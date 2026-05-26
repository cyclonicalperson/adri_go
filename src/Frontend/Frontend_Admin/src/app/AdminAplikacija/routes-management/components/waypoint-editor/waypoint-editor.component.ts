import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { MapComponent, MapClickEvent, MapMarker, MapPath } from '@shared/components/map/map.component';
import { Waypoint } from '@core/models/route.model';

type WaypointInput = Omit<Waypoint, 'waypointId' | 'routeId'>;
type RouteValidationStatus = 'idle' | 'checking' | 'valid' | 'error';
export type RouteMetrics = {
  distanceKm: number;
  durationMin: number;
};

@Component({
  selector: 'app-waypoint-editor',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './waypoint-editor.component.html',
  styleUrl: './waypoint-editor.component.scss',
})
export class WaypointEditorComponent {
  @ViewChild(MapComponent) mapComp!: MapComponent;

  @Input() waypoints: WaypointInput[] = [];
  @Input() centerLat = 43.85;
  @Input() centerLng = 18.41;
  @Input() routeValidationStatus: RouteValidationStatus = 'idle';
  @Input() routeValidationMessage: string | null = null;
  @Output() waypointsChange = new EventEmitter<WaypointInput[]>();
  @Output() routeMetricsChange = new EventEmitter<RouteMetrics | null>();

  snapping = false;
  roadPath: MapPath | null = null;
  private roadPathRequestId = 0;
  private readonly routingTimeoutMs = 5000;

  get markers(): MapMarker[] {
    return this.waypoints.map((w, i) => ({
      id: i + 1,
      lat: w['latitude'],
      lng: w['longitude'],
      label: i === 0
        ? 'Pocetak'
        : i === this.waypoints.length - 1
          ? 'Kraj'
          : `Tacka ${i + 1}`,
      category: 'sports_facility',
      color: i === 0 ? '#22c55e' : i === this.waypoints.length - 1 ? '#ef4444' : '#3b82f6',
    }));
  }

  get paths(): MapPath[] {
    return this.roadPath ? [this.roadPath] : [];
  }

  onMapClick(ev: MapClickEvent): void {
    if (this.snapping) return;
    this.snapping = true;
    const nearestUrl = `https://routing.openstreetmap.de/routed-foot/nearest/v1/foot/${ev.lng},${ev.lat}?number=1`;

    void this.fetchJsonWithTimeout(nearestUrl)
      .catch(() => null)
      .then(res => {
      this.snapping = false;
      const snappedLocation = res?.waypoints?.[0]?.location as [number, number] | undefined;
      const lat = snappedLocation ? snappedLocation[1] : ev.lat;
      const lng = snappedLocation ? snappedLocation[0] : ev.lng;

      const next: WaypointInput[] = [
        ...this.waypoints,
        { latitude: lat, longitude: lng, sequenceOrder: this.waypoints.length + 1 },
      ];
      this.waypointsChange.emit(next);
      this.updateRoadPath(next);
    });
  }

  removeLast(): void {
    if (this.waypoints.length === 0) return;
    const next = this.waypoints.slice(0, -1);
    this.waypointsChange.emit(next);
    this.updateRoadPath(next);
  }

  clearAll(): void {
    this.waypointsChange.emit([]);
    this.roadPath = null;
    this.roadPathRequestId += 1;
  }

  private updateRoadPath(waypoints: WaypointInput[]): void {
    const requestId = ++this.roadPathRequestId;
    if (waypoints.length < 2) {
      this.roadPath = null;
      this.routeMetricsChange.emit(null);
      return;
    }

    const coords = waypoints.map(w => `${w['longitude']},${w['latitude']}`).join(';');
    const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=true`;

    void this.fetchJsonWithTimeout(routeUrl)
      .catch(() => null)
      .then(res => {
      if (requestId !== this.roadPathRequestId) {
        return;
      }

      if (this.containsFerrySegment(res?.routes?.[0])) {
        this.roadPath = null;
        this.routeMetricsChange.emit(null);
        return;
      }

      const route = res?.routes?.[0];
      const geometry = route?.geometry?.coordinates as [number, number][] | undefined;
      if (!geometry?.length) {
        this.roadPath = null;
        this.routeMetricsChange.emit(null);
        return;
      }
      if (this.hasSuspiciousGeometryJump(geometry)) {
        this.roadPath = null;
        this.routeMetricsChange.emit(null);
        return;
      }

      this.roadPath = {
        id: 'road-snap',
        label: 'Ruta',
        color: '#0ea5e9',
        weight: 4,
        points: geometry.map(([lng, lat]) => ({ lat, lng })),
      };
      this.routeMetricsChange.emit(this.extractRouteMetrics(route));
    });
  }

  private extractRouteMetrics(route: any): RouteMetrics | null {
    const distanceMeters = Number(route?.distance);
    const durationSeconds = Number(route?.duration);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0
      || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return null;
    }

    return {
      distanceKm: Number((distanceMeters / 1000).toFixed(1)),
      durationMin: Math.max(1, Math.round(durationSeconds / 60)),
    };
  }

  private async fetchJsonWithTimeout(url: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), this.routingTimeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Routing request failed with status ${response.status}.`);
      }

      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
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

  private hasSuspiciousGeometryJump(coordinates: [number, number][]): boolean {
    for (let index = 1; index < coordinates.length; index += 1) {
      const [previousLng, previousLat] = coordinates[index - 1];
      const [currentLng, currentLat] = coordinates[index];
      const distanceKm = this.haversineKm(
        { latitude: previousLat, longitude: previousLng },
        { latitude: currentLat, longitude: currentLng },
      );
      if (distanceKm > 8) {
        return true;
      }
    }

    return false;
  }

  private haversineKm(
    start: Pick<WaypointInput, 'latitude' | 'longitude'>,
    end: Pick<WaypointInput, 'latitude' | 'longitude'>,
  ): number {
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
