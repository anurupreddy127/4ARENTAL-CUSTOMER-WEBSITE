// supabase/functions/_shared/ratelimit.ts
// Rate Limiting Utility Module for 4A Rentals
// Using Upstash Ratelimit with sliding window algorithm

import { Ratelimit } from "npm:@upstash/ratelimit@2.0.1";
import { Redis } from "npm:@upstash/redis@1.28.0";

// ============================================
// TYPES
// ============================================
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (ms) when the limit resets
  retryAfter: number; // Seconds until retry is allowed
}

export interface RateLimitErrorResponse {
  error: string;
  code: "RATE_LIMITED";
  retryAfter: number;
  limit: number;
  resetAt: string;
}

// ============================================
// CONSTANTS - RATE LIMIT CONFIGURATIONS
// ============================================
export const RATE_LIMITS = {
  // Authentication
  LOGIN: { requests: 5, window: "15 m" },
  SIGNUP: { requests: 3, window: "1 h" },
  PASSWORD_RESET: { requests: 3, window: "24 h" },
  PASSWORD_CHANGE: { requests: 5, window: "1 h" },
  OTP_VERIFY: { requests: 5, window: "5 m" },

  // Business Operations
  BOOKING_CREATE: { requests: 10, window: "1 h" },
  BOOKING_EXTEND: { requests: 5, window: "1 h" },
  PAYMENT_INITIATE: { requests: 5, window: "15 m" },

  // File Operations
  FILE_UPLOAD: { requests: 20, window: "1 h" },
  VERIFICATION_UPLOAD: { requests: 10, window: "1 h" },

  // Email (via Resend)
  EMAIL_SEND: { requests: 10, window: "1 h" },
  EMAIL_SEND_WORKER: { requests: 50, window: "1 h" },

  // POS Operations (Workers)
  POS_TRANSACTION: { requests: 20, window: "15 m" },
  TERMINAL_CONNECTION: { requests: 30, window: "15 m" },

  // API Protection
  PUBLIC_API: { requests: 100, window: "1 m" },
  DASHBOARD_REFRESH: { requests: 30, window: "1 m" },

  // Public Forms (no auth required)
  CONTACT_FORM: { requests: 5, window: "1 h" },

  // Admin Operations
  WORKER_CREATE: { requests: 10, window: "1 h" },
} as const;

// Type for rate limit keys
export type RateLimitKey = keyof typeof RATE_LIMITS;

// ============================================
// REDIS CLIENT SINGLETON
// ============================================
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

    if (!url || !token) {
      throw new Error("Redis credentials not configured");
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

// ============================================
// RATE LIMITER FACTORY
// ============================================
const rateLimiters = new Map<RateLimitKey, Ratelimit>();

function getRateLimiter(key: RateLimitKey): Ratelimit {
  if (!rateLimiters.has(key)) {
    const config = RATE_LIMITS[key];
    const limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      prefix: `4arentals:ratelimit:${key.toLowerCase()}`,
      analytics: false, // Disable analytics to reduce Redis calls
    });
    rateLimiters.set(key, limiter);
  }
  return rateLimiters.get(key)!;
}

// ============================================
// MAIN RATE LIMIT CHECK FUNCTION
// ============================================

/**
 * Check rate limit for a specific operation and identifier
 *
 * @param limitKey - The type of operation (LOGIN, SIGNUP, BOOKING_CREATE, etc.)
 * @param identifier - Unique identifier (user_id, email, IP address, or combination)
 * @returns RateLimitResult with success status and metadata
 *
 * @example
 * // Check login rate limit by email
 * const result = await checkRateLimit("LOGIN", email);
 * if (!result.success) {
 *   return rateLimitResponse(result);
 * }
 *
 * @example
 * // Check booking creation by user ID
 * const result = await checkRateLimit("BOOKING_CREATE", userId);
 */
export async function checkRateLimit(
  limitKey: RateLimitKey,
  identifier: string,
): Promise<RateLimitResult> {
  try {
    const limiter = getRateLimiter(limitKey);
    const result = await limiter.limit(identifier);

    const retryAfter = result.success
      ? 0
      : Math.ceil((result.reset - Date.now()) / 1000);

    console.log(
      `[RATELIMIT] ${limitKey} | ${identifier.substring(0, 8)}... | ` +
        `${result.success ? "ALLOWED" : "BLOCKED"} | ` +
        `remaining: ${result.remaining}/${result.limit}`,
    );

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: Math.max(0, retryAfter),
    };
  } catch (error) {
    // On Redis failure, allow the request (fail-open)
    // This prevents Redis outages from blocking all users
    console.error(`[RATELIMIT] Error checking ${limitKey}:`, error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      retryAfter: 0,
    };
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Generate rate limit headers for successful requests
 * Add these to your response to help clients track their limits
 */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };
}

/**
 * Generate a standardized rate limit error response body
 */
export function rateLimitErrorBody(
  result: RateLimitResult,
  customMessage?: string,
): RateLimitErrorResponse {
  const defaultMessage = `Too many requests. Please try again in ${formatRetryTime(result.retryAfter)}.`;

  return {
    error: customMessage || defaultMessage,
    code: "RATE_LIMITED",
    retryAfter: result.retryAfter,
    limit: result.limit,
    resetAt: new Date(result.reset).toISOString(),
  };
}

/**
 * Create a complete 429 Response object for rate-limited requests
 * Use this directly in your Edge Function when rate limit is exceeded
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {},
  customMessage?: string,
): Response {
  return new Response(
    JSON.stringify(rateLimitErrorBody(result, customMessage)),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": result.retryAfter.toString(),
        ...rateLimitHeaders(result),
      },
    },
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format retry time in human-readable format
 */
function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.ceil(seconds / 3600);
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

/**
 * Create a combined identifier from multiple values
 * Useful for signup (email + IP) or other combined limits
 *
 * @example
 * const identifier = createIdentifier(email, ipAddress);
 */
export function createIdentifier(...parts: string[]): string {
  return parts.filter(Boolean).join(":");
}

/**
 * Extract IP address from request headers
 * Handles various proxy headers
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Extract user ID from Supabase auth token
 * Returns null if not authenticated
 */
export async function getUserIdFromRequest(
  req: Request,
  supabaseAdmin: ReturnType<
    typeof import("npm:@supabase/supabase-js@2").createClient
  >,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}
