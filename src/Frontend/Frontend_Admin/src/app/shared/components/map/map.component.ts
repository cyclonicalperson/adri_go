import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, SimpleChanges, NgZone,
} from '@angular/core';
import * as L from 'leaflet';

export interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  label: string;
  category?: string;
}

export interface MapClickEvent {
  lat: number;
  lng: number;
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
  @Input() centerLat: number = 43.1556;   // Default: Žabljak (Montenegro)
  @Input() centerLng: number = 19.1225;
  @Input() zoom: number = 8;
  @Input() height: string = '400px';
  @Input() clickable: boolean = false;
  @Input() selectedMarkerId: number | null = null;

  @Output() markerClicked = new EventEmitter<MapMarker>();
  @Output() mapClicked = new EventEmitter<MapClickEvent>();

  private map!: L.Map;
  private markerLayer!: L.LayerGroup;
  private selectedPin: L.Marker | null = null;

  constructor(private zone: NgZone) { }

  ngOnInit(): void {
    this.initMap();
  }

  /**
   * invalidateSize() must be called AFTER the host element has been painted.
   * When the map lives inside a flex/grid container or a panel that opens after
   * init (sidebar, tab, overlay), Leaflet measures 0×0 and renders broken tiles.
   * Two RAF ticks are enough to let the browser layout the container first.
   */
  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.map?.invalidateSize();
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['markers']) {
      this.renderMarkers();
    }

    if (changes['centerLat'] || changes['centerLng'] || changes['zoom']) {
      this.map.setView([this.centerLat, this.centerLng], this.zoom);
    }

    if (changes['height']) {
      // Height changed — force Leaflet to re-measure
      requestAnimationFrame(() => this.map?.invalidateSize());
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /** Called from parent to place a single "picked" pin (e.g. in forms). */
  setPickedLocation(lat: number, lng: number): void {
    this.selectedPin?.remove();
    this.selectedPin = L.marker([lat, lng], { icon: this.buildIcon('picked') })
      .addTo(this.map);
    this.map.setView([lat, lng], 14);
  }

  /** Force a size recalculation — useful when the host panel becomes visible. */
  refresh(): void {
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private initMap(): void {
    // Run outside Angular change detection so Leaflet's internal events
    // don't trigger unnecessary CD cycles.
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapEl.nativeElement, {
        center: [this.centerLat, this.centerLng],
        zoom: this.zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);

      if (this.clickable) {
        this.map.on('click', (e: L.LeafletMouseEvent) => {
          // Re-enter Angular zone so EventEmitter subscribers get CD
          this.zone.run(() => {
            this.mapClicked.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
          });
        });
      }

      this.renderMarkers();
    });
  }

  private renderMarkers(): void {
    this.markerLayer.clearLayers();

    this.markers.forEach(m => {
      const isSelected = m.id === this.selectedMarkerId;
      const marker = L.marker([m.lat, m.lng], {
        icon: this.buildIcon(isSelected ? 'selected' : 'default'),
      });

      marker.bindPopup(
        `<strong>${m.label}</strong>${m.category ? '<br>' + m.category : ''}`
      );
      marker.on('click', () => {
        this.zone.run(() => this.markerClicked.emit(m));
      });
      this.markerLayer.addLayer(marker);
    });
  }

  private buildIcon(type: 'default' | 'selected' | 'picked'): L.DivIcon {
    const colors: Record<string, string> = {
      default: '#3FA26E',
      selected: '#E24B4A',
      picked: '#1A73E8',
    };

    const color = colors[type];

    return L.divIcon({
      className: '',
      html: `<div style="
        width:28px; height:28px; border-radius:50% 50% 50% 0;
        background:${color}; border:2px solid #fff;
        transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,.25);
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    });
  }
}
