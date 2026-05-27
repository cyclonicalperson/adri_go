import { Injectable } from '@angular/core';
import { Waypoint } from '@core/models/route.model';

type RoutePoint = Pick<Waypoint, 'latitude' | 'longitude'>;
export type RouteValidationResult = { valid: boolean; message?: string };
type LegCheckResult = 'routable' | 'not_routable' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class RouteSafetyService {
  private readonly requestTimeoutMs = 5000;

  async validateWaypoints(waypoints: RoutePoint[]): Promise<RouteValidationResult> {
    const normalized = waypoints
      .map(point => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      }))
      .filter(point =>
        Number.isFinite(point.latitude)
        && Number.isFinite(point.longitude)
        && point.latitude >= -90
        && point.latitude <= 90
        && point.longitude >= -180
        && point.longitude <= 180
      );

    if (normalized.length < 2) {
      return { valid: true };
    }

    const routeResult = await this.checkRoutableRoute(normalized);
    if (routeResult === 'routable') {
      return { valid: true };
    }

    if (routeResult === 'unavailable') {
      return {
        valid: false,
        message: 'Servis za proveru ruta trenutno ne odgovara. Proverite internet konekciju ili pokusajte ponovo za par trenutaka.',
      };
    }

    return {
      valid: false,
      message: 'Ruta nije routabilna. Pomerite tacke na kopno/put i izbegnite vodene povrsine.',
    };
  }

  private async checkRoutableRoute(points: RoutePoint[]): Promise<LegCheckResult> {
    let hadUnavailableProfile = false;

    for (const profile of ['foot', 'driving'] as const) {
      try {
        const data = await this.fetchJsonWithTimeout(this.buildOsrmUrl(points, profile));
        if (data?.code && data.code !== 'Ok') {
          continue;
        }
        if (Array.isArray(data?.routes)
          && data.routes.length > 0
          && !this.containsFerrySegment(data.routes[0])
          && !this.hasSuspiciousGeometryJump(data.routes[0])) {
          return 'routable';
        }
      } catch {
        hadUnavailableProfile = true;
      }
    }

    return hadUnavailableProfile ? 'unavailable' : 'not_routable';
  }

  private async fetchJsonWithTimeout(url: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Route validation failed with status ${response.status}.`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildOsrmUrl(points: RoutePoint[], profile: 'foot' | 'driving'): string {
    const baseUrl = profile === 'foot'
      ? 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
      : 'https://routing.openstreetmap.de/routed-car/route/v1/driving';
    const coordinates = points.map(point => `${point.longitude},${point.latitude}`).join(';');
    return `${baseUrl}/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=false&continue_straight=false`;
  }

  private containsFerrySegment(value: unknown): boolean {
    if (typeof value === 'string') {
      return /ferry|trajekt|boat|ship/i.test(value);
    }

    if (Array.isArray(value)) {
      return value.some(item => this.containsFerrySegment(item));
    }

    if (value && typeof value === 'object') {
      return Object.values(value).some(item => this.containsFerrySegment(item));
    }

    return false;
  }

  private hasSuspiciousGeometryJump(route: any): boolean {
    const coordinates = route?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return false;
    }

    for (let index = 1; index < coordinates.length; index += 1) {
      const previous = coordinates[index - 1];
      const current = coordinates[index];
      if (!Array.isArray(previous) || !Array.isArray(current)) {
        continue;
      }

      const distanceKm = this.haversineKm(
        { longitude: Number(previous[0]), latitude: Number(previous[1]) },
        { longitude: Number(current[0]), latitude: Number(current[1]) },
      );
      if (distanceKm > 8) {
        return true;
      }
    }

    return false;
  }

  private haversineKm(start: RoutePoint, end: RoutePoint): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(end.latitude - start.latitude);
    const dLng = this.toRadians(end.longitude - start.longitude);
    const startLat = this.toRadians(start.latitude);
    const endLat = this.toRadians(end.latitude);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }
}
