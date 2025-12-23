/* eslint-disable @typescript-eslint/no-explicit-any */
// types/booking.types.ts

/**
 * Booking-related type definitions
 */

/**
 * Driver-related type definitions
 */
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

export interface PickupPhotos {
  front: string | null;
  back: string | null;
  leftSide: string | null;
  rightSide: string | null;
  odometer: string | null;
}

export interface Booking {
  id: string;
  userId: string;
  vehicleId: string;
  pickupLocation: string;
  pickupDate: string;
  returnDate: string;

  // Pickup type fields
  pickupType: "store" | "delivery";
  deliveryLocationId: string | null;
  deliveryFee: number;
  additionalDriverFee: number;

  // Rental details
  rentalMonths: number;
  rentalAmount: number;
  securityDeposit: number;
  totalPrice: number;

  // Status fields
  status: BookingStatus;
  paymentStatus: PaymentStatus; // ✅ ADDED

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

  // Vehicle info
  vehicle?: {
    id: string;
    name: string;
    category: string;
    price: number;
    image: string | string[];
    features: string[];
    status: string;
    specifications: any;
  };

  // Pickup/return tracking
  actualPickupDate: string | null;
  actualReturnDate: string | null;
  extensionCount: number;
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

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Status types
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "inspection"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "refunded" | "partial";

export type PickupType = "store" | "delivery";

// Type guards
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
