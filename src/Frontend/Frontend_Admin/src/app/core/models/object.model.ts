export type ObjectCategory =
  | 'HOTEL'
  | 'APARTMENT'
  | 'RESTAURANT'
  | 'CAFE'
  | 'CLUB'
  | 'SHOP'
  | 'CULTURAL'
  | 'MONUMENT'
  | 'SPORT'
  | 'NATURE'
  | 'OTHER';

export type OpeningHoursSchedule = Record<string, string>;

export interface TouristObject {
  objectId: number;
  // DB uses region_id — destinationId kept for backward compatibility
  destinationId: number;
  /** Alias for destinationId — matches new DB schema (region table) */
  regionId?: number;
  proposedRegionName?: string | null;
  country?: string;
  name: string;
  category: ObjectCategory;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  website: string;
  workingHours: string;
  workingHoursSchedule?: OpeningHoursSchedule | null;
  createdBy: number;
  createdAt: string;
  // API may return either destination (old) or region (new DB)
  destination?: { destinationId: number; name: string } | null;
  region?: { regionId: number; name: string; country?: string } | null;
  activities?: Activity[];
  media?: Media[];
  averageRating?: number;
  reviewCount?: number;
}

export interface CreateObjectRequest {
  destinationId?: number;
  regionId?: number;
  proposedRegionName?: string | null;
  country?: string;
  name: string;
  category: ObjectCategory;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  workingHours?: string | OpeningHoursSchedule | null;
  activityIds?: number[];
  media?: Media[];
}

export interface UpdateObjectRequest extends Partial<CreateObjectRequest> {
  status?: 'draft' | 'published' | 'archived';
}

import { Activity } from './activity.model';
import { Media } from './destination.model';
