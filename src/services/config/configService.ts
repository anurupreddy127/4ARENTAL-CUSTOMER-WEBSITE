import type { ConfigKey, ParsedConfigMap } from "@/types";

const DEFAULT_CONFIG: ParsedConfigMap = {
  cancellation_fee: 50,
  no_show_fee: 50,
  additional_driver_fee: 50,
  insurance_late_fee_daily: 50,
  monthly_no_notice_fine: 50,
  early_return_fee: 50,
  security_deposit_weekly: 350,
  security_deposit_monthly_multiplier: 1,
  booking_min_lead_time_hours: 48,
  booking_max_advance_days: 30,
  min_rental_days: 7,
  vehicle_buffer_days: 2,
  modification_cutoff_hours: 24,
  deposit_release_business_days: 7,
  monthly_notice_days: 7,
  monthly_notice_reply_days: 1,
  monthly_rental_threshold_days: 30,
  insurance_deadline_hours: 24,
  insurance_grace_period_hours: 48,
  overdue_escalation_days: 7,
  delivery_wait_minutes: 30,
  delivery_first_slot_offset_hours: 1,
  delivery_slot_interval_hours: 3,
  extension_min_rental_days: 30,
  extension_min_duration_days: 7,
  extension_cutoff_days: 5,
  max_extensions: 5,
  min_driver_age: 18,
  max_additional_drivers: 3,
  us_license_only: true,
  young_driver_fee_enabled: false,
  first_booking_verification_only: true,
  cash_advance_booking_allowed: false,
  cash_delivery_allowed: false,
  store_hours_weekday_open: "09:00",
  store_hours_weekday_close: "19:00",
  store_hours_sunday_open: "09:00",
  store_hours_sunday_close: "17:00",
  booking_id_prefix: "4AR",
} as ParsedConfigMap;

export const configService = {
  async getAllConfigs(): Promise<ParsedConfigMap> {
    return DEFAULT_CONFIG;
  },

  async getConfig<K extends ConfigKey>(key: K): Promise<ParsedConfigMap[K]> {
    return DEFAULT_CONFIG[key];
  },

  async getConfigs<K extends ConfigKey>(
    keys: K[],
  ): Promise<Pick<ParsedConfigMap, K>> {
    const result: Partial<Pick<ParsedConfigMap, K>> = {};
    for (const key of keys) {
      result[key] = DEFAULT_CONFIG[key];
    }
    return result as Pick<ParsedConfigMap, K>;
  },

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

  async getExtensionConfigs() {
    return this.getConfigs([
      "extension_min_rental_days",
      "extension_min_duration_days",
      "extension_cutoff_days",
      "max_extensions",
    ]);
  },

  async getDriverConfigs() {
    return this.getConfigs([
      "min_driver_age",
      "max_additional_drivers",
      "us_license_only",
      "young_driver_fee_enabled",
      "first_booking_verification_only",
    ]);
  },

  async getStoreHoursConfigs() {
    return this.getConfigs([
      "store_hours_weekday_open",
      "store_hours_weekday_close",
      "store_hours_sunday_open",
      "store_hours_sunday_close",
    ]);
  },

  async getDeliveryConfigs() {
    return this.getConfigs([
      "delivery_wait_minutes",
      "delivery_first_slot_offset_hours",
      "delivery_slot_interval_hours",
    ]);
  },
};

export function clearConfigCache(): void {
  // No-op - using static defaults
}
