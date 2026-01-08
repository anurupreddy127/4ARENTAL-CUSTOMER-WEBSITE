// hooks/useConfig.ts
/**
 * React hook for accessing system configuration
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  configService,
  clearConfigCache,
} from "@/services/config/configService";
import type { ParsedConfigMap, ConfigKey } from "@/types";

// ============================================
// HOOK RETURN TYPE
// ============================================

interface UseConfigReturn {
  config: ParsedConfigMap | null;
  loading: boolean;
  error: string | null;

  // Typed getters
  getInt: (key: ConfigKey) => number;
  getDecimal: (key: ConfigKey) => number;
  getBool: (key: ConfigKey) => boolean;
  getString: (key: ConfigKey) => string;

  // Utility functions
  refetch: () => Promise<void>;
  clearCache: () => void;
}

// ============================================
// DEFAULT VALUES (fallbacks)
// ============================================

const DEFAULT_CONFIG: Partial<ParsedConfigMap> = {
  // Fees
  cancellation_fee: 50,
  no_show_fee: 50,
  additional_driver_fee: 50,
  insurance_late_fee_daily: 50,
  monthly_no_notice_fine: 50,
  early_return_fee: 50,
  security_deposit_weekly: 350,
  security_deposit_monthly_multiplier: 1,

  // Timing
  booking_min_lead_time_hours: 48,
  booking_max_advance_days: 30,
  min_rental_days: 7,
  vehicle_buffer_days: 2,
  modification_cutoff_hours: 24,
  deposit_release_business_days: 7,

  // Monthly Rules
  monthly_notice_days: 7,
  monthly_notice_reply_days: 1,
  monthly_rental_threshold_days: 30,

  // Insurance
  insurance_deadline_hours: 24,
  insurance_grace_period_hours: 48,

  // Overdue
  overdue_escalation_days: 7,

  // Delivery
  delivery_wait_minutes: 30,
  delivery_first_slot_offset_hours: 1,
  delivery_slot_interval_hours: 3,

  // Extensions
  extension_min_rental_days: 30,
  extension_min_duration_days: 7,
  extension_cutoff_days: 5,
  max_extensions: 5,

  // Drivers
  min_driver_age: 18,
  max_additional_drivers: 3,
  us_license_only: true,
  young_driver_fee_enabled: false,
  first_booking_verification_only: true,

  // Payment
  cash_advance_booking_allowed: false,
  cash_delivery_allowed: false,

  // Store Hours
  store_hours_weekday_open: "09:00",
  store_hours_weekday_close: "19:00",
  store_hours_sunday_open: "09:00",
  store_hours_sunday_close: "17:00",

  // System
  booking_id_prefix: "4AR",
};

// ============================================
// MAIN HOOK
// ============================================

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<ParsedConfigMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch configs
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await configService.getAllConfigs();
      setConfig(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load configuration";
      setError(message);
      console.error("[useConfig] Error:", message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Typed getters with fallback to defaults
  const getInt = useCallback(
    (key: ConfigKey): number => {
      if (config && key in config) {
        const value = config[key as keyof ParsedConfigMap];
        return typeof value === "number" ? Math.floor(value) : 0;
      }
      const defaultValue = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
      return typeof defaultValue === "number" ? Math.floor(defaultValue) : 0;
    },
    [config]
  );

  const getDecimal = useCallback(
    (key: ConfigKey): number => {
      if (config && key in config) {
        const value = config[key as keyof ParsedConfigMap];
        return typeof value === "number" ? value : 0;
      }
      const defaultValue = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
      return typeof defaultValue === "number" ? defaultValue : 0;
    },
    [config]
  );

  const getBool = useCallback(
    (key: ConfigKey): boolean => {
      if (config && key in config) {
        const value = config[key as keyof ParsedConfigMap];
        return typeof value === "boolean" ? value : false;
      }
      const defaultValue = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
      return typeof defaultValue === "boolean" ? defaultValue : false;
    },
    [config]
  );

  const getString = useCallback(
    (key: ConfigKey): string => {
      if (config && key in config) {
        const value = config[key as keyof ParsedConfigMap];
        return typeof value === "string" ? value : "";
      }
      const defaultValue = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
      return typeof defaultValue === "string" ? defaultValue : "";
    },
    [config]
  );

  // Refetch
  const refetch = useCallback(async () => {
    clearConfigCache();
    await fetchConfig();
  }, [fetchConfig]);

  // Clear cache
  const clearCache = useCallback(() => {
    clearConfigCache();
  }, []);

  return {
    config,
    loading,
    error,
    getInt,
    getDecimal,
    getBool,
    getString,
    refetch,
    clearCache,
  };
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook for booking-related config values
 */
export function useBookingConfig() {
  const { getInt, getDecimal, loading, error } = useConfig();

  return useMemo(
    () => ({
      loading,
      error,
      minLeadTimeHours: getInt("booking_min_lead_time_hours"),
      maxAdvanceDays: getInt("booking_max_advance_days"),
      minRentalDays: getInt("min_rental_days"),
      modificationCutoffHours: getInt("modification_cutoff_hours"),
      additionalDriverFee: getDecimal("additional_driver_fee"),
      securityDepositWeekly: getDecimal("security_deposit_weekly"),
      securityDepositMultiplier: getDecimal(
        "security_deposit_monthly_multiplier"
      ),
      monthlyThresholdDays: getInt("monthly_rental_threshold_days"),
    }),
    [getInt, getDecimal, loading, error]
  );
}

/**
 * Hook for driver-related config values
 */
export function useDriverConfig() {
  const { getInt, getBool, loading, error } = useConfig();

  return useMemo(
    () => ({
      loading,
      error,
      minAge: getInt("min_driver_age"),
      maxAdditionalDrivers: getInt("max_additional_drivers"),
      usLicenseOnly: getBool("us_license_only"),
      youngDriverFeeEnabled: getBool("young_driver_fee_enabled"),
      firstBookingVerificationOnly: getBool("first_booking_verification_only"),
    }),
    [getInt, getBool, loading, error]
  );
}

/**
 * Hook for extension-related config values
 */
export function useExtensionConfig() {
  const { getInt, loading, error } = useConfig();

  return useMemo(
    () => ({
      loading,
      error,
      minRentalDays: getInt("extension_min_rental_days"),
      minDurationDays: getInt("extension_min_duration_days"),
      cutoffDays: getInt("extension_cutoff_days"),
      maxExtensions: getInt("max_extensions"),
    }),
    [getInt, loading, error]
  );
}

/**
 * Hook for store hours
 */
export function useStoreHours() {
  const { getString, loading, error } = useConfig();

  return useMemo(
    () => ({
      loading,
      error,
      weekdayOpen: getString("store_hours_weekday_open"),
      weekdayClose: getString("store_hours_weekday_close"),
      sundayOpen: getString("store_hours_sunday_open"),
      sundayClose: getString("store_hours_sunday_close"),
    }),
    [getString, loading, error]
  );
}

/**
 * Hook for delivery-related config values
 */
export function useDeliveryConfig() {
  const { getInt, loading, error } = useConfig();

  return useMemo(
    () => ({
      loading,
      error,
      waitMinutes: getInt("delivery_wait_minutes"),
      firstSlotOffsetHours: getInt("delivery_first_slot_offset_hours"),
      slotIntervalHours: getInt("delivery_slot_interval_hours"),
    }),
    [getInt, loading, error]
  );
}

export default useConfig;
