import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ObjectService } from '@core/services/object.service';
import { DestinationService } from '@core/services/destination.service';
import { TouristObject } from '@core/models/object.model';
import { Destination } from '@core/models/destination.model';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';

type LayerType = 'destinations' | 'objects' | 'both';

@Component({
  selector: 'app-map-admin',
  standalone: true,
  imports: [MapComponent, BadgeComponent],
  templateUrl: './map-admin.component.html',
  styleUrl: './map-admin.component.scss',
})
export class MapAdminComponent implements OnInit {
  destinations: Destination[] = [];
  objects: TouristObject[] = [];
  selectedMarker: MapMarker | null = null;
  layer: LayerType = 'both';
  loading = true;

  constructor(
    private objService: ObjectService,
    private destService: DestinationService,
  ) { }

  ngOnInit(): void {
    forkJoin({
      destinations: this.destService.getAll({ page: 1, pageSize: 200 }),
      objects: this.objService.getAll({ page: 1, pageSize: 200 }),
    }).subscribe({
      next: res => {
        this.destinations = res.destinations.data;
        this.objects = res.objects.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get markers(): MapMarker[] {
    const result: MapMarker[] = [];

    if (this.layer === 'destinations' || this.layer === 'both') {
      this.destinations.forEach(d => result.push({
        id: d.destinationId,
        lat: d.latitude,
        lng: d.longitude,
        label: d.name,
        category: d.type,
      }));
    }

    if (this.layer === 'objects' || this.layer === 'both') {
      this.objects.forEach(o => result.push({
        id: o.objectId + 10000,
        lat: o.latitude,
        lng: o.longitude,
        label: o.name,
        category: o.category,
      }));
    }

    return result;
  }

  onMarkerClicked(m: MapMarker): void {
    this.selectedMarker = m;
  }

  clearSelection(): void {
    this.selectedMarker = null;
  }

  setLayer(l: LayerType): void {
    this.layer = l;
    this.selectedMarker = null;
  }
}
