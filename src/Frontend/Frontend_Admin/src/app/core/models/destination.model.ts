export type DestinationType = 'CITY' | 'MOUNTAIN' | 'LAKE' | 'NATIONAL_PARK' | 'BEACH' | 'OTHER';

export interface Destination {
  destinationId: number;
  name: string;
  type: DestinationType;
  description: string;
  country: string;
  city?: string;
  region?: string;
  latitude: number;
  longitude: number;
  createdBy: number;
  createdAt: string;
  objectCount?: number;
  media?: Media[];
}

export interface CreateDestinationRequest {
  name: string;
  type: DestinationType;
  description: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface UpdateDestinationRequest extends Partial<CreateDestinationRequest> { }

export interface Media {
  mediaId: number;
  url: string;
  caption?: string;
  sortOrder: number;
}
