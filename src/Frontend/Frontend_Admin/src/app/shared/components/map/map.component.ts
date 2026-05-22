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
  private markerRefs = new Map<number, L.Marker>();

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => this.initMap());
  }

  ngAfterViewInit(): void {
    const safe = () => { try { this.map?.invalidateSize(); } catch {} };
    requestAnimationFrame(() => {
      safe();
      requestAnimationFrame(() => {
        safe();
        setTimeout(safe, 200);
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['markers'] || changes['selectedMarkerId']) this.zone.runOutsideAngular(() => this.renderMarkers());
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

  focusMarker(markerId: number, zoom = 16): void {
    const marker = this.markerRefs.get(markerId);
    if (!marker) return;

    this.selectedMarkerId = markerId;
    this.renderMarkers();
    const nextMarker = this.markerRefs.get(markerId) ?? marker;
    this.map.flyTo(nextMarker.getLatLng(), Math.max(this.map.getZoom(), zoom), {
      animate: true,
      duration: 0.8,
    });
    nextMarker.openPopup();
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
      const intensity = Math.max(0, Math.min(1, hp.intensity));
      const fillColor = intensity > 0.66
        ? '#dc2626'
        : intensity > 0.33
          ? '#f59e0b'
          : '#2563eb';
      const alpha = 0.2 + intensity * 0.35;
      const circle = L.circle([hp.lat, hp.lng], {
        radius,
        color: fillColor,
        weight: 1,
        opacity: 0.35,
        fillColor,
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
    this.markerRefs.clear();

    this.markers.forEach(m => {
      const isSelected = m.id === this.selectedMarkerId;
      const marker = L.marker([m.lat, m.lng], {
        icon: this.buildIcon(isSelected ? 'selected' : 'default', m.color, m.category),
      });

      const catLabel = m.category
        ? (MapComponent.CATEGORY_LABELS[m.category.toLowerCase().replace(/\s+/g, '_')] ?? m.category)
        : null;
      marker.bindPopup(`<strong>${m.label}</strong>${catLabel ? '<br><small>' + catLabel + '</small>' : ''}`);
      marker.on('click', () => this.zone.run(() => this.markerClicked.emit(m)));
      this.markerLayer.addLayer(marker);
      this.markerRefs.set(m.id, marker);

      if (isSelected) {
        setTimeout(() => marker.openPopup(), 0);
      }
    });
  }

  // ── Friendly display labels for map popups ───────────────────────────────
  private static readonly CATEGORY_LABELS: Record<string, string> = {
    accommodation:   'Smeštaj',
    restaurant:      'Restoran',
    club:            'Noćni klub',
    cultural_site:   'Kulturno mesto',
    monument:        'Spomenik',
    sports_facility: 'Sportski objekat',
    event:           'Događaj',
    attraction:      'Atrakcija',
    shop:            'Prodavnica',
    route:           'Ruta',
    other:           'Ostalo',
  };

  // ── Category colour + icon lookup (mirrors tourist-app map-home) ─────────
  private static readonly CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
    accommodation:   { bg: '#3b82f6', icon: 'accommodation' },
    restaurant:      { bg: '#ef4444', icon: 'food' },
    club:            { bg: '#8b5cf6', icon: 'nightlife' },
    cultural_site:   { bg: '#f59e0b', icon: 'culture' },
    monument:        { bg: '#d97706', icon: 'monument' },
    sports_facility: { bg: '#22c55e', icon: 'activity' },
    event:           { bg: '#ec4899', icon: 'events' },
    attraction:      { bg: '#10b981', icon: 'beach' },
    shop:            { bg: '#f97316', icon: 'shop' },
    route:           { bg: '#0ea5e9', icon: 'route' },
    other:           { bg: '#6b7280', icon: 'default' },
  };

  private static readonly SVG_ICONS: Record<string, string> = {
    route:         '<path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/>',
    beach:         '<path d="M13.127 14.56l1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73l2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02l-.01.01c-.38 3.01 1.17 6.88 4.7 10.41l5.39-5.39c-3.53-3.53-7.4-5.09-10.08-5.03z"/>',
    culture:       '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    monument:      '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    food:          '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>',
    nightlife:     '<path d="M7 2h10l2 6-7 14L5 8l2-6zm1.44 6l3.56 7.13L15.56 8H8.44zM9 4l-.67 2h7.34L15 4H9z"/>',
    activity:      '<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>',
    events:        '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>',
    accommodation: '<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>',
    shop:          '<path d="M16 6V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6h-6zm-6-2h4v2h-4V4zM11 17H9v-6h2v6zm4 0h-2v-6h2v6z"/>',
    default:       '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>',
  };

  private buildIcon(
    type: 'default' | 'selected' | 'picked',
    markerColor?: string,
    category?: string,
  ): L.DivIcon {
    let bg: string;
    let iconKey = 'default';

    if (type === 'selected') {
      bg = '#E24B4A';
    } else if (type === 'picked') {
      bg = '#1A73E8';
    } else if (markerColor) {
      bg = markerColor;
      // Still look up the SVG icon from category even when a custom colour is provided
      if (category) {
        const key = category.toLowerCase().replace(/\s+/g, '_');
        const style = MapComponent.CATEGORY_COLORS[key];
        if (style) iconKey = style.icon;
      }
    } else if (category) {
      const key = category.toLowerCase().replace(/\s+/g, '_');
      const style = MapComponent.CATEGORY_COLORS[key] ?? MapComponent.CATEGORY_COLORS['other'];
      bg = style.bg;
      iconKey = style.icon;
    } else {
      bg = '#3FA26E';
    }

    const svgPath = MapComponent.SVG_ICONS[iconKey] ?? MapComponent.SVG_ICONS['default'];
    const html = `
      <div style="width:36px;height:36px;background:${bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid rgba(255,255,255,0.6);">
        <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">${svgPath}</svg>
        </div>
      </div>`;

    return L.divIcon({
      className: '',
      html,
      iconSize:    [36, 36],
      iconAnchor:  [18, 36],
      popupAnchor: [0, -38],
    });
  }
}
