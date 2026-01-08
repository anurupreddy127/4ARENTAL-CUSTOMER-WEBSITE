// services/config/configService.ts
/**
 * Service for fetching and managing system configuration
 */

import { supabase } from "@/config/supabase";
import type { ConfigKey, ParsedConfigMap } from "@/types";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================

interface RawConfigMap {
  [key: string]: string;
}

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
  value: string
): string | number | boolean {
  // Boolean configs
  const booleanKeys = [
    "us_license_only",
    "young_driver_fee_enabled",
    "first_booking_verification_only",
    "cash_advance_booking_allowed",
    "cash_delivery_allowed",
  ];

  if (booleanKeys.includes(key)) {
    return value === "true";
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
    return value;
  }

  // Everything else is numeric
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse all config values
 */
function parseAllConfigs(raw: RawConfigMap): ParsedConfigMap {
  const parsed: Partial<ParsedConfigMap> = {};

  for (const [key, value] of Object.entries(raw)) {
    (parsed as Record<string, unknown>)[key] = parseConfigValue(key, value);
  }

  return parsed as ParsedConfigMap;
}

// ============================================
// CACHE
// ============================================

let configCache: ParsedConfigMap | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!configCache) return false;
  return Date.now() - cacheTimestamp < CACHE_DURATION_MS;
}

/**
 * Clear the config cache
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
  logInfo("Cache cleared");
}

// ============================================
// SERVICE
// ============================================

export const configService = {
  /**
   * Get all configs (with caching)
   */
  async getAllConfigs(): Promise<ParsedConfigMap> {
    // Return cached if valid
    if (isCacheValid() && configCache) {
      logInfo("Returning cached configs");
      return configCache;
    }

    logInfo("Fetching configs from database...");

    try {
      // Use the database function for efficiency
      const { data, error } = await supabase.rpc("get_all_configs");

      if (error) {
        logError("getAllConfigs", error);
        throw new Error("Failed to load configuration");
      }

      if (!data) {
        throw new Error("No configuration data returned");
      }

      // Parse and cache
      configCache = parseAllConfigs(data as RawConfigMap);
      cacheTimestamp = Date.now();

      logInfo(
        `Configs loaded and cached (${Object.keys(configCache).length} values)`
      );

      return configCache;
    } catch (error) {
      logError("getAllConfigs", error);

      // Return cached even if expired, as fallback
      if (configCache) {
        logInfo("Returning stale cache as fallback");
        return configCache;
      }

      throw error;
    }
  },

  /**
   * Get a single config value
   */
  async getConfig<K extends ConfigKey>(key: K): Promise<ParsedConfigMap[K]> {
    const configs = await this.getAllConfigs();
    return configs[key];
  },

  /**
   * Get multiple config values
   */
  async getConfigs<K extends ConfigKey>(
    keys: K[]
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
   */
  async getDeliveryConfigs() {
    return this.getConfigs([
      "delivery_wait_minutes",
      "delivery_first_slot_offset_hours",
      "delivery_slot_interval_hours",
    ]);
  },
};
