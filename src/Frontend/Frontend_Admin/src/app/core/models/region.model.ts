/**
 * region.model.ts
 *
 * Maps to DB `region` table.
 * Replaces the old `destination.model.ts` — the DB uses `region` not `destination`.
 *
 * API endpoint: /api/regions
 */

// Matches DB ENUM: region.type
export type RegionType =
  | 'city'
  | 'mountain'
  | 'lake'
  | 'national_park'
  | 'coast'
  | 'village'
  | 'other';

export interface Region {
  regionId: number;     // DB: region.id
  name: string;
  type: RegionType;
  description: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  coverImage: string | null;
  isActive: boolean;
  createdAt: string;
  // Computed (from v_region_popularity)
  numPosts?: number;
  totalViews?: number;
  totalLikes?: number;
  avgRating?: number | null;
}

export interface CreateRegionRequest {
  name: string;
  type: RegionType;
  description?: string;
  country?: string;
  lat?: number;
  lng?: number;
  coverImage?: string;
}

export interface UpdateRegionRequest extends Partial<CreateRegionRequest> {
  isActive?: boolean;
}

/** Maps RegionType to Serbian display label */
export const REGION_TYPE_LABELS: Record<RegionType, string> = {
  city: 'Grad',
  mountain: 'Planina',
  lake: 'Jezero',
  national_park: 'Nacionalni park',
  coast: 'Primorje',
  village: 'Selo',
  other: 'Ostalo',
};

/** Maps RegionType to emoji */
export const REGION_TYPE_ICONS: Record<RegionType, string> = {
  city: '🏙️',
  mountain: '🏔️',
  lake: '🏞️',
  national_park: '🌲',
  coast: '🏖️',
  village: '🏡',
  other: '📍',
};
