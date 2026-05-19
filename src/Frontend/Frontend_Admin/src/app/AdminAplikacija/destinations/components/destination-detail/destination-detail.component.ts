import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { DestinationService } from '@core/services/destination.service';
import { ObjectService } from '@core/services/object.service';
import { Destination } from '@core/models/destination.model';
import { TouristObject } from '@core/models/object.model';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';
import { ImageGalleryComponent } from '@shared/components/image-gallery/image-gallery.component';
import { PropertyCardComponent } from '@shared/components/property-card/property-card.component';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-destination-detail',
  standalone: true,
  imports: [
    MapComponent,
    ImageGalleryComponent,
    PropertyCardComponent,
    BadgeComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './destination-detail.component.html',
  styleUrl: './destination-detail.component.scss',
})

export class DestinationDetailComponent implements OnInit {
  destination: Destination | null = null;
  objects: TouristObject[] = [];
  loading = true;
  showDeleteDialog = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private destService: DestinationService,
    private objService: ObjectService,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.destService.getById(id).subscribe((res: { data: any; }) => {
      this.destination = res.data;
      this.loading = false;
    });

    this.objService.getAll({ page: 1, pageSize: 6, destinationId: id }).subscribe((res: { data: TouristObject[]; }) => {
      this.objects = res.data;
    });
  }

  get canManageDestinations(): boolean {
    return this.auth.isSuperAdmin;
  }

  get marker(): MapMarker[] {
    if (!this.destination) return [];
    return [{
      id: this.destination.destinationId,
      lat: this.destination.latitude,
      lng: this.destination.longitude,
      label: this.destination.name,
      category: this.destTypeToPostType(this.destination.type),
    }];
  }

  private destTypeToPostType(type: string): string {
    const map: Record<string, string> = {
      CITY:          'cultural_site',
      MOUNTAIN:      'attraction',
      LAKE:          'attraction',
      NATIONAL_PARK: 'attraction',
      BEACH:         'attraction',
    };
    return map[type] ?? 'other';
  }

  get typeBadge(): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      CITY: 'info', MOUNTAIN: 'success', LAKE: 'info',
      NATIONAL_PARK: 'success', BEACH: 'warning', OTHER: 'default',
    };
    return map[this.destination?.type ?? ''] ?? 'default';
  }

  goEdit(): void {
    if (!this.canManageDestinations) return;
    this.router.navigate(['/admin/destinations', this.destination!.destinationId, 'edit']);
  }

  goBack(): void {
    this.router.navigate(['/admin/destinations']);
  }

  confirmDelete(): void {
    if (!this.canManageDestinations) return;
    this.showDeleteDialog = true;
  }
  cancelDelete(): void { this.showDeleteDialog = false; }

  doDelete(): void {
    if (!this.canManageDestinations) return;
    this.destService.delete(this.destination!.destinationId).subscribe(() => {
      this.router.navigate(['/admin/destinations']);
    });
  }

  goObject(obj: TouristObject): void {
    this.router.navigate(['/admin/lokacije', obj.objectId]);
  }
}
