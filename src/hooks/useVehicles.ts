import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as Sentry from "@sentry/react";
import { vehicleService } from "@/services/vehicles/vehicleService";
import { Vehicle } from "@/types";

// ============================================
// TYPES
// ============================================
interface UseVehiclesResult {
  /** List of vehicles */
  vehicles: Vehicle[];
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch vehicles */
  refetch: () => void;
  /** Whether vehicles exist */
  hasVehicles: boolean;
  /** Total number of vehicles */
  totalCount: number;
}

interface UseVehiclesOptions {
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const ALL_CATEGORIES = "all";

// ============================================
// HOOK
// ============================================
/**
 * Hook for fetching and managing vehicle listings
 * @param category - Optional category filter ("all" or undefined for no filter)
 * @param options - Configuration options
 * @returns Vehicle data, loading state, error, and refetch function
 */
export function useVehicles(
  category?: string,
  options: UseVehiclesOptions = {}
): UseVehiclesResult {
  const { fetchOnMount = true } = options;

  // ============================================
  // STATE
  // ============================================
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  // Track component mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  // ============================================
  // NORMALIZED CATEGORY
  // ============================================
  const normalizedCategory = useMemo(() => {
    if (!category || category === ALL_CATEGORIES) {
      return undefined;
    }
    return category;
  }, [category]);

  // ============================================
  // FETCH FUNCTION
  // ============================================
  const fetchVehicles = useCallback(async (): Promise<void> => {
    // Increment fetch ID to track current fetch
    const currentFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      // Use appropriate service method based on category
      const fetchedVehicles = normalizedCategory
        ? await vehicleService.getVehiclesByCategory(normalizedCategory)
        : await vehicleService.getAllVehicles();

      // Only update state if this fetch is still current and component is mounted
      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setVehicles(fetchedVehicles);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { category: "vehicles", operation: "fetchVehicles" },
        extra: { filterCategory: normalizedCategory },
      });

      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        // Use error message from service if available
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load vehicles. Please try again.";
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [normalizedCategory]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    if (fetchOnMount) {
      fetchVehicles();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOnMount, fetchVehicles]);

  // ============================================
  // REFETCH HANDLER
  // ============================================
  const refetch = useCallback(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const hasVehicles = useMemo(() => vehicles.length > 0, [vehicles]);
  const totalCount = useMemo(() => vehicles.length, [vehicles]);

  // ============================================
  // MEMOIZED RETURN VALUE
  // ============================================
  return useMemo(
    () => ({
      vehicles,
      loading,
      error,
      refetch,
      hasVehicles,
      totalCount,
    }),
    [vehicles, loading, error, refetch, hasVehicles, totalCount]
  );
}