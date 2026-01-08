// hooks/index.ts
/**
 * Central export for all hooks
 */

export { useAuth } from "./useAuth";
export { useBookings, useBooking, useBookingStats } from "./useBookings";
export { useVehicles } from "./useVehicles";
export { useDrivers } from "./useDrivers";
export { useAvailability } from "./useAvailability";

// Config hooks
export {
  useConfig,
  useBookingConfig,
  useDriverConfig,
  useExtensionConfig,
  useStoreHours,
  useDeliveryConfig,
} from "./useConfig";

// Pricing hooks (NEW)
export {
  usePricing,
  useExtensionPricing,
  useVehicleRates,
  useDateValidation,
  formatCurrency,
  calculateRentalDays,
  determineRentalType,
} from "./usePricing";
