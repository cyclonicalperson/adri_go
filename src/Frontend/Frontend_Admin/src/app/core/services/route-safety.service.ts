import { Injectable } from '@angular/core';
import { Waypoint } from '@core/models/route.model';

type RoutePoint = Pick<Waypoint, 'latitude' | 'longitude'>;

@Injectable({ providedIn: 'root' })
export class RouteSafetyService {
  private readonly requestTimeoutMs = 8000;

  async validateWaypoints(waypoints: RoutePoint[]): Promise<{ valid: boolean; message?: string }> {
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

    for (let index = 0; index < normalized.length - 1; index += 1) {
      const canRoute = await this.hasRoutableLeg(normalized[index], normalized[index + 1]);
      if (!canRoute) {
        return {
          valid: false,
          message: `Deonica izmedju tacke ${index + 1} i ${index + 2} nije routabilna. Pomerite tacke na kopno/put i izbegnite vodene povrsine.`,
        };
      }
    }

    return { valid: true };
  }

  private async hasRoutableLeg(start: RoutePoint, end: RoutePoint): Promise<boolean> {
    for (const profile of ['foot', 'driving'] as const) {
      try {
        const data = await this.fetchJsonWithTimeout(this.buildOsrmUrl(start, end, profile));
        if (data?.code && data.code !== 'Ok') {
          continue;
        }
        if (Array.isArray(data?.routes) && data.routes.length > 0) {
          return true;
        }
      } catch {
        // Try the next profile. If both fail, the leg is treated as unsafe.
      }
    }

    return false;
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

  private buildOsrmUrl(start: RoutePoint, end: RoutePoint, profile: 'foot' | 'driving'): string {
    const baseUrl = profile === 'foot'
      ? 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
      : 'https://routing.openstreetmap.de/routed-car/route/v1/driving';
    return `${baseUrl}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=false&alternatives=false&continue_straight=false&radiuses=500;500`;
  }
}
