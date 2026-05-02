import { Injectable } from '@angular/core';
import { CalendarItem, UserProfile } from './user.service';
import { Location } from './location.service';
import { PlannerStop } from './route-planner.service';
import { TouristAnalyticsEvent } from './tourist-analytics.service';

export interface LocationRecommendation {
  location: Location;
  score: number;
  reason: string;
  badge: string;
}

export interface RouteDetourSuggestion {
  location: Location;
  score: number;
  reason: string;
  distanceToRouteKm: number;
  estimatedExtraMinutes: number;
  insertAfterIndex: number;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  buildGlobalRecommendations(
    locations: Location[],
    options: {
      userPosition?: [number, number] | null;
      limit?: number;
    } = {},
  ): LocationRecommendation[] {
    return [...locations]
      .map(location => ({
        location,
        score: this.scoreLocation(location, options.userPosition),
        reason: this.buildGlobalReason(location),
        badge: 'Trending',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 6);
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
    const likedTypes = new Set<string>();
    const likedRegions = new Set<string>();
    const interestTypes = this.mapInterestsToTypes([
      ...(profile?.interests ?? []),
      ...(options.contentPreferences ?? []),
    ]);

    savedLocations.forEach(location => {
      likedTypes.add(this.normalizeType(location.postType));
      if (location.regionName) {
        likedRegions.add(location.regionName.toLowerCase());
      }
    });

    calendarItems.forEach(item => {
      likedTypes.add(this.normalizeType(item.postType));
    });

    analyticsEvents.forEach(event => {
      const type = typeof event.metadata?.['postType'] === 'string'
        ? this.normalizeType(String(event.metadata?.['postType']))
        : '';
      if (type) {
        likedTypes.add(type);
      }
      const region = typeof event.metadata?.['regionName'] === 'string'
        ? String(event.metadata?.['regionName']).toLowerCase()
        : '';
      if (region) {
        likedRegions.add(region);
      }
    });

    const excludedIds = new Set(savedLocations.map(location => location.id));

    return [...locations]
      .filter(location => !excludedIds.has(location.id))
      .map(location => {
        const normalizedType = this.normalizeType(location.postType);
        const regionName = location.regionName?.toLowerCase() ?? '';
        let score = this.scoreLocation(location, options.userPosition);
        let badge = 'For you';
        let reason = 'Balanced for your travel style';

        if (interestTypes.has(normalizedType)) {
          score += 28;
          reason = `Matches your interest in ${this.humanizeType(location.postType)}`;
          badge = 'Interest match';
        }

        if (likedTypes.has(normalizedType)) {
          score += 22;
          reason = `Similar to places you already saved`;
          badge = 'Taste match';
        }

        if (regionName && likedRegions.has(regionName)) {
          score += 16;
          reason = `Fits the areas you have been exploring`;
          badge = 'Nearby vibe';
        }

        return { location, score, reason, badge };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 6);
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
    if (stops.length < 2 || routeGeometry.length < 2) {
      return [];
    }

    const existingIds = new Set(stops.map(stop => stop.id));
    const preferenceTypes = this.mapInterestsToTypes(options.contentPreferences ?? []);

    return locations
      .filter(location => !existingIds.has(location.id))
      .map(location => {
        const lat = location.lat ?? location.latitude;
        const lng = location.lng ?? location.longitude;
        if (lat == null || lng == null) {
          return null;
        }

        const distanceToRouteKm = this.distanceToPolylineKm([lat, lng], routeGeometry);
        if (distanceToRouteKm < 0.35 || distanceToRouteKm > 14) {
          return null;
        }

        const insertAfterIndex = this.findInsertIndex(stops, [lat, lng]);
        let score = this.scoreLocation(location, options.userPosition) + Math.max(0, 18 - distanceToRouteKm * 1.4);
        let reason = 'Worth a small scenic detour';

        if (preferenceTypes.has(this.normalizeType(location.postType))) {
          score += 18;
          reason = `Strong match for your interests and only a short detour`;
        } else if ((location.avgRating ?? 0) >= 4.6) {
          score += 12;
          reason = 'Highly rated and just off your route';
        }

        return {
          location,
          score,
          reason,
          distanceToRouteKm: Math.round(distanceToRouteKm * 10) / 10,
          estimatedExtraMinutes: Math.max(8, Math.round(distanceToRouteKm * 6)),
          insertAfterIndex,
        };
      })
      .filter((item): item is RouteDetourSuggestion => !!item)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 4);
  }

  optimizeStopOrder(stops: PlannerStop[], userPosition?: [number, number] | null): PlannerStop[] {
    if (stops.length < 3) {
      return [...stops];
    }

    const remaining = [...stops];
    const start = userPosition
      ? this.extractNearestStop(remaining, userPosition)
      : remaining.shift()!;

    const optimized: PlannerStop[] = [start];

    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      const currentPoint: [number, number] = [current.lat, current.lng];
      const next = this.extractNearestStop(remaining, currentPoint);
      optimized.push(next);
    }

    return optimized;
  }

  private buildGlobalReason(location: Location): string {
    if ((location.avgRating ?? 0) >= 4.7) {
      return 'One of the best rated spots right now';
    }

    if ((location.reviewCount ?? 0) >= 20) {
      return 'Popular with recent visitors';
    }

    return 'Strong overall traveler signal';
  }

  private scoreLocation(location: Location, userPosition?: [number, number] | null): number {
    const rating = location.avgRating ?? 0;
    const reviews = location.reviewCount ?? 0;
    const likes = location.likeCount ?? 0;
    const saves = location.saveCount ?? 0;
    let score = (rating * 44) + (reviews * 1.8) + (likes * 0.9) + (saves * 1.2);

    if (userPosition) {
      const lat = location.lat ?? location.latitude;
      const lng = location.lng ?? location.longitude;
      if (lat != null && lng != null) {
        const distanceKm = this.haversineKm(userPosition[0], userPosition[1], lat, lng);
        score += Math.max(0, 18 - distanceKm);
      }
    }

    return score;
  }

  private mapInterestsToTypes(interests: string[]): Set<string> {
    const set = new Set<string>();

    interests.forEach(interest => {
      switch ((interest || '').trim().toLowerCase()) {
        case 'nature':
        case 'beaches':
        case 'beach':
        case 'hiking':
        case 'wellness':
        case 'sightseeing':
          set.add('attraction');
          break;
        case 'food':
          set.add('restaurant');
          break;
        case 'history':
        case 'culture':
        case 'history and culture':
          set.add('cultural_site');
          set.add('monument');
          break;
        case 'nightlife':
        case 'night life':
          set.add('club');
          break;
        case 'photography':
          set.add('attraction');
          set.add('monument');
          set.add('event');
          break;
        case 'adventure':
        case 'sport':
        case 'sports':
          set.add('sports_facility');
          break;
        default:
          break;
      }
    });

    return set;
  }

  private findInsertIndex(stops: PlannerStop[], point: [number, number]): number {
    let bestIndex = Math.max(0, stops.length - 2);
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 0; index < stops.length - 1; index++) {
      const a: [number, number] = [stops[index].lat, stops[index].lng];
      const b: [number, number] = [stops[index + 1].lat, stops[index + 1].lng];
      const distance = this.distanceToSegmentKm(point, a, b);
      if (distance < bestScore) {
        bestScore = distance;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  private distanceToPolylineKm(point: [number, number], polyline: [number, number][]): number {
    let minDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < polyline.length - 1; index++) {
      minDistance = Math.min(
        minDistance,
        this.distanceToSegmentKm(point, polyline[index], polyline[index + 1]),
      );
    }

    return minDistance;
  }

  private distanceToSegmentKm(point: [number, number], start: [number, number], end: [number, number]): number {
    const projection = this.projectPointOnSegment(point, start, end);
    return this.haversineKm(point[0], point[1], projection[0], projection[1]);
  }

  private projectPointOnSegment(
    point: [number, number],
    start: [number, number],
    end: [number, number],
  ): [number, number] {
    const px = point[1];
    const py = point[0];
    const x1 = start[1];
    const y1 = start[0];
    const x2 = end[1];
    const y2 = end[0];
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
      return start;
    }

    const t = ((px - x1) * dx + (py - y1) * dy) / ((dx * dx) + (dy * dy));
    const clamped = Math.max(0, Math.min(1, t));
    return [y1 + (dy * clamped), x1 + (dx * clamped)];
  }

  private extractNearestStop(stops: PlannerStop[], point: [number, number]): PlannerStop {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    stops.forEach((stop, index) => {
      const distance = this.haversineKm(point[0], point[1], stop.lat, stop.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return stops.splice(bestIndex, 1)[0];
  }

  private humanizeType(value?: string): string {
    const normalized = this.normalizeType(value);
    switch (normalized) {
      case 'restaurant': return 'food';
      case 'cultural_site': return 'culture';
      case 'sports_facility': return 'activities';
      case 'club': return 'nightlife';
      case 'attraction': return 'top sights';
      default: return value || 'this area';
    }
  }

  private normalizeType(value?: string): string {
    return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
