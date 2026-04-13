import { Review, ReviewStats, CreateReviewInput } from "@/types";

export const reviewService = {
  async getVehicleReviews(
    _vehicleId: string,
    _limit: number = 10,
  ): Promise<Review[]> {
    return [];
  },

  async getVehicleReviewStats(_vehicleId: string): Promise<ReviewStats> {
    return {
      averageRating: null,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  },

  async createReview(
    _userId: string,
    _input: CreateReviewInput,
  ): Promise<Review> {
    throw new Error("Reviews are not configured.");
  },

  async canUserReview(
    _userId: string,
    _vehicleId: string,
  ): Promise<{ canReview: boolean; reservationId?: string }> {
    return { canReview: false };
  },
};
