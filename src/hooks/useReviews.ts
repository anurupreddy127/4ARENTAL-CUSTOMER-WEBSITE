import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as Sentry from "@sentry/react";
import { reviewService } from "@/services/reviews/reviewService";
import { Review, ReviewStats } from "@/types";

// ============================================
// TYPES
// ============================================

interface UseReviewsOptions {
  vehicleId: string | null;
  limit?: number;
  enabled?: boolean;
}

interface UseReviewsResult {
  reviews: Review[];
  stats: ReviewStats | null;
  loading: boolean;
  error: string | null;
  hasReviews: boolean;
  refetch: () => void;
}

// ============================================
// HOOK
// ============================================

export function useReviews(options: UseReviewsOptions): UseReviewsResult {
  const { vehicleId, limit = 10, enabled = true } = options;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const fetchReviews = useCallback(async (): Promise<void> => {
    if (!vehicleId) {
      setReviews([]);
      setStats(null);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const [reviewsData, statsData] = await Promise.all([
        reviewService.getVehicleReviews(vehicleId, limit),
        reviewService.getVehicleReviewStats(vehicleId),
      ]);

      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setReviews(reviewsData);
        setStats(statsData);
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { category: "reviews", operation: "fetchReviews" },
        extra: { vehicleId },
      });

      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load reviews";
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current && fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [vehicleId, limit]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && vehicleId) {
      fetchReviews();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, vehicleId, fetchReviews]);

  const refetch = useCallback(() => {
    fetchReviews();
  }, [fetchReviews]);

  const hasReviews = useMemo(() => reviews.length > 0, [reviews]);

  return useMemo(
    () => ({
      reviews,
      stats,
      loading,
      error,
      hasReviews,
      refetch,
    }),
    [reviews, stats, loading, error, hasReviews, refetch]
  );
}
