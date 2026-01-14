/**
 * Review-related type definitions
 */

export interface Review {
  id: string;
  vehicleId: string;
  userId: string;
  reservationId?: string | null;
  rating: number;
  comment?: string | null;
  reviewerName: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStats {
  averageRating: number | null;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CreateReviewInput {
  vehicleId: string;
  reservationId?: string;
  rating: number;
  comment?: string;
  reviewerName: string;
}
