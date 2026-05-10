// HTTP feed service – calls the backend /api/recommendations endpoint.
// The Angular project imports this via @recommended path alias.

export interface RecommendationFeedItem {
  entityId: number;
  entityType: 'post' | 'route';
  title: string;
  postType: string;
  regionId?: number | null;
  regionName?: string | null;
  imageUrl?: string | null;
  score: number;
  reason: string;
  matchedTags: string[];
  avgRating?: number | null;
  reviewCount?: number | null;
  saveCount?: number | null;
  viewCount?: number | null;
}
