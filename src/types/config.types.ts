// types/config.types.ts
/**
 * System configuration type definitions
 */

// ============================================
// CONFIG VALUE TYPES
// ============================================

export type ConfigDataType =
  | "integer"
  | "decimal"
  | "boolean"
  | "string"
  | "json"
  | "time";

export type ConfigCategory =
  | "fees"
  | "timing"
  | "monthly_rules"
  | "insurance"
  | "overdue"
  | "delivery"
  | "extensions"
  | "drivers"
  | "payment"
  | "store_hours"
  | "system";

// ============================================
// SYSTEM CONFIG INTERFACE
// ============================================

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  dataType: ConfigDataType;
  category: ConfigCategory;
  label: string;
  description: string;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  isVisible: boolean;
  isEditable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CONFIG KEYS (Type-safe access)
// ============================================

export type ConfigKey =
  // Fees
  | "cancellation_fee"
  | "no_show_fee"
  | "additional_driver_fee"
  | "insurance_late_fee_daily"
  | "monthly_no_notice_fine"
  | "early_return_fee"
  | "security_deposit_weekly"
  | "security_deposit_monthly_multiplier"
  // Timing
  | "booking_min_lead_time_hours"
  | "booking_max_advance_days"
  | "min_rental_days"
  | "vehicle_buffer_days"
  | "modification_cutoff_hours"
  | "deposit_release_business_days"
  // Monthly Rules
  | "monthly_notice_days"
  | "monthly_notice_reply_days"
  | "monthly_rental_threshold_days"
  // Insurance
  | "insurance_deadline_hours"
  | "insurance_grace_period_hours"
  // Overdue
  | "overdue_escalation_days"
  // Delivery
  | "delivery_wait_minutes"
  | "delivery_first_slot_offset_hours"
  | "delivery_slot_interval_hours"
  // Extensions
  | "extension_min_rental_days"
  | "extension_min_duration_days"
  | "extension_cutoff_days"
  | "max_extensions"
  // Drivers
  | "min_driver_age"
  | "max_additional_drivers"
  | "us_license_only"
  | "young_driver_fee_enabled"
  | "first_booking_verification_only"
  // Payment
  | "cash_advance_booking_allowed"
  | "cash_delivery_allowed"
  // Store Hours
  | "store_hours_weekday_open"
  | "store_hours_weekday_close"
  | "store_hours_sunday_open"
  | "store_hours_sunday_close"
  // System
  | "booking_id_prefix";

// ============================================
// PARSED CONFIG MAP
// ============================================

export interface ParsedConfigMap {
  // Fees (decimal)
  cancellation_fee: number;
  no_show_fee: number;
  additional_driver_fee: number;
  insurance_late_fee_daily: number;
  monthly_no_notice_fine: number;
  early_return_fee: number;
  security_deposit_weekly: number;
  security_deposit_monthly_multiplier: number;

  // Timing (integer)
  booking_min_lead_time_hours: number;
  booking_max_advance_days: number;
  min_rental_days: number;
  vehicle_buffer_days: number;
  modification_cutoff_hours: number;
  deposit_release_business_days: number;

  // Monthly Rules (integer)
  monthly_notice_days: number;
  monthly_notice_reply_days: number;
  monthly_rental_threshold_days: number;

  // Insurance (integer)
  insurance_deadline_hours: number;
  insurance_grace_period_hours: number;

  // Overdue (integer)
  overdue_escalation_days: number;

  // Delivery (integer)
  delivery_wait_minutes: number;
  delivery_first_slot_offset_hours: number;
  delivery_slot_interval_hours: number;

  // Extensions (integer)
  extension_min_rental_days: number;
  extension_min_duration_days: number;
  extension_cutoff_days: number;
  max_extensions: number;

  // Drivers (integer/boolean)
  min_driver_age: number;
  max_additional_drivers: number;
  us_license_only: boolean;
  young_driver_fee_enabled: boolean;
  first_booking_verification_only: boolean;

  // Payment (boolean)
  cash_advance_booking_allowed: boolean;
  cash_delivery_allowed: boolean;

  // Store Hours (string - time format)
  store_hours_weekday_open: string;
  store_hours_weekday_close: string;
  store_hours_sunday_open: string;
  store_hours_sunday_close: string;

  // System (string)
  booking_id_prefix: string;
}

// ============================================
// CONFIG CHANGE HISTORY
// ============================================

export interface ConfigChangeHistory {
  id: string;
  configId: string;
  configKey: string;
  oldValue: string | null;
  newValue: string;
  changedBy: string | null;
  changedByEmail: string | null;
  changedByName: string | null;
  changeReason: string | null;
  changedAt: Date;
}
