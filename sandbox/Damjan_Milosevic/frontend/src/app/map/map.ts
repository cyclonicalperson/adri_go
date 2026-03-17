import { Component, EventEmitter, Input, Output, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';
import { Location } from '../models/locations';

@Component({
  selector: 'app-map',
  templateUrl: './map.html',
  styleUrls: ['./map.css'],
})
export class Map implements AfterViewInit, OnChanges {
  @Input() locations: Location[] = [];
  @Output() newLocationSelected = new EventEmitter<{ latitude: number; longitude: number }>();
  @Output() deleteLocationSelected = new EventEmitter<Location>();

  map: any;
  private markerLayer: L.FeatureGroup = L.featureGroup();
  private selectedLatLng: { latitude: number; longitude: number } | null = null;
  private selectedLocation?: Location ;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['locations'] && this.map) {
      this.renderMarkers();
    }
  }

  defaultMarkerIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

  initMap() {
    this.map = L.map('map').setView([44.0128, 20.9114], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    this.markerLayer.addTo(this.map);

    

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.selectedLatLng = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      this.markerLayer.clearLayers();
      const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: this.defaultMarkerIcon }).addTo(this.markerLayer);
      marker.bindPopup('<button id="create-location-btn">Create new location</button>');
      marker.on('popupopen', () => {
        const btn = document.getElementById('create-location-btn');
        if (btn) {
          btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (this.selectedLatLng) {
              this.newLocationSelected.emit(this.selectedLatLng);
            }
          };
        }
      });
      marker.openPopup();
    });

    this.renderMarkers();
  }

  private renderMarkers() {
    this.markerLayer.clearLayers();
    if (!this.locations || !this.locations.length) return;

    for (const loc of this.locations) {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (!isFinite(lat) || !isFinite(lng)) continue;

      const marker = L.marker([lat, lng], { icon: this.defaultMarkerIcon });
      const title = loc.name || 'Location';
      const city = loc.city ? `<div>${loc.city}</div>` : '';
      const rating = loc.rating !== undefined ? `<div>Rating: ${loc.rating}</div>` : '';
      const deleteBtn = '<button id="deleteBtn">Delete</button>';
      marker.bindPopup(`<strong>${title}</strong>${city}${rating}${deleteBtn}`);

      marker.on('popupopen', () => {
        this.selectedLocation=loc;
        const btn = document.getElementById('deleteBtn');
        if (btn) {
          btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (this.selectedLatLng) {
              this.deleteLocationSelected.emit( this.selectedLocation);
            }
          };
        }
      });
      marker.openPopup();

      this.markerLayer.addLayer(marker);
    }

    try {
      const bounds = this.markerLayer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch {
      // ignore fit errors
    }
  }
}

