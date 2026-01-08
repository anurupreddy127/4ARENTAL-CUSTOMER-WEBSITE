import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/config/supabase";

// ============================================
// TYPES
// ============================================
interface BlockedDate {
  date: string; // YYYY-MM-DD format
  reason: string;
  type: "holiday" | "maintenance" | "booking" | "closed" | "other";
}

interface UseAvailabilityOptions {
  vehicleId: string | null;
  enabled?: boolean;
}

interface UseAvailabilityReturn {
  blockedDates: BlockedDate[];
  loading: boolean;
  error: string | null;
  isDateBlocked: (date: Date | string) => boolean;
  getBlockedReason: (date: Date | string) => string | null;
  refetch: () => Promise<void>;
}

// Matches actual business_calendar schema
interface BusinessCalendarRow {
  id: string;
  calendar_date: string;
  date_type: string; // 'holiday', 'closed', 'special_hours', etc.
  title: string | null;
  description: string | null;
  customer_note: string | null;
  open_time: string | null;
  close_time: string | null;
  delivery_available: boolean;
}

interface BookingRow {
  pickup_date: string;
  return_date: string;
  status: string;
}

// ============================================
// CONSTANTS
// ============================================
const isDev = import.meta.env.DEV;

// How many months ahead to fetch
const MONTHS_AHEAD = 6;

// Date types that indicate business is closed
const CLOSED_DATE_TYPES = ["holiday", "closed", "maintenance"];

// ============================================
// HELPER FUNCTIONS
// ============================================
function log(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[useAvailability] ${message}`, data ?? "");
  }
}

/**
 * Convert date to YYYY-MM-DD string (using LOCAL timezone, not UTC)
 */
function toDateString(date: Date | string): string {
  if (typeof date === "string") {
    // If it's a datetime-local string like "2026-01-20T10:00", extract just the date
    return date.split("T")[0];
  }

  // Use local date methods to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get all dates between two dates (inclusive) - timezone safe
 */
function getDatesBetween(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];

  // Create new dates using local components to avoid timezone issues
  const current = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  while (current <= end) {
    dates.push(toDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get date range for fetching (today to X months ahead)
 */
function getDateRange(): { startDate: string; endDate: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setMonth(end.getMonth() + MONTHS_AHEAD);

  return {
    startDate: toDateString(start),
    endDate: toDateString(end),
  };
}

/**
 * Check if a calendar entry indicates the business is closed
 */
function isBusinessClosed(row: BusinessCalendarRow): boolean {
  // Check if date_type indicates closed
  if (CLOSED_DATE_TYPES.includes(row.date_type?.toLowerCase())) {
    return true;
  }

  // If no open_time is set, business is closed
  if (row.open_time === null && row.date_type) {
    return true;
  }

  return false;
}

/**
 * Get display reason for blocked date
 */
function getBlockedReason(row: BusinessCalendarRow): string {
  if (row.customer_note) {
    return row.customer_note;
  }
  if (row.title) {
    return row.title;
  }
  if (row.date_type === "holiday") {
    return "Holiday - Business Closed";
  }
  if (row.date_type === "maintenance") {
    return "Maintenance Day";
  }
  return "Business Closed";
}

// ============================================
// HOOK
// ============================================
export function useAvailability(
  options: UseAvailabilityOptions
): UseAvailabilityReturn {
  const { vehicleId, enabled = true } = options;

  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch blocked dates
  const fetchBlockedDates = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();
      const allBlockedDates: BlockedDate[] = [];

      log("Fetching availability", { vehicleId, startDate, endDate });

      // 1. Fetch closed dates from business_calendar
      try {
        const { data: calendarDates, error: calendarError } = await supabase
          .from("business_calendar")
          .select(
            "id, calendar_date, date_type, title, description, customer_note, open_time, close_time, delivery_available"
          )
          .gte("calendar_date", startDate)
          .lte("calendar_date", endDate);

        if (calendarError) {
          log("Error fetching business calendar", calendarError);
          // Continue without calendar data - don't block the booking flow
        } else if (calendarDates && calendarDates.length > 0) {
          calendarDates.forEach((row: BusinessCalendarRow) => {
            if (isBusinessClosed(row)) {
              allBlockedDates.push({
                date: row.calendar_date,
                reason: getBlockedReason(row),
                type:
                  row.date_type === "holiday"
                    ? "holiday"
                    : row.date_type === "maintenance"
                    ? "maintenance"
                    : "closed",
              });
            }
          });
          log(
            `Found ${allBlockedDates.length} closed dates from business calendar`
          );
        }
      } catch (err) {
        log("business_calendar query failed, continuing without it", err);
      }

      // 2. Fetch existing bookings for this vehicle
      if (vehicleId) {
        try {
          const { data: bookings, error: bookingError } = await supabase
            .from("bookings")
            .select("pickup_date, return_date, status")
            .eq("vehicle_id", vehicleId)
            .in("status", ["confirmed", "active", "pending"])
            .gte("return_date", startDate)
            .lte("pickup_date", endDate);

          if (bookingError) {
            log("Error fetching bookings", bookingError);
            // Continue without bookings - don't block the booking flow
          } else if (bookings && bookings.length > 0) {
            bookings.forEach((booking: BookingRow) => {
              const pickupDate = new Date(booking.pickup_date);
              const returnDate = new Date(booking.return_date);

              // Get all dates in the booking range
              const bookedDates = getDatesBetween(pickupDate, returnDate);

              bookedDates.forEach((date) => {
                // Check if date already blocked
                if (!allBlockedDates.some((b) => b.date === date)) {
                  allBlockedDates.push({
                    date,
                    reason: "Vehicle already booked",
                    type: "booking",
                  });
                }
              });
            });
            log(`Found ${bookings.length} existing bookings`);
          }
        } catch (err) {
          log("bookings query failed, continuing without it", err);
        }
      }

      setBlockedDates(allBlockedDates);
      log(`Total blocked dates: ${allBlockedDates.length}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check availability";
      setError(message);
      log("Error in fetchBlockedDates", err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchBlockedDates();
  }, [fetchBlockedDates]);

  // Create a Set for O(1) lookup
  const blockedDateSet = useMemo(() => {
    return new Set(blockedDates.map((b) => b.date));
  }, [blockedDates]);

  // Create a Map for reason lookup
  const blockedDateMap = useMemo(() => {
    return new Map(blockedDates.map((b) => [b.date, b]));
  }, [blockedDates]);

  /**
   * Check if a specific date is blocked
   */
  const isDateBlocked = useCallback(
    (date: Date | string): boolean => {
      const dateStr = toDateString(date);
      return blockedDateSet.has(dateStr);
    },
    [blockedDateSet]
  );

  /**
   * Get the reason why a date is blocked
   */
  const getBlockedReasonFn = useCallback(
    (date: Date | string): string | null => {
      const dateStr = toDateString(date);
      const blocked = blockedDateMap.get(dateStr);
      return blocked?.reason || null;
    },
    [blockedDateMap]
  );

  return {
    blockedDates,
    loading,
    error,
    isDateBlocked,
    getBlockedReason: getBlockedReasonFn,
    refetch: fetchBlockedDates,
  };
}

export default useAvailability;
