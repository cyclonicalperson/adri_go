import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapComponent, MapClickEvent, MapMarker, MapPath } from '@shared/components/map/map.component';
import { Waypoint } from '@core/models/route.model';
import { catchError, of } from 'rxjs';

type WaypointInput = Omit<Waypoint, 'waypointId' | 'routeId'>;

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
  @Output() waypointsChange = new EventEmitter<WaypointInput[]>();

  snapping = false;
  roadPath: MapPath | null = null;

  constructor(private http: HttpClient) {}

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

    this.http.get<any>(nearestUrl).pipe(
      catchError(() => of(null)),
    ).subscribe(res => {
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
  }

  private updateRoadPath(waypoints: WaypointInput[]): void {
    if (waypoints.length < 2) {
      this.roadPath = null;
      return;
    }

    const coords = waypoints.map(w => `${w['longitude']},${w['latitude']}`).join(';');
    const routeUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`;

    this.http.get<any>(routeUrl).pipe(
      catchError(() => of(null)),
    ).subscribe(res => {
      const geometry = res?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
      if (!geometry?.length) {
        this.roadPath = null;
        return;
      }

      this.roadPath = {
        id: 'road-snap',
        label: 'Ruta',
        color: '#0ea5e9',
        weight: 4,
        points: geometry.map(([lng, lat]) => ({ lat, lng })),
      };
    });
  }
}
