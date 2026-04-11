/**
 * post.model.ts
 *
 * Centralni model za sve objave (post tabela).
 * Zamjenjuje stare modele: TouristObject, TouristEvent, Destination.
 * API endpoint: /api/posts
 * DB view: v_posts_full
 */

export type PostType =
  | 'accommodation'
  | 'restaurant'
  | 'club'
  | 'cultural_site'
  | 'monument'
  | 'sports_facility'
  | 'event'
  | 'attraction'
  | 'shop'
  | 'other';

export type PostStatus = 'draft' | 'published' | 'archived';

export interface PostRegion {
  regionId: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  country: string;
}

export interface Post {
  postId: number;
  adminId: number;
  adminName?: string;
  adminRole?: string;
  adminOrganizationId?: number | null;
  regionId: number | null;
  region?: PostRegion | null;
  title: string;
  postType: PostType;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  externalUrl: string | null;
  externalUrlLabel: string | null;
  images: string[] | null;
  openingHours: Record<string, string> | null;
  details: Record<string, any> | null;
  status: PostStatus;
  viewCount: number;
  likeCount: number;
  saveCount: number;
  reviewCount: number;
  avgRating: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  adminId?: number;
  regionId?: number | null;
  title: string;
  postType: PostType;
  description?: string;
  lat?: number | null;
  lng?: number | null;
  address?: string;
  externalUrl?: string;
  externalUrlLabel?: string;
  images?: string[];
  openingHours?: Record<string, string>;
  details?: Record<string, any>;
  status?: PostStatus;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  status?: PostStatus;
}

/** Srpski nazivi za tipove objava */
export const POST_TYPE_LABELS: Record<PostType, string> = {
  accommodation: 'Smještaj',
  restaurant: 'Restoran',
  club: 'Klub',
  cultural_site: 'Kulturni objekat',
  monument: 'Spomenik',
  sports_facility: 'Sportski objekat',
  event: 'Dogadjaj',
  attraction: 'Atrakcija',
  shop: 'Prodavnica',
  other: 'Ostalo',
};

/** Ikone za tipove objava */
export const POST_TYPE_ICONS: Record<PostType, string> = {
  accommodation: '🏨',
  restaurant: '🍽️',
  club: '🎵',
  cultural_site: '🏛️',
  monument: '🗿',
  sports_facility: '⚽',
  event: '🎟️',
  attraction: '🌟',
  shop: '🛍️',
  other: '📍',
};

/** Tipovi koji nisu dogadjaji (za lokacije tab) */
export const LOCATION_POST_TYPES: PostType[] = [
  'accommodation', 'restaurant', 'club', 'cultural_site',
  'monument', 'sports_facility', 'attraction', 'shop', 'other',
];
