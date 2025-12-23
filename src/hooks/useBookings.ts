// hooks/useBookings.ts (Enhanced logging, No Rate Limiting)
import { useState, useEffect, useCallback } from "react";
import { bookingService } from "@/services/bookings/bookingService";
import { useAuth } from "@/hooks/useAuth";
import type { Booking } from "@/types";

interface UseBookingsReturn {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage current user's bookings
 */
export function useBookings(): UseBookingsReturn {
  const { currentUser, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    // Wait for auth to be ready
    if (authLoading) {
      console.log("[useBookings] Auth still loading, waiting...");
      return;
    }

    // Check if user is authenticated
    if (!currentUser) {
      console.log("[useBookings] User not authenticated, clearing bookings");
      setBookings([]);
      setLoading(false);
      setError(null);
      return;
    }

    console.log("[useBookings] Fetching bookings for user:", currentUser.id);
    setLoading(true);
    setError(null);

    try {
      console.log("[useBookings] Calling bookingService.getMyBookings()...");
      const fetchedBookings = await bookingService.getMyBookings();

      console.log(
        "[useBookings] Bookings fetched successfully:",
        fetchedBookings.length
      );
      setBookings(fetchedBookings);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load bookings";
      console.error("[useBookings] Error fetching bookings:", errorMessage);
      setError(errorMessage);
      setBookings([]);
    } finally {
      console.log("[useBookings] Fetch complete, setting loading to false");
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  // Fetch bookings when auth state changes
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      // Wait for auth to be ready
      if (authLoading) {
        console.log("[useBookings] useEffect: Auth still loading...");
        return;
      }

      if (cancelled) {
        console.log("[useBookings] useEffect: Cancelled, skipping fetch");
        return;
      }

      await fetchBookings();
    };

    doFetch();

    return () => {
      cancelled = true;
      console.log("[useBookings] useEffect cleanup: Cancelled");
    };
  }, [fetchBookings, authLoading]);

  const refetch = useCallback(async () => {
    console.log("[useBookings] Manual refetch triggered");
    await fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading: loading || authLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch a single booking by ID
 */
export function useBooking(bookingId: string | undefined): {
  booking: Booking | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { currentUser, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    if (!currentUser) {
      setBooking(null);
      setLoading(false);
      setError("Please log in to view booking details");
      return;
    }

    console.log("[useBooking] Fetching booking:", bookingId);
    setLoading(true);
    setError(null);

    try {
      const fetchedBooking = await bookingService.getBooking(bookingId);

      if (!fetchedBooking) {
        setError("Booking not found");
        setBooking(null);
      } else {
        console.log("[useBooking] Booking fetched successfully");
        setBooking(fetchedBooking);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load booking";
      console.error("[useBooking] Error:", errorMessage);
      setError(errorMessage);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [authLoading, bookingId, currentUser]);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      if (authLoading) return;
      if (cancelled) return;
      await fetchBooking();
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchBooking, authLoading]);

  const refetch = useCallback(async () => {
    await fetchBooking();
  }, [fetchBooking]);

  return {
    booking,
    loading: loading || authLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get booking statistics for current user
 */
export function useBookingStats(): {
  stats: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { currentUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (authLoading) return;

    if (!currentUser) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedStats = await bookingService.getMyBookingStats();
      setStats(fetchedStats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load statistics";
      console.error("[useBookingStats] Error:", errorMessage);
      setError(errorMessage);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      if (authLoading) return;
      if (cancelled) return;
      await fetchStats();
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchStats, authLoading]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading: loading || authLoading,
    error,
    refetch,
  };
}

export default useBookings;
