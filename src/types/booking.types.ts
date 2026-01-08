/* eslint-disable @typescript-eslint/no-explicit-any */
// types/booking.types.ts
/**
 * Booking-related type definitions
 * Updated to match database schema with new columns
 */

// ============================================
// DRIVER TYPES
// ============================================

export interface PrimaryDriver {
  id: string;
  bookingId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicense: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  isAccountHolder: boolean;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdditionalDriver {
  id: string;
  bookingId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicense: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PICKUP PHOTOS
// ============================================

export interface PickupPhotos {
  front: string | null;
  back: string | null;
  leftSide: string | null;
  rightSide: string | null;
  odometer: string | null;
}

// ============================================
// STATUS TYPES
// ============================================

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "inspection"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "expired";

export type PickupType = "store" | "delivery";

export type RentalType = "weekly" | "monthly" | "semester";

export type PricingMethod = "weekly" | "monthly" | "semester";

// ============================================
// MAIN BOOKING INTERFACE
// ============================================

export interface Booking {
  id: string;
  userId: string;
  vehicleId: string;

  // Human-readable booking number (4AR-YYYYMMDD-XXXXX)
  bookingNumber: string | null;

  // Location & Pickup
  pickupLocation: string;
  pickupType: PickupType;
  deliveryLocationId: string | null;
  deliveryFee: number;
  deliveryTimeSlot: string | null;

  // Dates
  pickupDate: string;
  returnDate: string;

  // ============================================
  // NEW: Rental Type & Pricing Breakdown
  // ============================================
  rentalType: RentalType;
  rentalDays: number | null;
  pricingMethod: PricingMethod | null;

  // Rates frozen at booking time
  dailyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;

  // Legacy field (keeping for backwards compatibility)
  rentalMonths: number;

  // Amounts
  rentalAmount: number;
  securityDeposit: number;
  additionalDriverFee: number;
  totalPrice: number;

  // ============================================
  // NEW: Extension Linking
  // ============================================
  parentBookingId: string | null;
  extensionNumber: number;
  extensionCount: number;

  // ============================================
  // NEW: Student Verification
  // ============================================
  isStudentBooking: boolean;
  studentIdUrl: string | null;
  studentVerified: boolean;
  studentVerifiedBy: string | null;
  studentVerifiedAt: string | null;

  // ============================================
  // NEW: Insurance Tracking
  // ============================================
  insuranceUploaded: boolean;
  insuranceUploadedAt: string | null;
  insuranceUrl: string | null;
  insuranceCompany: string | null;
  insurancePolicyNumber: string | null;
  insuranceVerified: boolean;
  insuranceVerifiedBy: string | null;
  insuranceVerifiedAt: string | null;

  // ============================================
  // NEW: Cancellation Tracking
  // ============================================
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancellationFeeApplied: number;

  // ============================================
  // NEW: Config Snapshot
  // ============================================
  configSnapshot: Record<string, string> | null;

  // Status fields
  status: BookingStatus;
  paymentStatus: PaymentStatus;

  // Customer info
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  // Driver info
  primaryDriver?: PrimaryDriver;
  additionalDrivers?: AdditionalDriver[];
  driversLicense?: string;

  // Vehicle info (joined)
  vehicle?: {
    id: string;
    name: string;
    category: string;
    price: number;
    image: string | string[];
    features: string[];
    status: string;
    specifications: any;
    dailyRate?: number;
    weeklyRate?: number;
    monthlyRate?: number;
    semesterRate?: number;
  };

  // Pickup/return tracking
  actualPickupDate: string | null;
  actualReturnDate: string | null;
  pickupMileage: number | null;
  returnMileage: number | null;
  pickupPhotos: PickupPhotos | null;

  // Admin fields
  adminNotes: string;

  // Deposit refund tracking
  securityDepositDeduction: number;
  securityDepositAmountReturned: number;
  securityDepositReturned: boolean;
  securityDepositReturnDate: string | null;
  deductionReason: string;

  // Stripe fields
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paidAt?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// BOOKING CREATE INPUT
// ============================================

export interface CreateBookingInput {
  vehicleId: string;
  pickupLocation: string;
  pickupType: PickupType;
  deliveryLocationId?: string | null;
  deliveryFee?: number;
  deliveryTimeSlot?: string | null;
  pickupDate: string;
  returnDate: string;
  rentalType: RentalType;
  rentalDays: number;
  pricingMethod: PricingMethod;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  rentalAmount: number;
  securityDeposit: number;
  additionalDriverFee?: number;
  totalPrice: number;
  isStudentBooking?: boolean;
  studentIdUrl?: string | null;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

// ============================================
// EXTENSION BOOKING INPUT
// ============================================

export interface CreateExtensionInput {
  parentBookingId: string;
  newReturnDate: string;
  rentalAmount: number;
}

// ============================================
// TYPE GUARDS
// ============================================

export const isActiveBooking = (booking: Booking): boolean => {
  return (
    booking.status === "active" ||
    booking.status === "confirmed" ||
    booking.status === "inspection"
  );
};

export const isCancellableBooking = (booking: Booking): boolean => {
  return booking.status === "pending" || booking.status === "confirmed";
};

export const isCompletedBooking = (booking: Booking): boolean => {
  return booking.status === "completed" || booking.status === "cancelled";
};

export const isExtension = (booking: Booking): boolean => {
  return booking.parentBookingId !== null && booking.extensionNumber > 0;
};

export const canExtend = (booking: Booking, daysRemaining: number): boolean => {
  // Only monthly+ rentals can extend
  if (booking.rentalType === "weekly") return false;

  // Semester rentals cannot extend
  if (booking.rentalType === "semester") return false;

  // Must be active
  if (booking.status !== "active") return false;

  // Max 5 extensions
  if (booking.extensionCount >= 5) return false;

  // Must have more than 5 days remaining (cutoff)
  if (daysRemaining <= 5) return false;

  return true;
};

export const needsInsurance = (booking: Booking): boolean => {
  return booking.status === "active" && !booking.insuranceUploaded;
};
