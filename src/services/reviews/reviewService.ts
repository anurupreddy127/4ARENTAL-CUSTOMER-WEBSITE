// services/reviews/reviewService.ts (With Redis Caching)
import { supabase } from "@/config/supabase";
import { cachedApi } from "@/config/api";
import { Review, ReviewStats, CreateReviewInput } from "@/types";
import * as Sentry from "@sentry/react";

// ============================================
// HELPER FUNCTIONS
// ============================================

function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[reviewService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "reviewService", context },
    });
  }
}

function mapReviewFromDB(data: Record<string, unknown>): Review {
  return {
    id: data.id as string,
    vehicleId: (data.vehicle_id ?? data.vehicleId) as string,
    userId: (data.user_id ?? data.userId) as string,
    reservationId: (data.reservation_id ?? data.reservationId) as string | null,
    rating: data.rating as number,
    comment: data.comment as string | null,
    reviewerName: (data.reviewer_name ?? data.reviewerName) as string,
    isVerified: (data.is_verified ?? data.isVerified) as boolean,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

// ============================================
// SERVICE (WITH REDIS CACHING)
// ============================================

export const reviewService = {
  /**
   * Get reviews for a vehicle
   * ✅ CACHED (5 min TTL)
   */
  async getVehicleReviews(
    vehicleId: string,
    limit: number = 10,
  ): Promise<Review[]> {
    try {
      const data = await cachedApi.vehicles.reviews(vehicleId, limit, 0);

      if (!data || data.length === 0) {
        return [];
      }

      return (data as Record<string, unknown>[]).map(mapReviewFromDB);
    } catch (error) {
      logError("getVehicleReviews", error);
      throw new Error("Failed to load reviews");
    }
  },

  /**
   * Get review statistics for a vehicle
   * ✅ CACHED (5 min TTL) - Uses vehicle's cached average_rating and review_count
   */
  async getVehicleReviewStats(vehicleId: string): Promise<ReviewStats> {
    try {
      const stats = await cachedApi.vehicles.reviewStats(vehicleId);

      if (!stats) {
        return {
          averageRating: null,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
      }

      // For rating distribution, we need to fetch actual reviews
      // This is computed from the cached reviews
      const reviews = await cachedApi.vehicles.reviews(vehicleId, 100, 0);

      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      if (reviews && reviews.length > 0) {
        (reviews as Record<string, unknown>[]).forEach((r) => {
          const rating = r.rating as 1 | 2 | 3 | 4 | 5;
          if (rating >= 1 && rating <= 5) {
            ratingDistribution[rating]++;
          }
        });
      }

      return {
        averageRating: stats.averageRating,
        totalReviews: stats.reviewCount,
        ratingDistribution,
      };
    } catch (error) {
      logError("getVehicleReviewStats", error);
      throw new Error("Failed to load review stats");
    }
  },

  /**
   * Create a new review
   * ❌ NOT CACHED - Write operation
   */
  async createReview(
    userId: string,
    input: CreateReviewInput,
  ): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          vehicle_id: input.vehicleId,
          user_id: userId,
          reservation_id: input.reservationId || null,
          rating: input.rating,
          comment: input.comment || null,
          reviewer_name: input.reviewerName,
          is_verified: Boolean(input.reservationId),
        })
        .select()
        .single();

      if (error) {
        logError("createReview", error);
        throw new Error("Failed to create review");
      }

      // Note: Cache will be invalidated via webhook or TTL expiration
      return mapReviewFromDB(data);
    } catch (error) {
      logError("createReview", error);
      throw error;
    }
  },

  /**
   * Check if user can review a vehicle (has completed rental)
   * ❌ NOT CACHED - User-specific, must be real-time
   */
  async canUserReview(
    userId: string,
    vehicleId: string,
  ): Promise<{ canReview: boolean; reservationId?: string }> {
    try {
      // Check if user has already reviewed this vehicle
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId)
        .single();

      if (existingReview) {
        return { canReview: false };
      }

      // Check if user has a completed reservation for this vehicle
      const { data: reservation } = await supabase
        .from("reservations")
        .select("id")
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        canReview: true,
        reservationId: reservation?.id,
      };
    } catch {
      // If no reservation found, user can still leave unverified review
      return { canReview: true };
    }
  },
};
