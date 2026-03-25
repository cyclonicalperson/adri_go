export interface RecommendationPreviewItem {
  entityId: number;
  entityType: string;
  title: string;
  imageUrl?: string;
  subtitle?: string;
}

export interface CrossCategoryRecommendation {
  categoryKey: string;
  categoryLabel: string;
  destinationId: number;
  destinationName: string;
  city?: string;
  score: number;
  itemsCount: number;
  navigationUrl: string;
  previewItems: RecommendationPreviewItem[];
}