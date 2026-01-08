// types/index.ts
/**
 * Central export for all type definitions
 */

// User types
export * from "./user.types";

// Auth types
export * from "./auth.types";

// Vehicle types
export * from "./vehicle.types";

// Booking types
export * from "./booking.types";

// Config types (NEW)
export * from "./config.types";

// Calendar types (NEW)
export * from "./calendar.types";

// Pricing types (NEW)
export * from "./pricing.types";

// ============================================
// Re-export commonly used types explicitly for better IDE support
// ============================================

// User types
export type { User, UserProfile } from "./user.types";

// Auth types
export type {
  AuthContextType,
  LoginCredentials,
  RegisterCredentials,
} from "./auth.types";

// Vehicle types
export type {
  Vehicle,
  VehicleStatus,
  VehicleCategory,
  VehicleInspection,
  VehicleMaintenance,
} from "./vehicle.types";

// Booking types
export type {
  Booking,
  BookingStatus,
  PrimaryDriver,
  AdditionalDriver,
  PaymentStatus,
  PickupType,
  PickupPhotos,
  RentalType,
  PricingMethod,
  CreateBookingInput,
  CreateExtensionInput,
} from "./booking.types";

// Config types (NEW)
export type {
  SystemConfig,
  ConfigKey,
  ConfigDataType,
  ConfigCategory,
  ParsedConfigMap,
  ConfigChangeHistory,
} from "./config.types";

// Calendar types (NEW)
export type {
  BusinessCalendarEntry,
  CalendarDateType,
  StoreHours,
  BlockedDate,
  UnavailableDateRange,
  DeliveryTimeSlot,
} from "./calendar.types";

// Pricing types (NEW)
export type {
  PricingResult,
  BookingTotal,
  ExtensionPricing,
  EarlyReturnCalculation,
  PricingBreakdown,
  PricingBreakdownLine,
} from "./pricing.types";
