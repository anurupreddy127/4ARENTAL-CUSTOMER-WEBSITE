/* eslint-disable @typescript-eslint/no-unused-vars */
// hooks/usePricing.ts
/**
 * React hooks for pricing calculations
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { pricingService } from "@/services/pricing/pricingService";
import { useBookingConfig } from "@/hooks/useConfig";
import type {
  PricingResult,
  BookingTotal,
  ExtensionPricing,
  PricingBreakdown,
  PricingBreakdownLine,
  RentalType,
} from "@/types";

// ============================================
// TYPES
// ============================================

interface UsePricingOptions {
  vehicleId: string | null;
  pickupDate: Date | string | null;
  returnDate: Date | string | null;
  isStudent?: boolean;
  deliveryFee?: number;
  additionalDrivers?: number;
  enabled?: boolean; // Set to false to disable auto-fetching
}

interface UsePricingReturn {
  pricing: BookingTotal | null;
  breakdown: PricingBreakdown | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseExtensionPricingOptions {
  vehicleId: string | null;
  currentReturnDate: Date | string | null;
  newReturnDate: Date | string | null;
  enabled?: boolean;
}

interface UseExtensionPricingReturn {
  pricing: ExtensionPricing | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate pricing breakdown lines for display
 */
function generateBreakdown(pricing: BookingTotal): PricingBreakdown {
  const lines: PricingBreakdownLine[] = [];

  // Rental amount with description
  let rentalDescription = "";
  if (pricing.pricingMethod === "weekly") {
    rentalDescription = `${pricing.rentalDays} days at weekly rate`;
  } else if (pricing.pricingMethod === "monthly") {
    rentalDescription = `${pricing.rentalDays} days at monthly rate`;
  } else if (pricing.pricingMethod === "semester") {
    rentalDescription = "Semester rate (student)";
  }

  lines.push({
    label: "Rental",
    description: rentalDescription,
    amount: pricing.rentalAmount,
  });

  // Delivery fee (if any)
  if (pricing.deliveryFee > 0) {
    lines.push({
      label: "Delivery Fee",
      amount: pricing.deliveryFee,
    });
  }

  // Additional driver fee (if any)
  if (pricing.additionalDriverFee > 0) {
    const driverCount = pricing.additionalDriverFee / 50; // $50 per driver from config
    lines.push({
      label: "Additional Drivers",
      description: `${driverCount} driver${driverCount > 1 ? "s" : ""} × $50`,
      amount: pricing.additionalDriverFee,
    });
  }

  // Subtotal
  lines.push({
    label: "Subtotal",
    amount: pricing.subtotal,
    isSubtotal: true,
  });

  // Security deposit
  lines.push({
    label: "Security Deposit",
    description:
      pricing.rentalType === "weekly" ? "Refundable" : "1 month (refundable)",
    amount: pricing.securityDeposit,
    isDeposit: true,
  });

  // Total due now
  lines.push({
    label: "Total Due Now",
    amount: pricing.totalDueNow,
    isTotal: true,
  });

  return {
    lines,
    rentalType: pricing.rentalType,
    pricingMethod: pricing.pricingMethod,
    totalDueNow: pricing.totalDueNow,
  };
}

/**
 * Calculate rental days between two dates
 */
