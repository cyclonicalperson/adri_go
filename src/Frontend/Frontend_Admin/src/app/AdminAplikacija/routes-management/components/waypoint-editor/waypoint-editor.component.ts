import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { MapComponent, MapClickEvent, MapMarker } from '@shared/components/map/map.component';
import { Waypoint } from '@core/models/route.model';

@Component({
  selector: 'app-waypoint-editor',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './waypoint-editor.component.html',
  styleUrl: './waypoint-editor.component.scss',
})
export class WaypointEditorComponent implements OnInit {
  @ViewChild(MapComponent) mapComp!: MapComponent;

  @Input() waypoints: Omit<Waypoint, 'waypointId' | 'routeId'>[] = [];
  @Input() centerLat = 43.85;
  @Input() centerLng = 18.41;
  @Output() waypointsChange = new EventEmitter<Omit<Waypoint, 'waypointId' | 'routeId'>[]>();

  get markers(): MapMarker[] {
    return this.waypoints.map((w, i) => ({
      id: i + 1,
      lat: w['latitude'],
      lng: w['longitude'],
      label: i === 0
        ? 'Start'
        : i === this.waypoints.length - 1
          ? 'Kraj'
          : `Tačka ${i + 1}`,
    }));
  }

  ngOnInit(): void { }

  onMapClick(ev: MapClickEvent): void {
    const next = [
      ...this.waypoints,
      { latitude: ev.lat, longitude: ev.lng, sequenceOrder: this.waypoints.length + 1 },
    ];
    this.waypointsChange.emit(next);
  }

  removeLast(): void {
    if (this.waypoints.length === 0) return;
    this.waypointsChange.emit(this.waypoints.slice(0, -1));
  }

  clearAll(): void {
    this.waypointsChange.emit([]);
  }
}
