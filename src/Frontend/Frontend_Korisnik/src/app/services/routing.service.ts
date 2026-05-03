import { Injectable } from '@angular/core';
import { TravelMode } from './tourist-preferences.service';

export interface RouteSummary {
  distanceKm: number;
  durationMin: number;
  stopCount: number;
}

export interface ComputedRoute {
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
  usedFallback: boolean;
}

export type RouteViewportMode = 'mobile' | 'desktop';

export interface RouteComputeOptions {
  viewport?: RouteViewportMode;
}

export interface ExternalNavigationLink {
  id: 'preferred' | 'google' | 'apple' | 'waze';
  label: string;
  url: string;
  primary?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly cacheTtlMs = 4 * 60 * 1000;
  private readonly routeCache = new Map<string, { route: ComputedRoute; storedAt: number }>();

  async computeRoute(
    coordinates: [number, number][],
    travelMode: TravelMode,
    options: RouteComputeOptions = {},
  ): Promise<ComputedRoute> {
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
    } catch {
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

  private async fetchLiveRoute(
    coordinates: [number, number][],
    travelMode: TravelMode,
  ): Promise<ComputedRoute> {
    let lastError: Error | null = null;

    // The public OSRM demo only reliably serves the driving profile regardless of
    // what profile is requested. Always fetch a driving route for accurate road
    // geometry and distance, then compute duration using mode-appropriate speeds.
    for (const profile of this.resolveRoutingProfiles(travelMode)) {
      try {
        const response = await fetch(this.buildOsrmUrl(coordinates, profile));
        if (!response.ok) {
          lastError = new Error(`OSRM request failed with status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates) {
          lastError = new Error('No route geometry returned from OSRM.');
          continue;
        }

        const geometry = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );

        const distanceKm = Math.round(((route.distance ?? 0) / 1000) * 10) / 10;
        // For driving, trust OSRM's traffic-aware duration.
        // For walking/cycling, OSRM returns driving durations so compute from distance.
        const durationMin = travelMode === 'driving'
          ? Math.max(1, Math.round((route.duration ?? 0) / 60))
          : Math.max(1, this.estimateFallbackDurationMin(distanceKm, travelMode));

        return { geometry, distanceKm, durationMin, usedFallback: false };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to fetch route.');
      }
    }

    throw lastError ?? new Error('No routing profiles succeeded.');
  }

  private buildOsrmUrl(coordinates: [number, number][], profile: string): string {
    const coordinatesString = coordinates
      .map(([lat, lng]) => `${lng},${lat}`)
      .join(';');

    return `https://router.project-osrm.org/route/v1/${profile}/${coordinatesString}?overview=full&geometries=geojson`;
  }

  private normalizeForViewport(route: ComputedRoute, viewport: RouteViewportMode = 'desktop'): ComputedRoute {
    return {
      ...route,
      geometry: this.simplifyGeometry(
        route.geometry,
        viewport === 'mobile' ? 160 : 260,
      ),
    };
  }

  private simplifyGeometry(geometry: [number, number][], maxPoints: number): [number, number][] {
    if (geometry.length <= maxPoints) {
      return [...geometry];
    }

    const step = Math.ceil(geometry.length / maxPoints);
    const reduced = geometry.filter((_, index) => index === 0 || index === geometry.length - 1 || index % step === 0);
    if (reduced[reduced.length - 1] !== geometry[geometry.length - 1]) {
      reduced.push(geometry[geometry.length - 1]);
    }

    return reduced;
  }

  private resolveRoutingProfiles(travelMode: TravelMode): string[] {
    switch (travelMode) {
      case 'walking':
        return ['walking', 'foot'];
      case 'cycling':
        return ['cycling', 'bike'];
      default:
        return ['driving'];
    }
  }

  private buildCacheKey(coordinates: [number, number][], travelMode: TravelMode): string {
    return `${travelMode}|${coordinates.map(point => `${point[0].toFixed(5)},${point[1].toFixed(5)}`).join('|')}`;
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
