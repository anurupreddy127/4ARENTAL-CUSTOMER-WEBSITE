/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from "@/config/supabase";
import { Booking, RentalType } from "@/types";
import { toBusinessDateString } from "@/utils/dates";

// ============================================
// TYPES
// ============================================
export interface ExtensionEligibility {
  canExtend: boolean;
  reason?: string;
  maxExtensionDays: number;
  daysRemaining: number;
  extensionsUsed: number;
  maxExtensions: number;
}

export interface ExtensionPricing {
  additionalDays: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  pricingMethod: "daily" | "weekly" | "monthly";
  extensionAmount: number;
  newReturnDate: string;
  newTotalDays: number;
}

export interface ExtensionAvailability {
  available: boolean;
  conflictingBooking?: {
    pickupDate: string;
    returnDate: string;
  };
}

// ============================================
// CONSTANTS
// ============================================
const MAX_EXTENSIONS = 5;
const MIN_DAYS_REMAINING_TO_EXTEND = 5;
const MIN_EXTENSION_DAYS = 7;
const MAX_EXTENSION_DAYS = 90;

const isDev = import.meta.env.DEV;

// ============================================
// HELPER FUNCTIONS
// ============================================
function log(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[ExtensionService] ${message}`, data ?? "");
  }
}

function getDaysRemaining(returnDate: string): number {
  const now = new Date();
  const returnDateTime = new Date(returnDate);
  const diffTime = returnDateTime.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return toBusinessDateString(date);
}

function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate.split("T")[0]);
  const end = new Date(endDate.split("T")[0]);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// SERVICE
// ============================================
export const extensionService = {
  /**
   * Check if a booking is eligible for extension
   */
  checkEligibility(booking: Booking): ExtensionEligibility {
    const daysRemaining = getDaysRemaining(booking.returnDate);

    // Check rental type - only monthly can extend
    if (booking.rentalType === "weekly") {
      return {
        canExtend: false,
        reason:
          "Weekly rentals cannot be extended. Please create a new booking.",
        maxExtensionDays: 0,
        daysRemaining,
        extensionsUsed: booking.extensionCount,
        maxExtensions: MAX_EXTENSIONS,
      };
    }

    if (booking.rentalType === "semester") {
      return {
        canExtend: false,
        reason: "Semester rentals have fixed dates and cannot be extended.",
        maxExtensionDays: 0,
        daysRemaining,
        extensionsUsed: booking.extensionCount,
        maxExtensions: MAX_EXTENSIONS,
      };
    }

    // Check status - must be confirmed or active
    if (booking.status !== "confirmed" && booking.status !== "active") {
      return {
        canExtend: false,
        reason: `Booking must be confirmed or active to extend. Current status: ${booking.status}`,
        maxExtensionDays: 0,
        daysRemaining,
        extensionsUsed: booking.extensionCount,
        maxExtensions: MAX_EXTENSIONS,
      };
    }

    // Check extension limit
    if (booking.extensionCount >= MAX_EXTENSIONS) {
      return {
        canExtend: false,
        reason: `Maximum of ${MAX_EXTENSIONS} extensions reached. Please create a new booking.`,
        maxExtensionDays: 0,
        daysRemaining,
        extensionsUsed: booking.extensionCount,
        maxExtensions: MAX_EXTENSIONS,
      };
    }

    // Check days remaining
    if (daysRemaining < MIN_DAYS_REMAINING_TO_EXTEND) {
      return {
        canExtend: false,
        reason: `Extensions must be requested at least ${MIN_DAYS_REMAINING_TO_EXTEND} days before return date.`,
        maxExtensionDays: 0,
        daysRemaining,
        extensionsUsed: booking.extensionCount,
        maxExtensions: MAX_EXTENSIONS,
      };
    }

    return {
      canExtend: true,
      maxExtensionDays: MAX_EXTENSION_DAYS,
      daysRemaining,
      extensionsUsed: booking.extensionCount,
      maxExtensions: MAX_EXTENSIONS,
    };
  },

  /**
   * Check if vehicle is available for extension dates
   */
  async checkAvailability(
    vehicleId: string,
    currentReturnDate: string,
    newReturnDate: string,
    currentBookingId: string,
  ): Promise<ExtensionAvailability> {
    log("Checking availability", {
      vehicleId,
      currentReturnDate,
      newReturnDate,
    });

    try {
      // Find any bookings that overlap with the extension period
      const { data: conflictingBookings, error } = await supabase
        .from("bookings")
        .select("id, pickup_date, return_date")
        .eq("vehicle_id", vehicleId)
        .neq("id", currentBookingId) // Exclude current booking
        .in("status", ["confirmed", "active", "pending"])
        .lt("pickup_date", newReturnDate) // Booking starts before our new end
        .gt("return_date", currentReturnDate); // Booking ends after our current end

      if (error) {
        log("Error checking availability", error);
        throw new Error("Failed to check vehicle availability");
      }

      if (conflictingBookings && conflictingBookings.length > 0) {
        const conflict = conflictingBookings[0];
        return {
          available: false,
          conflictingBooking: {
            pickupDate: conflict.pickup_date,
            returnDate: conflict.return_date,
          },
        };
      }

      // Also check business calendar for blocked dates
      const { data: blockedDates, error: calendarError } = await supabase
        .from("business_calendar")
        .select("calendar_date, title, date_type")
        .gte("calendar_date", currentReturnDate.split("T")[0])
        .lte("calendar_date", newReturnDate.split("T")[0])
        .in("date_type", ["holiday", "closed", "maintenance"]);

      if (calendarError) {
        log("Error checking calendar", calendarError);
        // Don't fail - just continue without calendar check
      }

      // We don't block for holidays in the middle, only for return date
      const newReturnDateStr = newReturnDate.split("T")[0];
      const returnDateBlocked = blockedDates?.find(
        (d) => d.calendar_date === newReturnDateStr,
      );

      if (returnDateBlocked) {
        return {
          available: false,
          conflictingBooking: {
            pickupDate: returnDateBlocked.calendar_date,
            returnDate: returnDateBlocked.calendar_date,
          },
        };
      }

      return { available: true };
    } catch (err) {
      log("Availability check failed", err);
      throw err;
    }
  },

  /**
   * Calculate pricing for extension
   */
  calculateExtensionPricing(
    booking: Booking,
    newReturnDate: string,
  ): ExtensionPricing {
    const additionalDays = calculateDaysBetween(
      booking.returnDate,
      newReturnDate,
    );
    const newTotalDays = (booking.rentalDays || 0) + additionalDays;

    // Get rates from booking (frozen at booking time)
    const dailyRate = booking.dailyRate || 0;
    const weeklyRate = booking.weeklyRate || 0;
    const monthlyRate = booking.monthlyRate || 0;

    // Determine pricing method based on extension length
    let pricingMethod: "daily" | "weekly" | "monthly";
    let extensionAmount: number;

    if (additionalDays >= 30) {
      // Monthly rate
      const fullMonths = Math.floor(additionalDays / 30);
      const remainingDays = additionalDays % 30;
      const remainingWeeks = Math.floor(remainingDays / 7);
      const extraDays = remainingDays % 7;

      extensionAmount =
        fullMonths * monthlyRate +
        remainingWeeks * weeklyRate +
        extraDays * dailyRate;
      pricingMethod = "monthly";
    } else if (additionalDays >= 7) {
      // Weekly rate
      const fullWeeks = Math.floor(additionalDays / 7);
      const extraDays = additionalDays % 7;

      extensionAmount = fullWeeks * weeklyRate + extraDays * dailyRate;
      pricingMethod = "weekly";
    } else {
      // Daily rate
      extensionAmount = additionalDays * dailyRate;
      pricingMethod = "daily";
    }

    return {
      additionalDays,
      dailyRate,
      weeklyRate,
      monthlyRate,
      pricingMethod,
      extensionAmount: Math.round(extensionAmount * 100) / 100,
      newReturnDate,
      newTotalDays,
    };
  },

  /**
   * Get minimum and maximum extension dates
   */
  getExtensionDateLimits(booking: Booking): {
    minDate: string;
    maxDate: string;
  } {
    const currentReturn = new Date(booking.returnDate);

    // Minimum: current return + 7 days
    const minDate = new Date(currentReturn);
    minDate.setDate(minDate.getDate() + MIN_EXTENSION_DAYS);

    // Maximum: current return + 90 days
    const maxDate = new Date(currentReturn);
    maxDate.setDate(maxDate.getDate() + MAX_EXTENSION_DAYS);

    return {
      minDate: toBusinessDateString(minDate),
      maxDate: toBusinessDateString(maxDate),
    };
  },
};

export default extensionService;
