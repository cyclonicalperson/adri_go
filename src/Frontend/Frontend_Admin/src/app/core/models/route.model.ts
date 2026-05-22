export type RouteType = 'HIKING' | 'CYCLING' | 'WALKING' | 'DRIVING' | 'OTHER';
export type RouteDifficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXPERT';
export type RouteStatus = 'draft' | 'published' | 'archived';

export interface TouristRoute {
  routeId: number;
  destinationId: number;
  regionId?: number | null;
  proposedRegionName?: string | null;
  country?: string;
  name: string;
  routeType?: RouteType | null;
  difficulty: RouteDifficulty;
  distanceKm: number;
  durationMin: number;
  elevationGainM: number;
  description: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  isActive: boolean;
  createdBy: number;
  waypoints?: Waypoint[];
  images?: string[];
  destination?: { destinationId: number; name: string; country?: string };
  status?: RouteStatus;
  viewCount?: number;
  saveCount?: number;
}

export interface Waypoint {
  waypointId: number;
  routeId: number;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
}

export interface CreateRouteRequest {
  destinationId?: number | null;
  regionId?: number | null;
  proposedRegionName?: string | null;
  country?: string;
  name: string;
  difficulty: RouteDifficulty;
  distanceKm: number;
  durationMin: number;
  elevationGainM?: number;
  description: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  status?: RouteStatus;
  isActive?: boolean;
  waypoints?: Omit<Waypoint, 'waypointId' | 'routeId'>[];
  images?: string[];
}

export interface UpdateRouteRequest extends Partial<CreateRouteRequest> {}