export function calculateRentalDays(
  pickupDate: Date | string,
  returnDate: Date | string
): number {
  const pickup =
    typeof pickupDate === "string" ? new Date(pickupDate) : pickupDate;
  const returnD =
    typeof returnDate === "string" ? new Date(returnDate) : returnDate;

  const diffTime = returnD.getTime() - pickup.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Determine rental type based on days
 */
export function determineRentalType(
  days: number,
  isStudent: boolean,
  monthlyThreshold: number = 30
): RentalType {
  if (isStudent) return "semester";
  if (days >= monthlyThreshold) return "monthly";
  return "weekly";
}

// ============================================
// MAIN PRICING HOOK
// ============================================

export function usePricing(options: UsePricingOptions): UsePricingReturn {
  const {
    vehicleId,
    pickupDate,
    returnDate,
    isStudent = false,
    deliveryFee = 0,
    additionalDrivers = 0,
    enabled = true,
  } = options;

  const [pricing, setPricing] = useState<BookingTotal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have all required inputs
  const hasRequiredInputs = Boolean(vehicleId && pickupDate && returnDate);

  // Fetch pricing
  const fetchPricing = useCallback(async () => {
    if (!vehicleId || !pickupDate || !returnDate) {
      setPricing(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await pricingService.calculateBookingTotal(
        vehicleId,
        pickupDate,
        returnDate,
        isStudent,
        deliveryFee,
        additionalDrivers
      );

      setPricing(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to calculate price";
      setError(message);
      setPricing(null);
      console.error("[usePricing] Error:", message);
    } finally {
      setLoading(false);
    }
  }, [
    vehicleId,
    pickupDate,
    returnDate,
    isStudent,
    deliveryFee,
    additionalDrivers,
  ]);

  // Auto-fetch when inputs change
  useEffect(() => {
    if (enabled && hasRequiredInputs) {
      fetchPricing();
    } else if (!hasRequiredInputs) {
      setPricing(null);
      setError(null);
    }
  }, [enabled, hasRequiredInputs, fetchPricing]);

  // Generate breakdown
  const breakdown = useMemo(() => {
    if (!pricing) return null;
    return generateBreakdown(pricing);
  }, [pricing]);

  return {
    pricing,
    breakdown,
    loading,
    error,
    refetch: fetchPricing,
  };
}

// ============================================
// EXTENSION PRICING HOOK
// ============================================

export function useExtensionPricing(
  options: UseExtensionPricingOptions
): UseExtensionPricingReturn {
  const {
    vehicleId,
    currentReturnDate,
    newReturnDate,
    enabled = true,
  } = options;

  const [pricing, setPricing] = useState<ExtensionPricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRequiredInputs = Boolean(
    vehicleId && currentReturnDate && newReturnDate
  );

  const fetchPricing = useCallback(async () => {
    if (!vehicleId || !currentReturnDate || !newReturnDate) {
      setPricing(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await pricingService.calculateExtensionPrice(
        vehicleId,
        currentReturnDate,
        newReturnDate
      );

      setPricing(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to calculate extension price";
      setError(message);
      setPricing(null);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, currentReturnDate, newReturnDate]);

  useEffect(() => {
    if (enabled && hasRequiredInputs) {
      fetchPricing();
    } else if (!hasRequiredInputs) {
      setPricing(null);
      setError(null);
    }
  }, [enabled, hasRequiredInputs, fetchPricing]);

  return {
    pricing,
    loading,
    error,
    refetch: fetchPricing,
  };
}

// ============================================
// VEHICLE RATES HOOK
// ============================================

interface UseVehicleRatesReturn {
  rates: {
    dailyRate: number;
    weeklyRate: number;
    monthlyRate: number;
    semesterRate: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVehicleRates(
  vehicleId: string | null
): UseVehicleRatesReturn {
  const [rates, setRates] = useState<UseVehicleRatesReturn["rates"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    if (!vehicleId) {
      setRates(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await pricingService.getVehicleRates(vehicleId);
      setRates(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get vehicle rates";
      setError(message);
      setRates(null);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    rates,
    loading,
    error,
    refetch: fetchRates,
  };
}

// ============================================
// DATE VALIDATION HOOK
// ============================================

interface UseDateValidationOptions {
  pickupDate: Date | string | null;
  returnDate: Date | string | null;
}

interface UseDateValidationReturn {
  isValid: boolean;
  errors: string[];
  rentalDays: number;
  rentalType: RentalType | null;
}

export function useDateValidation(
  options: UseDateValidationOptions
): UseDateValidationReturn {
  const { pickupDate, returnDate } = options;
  const {
    minRentalDays,
    minLeadTimeHours,
    maxAdvanceDays,
    monthlyThresholdDays,
    loading,
  } = useBookingConfig();

  return useMemo(() => {
    const errors: string[] = [];

    if (!pickupDate || !returnDate) {
      return {
        isValid: false,
        errors: [],
        rentalDays: 0,
        rentalType: null,
      };
    }

    if (loading) {
      return {
        isValid: false,
        errors: [],
        rentalDays: 0,
        rentalType: null,
      };
    }

    const pickup =
      typeof pickupDate === "string" ? new Date(pickupDate) : pickupDate;
    const returnD =
      typeof returnDate === "string" ? new Date(returnDate) : returnDate;
    const now = new Date();

    // Calculate rental days
    const rentalDays = calculateRentalDays(pickup, returnD);

    // Validate minimum rental days
    if (rentalDays < minRentalDays) {
      errors.push(`Minimum rental duration is ${minRentalDays} days`);
    }

    // Validate pickup is in the future
    const hoursUntilPickup =
      (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilPickup < minLeadTimeHours) {
      errors.push(`Pickup must be at least ${minLeadTimeHours} hours from now`);
    }

    // Validate max advance booking
    const daysUntilPickup = hoursUntilPickup / 24;
    if (daysUntilPickup > maxAdvanceDays) {
      errors.push(`Cannot book more than ${maxAdvanceDays} days in advance`);
    }

    // Validate return is after pickup
    if (returnD <= pickup) {
      errors.push("Return date must be after pickup date");
    }

    // Determine rental type
    const rentalType =
      rentalDays >= monthlyThresholdDays ? "monthly" : "weekly";

    return {
      isValid: errors.length === 0,
      errors,
      rentalDays,
      rentalType,
    };
  }, [
    pickupDate,
    returnDate,
    minRentalDays,
    minLeadTimeHours,
    maxAdvanceDays,
    monthlyThresholdDays,
    loading,
  ]);
}

export default usePricing;
