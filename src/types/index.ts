// User types
export * from "./user.types";

// Auth types
export * from "./auth.types";

// Vehicle types
export * from "./vehicle.types";

// Booking types
export * from "./booking.types";

// Re-export commonly used types explicitly for better IDE support
export type { User, UserProfile } from "./user.types";

export type {
  AuthContextType,
  LoginCredentials,
  RegisterCredentials,
} from "./auth.types";

export type {
  Vehicle,
  VehicleStatus,
  VehicleCategory,
  VehicleInspection,
  VehicleMaintenance,
} from "./vehicle.types";

export type {
  Booking,
  BookingStatus,
  PrimaryDriver,
  AdditionalDriver,
  PaymentStatus,
  PickupType,
  PickupPhotos,
} from "./booking.types";
