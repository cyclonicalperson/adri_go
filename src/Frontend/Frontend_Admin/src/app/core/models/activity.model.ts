export type ActivityCategory =
  | 'SPORT'
  | 'SHOPPING'
  | 'NIGHTLIFE'
  | 'WELLNESS'
  | 'DINING'
  | 'SIGHTSEEING'
  | 'ADVENTURE'
  | 'CULTURE'
  | 'OTHER';

export interface Activity {
  activityId: number;
  name: string;
  category: ActivityCategory;
  description: string;
  lat?: number | null;
  lng?: number | null;
  locationName?: string;
}

export interface CreateActivityRequest {
  name: string;
  category: ActivityCategory;
  description: string;
}

export interface UpdateActivityRequest extends Partial<CreateActivityRequest> { }
