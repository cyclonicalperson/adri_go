import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { DestinationService } from '@core/services/destination.service';
import { Destination, DestinationType } from '@core/models/destination.model';
import { PageRequest } from '@core/models/api-response.model';
import { SearchBarComponent } from '@shared/components/search-bar/search-bar.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-destinations-list',
  standalone: true,
  imports: [
    SearchBarComponent,
    PaginationComponent,
    BadgeComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './destinations-list.component.html',
  styleUrl: './destinations-list.component.scss',
})

export class DestinationsListComponent implements OnInit {
  destinations: Destination[] = [];
  total = 0;
  totalPages = 1;

  req: PageRequest & { type?: string } = {
    page: 1, pageSize: 12, sortBy: 'name', sortDir: 'asc',
  };

  deleteTarget: Destination | null = null;
  loading = true;

  readonly typeOptions: { value: string; label: string }[] = [
    { value: '', label: 'Sve' },
    { value: 'CITY', label: 'Grad' },
    { value: 'MOUNTAIN', label: 'Planina' },
    { value: 'LAKE', label: 'Jezero' },
    { value: 'NATIONAL_PARK', label: 'Nacionalni park' },
    { value: 'BEACH', label: 'Plaža' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private service: DestinationService,
    private router: Router,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    if (!this.canManageDestinations) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.load();
  }

  get canManageDestinations(): boolean {
    return this.auth.isSuperAdmin;
  }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: (res: { data: Destination[]; total: number; totalPages: number; }) => {
        this.total = res.total;
        this.totalPages = res.totalPages;
        // Ako je trenutna stranica van opsega (npr. brisanje zadnje stavke na zadnjoj str)
        if (this.req.page > this.totalPages && this.totalPages > 0) {
          this.req = { ...this.req, page: this.totalPages };
          this.load();
          return;
        }
        this.destinations = res.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(q: string): void {
    this.req = { ...this.req, search: q, page: 1 };
    this.load();
  }

  onTypeChange(type: string): void {
    this.req = { ...this.req, type: type || undefined, page: 1 };
    this.load();
  }

  onSort(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    this.req = { ...this.req, page: p };
    this.load();
  }

  goNew(): void {
    if (!this.canManageDestinations) return;
    this.router.navigate(['/admin/destinations/new']);
  }

  goEdit(d: Destination): void {
    if (!this.canManageDestinations) return;
    this.router.navigate(['/admin/destinations', d.destinationId, 'edit']);
  }

  goDetail(d: Destination): void { this.router.navigate(['/admin/destinations', d.destinationId]); }

  confirmDelete(d: Destination): void {
    if (!this.canManageDestinations) return;
    this.deleteTarget = d;
  }

  cancelDelete(): void { this.deleteTarget = null; }

  doDelete(): void {
    if (!this.deleteTarget || !this.canManageDestinations) return;
    this.service.delete(this.deleteTarget.destinationId).subscribe(() => {
      this.deleteTarget = null;
      this.load();
    });
  }

  typeBadge(type: DestinationType): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      CITY: 'info',
      MOUNTAIN: 'success',
      LAKE: 'info',
      NATIONAL_PARK: 'success',
      BEACH: 'warning',
      OTHER: 'default',
    };
    return map[type] ?? 'default';
  }

  typeLabel(type: DestinationType): string {
    const map: Record<string, string> = {
      CITY: 'Grad',
      MOUNTAIN: 'Planina',
      LAKE: 'Jezero',
      NATIONAL_PARK: 'Nacionalni park',
      BEACH: 'Plaža',
      OTHER: 'Ostalo',
    };
    return map[type] ?? type;
  }

  sortIcon(col: string): string {
    if (this.req.sortBy !== col) return '↕';
    return this.req.sortDir === 'asc' ? '↑' : '↓';
  }
}
