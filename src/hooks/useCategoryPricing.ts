import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as Sentry from "@sentry/react";
import { vehicleService } from "@/services/vehicles/vehicleService";

// ============================================
// TYPES
// ============================================
interface UseCategoryPricingResult {
  /** Monthly pricing data by category */
  pricing: Record<string, number>;
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch pricing data */
  refetch: () => void;
}

// ============================================
// HOOK
// ============================================
export function useCategoryPricing(): UseCategoryPricingResult {
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const fetchPricing = useCallback(async (): Promise<void> => {
    const currentFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const data = await vehicleService.getCategoryPricing();

      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setPricing(data);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { category: "pricing", operation: "fetchCategoryPricing" },
      });

      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load pricing. Please try again.";
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPricing();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPricing]);

  const refetch = useCallback(() => {
    fetchPricing();
  }, [fetchPricing]);

  return useMemo(
    () => ({
      pricing,
      loading,
      error,
      refetch,
    }),
    [pricing, loading, error, refetch]
  );
}
