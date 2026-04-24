import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

export interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  label: string;
  category?: string;
  color?: string;
}

export interface MapClickEvent {
  lat: number;
  lng: number;
}

export interface MapPathPoint {
  lat: number;
  lng: number;
}

export interface MapPath {
  id: string | number;
  points: MapPathPoint[];
  color?: string;
  weight?: number;
  label?: string;
}

export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
  label?: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() markers: MapMarker[] = [];
  @Input() paths: MapPath[] = [];
  @Input() heatPoints: HeatPoint[] = [];
  @Input() centerLat = 43.1556;
  @Input() centerLng = 19.1225;
  @Input() zoom = 8;
  @Input() height = '400px';
  @Input() clickable = false;
  @Input() selectedMarkerId: number | null = null;

  @Output() markerClicked = new EventEmitter<MapMarker>();
  @Output() mapClicked = new EventEmitter<MapClickEvent>();

  private map!: L.Map;
  private markerLayer!: L.LayerGroup;
  private pathLayer!: L.LayerGroup;
  private heatLayer!: L.LayerGroup;
  private selectedPin: L.Marker | null = null;

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => this.initMap());
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      requestAnimationFrame(() => {
        this.map?.invalidateSize();
        setTimeout(() => this.map?.invalidateSize(), 200);
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['markers']) this.zone.runOutsideAngular(() => this.renderMarkers());
    if (changes['paths']) this.zone.runOutsideAngular(() => this.renderPaths());
    if (changes['heatPoints']) this.zone.runOutsideAngular(() => this.renderHeat());

    if (changes['centerLat'] || changes['centerLng'] || changes['zoom']) {
      this.map.setView([this.centerLat, this.centerLng], this.zoom);
    }

    if (changes['height']) {
      requestAnimationFrame(() => this.map?.invalidateSize());
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  setPickedLocation(lat: number, lng: number): void {
    this.selectedPin?.remove();
    this.selectedPin = L.marker([lat, lng], { icon: this.buildIcon('picked') }).addTo(this.map);
    this.map.setView([lat, lng], 14);
  }

  refresh(): void {
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  clearHeat(): void {
    this.heatLayer?.clearLayers();
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [this.centerLat, this.centerLng],
      zoom: this.zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00A9 OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.pathLayer = L.layerGroup().addTo(this.map);
    this.heatLayer = L.layerGroup().addTo(this.map);

    if (this.clickable) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.zone.run(() => this.mapClicked.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));
      });
    }

    this.renderMarkers();
    this.renderPaths();
    this.renderHeat();
  }

  private renderPaths(): void {
    this.pathLayer.clearLayers();

    this.paths
      .filter(path => path.points?.length >= 2)
      .forEach(path => {
        const polyline = L.polyline(
          path.points.map(point => [point.lat, point.lng] as [number, number]),
          {
            color: path.color ?? '#0ea5e9',
            weight: path.weight ?? 4,
            opacity: 0.85,
          },
        );

        if (path.label) {
          polyline.bindTooltip(path.label, { sticky: true });
        }

        this.pathLayer.addLayer(polyline);
      });
  }

  private renderHeat(): void {
    this.heatLayer.clearLayers();

    this.heatPoints.forEach(hp => {
      const radius = 800 + hp.intensity * 4000;
      const green = Math.round(197 * hp.intensity);
      const alpha = 0.15 + hp.intensity * 0.25;
      const circle = L.circle([hp.lat, hp.lng], {
        radius,
        color: 'transparent',
        fillColor: `rgb(34, ${green}, 94)`,
        fillOpacity: alpha,
      });

      if (hp.label) {
        circle.bindTooltip(hp.label, { permanent: false, direction: 'top' });
      }

      this.heatLayer.addLayer(circle);
    });
  }

  private renderMarkers(): void {
    this.markerLayer.clearLayers();

    this.markers.forEach(m => {
      const isSelected = m.id === this.selectedMarkerId;
      const marker = L.marker([m.lat, m.lng], {
        icon: this.buildIcon(isSelected ? 'selected' : 'default', m.color),
      });

      marker.bindPopup(`<strong>${m.label}</strong>${m.category ? '<br><small>' + m.category + '</small>' : ''}`);
      marker.on('click', () => this.zone.run(() => this.markerClicked.emit(m)));
      this.markerLayer.addLayer(marker);
    });
  }

  private buildIcon(type: 'default' | 'selected' | 'picked', markerColor?: string): L.DivIcon {
    let c: string;
    if (type === 'selected') {
      c = '#E24B4A';
    } else if (type === 'picked') {
      c = '#1A73E8';
    } else {
      c = markerColor ?? '#3FA26E';
    }

    return L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${c};border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    });
  }
}
