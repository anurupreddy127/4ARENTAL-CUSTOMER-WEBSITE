// utils/rateLimiter.ts
import * as Sentry from "@sentry/react";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

// Default configurations for different actions
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  // Auth actions
  login: { limit: 5, windowMs: 15 * 60 * 1000, message: "Too many login attempts. Please try again in 15 minutes." },
  signup: { limit: 3, windowMs: 60 * 60 * 1000, message: "Too many signup attempts. Please try again later." },
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000, message: "Too many password reset requests." },
  
  // Booking actions
  createBooking: { limit: 5, windowMs: 60 * 1000, message: "Too many booking attempts. Please wait a moment." },
  cancelBooking: { limit: 10, windowMs: 60 * 1000, message: "Too many cancellation requests." },
  
  // Search/Browse actions
  searchVehicles: { limit: 30, windowMs: 60 * 1000, message: "Too many searches. Please slow down." },
  getVehicles: { limit: 60, windowMs: 60 * 1000, message: "Too many requests. Please slow down." },
  
  // Contact actions
  contactForm: { limit: 3, windowMs: 10 * 60 * 1000, message: "Too many messages. Please try again later." },
  
  // Default fallback
  default: { limit: 30, windowMs: 60 * 1000, message: "Too many requests. Please slow down." },
};

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Record<string, RateLimitConfig> = DEFAULT_CONFIGS;

  /**
   * Check if action is allowed and throw error if not
   */
  check(action: string): void {
    if (!this.isAllowed(action)) {
      const config = this.getConfig(action);
      const error = new Error(config.message);
      
      // Log to Sentry for monitoring
      if (import.meta.env.PROD) {
        Sentry.captureMessage(`Rate limit exceeded: ${action}`, {
          level: "warning",
          tags: { action, type: "rate_limit" },
        });
      }
      
      throw error;
    }
  }

  /**
   * Check if action is allowed (returns boolean)
   */
  isAllowed(action: string): boolean {
    const config = this.getConfig(action);
    const key = this.getKey(action);
    const now = Date.now();
    const entry = this.limits.get(key);

    // Clean old entries occasionally
    this.cleanup();

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, { 
        count: 1, 
        resetTime: now + config.windowMs,
        blocked: false 
      });
      return true;
    }

    if (entry.count >= config.limit) {
      entry.blocked = true;
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for an action
   */
  getRemaining(action: string): number {
    const config = this.getConfig(action);
    const key = this.getKey(action);
    const entry = this.limits.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return config.limit;
    }
    
    return Math.max(0, config.limit - entry.count);
  }

  /**
   * Get time until reset (in seconds)
   */
  getResetIn(action: string): number {
    const key = this.getKey(action);
    const entry = this.limits.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    
    return Math.ceil((entry.resetTime - Date.now()) / 1000);
  }

  /**
   * Reset rate limit for an action
   */
  reset(action: string): void {
    const key = this.getKey(action);
    this.limits.delete(key);
  }

  /**
   * Add custom configuration
   */
  configure(action: string, config: RateLimitConfig): void {
    this.configs[action] = config;
  }

  private getConfig(action: string): RateLimitConfig {
    return this.configs[action] || this.configs.default;
  }

  private getKey(action: string): string {
    // In a real app, you might include user ID
    return `rate_limit_${action}`;
  }

  private cleanup(): void {
    // Run cleanup randomly (1% of calls) to avoid performance hit
    if (Math.random() > 0.01) return;

    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export types for external use
export type { RateLimitConfig };