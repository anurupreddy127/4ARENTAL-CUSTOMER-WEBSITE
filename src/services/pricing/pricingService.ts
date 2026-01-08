// services/pricing/pricingService.ts
/**
 * Service for calculating rental prices using database functions
 */

import { supabase } from "@/config/supabase";
import type {
  PricingResult,
  BookingTotal,
  ExtensionPricing,
  RentalType,
  PricingMethod,
} from "@/types";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================

interface RawPricingResult {
  rental_days: number;
  rental_type: string;
  pricing_method: string;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  full_weeks: number | null;
  overflow_days: number | null;
  full_months: number | null;
  monthly_overflow_days: number | null;
  weekly_calculation: number | null;
  monthly_calculation: number | null;
  rental_amount: number;
  security_deposit: number;
  subtotal: number;
}

interface RawBookingTotal {
  rental_days: number;
  rental_type: string;
  pricing_method: string;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  rental_amount: number;
  security_deposit: number;
  delivery_fee: number;
  additional_driver_fee: number;
  subtotal: number;
  total_due_now: number;
}

interface RawExtensionPricing {
  extension_days: number;
  rental_type: string;
  pricing_method: string;
  rental_amount: number;
}

interface RawSimplePricing {
  rental_days: number;
  rental_type: string;
  pricing_method: string;
  rental_amount: number;
  security_deposit: number;
  subtotal: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function logInfo(message: string): void {
  if (import.meta.env.DEV) {
    console.log(`[pricingService] ${message}`);
  }
}

function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[pricingService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "pricingService", context },
    });
  }
}

/**
 * Format date to YYYY-MM-DD for database functions
 */
function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    // If already a string, ensure it's in correct format
    return date.split("T")[0];
  }
  return date.toISOString().split("T")[0];
}

/**
 * Map raw pricing result to typed interface
 */
function mapPricingResult(raw: RawPricingResult): PricingResult {
  return {
    rentalDays: raw.rental_days,
    rentalType: raw.rental_type as RentalType,
    pricingMethod: raw.pricing_method as PricingMethod,
    dailyRate: raw.daily_rate,
    weeklyRate: raw.weekly_rate,
    monthlyRate: raw.monthly_rate,
    fullWeeks: raw.full_weeks,
    overflowDays: raw.overflow_days,
    fullMonths: raw.full_months,
    monthlyOverflowDays: raw.monthly_overflow_days,
    weeklyCalculation: raw.weekly_calculation,
    monthlyCalculation: raw.monthly_calculation,
    rentalAmount: raw.rental_amount,
    securityDeposit: raw.security_deposit,
    subtotal: raw.subtotal,
  };
}

/**
 * Map raw booking total to typed interface
 */
function mapBookingTotal(raw: RawBookingTotal): BookingTotal {
  return {
    rentalDays: raw.rental_days,
    rentalType: raw.rental_type as RentalType,
    pricingMethod: raw.pricing_method as PricingMethod,
    dailyRate: raw.daily_rate,
    weeklyRate: raw.weekly_rate,
    monthlyRate: raw.monthly_rate,
    rentalAmount: raw.rental_amount,
    securityDeposit: raw.security_deposit,
    deliveryFee: raw.delivery_fee,
    additionalDriverFee: raw.additional_driver_fee,
    subtotal: raw.subtotal,
    totalDueNow: raw.total_due_now,
  };
}

/**
 * Map raw extension pricing to typed interface
 */
function mapExtensionPricing(raw: RawExtensionPricing): ExtensionPricing {
  return {
    extensionDays: raw.extension_days,
    rentalType: raw.rental_type as RentalType,
    pricingMethod: raw.pricing_method as PricingMethod,
    rentalAmount: raw.rental_amount,
  };
}

// ============================================
// SERVICE
// ============================================

