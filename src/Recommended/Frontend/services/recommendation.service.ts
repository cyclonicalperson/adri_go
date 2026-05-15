// Standalone recommendation logic – no Angular/framework dependencies.
// The Angular project imports these pure functions via @recommended path alias.

export interface RecommendableLocation {
  id: number;
  postType?: string;
  regionName?: string;
  avgRating?: number;
  reviewCount?: number;
  likeCount?: number;
  saveCount?: number;
  lat?: number | null;
  latitude?: number | null;
  lng?: number | null;
  longitude?: number | null;
}

export interface PlannerStopLike {
  id: number;
  lat: number;
  lng: number;
}

export interface UserProfileLike {
  interests?: string[];
}

export interface CalendarItemLike {
  postType?: string;
}

export interface AnalyticsEventLike {
  metadata?: Record<string, unknown>;
}

export interface LocationRecommendation<T extends RecommendableLocation = RecommendableLocation> {
  location: T;
  score: number;
  reason: string;
  badge: string;
}

export interface RouteDetourSuggestion<T extends RecommendableLocation = RecommendableLocation> {
  location: T;
  score: number;
  reason: string;
  distanceToRouteKm: number;
  estimatedExtraMinutes: number;
  insertAfterIndex: number;
}

export function buildGlobalRecommendations<T extends RecommendableLocation>(
  locations: T[],
  options: { userPosition?: [number, number] | null; limit?: number } = {},
): LocationRecommendation<T>[] {
  return [...locations]
    .map(location => ({
      location,
      score: scoreLocation(location, options.userPosition),
      reason: buildGlobalReason(location),
      badge: 'Trending',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 6);
}

export function buildPersonalizedRecommendations<
  T extends RecommendableLocation,
  P extends UserProfileLike,
  C extends CalendarItemLike,
  A extends AnalyticsEventLike,
>(
  locations: T[],
  profile: P | null,
  savedLocations: T[],
  calendarItems: C[],
  analyticsEvents: A[],
  options: {
    userPosition?: [number, number] | null;
    contentPreferences?: string[];
    limit?: number;
  } = {},
): LocationRecommendation<T>[] {
  const likedTypes = new Set<string>();
  const likedRegions = new Set<string>();
  const interestTypes = mapInterestsToTypes([
    ...(profile?.interests ?? []),
    ...(options.contentPreferences ?? []),
  ]);

  savedLocations.forEach(location => {
    likedTypes.add(normalizeType(location.postType));
    if (location.regionName) likedRegions.add(location.regionName.toLowerCase());
  });

  calendarItems.forEach(item => {
    likedTypes.add(normalizeType(item.postType));
  });

  analyticsEvents.forEach(event => {
    const type = typeof event.metadata?.['postType'] === 'string'
      ? normalizeType(String(event.metadata['postType']))
      : '';
    if (type) likedTypes.add(type);
    const region = typeof event.metadata?.['regionName'] === 'string'
      ? String(event.metadata['regionName']).toLowerCase()
      : '';
    if (region) likedRegions.add(region);
  });

  const excludedIds = new Set(savedLocations.map(location => location.id));

  return [...locations]
    .filter(location => !excludedIds.has(location.id))
    .map(location => {
      const normalizedType = normalizeType(location.postType);
      const regionName = location.regionName?.toLowerCase() ?? '';
      let score = scoreLocation(location, options.userPosition);
      let badge = 'For you';
      let reason = 'Balanced for your travel style';

      if (interestTypes.has(normalizedType)) {
        score += 28;
        reason = `Matches your interest in ${humanizeType(location.postType)}`;
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

export function suggestDetours<T extends RecommendableLocation, S extends PlannerStopLike>(
  stops: S[],
  routeGeometry: [number, number][],
  locations: T[],
  options: {
    contentPreferences?: string[];
    userPosition?: [number, number] | null;
    limit?: number;
  } = {},
): RouteDetourSuggestion<T>[] {
  if (stops.length < 2 || routeGeometry.length < 2) return [];

  const existingIds = new Set(stops.map(stop => stop.id));
  const preferenceTypes = mapInterestsToTypes(options.contentPreferences ?? []);

  return locations
    .filter(location => !existingIds.has(location.id))
    .map(location => {
      const lat = location.lat ?? location.latitude;
      const lng = location.lng ?? location.longitude;
      if (lat == null || lng == null) return null;

      const distanceToRouteKm = distanceToPolylineKm([lat, lng], routeGeometry);
      if (distanceToRouteKm < 0.35 || distanceToRouteKm > 14) return null;

      const insertAfterIndex = findInsertIndex(stops, [lat, lng]);
      let score = scoreLocation(location, options.userPosition) + Math.max(0, 18 - distanceToRouteKm * 1.4);
      let reason = 'Worth a small scenic detour';

      if (preferenceTypes.has(normalizeType(location.postType))) {
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
    .filter((item): item is RouteDetourSuggestion<T> => !!item)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 4);
}

export function optimizeStopOrder<S extends PlannerStopLike>(
  stops: S[],
  userPosition?: [number, number] | null,
): S[] {
  if (stops.length < 3) return [...stops];

  const remaining = [...stops];
  const start = userPosition
    ? extractNearestStop(remaining, userPosition)
    : remaining.shift()!;

  const optimized: S[] = [start];
  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    const next = extractNearestStop(remaining, [current.lat, current.lng]);
    optimized.push(next);
  }

  return twoOpt(optimized);
}

// ── Private helpers ──────────────────────────────────────────────────────────

function buildGlobalReason(location: RecommendableLocation): string {
  if ((location.avgRating ?? 0) >= 4.7) return 'One of the best rated spots right now';
  if ((location.reviewCount ?? 0) >= 20) return 'Popular with recent visitors';
  return 'Strong overall traveler signal';
}

function scoreLocation(location: RecommendableLocation, userPosition?: [number, number] | null): number {
  const rating = location.avgRating ?? 0;
  const reviews = location.reviewCount ?? 0;
  const likes = location.likeCount ?? 0;
  const saves = location.saveCount ?? 0;
  let score = (rating * 44) + (reviews * 1.8) + (likes * 0.9) + (saves * 1.2);

  if (userPosition) {
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;
    if (lat != null && lng != null) {
      score += Math.max(0, 18 - haversineKm(userPosition[0], userPosition[1], lat, lng));
    }
  }

  return score;
}

function twoOpt<S extends PlannerStopLike>(stops: S[]): S[] {
  if (stops.length < 4) return stops;

  let best = [...stops];
  let improved = true;
  let guard = 0;

  while (improved && guard < 40) {
    improved = false;
    guard++;

    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const current =
          distanceBetween(best[i - 1], best[i]) +
          distanceBetween(best[k], best[k + 1]);
        const swapped =
          distanceBetween(best[i - 1], best[k]) +
          distanceBetween(best[i], best[k + 1]);

        if (swapped + 0.01 < current) {
          best = [
            ...best.slice(0, i),
            ...best.slice(i, k + 1).reverse(),
            ...best.slice(k + 1),
          ];
          improved = true;
        }
      }
    }
  }

  return best;
}

function distanceBetween(a: PlannerStopLike, b: PlannerStopLike): number {
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

function mapInterestsToTypes(interests: string[]): Set<string> {
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
    }
  });
  return set;
}

function findInsertIndex<S extends PlannerStopLike>(stops: S[], point: [number, number]): number {
  let bestIndex = Math.max(0, stops.length - 2);
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 0; index < stops.length - 1; index++) {
    const distance = distanceToSegmentKm(
      point,
      [stops[index].lat, stops[index].lng],
      [stops[index + 1].lat, stops[index + 1].lng],
    );
    if (distance < bestScore) { bestScore = distance; bestIndex = index; }
  }
  return bestIndex;
}

function distanceToPolylineKm(point: [number, number], polyline: [number, number][]): number {
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polyline.length - 1; index++) {
    minDistance = Math.min(minDistance, distanceToSegmentKm(point, polyline[index], polyline[index + 1]));
  }
  return minDistance;
}

function distanceToSegmentKm(point: [number, number], start: [number, number], end: [number, number]): number {
  const projection = projectPointOnSegment(point, start, end);
  return haversineKm(point[0], point[1], projection[0], projection[1]);
}

function projectPointOnSegment(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): [number, number] {
  const px = point[1], py = point[0];
  const x1 = start[1], y1 = start[0];
  const x2 = end[1], y2 = end[0];
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return start;
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return [y1 + dy * clamped, x1 + dx * clamped];
}

function extractNearestStop<S extends PlannerStopLike>(stops: S[], point: [number, number]): S {
  let bestIndex = 0, bestDistance = Number.POSITIVE_INFINITY;
  stops.forEach((stop, index) => {
    const distance = haversineKm(point[0], point[1], stop.lat, stop.lng);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return stops.splice(bestIndex, 1)[0];
}

function humanizeType(value?: string): string {
  switch (normalizeType(value)) {
    case 'restaurant': return 'food';
    case 'cultural_site': return 'culture';
    case 'sports_facility': return 'activities';
    case 'club': return 'nightlife';
    case 'attraction': return 'top sights';
    default: return value || 'this area';
  }
}

function normalizeType(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
