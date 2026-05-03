import { Injectable } from '@angular/core';
import { CalendarItem, UserProfile } from './user.service';
import { Location } from './location.service';
import { PlannerStop } from './route-planner.service';
import { TouristAnalyticsEvent } from './tourist-analytics.service';
import {
  LocationRecommendation as LocationRecommendationGeneric,
  RouteDetourSuggestion as RouteDetourSuggestionGeneric,
  buildGlobalRecommendations,
  buildPersonalizedRecommendations,
  suggestDetours,
  optimizeStopOrder,
} from '@recommended/services/recommendation.service';

export type LocationRecommendation = LocationRecommendationGeneric<Location>;
export type RouteDetourSuggestion = RouteDetourSuggestionGeneric<Location>;

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  buildGlobalRecommendations(
    locations: Location[],
    options: { userPosition?: [number, number] | null; limit?: number } = {},
  ): LocationRecommendation[] {
    return buildGlobalRecommendations(locations, options);
  }

  buildPersonalizedRecommendations(
    locations: Location[],
    profile: UserProfile | null,
    savedLocations: Location[],
    calendarItems: CalendarItem[],
    analyticsEvents: TouristAnalyticsEvent[],
    options: {
      userPosition?: [number, number] | null;
      contentPreferences?: string[];
      limit?: number;
    } = {},
  ): LocationRecommendation[] {
    return buildPersonalizedRecommendations(locations, profile, savedLocations, calendarItems, analyticsEvents, options);
  }

  suggestDetours(
    stops: PlannerStop[],
    routeGeometry: [number, number][],
    locations: Location[],
    options: {
      contentPreferences?: string[];
      userPosition?: [number, number] | null;
      limit?: number;
    } = {},
  ): RouteDetourSuggestion[] {
    return suggestDetours(stops, routeGeometry, locations, options);
  }

  optimizeStopOrder(stops: PlannerStop[], userPosition?: [number, number] | null): PlannerStop[] {
    return optimizeStopOrder(stops, userPosition);
  }
}
