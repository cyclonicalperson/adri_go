export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReviewEntityType = 'OBJECT' | 'EVENT' | 'ROUTE';

export interface Review {
  reviewId: number;
  userId: number | null;
  objectId: number | null;
  eventId: number | null;
  routeId: number | null;
  rating: number;
  comment: string;
  createdAt: string;
  status: ReviewStatus;
  user?: { userId: number; fullName: string };
  entityName?: string;
  entityType?: ReviewEntityType;
}

export interface CreateReviewRequest {
  objectId?: number;
  eventId?: number;
  routeId?: number;
  rating: number;
  comment: string;
}

export interface UpdateReviewStatusRequest {
  status: ReviewStatus;
}
