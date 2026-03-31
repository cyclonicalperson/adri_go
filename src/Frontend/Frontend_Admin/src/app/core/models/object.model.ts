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

export interface TouristObject {
  objectId: number;
  destinationId: number;
  name: string;
  category: ObjectCategory;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  website: string;
  workingHours: string;
  createdBy: number;
  createdAt: string;
  destination?: { destinationId: number; name: string };
  activities?: Activity[];
  media?: Media[];
  averageRating?: number;
  reviewCount?: number;
}

export interface CreateObjectRequest {
  destinationId: number;
  name: string;
  category: ObjectCategory;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  workingHours?: string;
  activityIds?: number[];
}

export interface UpdateObjectRequest extends Partial<CreateObjectRequest> { }

import { Activity } from './activity.model';
import { Media } from './destination.model';
