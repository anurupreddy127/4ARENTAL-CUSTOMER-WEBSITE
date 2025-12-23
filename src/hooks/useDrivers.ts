import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as Sentry from "@sentry/react";
import { driverService } from "@/services/drivers/driverService";
import { PrimaryDriver, AdditionalDriver } from "@/types";

// ============================================
// TYPES
// ============================================
interface UseDriversResult {
  /** Primary driver information */
  primaryDriver: PrimaryDriver | null;
  /** List of additional drivers */
  additionalDrivers: AdditionalDriver[];
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch driver data */
  refetch: () => void;
  /** Whether any drivers exist */
  hasDrivers: boolean;
  /** Total number of drivers (primary + additional) */
  totalDrivers: number;
  /** Whether driver info is complete */
  isComplete: boolean;
}

interface UseDriversOptions {
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
}

// ============================================
// HOOK
// ============================================
/**
 * Hook for fetching and managing driver information for a booking
 * @param bookingId - The booking ID to fetch drivers for
 * @param options - Configuration options
 * @returns Driver data, loading state, error, and refetch function
 */
export function useDrivers(
  bookingId: string | undefined,
  options: UseDriversOptions = {}
): UseDriversResult {
  const { fetchOnMount = true } = options;

  // ============================================
  // STATE
  // ============================================
  const [primaryDriver, setPrimaryDriver] = useState<PrimaryDriver | null>(null);
  const [additionalDrivers, setAdditionalDrivers] = useState<AdditionalDriver[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  // Track component mount state
  const isMountedRef = useRef(true);
  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  // ============================================
  // FETCH FUNCTION
  // ============================================
  const fetchDrivers = useCallback(async (bId: string): Promise<void> => {
    const currentFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const { primary, additional } = await driverService.getAllDrivers(bId);

      // Only update state if fetch is still current and component is mounted
      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setPrimaryDriver(primary);
        setAdditionalDrivers(additional || []);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { category: "drivers", operation: "fetchDrivers" },
        extra: { bookingId: bId },
      });

      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        // Use error message from service if available
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load driver information. Please try again.";
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    if (bookingId && fetchOnMount) {
      fetchDrivers(bookingId);
    } else if (!bookingId) {
      // Reset state when bookingId is cleared
      setLoading(false);
      setPrimaryDriver(null);
      setAdditionalDrivers([]);
      setError(null);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [bookingId, fetchOnMount, fetchDrivers]);

  // ============================================
  // REFETCH HANDLER
  // ============================================
  const refetch = useCallback(() => {
    if (bookingId) {
      fetchDrivers(bookingId);
    }
  }, [bookingId, fetchDrivers]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const hasDrivers = useMemo(() => {
    return primaryDriver !== null || additionalDrivers.length > 0;
  }, [primaryDriver, additionalDrivers]);

  const totalDrivers = useMemo(() => {
    return (primaryDriver ? 1 : 0) + additionalDrivers.length;
  }, [primaryDriver, additionalDrivers]);

  const isComplete = useMemo(() => {
    return primaryDriver !== null && primaryDriver.isVerified;
  }, [primaryDriver]);

  // ============================================
  // MEMOIZED RETURN VALUE
  // ============================================
  return useMemo(
    () => ({
      primaryDriver,
      additionalDrivers,
      loading,
      error,
      refetch,
      hasDrivers,
      totalDrivers,
      isComplete,
    }),
    [
      primaryDriver,
      additionalDrivers,
      loading,
      error,
      refetch,
      hasDrivers,
      totalDrivers,
      isComplete,
    ]
  );
}