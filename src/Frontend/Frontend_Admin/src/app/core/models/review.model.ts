/**
 * review.model.ts
 *
 * Maps to DB `review` table (+ schema_changes.sql additions).
 * API endpoint: /api/reviews
 * DB view:      v_reviews_full
 */

// Matches new DB ENUM: review.status
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Computed by v_reviews_full view based on which foreign key is set
export type ReviewEntityType = 'OBJECT' | 'EVENT' | 'ROUTE';

export interface Review {
  reviewId: number;     // DB: review.id
  touristId: number | null;
  postId: number | null;    // DB: review.post_id (nullable after schema change)
  routeId: number | null;    // DB: review.route_id (new column)
  rating: number;           // 1-5
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  // Joined from v_reviews_full
  touristName?: string | null;
  /**
   * Backward kompatibilnost sa review-card komponentom.
   * API vraća user objekat, v_reviews_full vraća touristName string.
   * Oba su podržana.
   */
  user?: { userId: number | null; fullName: string } | null;
  entityType?: ReviewEntityType;
  entityName?: string | null;
  postType?: string | null;   // for distinguishing OBJECT vs EVENT
}

export interface CreateReviewRequest {
  postId?: number;
  routeId?: number;
  rating: number;
  comment?: string;
}

export interface UpdateReviewStatusRequest {
  status: ReviewStatus;
  rejectionReason?: string;
}