export const pricingService = {
  /**
   * Calculate full pricing breakdown
   * Calls calculate_rental_price database function
   */
  async calculatePrice(
    vehicleId: string,
    pickupDate: Date | string,
    returnDate: Date | string,
    isStudent: boolean = false
  ): Promise<PricingResult> {
    logInfo(`Calculating price for vehicle ${vehicleId}`);

    try {
      const { data, error } = await supabase.rpc("calculate_rental_price", {
        p_vehicle_id: vehicleId,
        p_pickup_date: formatDate(pickupDate),
        p_return_date: formatDate(returnDate),
        p_is_student: isStudent,
      });

      if (error) {
        logError("calculatePrice", error);
        throw new Error(error.message || "Failed to calculate price");
      }

      if (!data) {
        throw new Error("No pricing data returned");
      }

      logInfo(`Price calculated: $${data.rental_amount}`);
      return mapPricingResult(data as RawPricingResult);
    } catch (error) {
      logError("calculatePrice", error);
      throw error;
    }
  },

  /**
   * Get simplified pricing (for quick lookups)
   * Calls get_rental_price database function
   */
  async getPrice(
    vehicleId: string,
    pickupDate: Date | string,
    returnDate: Date | string,
    isStudent: boolean = false
  ): Promise<{
    rentalDays: number;
    rentalType: RentalType;
    pricingMethod: PricingMethod;
    rentalAmount: number;
    securityDeposit: number;
    subtotal: number;
  }> {
    logInfo(`Getting price for vehicle ${vehicleId}`);

    try {
      const { data, error } = await supabase.rpc("get_rental_price", {
        p_vehicle_id: vehicleId,
        p_pickup_date: formatDate(pickupDate),
        p_return_date: formatDate(returnDate),
        p_is_student: isStudent,
      });

      if (error) {
        logError("getPrice", error);
        throw new Error(error.message || "Failed to get price");
      }

      if (!data || data.length === 0) {
        throw new Error("No pricing data returned");
      }

      const result = data[0] as RawSimplePricing;

      return {
        rentalDays: result.rental_days,
        rentalType: result.rental_type as RentalType,
        pricingMethod: result.pricing_method as PricingMethod,
        rentalAmount: result.rental_amount,
        securityDeposit: result.security_deposit,
        subtotal: result.subtotal,
      };
    } catch (error) {
      logError("getPrice", error);
      throw error;
    }
  },

  /**
   * Calculate total booking cost including all fees
   * Calls calculate_booking_total database function
   */
  async calculateBookingTotal(
    vehicleId: string,
    pickupDate: Date | string,
    returnDate: Date | string,
    isStudent: boolean = false,
    deliveryFee: number = 0,
    additionalDrivers: number = 0
  ): Promise<BookingTotal> {
    logInfo(`Calculating booking total for vehicle ${vehicleId}`);

    try {
      const { data, error } = await supabase.rpc("calculate_booking_total", {
        p_vehicle_id: vehicleId,
        p_pickup_date: formatDate(pickupDate),
        p_return_date: formatDate(returnDate),
        p_is_student: isStudent,
        p_delivery_fee: deliveryFee,
        p_additional_drivers: additionalDrivers,
      });

      if (error) {
        logError("calculateBookingTotal", error);
        throw new Error(error.message || "Failed to calculate booking total");
      }

      if (!data || data.length === 0) {
        throw new Error("No pricing data returned");
      }

      const result = data[0] as RawBookingTotal;
      logInfo(`Booking total calculated: $${result.total_due_now}`);

      return mapBookingTotal(result);
    } catch (error) {
      logError("calculateBookingTotal", error);
      throw error;
    }
  },

  /**
   * Calculate extension pricing
   * Calls calculate_extension_price database function
   */
  async calculateExtensionPrice(
    vehicleId: string,
    currentReturnDate: Date | string,
    newReturnDate: Date | string
  ): Promise<ExtensionPricing> {
    logInfo(`Calculating extension price for vehicle ${vehicleId}`);

    try {
      const { data, error } = await supabase.rpc("calculate_extension_price", {
        p_vehicle_id: vehicleId,
        p_current_return_date: formatDate(currentReturnDate),
        p_new_return_date: formatDate(newReturnDate),
      });

      if (error) {
        logError("calculateExtensionPrice", error);
        throw new Error(error.message || "Failed to calculate extension price");
      }

      if (!data || data.length === 0) {
        throw new Error("No pricing data returned");
      }

      const result = data[0] as RawExtensionPricing;
      logInfo(`Extension price calculated: $${result.rental_amount}`);

      return mapExtensionPricing(result);
    } catch (error) {
      logError("calculateExtensionPrice", error);
      throw error;
    }
  },

  /**
   * Get vehicle rates
   */
  async getVehicleRates(vehicleId: string): Promise<{
    dailyRate: number;
    weeklyRate: number;
    monthlyRate: number;
    semesterRate: number;
  }> {
    logInfo(`Getting rates for vehicle ${vehicleId}`);

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("daily_rate, weekly_rate, monthly_rate, semester_rate")
        .eq("id", vehicleId)
        .single();

      if (error) {
        logError("getVehicleRates", error);
        throw new Error("Failed to get vehicle rates");
      }

      if (!data) {
        throw new Error("Vehicle not found");
      }

      return {
        dailyRate: data.daily_rate || 0,
        weeklyRate: data.weekly_rate || 0,
        monthlyRate: data.monthly_rate || 0,
        semesterRate: data.semester_rate || 0,
      };
    } catch (error) {
      logError("getVehicleRates", error);
      throw error;
    }
  },
};
