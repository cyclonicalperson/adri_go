export type ActivityCategory =
  | 'SPORT'
  | 'BUSINESS'
  | 'SHOPPING'
  | 'NIGHTLIFE'
  | 'WELLNESS'
  | 'DINING'
  | 'SIGHTSEEING'
  | 'ADVENTURE'
  | 'CULTURE'
  | 'OTHER';

export type ActivityStatus = 'approved' | 'pending';

export interface Activity {
  activityId: number;
  name: string;
  category: ActivityCategory;
  description?: string;
  duration?: string;
  difficulty?: string;
  maxCapacity?: number | null;
  tags?: string;
  postId?: number | null;
  lat?: number | null;
  lng?: number | null;
  locationName?: string;
  color?: string;
  status?: ActivityStatus;
  viewCount?: number;
  linkedPosts?: number;
}

export interface CreateActivityRequest {
  name: string;
  category: ActivityCategory;
  description?: string;
  duration?: string;
  difficulty?: string;
  maxCapacity?: number | null;
  tags?: string;
  postId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: ActivityStatus;
  clearPost?: boolean;
}

export interface UpdateActivityRequest extends Partial<CreateActivityRequest> { }
