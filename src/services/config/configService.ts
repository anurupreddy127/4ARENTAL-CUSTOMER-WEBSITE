// services/config/configService.ts (With Redis Caching)
/**
 * Service for fetching and managing system configuration
 * ✅ Now uses Redis caching via Edge Function (1 hour TTL)
 */

import { cachedApi } from "@/config/api";
import type { ConfigKey, ParsedConfigMap } from "@/types";
import * as Sentry from "@sentry/react";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe logging for development
 */
function logInfo(message: string): void {
  if (import.meta.env.DEV) {
    console.log(`[configService] ${message}`);
  }
}

/**
 * Safe error logging
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[configService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "configService", context },
    });
  }
}

/**
 * Parse raw config values into typed values
 */
function parseConfigValue(
  key: string,
  value: unknown,
): string | number | boolean {
  // Already parsed (from cache)
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;

  const strValue = String(value);

  // Boolean configs
  const booleanKeys = [
    "us_license_only",
    "young_driver_fee_enabled",
    "first_booking_verification_only",
    "cash_advance_booking_allowed",
    "cash_delivery_allowed",
  ];

  if (booleanKeys.includes(key)) {
    return strValue === "true";
  }

  // String configs (keep as string)
  const stringKeys = [
    "store_hours_weekday_open",
    "store_hours_weekday_close",
    "store_hours_sunday_open",
    "store_hours_sunday_close",
    "booking_id_prefix",
  ];

  if (stringKeys.includes(key)) {
    return strValue;
  }

  // Everything else is numeric
  const parsed = parseFloat(strValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse all config values
 */
function parseAllConfigs(raw: Record<string, unknown>): ParsedConfigMap {
  const parsed: Partial<ParsedConfigMap> = {};

  for (const [key, value] of Object.entries(raw)) {
    (parsed as Record<string, unknown>)[key] = parseConfigValue(key, value);
  }

  return parsed as ParsedConfigMap;
}

// ============================================
// IN-MEMORY FALLBACK CACHE
// ============================================
// Keeps a local copy in case Edge Function is unavailable

let fallbackCache: ParsedConfigMap | null = null;

// ============================================
// SERVICE (WITH REDIS CACHING)
// ============================================

export const configService = {
  /**
   * Get all configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getAllConfigs(): Promise<ParsedConfigMap> {
    logInfo("Fetching configs from cached API...");

    try {
      const data = await cachedApi.config.all();

      if (!data || Object.keys(data).length === 0) {
        throw new Error("No configuration data returned");
      }

      // Parse values and update fallback cache
      const parsed = parseAllConfigs(data);
      fallbackCache = parsed;

      logInfo(`Configs loaded (${Object.keys(parsed).length} values)`);

      return parsed;
    } catch (error) {
      logError("getAllConfigs", error);

      // Return fallback cache if available
      if (fallbackCache) {
        logInfo("Returning fallback cache");
        return fallbackCache;
      }

      throw new Error("Failed to load configuration");
    }
  },

  /**
   * Get a single config value
   * ✅ Uses cached getAllConfigs()
   */
  async getConfig<K extends ConfigKey>(key: K): Promise<ParsedConfigMap[K]> {
    const configs = await this.getAllConfigs();
    return configs[key];
  },

  /**
   * Get multiple config values
   * ✅ Uses cached getAllConfigs()
   */
  async getConfigs<K extends ConfigKey>(
    keys: K[],
  ): Promise<Pick<ParsedConfigMap, K>> {
    const configs = await this.getAllConfigs();
    const result: Partial<Pick<ParsedConfigMap, K>> = {};

    for (const key of keys) {
      result[key] = configs[key];
    }

    return result as Pick<ParsedConfigMap, K>;
  },

  /**
   * Get fee-related configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getFeeConfigs() {
    return this.getConfigs([
      "cancellation_fee",
      "no_show_fee",
      "additional_driver_fee",
      "insurance_late_fee_daily",
      "monthly_no_notice_fine",
      "early_return_fee",
      "security_deposit_weekly",
      "security_deposit_monthly_multiplier",
    ]);
  },

  /**
   * Get timing-related configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getTimingConfigs() {
    return this.getConfigs([
      "booking_min_lead_time_hours",
      "booking_max_advance_days",
      "min_rental_days",
      "vehicle_buffer_days",
      "modification_cutoff_hours",
      "deposit_release_business_days",
    ]);
  },

  /**
   * Get extension-related configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getExtensionConfigs() {
    return this.getConfigs([
      "extension_min_rental_days",
      "extension_min_duration_days",
      "extension_cutoff_days",
      "max_extensions",
    ]);
  },

  /**
   * Get driver-related configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getDriverConfigs() {
    return this.getConfigs([
      "min_driver_age",
      "max_additional_drivers",
      "us_license_only",
      "young_driver_fee_enabled",
      "first_booking_verification_only",
    ]);
  },

  /**
   * Get store hours configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getStoreHoursConfigs() {
    return this.getConfigs([
      "store_hours_weekday_open",
      "store_hours_weekday_close",
      "store_hours_sunday_open",
      "store_hours_sunday_close",
    ]);
  },

  /**
   * Get delivery-related configs
   * ✅ CACHED via Redis (1 hour TTL)
   */
  async getDeliveryConfigs() {
    return this.getConfigs([
      "delivery_wait_minutes",
      "delivery_first_slot_offset_hours",
      "delivery_slot_interval_hours",
    ]);
  },
};

/**
 * Clear the fallback cache (exported for testing/admin use)
 */
export function clearConfigCache(): void {
  fallbackCache = null;
  logInfo("Fallback cache cleared");
}
