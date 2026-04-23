export type RouteType = 'HIKING' | 'CYCLING' | 'WALKING' | 'DRIVING' | 'OTHER';
export type RouteDifficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXPERT';

export interface TouristRoute {
  routeId: number;
  destinationId: number;
  name: string;
  routeType: RouteType;
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
  destination?: { destinationId: number; name: string };
  status?: string;
}

export interface Waypoint {
  waypointId: number;
  routeId: number;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
}

export interface CreateRouteRequest {
  destinationId: number;
  name: string;
  routeType: RouteType;
  difficulty: RouteDifficulty;
  distanceKm: number;
  durationMin: number;
  elevationGainM?: number;
  description: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  isActive?: boolean;
  waypoints?: Omit<Waypoint, 'waypointId' | 'routeId'>[];
}

export interface UpdateRouteRequest extends Partial<CreateRouteRequest> { }
