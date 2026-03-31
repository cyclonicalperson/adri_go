import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { MapComponent, MapClickEvent } from '@shared/components/map/map.component';

@Component({
  selector: 'app-object-map-picker',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './object-map-picker.component.html',
  styleUrl: './object-map-picker.component.scss',
})

export class ObjectMapPickerComponent {
  @ViewChild(MapComponent) mapComp!: MapComponent;

  @Input() lat: number = 43.85;
  @Input() lng: number = 18.41;
  @Output() locationPicked = new EventEmitter<{ lat: number; lng: number }>();

  onMapClick(ev: MapClickEvent): void {
    this.lat = ev.lat;
    this.lng = ev.lng;
    this.mapComp.setPickedLocation(ev.lat, ev.lng);
    this.locationPicked.emit({ lat: ev.lat, lng: ev.lng });
  }
}
