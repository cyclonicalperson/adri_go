import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      obj: this.objService.getById(id),
      reviews: this.reviewService.getAll({ page: 1, pageSize: 5, entityType: 'OBJECT' }),
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
      category: this.object.category,
    }];
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

  goEdit(): void { this.router.navigate(['/admin/destinacije', this.object!.objectId, 'edit']); }
  goBack(): void { this.router.navigate(['/admin/destinacije']); }
  confirmDelete(): void { this.showDeleteDialog = true; }
  cancelDelete(): void { this.showDeleteDialog = false; }

  doDelete(): void {
    this.objService.delete(this.object!.objectId).subscribe(() => {
      this.router.navigate(['/admin/destinacije']);
    });
  }
}
