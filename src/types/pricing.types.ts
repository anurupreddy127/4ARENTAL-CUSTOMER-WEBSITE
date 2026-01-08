// types/pricing.types.ts
/**
 * Pricing calculation type definitions
 */

import type { RentalType, PricingMethod } from "./booking.types";

// ============================================
// PRICING RESULT (from calculate_rental_price)
// ============================================

export interface PricingResult {
  rentalDays: number;
  rentalType: RentalType;
  pricingMethod: PricingMethod;

  // Rates
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;

  // Calculation breakdown
  fullWeeks: number | null;
  overflowDays: number | null;
  fullMonths: number | null;
  monthlyOverflowDays: number | null;

  // Amounts
  weeklyCalculation: number | null;
  monthlyCalculation: number | null;
  rentalAmount: number;

  // Security deposit
  securityDeposit: number;

  // Total (before delivery/driver fees)
  subtotal: number;
}

// ============================================
// BOOKING TOTAL (with all fees)
// ============================================

export interface BookingTotal {
  rentalDays: number;
  rentalType: RentalType;
  pricingMethod: PricingMethod;

  // Rates (frozen at booking time)
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;

  // Breakdown
  rentalAmount: number;
  securityDeposit: number;
  deliveryFee: number;
  additionalDriverFee: number;

  // Totals
  subtotal: number; // rentalAmount + deliveryFee + driverFee
  totalDueNow: number; // subtotal + securityDeposit
}

// ============================================
// EXTENSION PRICING
// ============================================

export interface ExtensionPricing {
  extensionDays: number;
  rentalType: RentalType;
  pricingMethod: PricingMethod;
  rentalAmount: number;
}

// ============================================
// EARLY RETURN CALCULATION
// ============================================

export interface EarlyReturnCalculation {
  originalDays: number;
  actualDays: number;
  daysUnused: number;
  originalAmount: number;
  usedAmount: number;
  earlyReturnFee: number;
  refundAmount: number;
  additionalCharge: number;
}

// ============================================
// PRICING DISPLAY BREAKDOWN
// ============================================

export interface PricingBreakdownLine {
  label: string;
  description?: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isDeposit?: boolean;
}

export interface PricingBreakdown {
  lines: PricingBreakdownLine[];
  rentalType: RentalType;
  pricingMethod: PricingMethod;
  totalDueNow: number;
}
