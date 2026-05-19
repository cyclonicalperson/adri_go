import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ObjectService } from '@core/services/object.service';
import { ReviewService } from '@core/services/review.service';
import { TouristObject } from '@core/models/object.model';
import { Review } from '@core/models/review.model';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';
import { ImageGalleryComponent } from '@shared/components/image-gallery/image-gallery.component';
import { StarRatingComponent } from '@shared/components/star-rating/star-rating.component';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';
import { ReviewCardComponent } from '@shared/components/review-card/review-card.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-object-detail',
  standalone: true,
  imports: [
    MapComponent,
    ImageGalleryComponent,
    StarRatingComponent,
    BadgeComponent,
    ReviewCardComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './object-detail.component.html',
  styleUrl: './object-detail.component.scss',
})

export class ObjectDetailComponent implements OnInit {
  object: TouristObject | null = null;
  reviews: Review[] = [];
  loading = true;
  showDeleteDialog = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objService: ObjectService,
    private reviewService: ReviewService,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const reviews$ = this.auth.hasGlobalPermission('manage_reviews')
      ? this.reviewService.getAll({ page: 1, pageSize: 5, entityType: 'OBJECT' }).pipe(catchError(() => of({ data: [] } as any)))
      : of({ data: [] } as any);

    forkJoin({
      obj: this.objService.getById(id),
      reviews: reviews$,
    }).subscribe({
      next: ({ obj, reviews }) => {
        this.object = obj.data;
        this.reviews = reviews.data.filter(r => r.postId === id);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get marker(): MapMarker[] {
    if (!this.object) return [];
    return [{
      id: this.object.objectId,
      lat: this.object.latitude,
      lng: this.object.longitude,
      label: this.object.name,
      category: this.objCategoryToPostType(this.object.category),
    }];
  }

  private objCategoryToPostType(cat: string): string {
    const map: Record<string, string> = {
      HOTEL:      'accommodation',
      APARTMENT:  'accommodation',
      RESTAURANT: 'restaurant',
      CAFE:       'restaurant',
      CLUB:       'club',
      SHOP:       'shop',
      CULTURAL:   'cultural_site',
      MONUMENT:   'monument',
      SPORT:      'sports_facility',
      NATURE:     'attraction',
    };
    return map[cat] ?? 'other';
  }

  get categoryLabel(): string {
    const map: Record<string, string> = {
      HOTEL: 'Smeštaj',
      APARTMENT: 'Smeštaj',
      RESTAURANT: 'Restoran',
      CAFE: 'Restoran',
      CLUB: 'Klub',
      SHOP: 'Prodavnica',
      CULTURAL: 'Kulturni objekat',
      MONUMENT: 'Spomenik',
      SPORT: 'Sportski objekat',
      NATURE: 'Atrakcija',
      OTHER: 'Ostalo',
    };
    return map[this.object?.category ?? ''] ?? (this.object?.category ?? '');
  }

  get categoryBadge(): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      HOTEL: 'info', APARTMENT: 'info', RESTAURANT: 'success',
      CAFE: 'success', CLUB: 'purple', SHOP: 'warning',
      CULTURAL: 'purple', MONUMENT: 'purple', SPORT: 'warning',
      NATURE: 'success', OTHER: 'default',
    };
    return map[this.object?.category ?? ''] ?? 'default';
  }

  get canEditObject(): boolean {
    if (!this.object) return false;
    return this.auth.isSuperAdmin ||
      (
        this.auth.hasPermission('manage_own_posts', this.objectScopeRegionId) &&
        this.object.createdBy === this.auth.currentUser?.userId
      );
  }

  goEdit(): void {
    if (!this.canEditObject) return;
    this.router.navigate(['/admin/lokacije', this.object!.objectId, 'edit']);
  }
  goBack(): void { this.router.navigate(['/admin/lokacije']); }
  confirmDelete(): void {
    if (!this.canEditObject) return;
    this.showDeleteDialog = true;
  }
  cancelDelete(): void { this.showDeleteDialog = false; }

  doDelete(): void {
    if (!this.canEditObject) return;
    this.objService.delete(this.object!.objectId).subscribe(() => {
      this.router.navigate(['/admin/lokacije']);
    });
  }

  private get objectScopeRegionId(): number | undefined {
    if (!this.object || this.object.proposedRegionName) {
      return undefined;
    }

    const regionId = this.object.regionId ?? this.object.destinationId;
    return typeof regionId === 'number' && regionId > 0 ? regionId : undefined;
  }
}
