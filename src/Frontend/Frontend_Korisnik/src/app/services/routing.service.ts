import { Injectable } from '@angular/core';
import { TravelMode } from './tourist-preferences.service';

export interface RouteSummary {
  distanceKm: number;
  durationMin: number;
  stopCount: number;
}

export interface NavigationStep {
  instruction: string;
  /** Raw street / road name from OSRM (empty string when unnamed). */
  streetName: string;
  distanceM: number;
  durationSec: number;
  maneuverType: string;
  maneuverModifier?: string;
  position: [number, number]; // [lat, lng]
}

export interface ComputedRoute {
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
  usedFallback: boolean;
  steps?: NavigationStep[];
}

export type RouteViewportMode = 'mobile' | 'desktop';

export interface RouteComputeOptions {
  viewport?: RouteViewportMode;
  allowFallback?: boolean;
}

export interface ExternalNavigationLink {
  id: 'preferred' | 'google' | 'apple' | 'waze';
  label: string;
  url: string;
  primary?: boolean;
}

export class RoutingUnavailableError extends Error {
  override name = 'RoutingUnavailableError';
}

export class RouteNotRoutableError extends Error {
  override name = 'RouteNotRoutableError';
}

export function isRoutingUnavailableError(error: unknown): boolean {
  return error instanceof RoutingUnavailableError;
}

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly cacheTtlMs = 4 * 60 * 1000;
  private readonly requestTimeoutMs = 10000;
  private readonly snapRadiusM = 2000;
  private readonly routeCache = new Map<string, { route: ComputedRoute; storedAt: number }>();

  async computeRoute(
    coordinates: [number, number][],
    travelMode: TravelMode,
    options: RouteComputeOptions = {},
  ): Promise<ComputedRoute> {
    coordinates = this.normalizeCoordinates(coordinates);
    if (coordinates.length < 2) {
      return {
        geometry: [...coordinates],
        distanceKm: 0,
        durationMin: 0,
        usedFallback: false,
      };
    }

    const cacheKey = this.buildCacheKey(coordinates, travelMode);
    const cached = this.routeCache.get(cacheKey);
    if (cached && (Date.now() - cached.storedAt) < this.cacheTtlMs) {
      return this.normalizeForViewport(cached.route, options.viewport);
    }

    try {
      const liveRoute = await this.fetchLiveRoute(coordinates, travelMode);
      this.routeCache.set(cacheKey, { route: liveRoute, storedAt: Date.now() });
      return this.normalizeForViewport(liveRoute, options.viewport);
    } catch (error) {
      if (options.allowFallback === false) {
        throw error;
      }

      const distanceKm = this.estimateStraightDistanceKm(coordinates);
      const fallbackRoute: ComputedRoute = {
        geometry: [...coordinates],
        distanceKm,
        durationMin: this.estimateFallbackDurationMin(distanceKm, travelMode),
        usedFallback: true,
      };

      return this.normalizeForViewport(fallbackRoute, options.viewport);
    }
  }

  estimateStraightDistanceKm(coordinates: [number, number][]): number {
    let total = 0;
    for (let index = 0; index < coordinates.length - 1; index++) {
      total += this.haversineKm(
        coordinates[index][0],
        coordinates[index][1],
        coordinates[index + 1][0],
        coordinates[index + 1][1],
      );
    }

    return Math.round(total * 10) / 10;
  }

  estimateFallbackDurationMin(distanceKm: number, travelMode: TravelMode): number {
    const adjustedDistanceKm = distanceKm * (
      travelMode === 'walking'
        ? 1.16
        : travelMode === 'cycling'
          ? 1.12
          : 1.24
    );

    const speedKmPerHour = travelMode === 'walking'
      ? 4.8
      : travelMode === 'cycling'
        ? 13.5
        : 42;

    return Math.max(
      travelMode === 'walking' ? 8 : 5,
      Math.round((adjustedDistanceKm / speedKmPerHour) * 60),
    );
  }

  buildNavigationLinks(
    coordinates: [number, number][],
    travelMode: TravelMode,
    options: { useCurrentLocationAsOrigin?: boolean } = {},
  ): ExternalNavigationLink[] {
    if (coordinates.length === 0) {
      return [];
    }

    const destination = coordinates[coordinates.length - 1];
    const googleTravelMode = travelMode === 'walking'
      ? 'walking'
      : travelMode === 'cycling'
        ? 'bicycling'
        : 'driving';
    const appleTravelMode = travelMode === 'walking'
      ? 'w'
      : travelMode === 'cycling'
        ? 'r'
        : 'd';

    const origin = !options.useCurrentLocationAsOrigin && coordinates.length > 1
      ? coordinates[0]
      : null;
    const waypointCoordinates = options.useCurrentLocationAsOrigin
      ? coordinates.slice(0, -1)
      : coordinates.slice(1, -1);

    const googleUrl = new URL('https://www.google.com/maps/dir/');
    googleUrl.searchParams.set('api', '1');
    googleUrl.searchParams.set('travelmode', googleTravelMode);
    googleUrl.searchParams.set('destination', this.serializeCoordinate(destination));
    if (origin) {
      googleUrl.searchParams.set('origin', this.serializeCoordinate(origin));
    }
    if (waypointCoordinates.length > 0) {
      googleUrl.searchParams.set(
        'waypoints',
        waypointCoordinates.map(point => this.serializeCoordinate(point)).join('|'),
      );
    }

    const appleUrl = new URL('https://maps.apple.com/');
    appleUrl.searchParams.set('daddr', this.serializeCoordinate(destination));
    appleUrl.searchParams.set('dirflg', appleTravelMode);
    if (origin) {
      appleUrl.searchParams.set('saddr', this.serializeCoordinate(origin));
    }

    const wazeUrl = new URL('https://waze.com/ul');
    wazeUrl.searchParams.set('ll', this.serializeCoordinate(destination));
    wazeUrl.searchParams.set('navigate', 'yes');

    const primaryLink: ExternalNavigationLink = this.preferAppleMaps()
      ? { id: 'preferred', label: 'Start in Apple Maps', url: appleUrl.toString(), primary: true }
      : { id: 'preferred', label: 'Start in Google Maps', url: googleUrl.toString(), primary: true };

    return [
      primaryLink,
      { id: 'google', label: 'Google Maps', url: googleUrl.toString() },
      { id: 'apple', label: 'Apple Maps', url: appleUrl.toString() },
      { id: 'waze', label: 'Waze', url: wazeUrl.toString() },
    ];
  }

  async computeRouteForNavigation(
    coordinates: [number, number][],
    travelMode: TravelMode,
    options: RouteComputeOptions = {},
  ): Promise<ComputedRoute> {
    coordinates = this.normalizeCoordinates(coordinates);
    if (coordinates.length < 2) {
      return { geometry: [...coordinates], distanceKm: 0, durationMin: 0, usedFallback: false, steps: [] };
    }

    let lastNavigationError: Error | null = null;

    for (const profile of this.resolveRoutingProfiles(travelMode)) {
      try {
        const data = await this.fetchJsonWithTimeout(this.buildOsrmUrl(coordinates, profile, true));
        if (data?.code && data.code !== 'Ok') {
          lastNavigationError = this.buildRouteFailure(data.code);
          continue;
        }
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates) {
          lastNavigationError = new Error('No navigation route geometry returned from OSRM.');
          continue;
        }

        const geometry = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
        );
        const distanceKm = Math.round(((route.distance ?? 0) / 1000) * 10) / 10;
        const durationMin = Math.max(1, Math.round((route.duration ?? 0) / 60));

        const steps: NavigationStep[] = (route.legs ?? [])
          .flatMap((leg: any) => leg.steps ?? [])
          .map((step: any) => ({
            instruction: this.buildInstruction(step),
            streetName: step.name ?? '',
            distanceM: Math.round(step.distance ?? 0),
            durationSec: Math.round(step.duration ?? 0),
            maneuverType: step.maneuver?.type ?? 'continue',
            maneuverModifier: step.maneuver?.modifier,
            position: [
              step.maneuver?.location?.[1] ?? 0,
              step.maneuver?.location?.[0] ?? 0,
            ] as [number, number],
          }));

        return {
          geometry: this.simplifyGeometry(
            geometry,
            options.viewport === 'mobile' ? 1000 : 2000,
          ),
          distanceKm,
          durationMin,
          usedFallback: false,
          steps,
        };
      } catch (error) {
        lastNavigationError = error instanceof Error ? error : new Error('Failed to fetch navigation route.');
        // try next profile
      }
    }

    if (options.allowFallback !== true) {
      throw lastNavigationError ?? new RouteNotRoutableError('No navigation routing profiles succeeded.');
    }

    // Fallback without steps
    const route = await this.computeRoute(coordinates, travelMode, options);
    return { ...route, steps: [] };
  }

  private async fetchLiveRoute(
    coordinates: [number, number][],
    travelMode: TravelMode,
  ): Promise<ComputedRoute> {
    let lastError: Error | null = null;
    let unavailableError: RoutingUnavailableError | null = null;
    let notRoutableError: RouteNotRoutableError | null = null;
    const profiles = this.resolveRoutingProfiles(travelMode);
    const primaryProfileCount = travelMode === 'driving' ? profiles.length : 1;
    const primaryProfiles = profiles.slice(0, primaryProfileCount);
    const fallbackProfiles = profiles.slice(primaryProfileCount);

    for (const profile of primaryProfiles) {
      try {
        const data = await this.fetchJsonWithTimeout(this.buildOsrmUrl(coordinates, profile));
        if (data?.code && data.code !== 'Ok') {
          lastError = this.buildRouteFailure(data.code);
          if (lastError instanceof RouteNotRoutableError) {
            notRoutableError = lastError;
          }
          continue;
        }
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates) {
          lastError = new Error('No route geometry returned from OSRM.');
          continue;
        }

        const geometry = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
        );

        const distanceKm = Math.round(((route.distance ?? 0) / 1000) * 10) / 10;
        // Trust OSRM's duration for all travel modes — the correct profile
        // (foot / bike / driving) is already selected by resolveRoutingProfiles().
        const durationMin = Math.max(1, Math.round((route.duration ?? 0) / 60));

        return { geometry, distanceKm, durationMin, usedFallback: false };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to fetch route.');
        if (lastError instanceof RoutingUnavailableError) {
          unavailableError = lastError;
        } else if (lastError instanceof RouteNotRoutableError) {
          notRoutableError = lastError;
        }
      }
    }

    const primarySegmentedRoute = await this.fetchSegmentedRoute(coordinates, primaryProfiles);
    if (primarySegmentedRoute) {
      return primarySegmentedRoute;
    }

    for (const profile of fallbackProfiles) {
      try {
        return await this.fetchRouteForProfile(coordinates, profile);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to fetch route.');
        if (lastError instanceof RoutingUnavailableError) {
          unavailableError = lastError;
        } else if (lastError instanceof RouteNotRoutableError) {
          notRoutableError = lastError;
        }
      }
    }

    const segmentedRoute = await this.fetchSegmentedRoute(coordinates, profiles);
    if (segmentedRoute) {
      return segmentedRoute;
    }

    throw unavailableError ?? notRoutableError ?? lastError ?? new Error('No routing profiles succeeded.');
  }

  private async fetchSegmentedRoute(
    coordinates: [number, number][],
    profiles: string[],
  ): Promise<ComputedRoute | null> {
    if (coordinates.length < 3) {
      return null;
    }

    const geometry: [number, number][] = [];
    let distanceKm = 0;
    let durationMin = 0;

    for (let index = 0; index < coordinates.length - 1; index++) {
      const leg = await this.fetchDirectRoute([coordinates[index], coordinates[index + 1]], profiles);
      if (!leg) {
        return null;
      }

      if (geometry.length > 0 && leg.geometry.length > 0) {
        geometry.push(...leg.geometry.slice(1));
      } else {
        geometry.push(...leg.geometry);
      }
      distanceKm += leg.distanceKm;
      durationMin += leg.durationMin;
    }

    return {
      geometry,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMin: Math.max(1, Math.round(durationMin)),
      usedFallback: false,
    };
  }

  private async fetchDirectRoute(
    coordinates: [number, number][],
    profiles: string[],
  ): Promise<ComputedRoute | null> {
    for (const profile of profiles) {
      try {
        return await this.fetchRouteForProfile(coordinates, profile);
      } catch {
        // try next endpoint/profile
      }
    }

    return null;
  }

  private async fetchRouteForProfile(coordinates: [number, number][], profile: string): Promise<ComputedRoute> {
    const data = await this.fetchJsonWithTimeout(this.buildOsrmUrl(coordinates, profile));
    if (data?.code && data.code !== 'Ok') {
      throw this.buildRouteFailure(data.code);
    }

    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates) {
      throw new Error('No route geometry returned from OSRM.');
    }

    return {
      geometry: route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
      ),
      distanceKm: Math.round(((route.distance ?? 0) / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round((route.duration ?? 0) / 60)),
      usedFallback: false,
    };
  }

  private async fetchJsonWithTimeout(url: string): Promise<any> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.requestTimeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        if (response.status >= 500) {
          throw new RoutingUnavailableError(`Routing server returned status ${response.status}.`);
        }
        throw new Error(`OSRM request failed with status ${response.status}.`);
      }
      return await response.json();
    } catch (error) {
      const errorName = error instanceof DOMException || error instanceof Error ? error.name : '';
      if (timedOut || errorName === 'AbortError' || error instanceof TypeError) {
        throw new RoutingUnavailableError('Routing server is unavailable.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildRouteFailure(code: string): Error {
    if (code === 'NoRoute' || code === 'NoSegment') {
      return new RouteNotRoutableError(`OSRM route failed with code ${code}.`);
    }

    return new Error(`OSRM route failed with code ${code}.`);
  }

  private buildInstruction(step: any): string {
    const type: string = step.maneuver?.type ?? '';
    const modifier: string = step.maneuver?.modifier ?? '';
    const name: string = step.name ?? '';
    const street = name ? ` onto ${name}` : '';

    switch (type) {
      case 'depart': return `Head ${modifier}${street}`;
      case 'arrive': return 'You have arrived at your destination';
      case 'turn': {
        const dir = modifier === 'straight' ? 'Continue straight' : `Turn ${modifier}`;
        return `${dir}${street}`;
      }
      case 'merge': return `Merge ${modifier}${street}`;
      case 'on ramp': return `Take the ramp ${modifier}${street}`;
      case 'off ramp': return `Take the exit ${modifier}${street}`;
      case 'fork': return `Keep ${modifier} at the fork${street}`;
      case 'end of road': return `Turn ${modifier} at the end of road${street}`;
      case 'continue': return `Continue straight${street}`;
      case 'roundabout':
      case 'rotary': return `Enter the roundabout${street}`;
      case 'exit roundabout':
      case 'exit rotary': return `Exit the roundabout${street}`;
      default: return name ? `Continue on ${name}` : 'Continue';
    }
  }

  private buildOsrmUrl(coordinates: [number, number][], profile: string, includeSteps = false): string {
    const coordinatesString = coordinates
      .map(([lat, lng]) => `${lng},${lat}`)
      .join(';');

    // Seed pins can be slightly off-road; OSRM snaps each point to the nearest routable segment.
    const radiuses = coordinates.map(() => String(this.snapRadiusM)).join(';');
    const params = `?overview=full&geometries=geojson&alternatives=false&continue_straight=false&radiuses=${radiuses}${includeSteps ? '&steps=true' : ''}`;

    if (profile === 'foot-osm') {
      return `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordinatesString}${params}`;
    }
    if (profile === 'bike-osm') {
      return `https://routing.openstreetmap.de/routed-bike/route/v1/bike/${coordinatesString}${params}`;
    }
    if (profile === 'driving-project') {
      return `https://router.project-osrm.org/route/v1/driving/${coordinatesString}${params}`;
    }
    return `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinatesString}${params}`;
  }

  private normalizeForViewport(route: ComputedRoute, viewport: RouteViewportMode = 'desktop'): ComputedRoute {
    // Use a generous cap — Leaflet handles large polylines efficiently.
    // The RDP pass below already removes truly redundant collinear points.
    const maxPoints = viewport === 'mobile' ? 1000 : 2000;
    return {
      ...route,
      geometry: this.simplifyGeometry(route.geometry, maxPoints),
    };
  }

  /**
   * Ramer-Douglas-Peucker simplification.
   * Preserves corners/turns (critical for street-following appearance) while
   * pruning collinear points. Falls back to a final stride pass only if the
   * RDP result still exceeds maxPoints (rare with street routes).
   */
  private simplifyGeometry(geometry: [number, number][], maxPoints: number): [number, number][] {
    if (geometry.length <= maxPoints) return [...geometry];

    // ~3 m tolerance in lat/lng degree units (1° ≈ 111 km)
    const simplified = this.rdp(geometry, 0.000027);
    if (simplified.length <= maxPoints) return simplified;

    // Safety stride if still over limit
    const step = Math.ceil(simplified.length / maxPoints);
    const result = simplified.filter((_, i) => i === 0 || i === simplified.length - 1 || i % step === 0);
    if (result[result.length - 1] !== simplified[simplified.length - 1]) {
      result.push(simplified[simplified.length - 1]);
    }
    return result;
  }

  /** Recursive Ramer-Douglas-Peucker — iterative stack to avoid call-stack limits. */
  private rdp(pts: [number, number][], eps: number): [number, number][] {
    const keep = new Uint8Array(pts.length);
    keep[0] = 1;
    keep[pts.length - 1] = 1;

    // Stack of [start, end] index pairs
    const stack: [number, number][] = [[0, pts.length - 1]];
    while (stack.length) {
      const [start, end] = stack.pop()!;
      if (end - start <= 1) continue;

      let maxD = 0;
      let maxI = start;
      for (let i = start + 1; i < end; i++) {
        const d = this.ptSegDist(pts[i], pts[start], pts[end]);
        if (d > maxD) { maxD = d; maxI = i; }
      }

      if (maxD > eps) {
        keep[maxI] = 1;
        stack.push([start, maxI], [maxI, end]);
      }
    }

    return pts.filter((_, i) => keep[i]);
  }

  private ptSegDist(p: [number, number], a: [number, number], b: [number, number]): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }

  private resolveRoutingProfiles(travelMode: TravelMode): string[] {
    switch (travelMode) {
      case 'walking':  return ['foot-osm', 'driving', 'driving-project'];
      case 'cycling':  return ['bike-osm', 'driving', 'driving-project'];
      // driving: try Geofabrik first, then OSRM demo as fallback
      default:         return ['driving', 'driving-project'];
    }
  }

  private buildCacheKey(coordinates: [number, number][], travelMode: TravelMode): string {
    return `${travelMode}|${coordinates.map(point => `${point[0].toFixed(5)},${point[1].toFixed(5)}`).join('|')}`;
  }

  private normalizeCoordinates(coordinates: [number, number][]): [number, number][] {
    return coordinates.filter(([lat, lng]) =>
      Number.isFinite(lat) && Number.isFinite(lng)
      && lat >= -90 && lat <= 90
      && lng >= -180 && lng <= 180
    );
  }

  private serializeCoordinate([lat, lng]: [number, number]): string {
    return `${lat},${lng}`;
  }

  private preferAppleMaps(): boolean {
    const userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
    return /iphone|ipad|macintosh|mac os x/.test(userAgent);
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radiusKm = 6371;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180)
      * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(deltaLon / 2) ** 2;

    return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
