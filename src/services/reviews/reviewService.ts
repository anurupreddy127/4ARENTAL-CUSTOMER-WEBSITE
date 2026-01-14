/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from "@/config/supabase";
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
    vehicleId: data.vehicle_id as string,
    userId: data.user_id as string,
    reservationId: data.reservation_id as string | null,
    rating: data.rating as number,
    comment: data.comment as string | null,
    reviewerName: data.reviewer_name as string,
    isVerified: data.is_verified as boolean,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

// ============================================
// SERVICE
// ============================================

export const reviewService = {
  /**
   * Get reviews for a vehicle
   */
  async getVehicleReviews(
    vehicleId: string,
    limit: number = 10
  ): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        logError("getVehicleReviews", error);
        throw new Error("Failed to load reviews");
      }

      return (data || []).map(mapReviewFromDB);
    } catch (error) {
      logError("getVehicleReviews", error);
      throw error;
    }
  },

  /**
   * Get review statistics for a vehicle
   */
  async getVehicleReviewStats(vehicleId: string): Promise<ReviewStats> {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("vehicle_id", vehicleId);

      if (error) {
        logError("getVehicleReviewStats", error);
        throw new Error("Failed to load review stats");
      }

      const reviews = data || [];
      const totalReviews = reviews.length;

      if (totalReviews === 0) {
        return {
          averageRating: null,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
      }

      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = Math.round((sum / totalReviews) * 10) / 10;

      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach((r) => {
        const rating = r.rating as 1 | 2 | 3 | 4 | 5;
        ratingDistribution[rating]++;
      });

      return {
        averageRating,
        totalReviews,
        ratingDistribution,
      };
    } catch (error) {
      logError("getVehicleReviewStats", error);
      throw error;
    }
  },

  /**
   * Create a new review
   */
  async createReview(
    userId: string,
    input: CreateReviewInput
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

      return mapReviewFromDB(data);
    } catch (error) {
      logError("createReview", error);
      throw error;
    }
  },

  /**
   * Check if user can review a vehicle (has completed rental)
   */
  async canUserReview(
    userId: string,
    vehicleId: string
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
    } catch (error) {
      // If no reservation found, user can still leave unverified review
      return { canReview: true };
    }
  },
};
