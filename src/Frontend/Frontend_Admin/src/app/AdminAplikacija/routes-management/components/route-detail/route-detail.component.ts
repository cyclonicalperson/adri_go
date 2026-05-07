import { DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteStatus, TouristRoute } from '@core/models/route.model';
import { Review } from '@core/models/review.model';
import { RouteService } from '@core/services/route.service';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { MapComponent, MapMarker, MapPath } from '@shared/components/map/map.component';
import { ReviewCardComponent } from '@shared/components/review-card/review-card.component';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-route-detail',
  standalone: true,
  imports: [
    DecimalPipe,
    BadgeComponent,
    ConfirmDialogComponent,
    MapComponent,
    ReviewCardComponent,
  ],
  templateUrl: './route-detail.component.html',
  styleUrl: './route-detail.component.scss',
})
export class RouteDetailComponent implements OnInit {
  routeData: TouristRoute | null = null;
  reviews: Review[] = [];
  loading = true;
  showApproveDialog = false;
  showRejectDialog = false;
  showDeleteDialog = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private routeService: RouteService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.loading = false;
      return;
    }

    forkJoin({
      routeData: this.routeService.getById(id),
      reviews: this.routeService.getReviews(id).pipe(
        catchError(() => of([])),
      ),
    }).subscribe({
      next: ({ routeData, reviews }) => {
        this.routeData = routeData.data;
        this.reviews = reviews;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get difficultyBadge(): BadgeVariant {
    const difficulty = this.routeData?.difficulty?.toLowerCase() ?? 'moderate';
    const variants: Record<string, BadgeVariant> = {
      easy: 'success',
      moderate: 'info',
      hard: 'warning',
      expert: 'danger',
    };

    return variants[difficulty] ?? 'default';
  }

  get statusBadge(): BadgeVariant {
    switch (this.routeData?.status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  }

  get statusLabel(): string {
    return this.mapStatusLabel(this.routeData?.status);
  }

  get difficultyLabel(): string {
    const labels: Record<string, string> = {
      easy: 'Lako',
      moderate: 'Srednje',
      hard: 'Tesko',
      expert: 'Ekspertsko',
    };

    return labels[this.routeData?.difficulty?.toLowerCase() ?? 'moderate'] ?? (this.routeData?.difficulty ?? 'Moderate');
  }

  get markers(): MapMarker[] {
    if (!this.routeData?.waypoints?.length) return [];

    return this.routeData.waypoints.map((waypoint, index, waypoints) => {
      const isStart = index === 0;
      const isEnd = index === waypoints.length - 1;

      return {
        id: waypoint.waypointId ?? index + 1,
        lat: waypoint.latitude,
        lng: waypoint.longitude,
        label: isStart ? 'Pocetak rute' : isEnd ? 'Kraj rute' : `Tacka ${index + 1}`,
        category: 'sports_facility',  // gives the activity/running-person icon in all waypoint pins
        color: isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6',
      };
    });
  }

  get paths(): MapPath[] {
    if (!this.routeData?.waypoints || this.routeData.waypoints.length < 2) return [];

    return [{
      id: this.routeData.routeId,
      label: this.routeData.name,
      color: '#0ea5e9',
      weight: 5,
      points: this.routeData.waypoints.map(waypoint => ({
        lat: waypoint.latitude,
        lng: waypoint.longitude,
      })),
    }];
  }

  get centerLat(): number {
    return this.routeData?.waypoints?.[0]?.latitude ?? 43.85;
  }

  get centerLng(): number {
    return this.routeData?.waypoints?.[0]?.longitude ?? 18.41;
  }

  get statusDescription(): string {
    switch (this.routeData?.status) {
      case 'published':
        return 'Ruta je javno dostupna turistima.';
      case 'draft':
        return 'Ruta ceka pregled i vidljiva je samo adminima.';
      case 'archived':
        return 'Ruta je arhivirana i vise nije javno prikazana.';
      default:
        return 'Status rute nije dostupan.';
    }
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  }

  goBack(): void {
    void this.router.navigate(['/admin/routes-management']);
  }

  goEdit(): void {
    if (!this.routeData) return;
    void this.router.navigate(['/admin/routes-management', this.routeData.routeId, 'edit']);
  }

  confirmApprove(): void {
    if (!this.routeData || this.routeData.status !== 'draft') return;
    this.showApproveDialog = true;
  }

  cancelApprove(): void {
    this.showApproveDialog = false;
  }

  doApprove(): void {
    if (!this.routeData) return;

    this.routeService.update(this.routeData.routeId, { status: 'published' }).subscribe(res => {
      this.routeData = res.data;
      this.showApproveDialog = false;
    });
  }

  confirmReject(): void {
    if (!this.routeData || this.routeData.status !== 'draft') return;
    this.showRejectDialog = true;
  }

  cancelReject(): void {
    this.showRejectDialog = false;
  }

  doReject(): void {
    if (!this.routeData) return;

    this.routeService.update(this.routeData.routeId, { status: 'archived' }).subscribe(res => {
      this.routeData = res.data;
      this.showRejectDialog = false;
    });
  }

  confirmDelete(): void {
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
  }

  doDelete(): void {
    if (!this.routeData) return;

    this.routeService.delete(this.routeData.routeId).subscribe(() => {
      void this.router.navigate(['/admin/routes-management']);
    });
  }

  private mapStatusLabel(status?: RouteStatus): string {
    switch (status) {
      case 'published':
        return 'Objavljena';
      case 'draft':
        return 'Na cekanju';
      case 'archived':
        return 'Arhivirana';
      default:
        return 'Nepoznato';
    }
  }
}
