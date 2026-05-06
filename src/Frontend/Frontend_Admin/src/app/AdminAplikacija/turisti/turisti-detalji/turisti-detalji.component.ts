import { Component, OnInit } from '@angular/core';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AdminTouristService, TouristUserDetail } from '@core/services/admin-tourist.service';

@Component({
  selector: 'app-turisti-detalji',
  templateUrl: './turisti-detalji.component.html',
  styleUrl:    './turisti-detalji.component.scss',
  imports: [RouterLink, DecimalPipe, UpperCasePipe, DateLocalPipe, ConfirmDialogComponent],
})
export class TuristiDetaljiComponent implements OnInit {
  tourist: TouristUserDetail | null = null;
  loading = true;
  notFound = false;

  suspendDialogOpen = false;
  activateDialogOpen = false;
  deleteDialogOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AdminTouristService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.notFound = true;
      this.loading  = false;
      return;
    }
    this.service.getById(id).subscribe({
      next:  res => { this.tourist = res.data; this.loading = false; },
      error: () => { this.notFound = true; this.loading = false; },
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  doToggle(): void {
    if (!this.tourist) return;
    this.suspendDialogOpen  = false;
    this.activateDialogOpen = false;

    const action$ = this.tourist.isActive
      ? this.service.suspend(this.tourist.id)
      : this.service.activate(this.tourist.id);

    action$.subscribe({
      next: res => {
        if (this.tourist && res.data) {
          this.tourist = { ...this.tourist, isActive: res.data.isActive };
        }
        // Reload full detail to refresh stats
        this.ngOnInit();
      },
    });
  }

  doDelete(): void {
    if (!this.tourist) return;
    this.deleteDialogOpen = false;
    this.service.delete(this.tourist.id).subscribe({
      next: () => void this.router.navigateByUrl('/admin/turisti'),
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  initials(name: string): string {
    return (name || '?')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  languageFlag(code: string): string {
    const flags: Record<string, string> = {
      en: '🇬🇧', sr: '🇷🇸', de: '🇩🇪', it: '🇮🇹',
      fr: '🇫🇷', ru: '🇷🇺', es: '🇪🇸', nl: '🇳🇱',
    };
    return flags[code] ?? '🌐';
  }

  statusBadge(): string {
    if (!this.tourist) return '';
    if (!this.tourist.isActive)        return 'badge-red';
    if (!this.tourist.isEmailVerified) return 'badge-amber';
    return 'badge-green';
  }

  statusLabel(): string {
    if (!this.tourist) return '';
    if (!this.tourist.isActive)        return '⏸ Suspendovan';
    if (!this.tourist.isEmailVerified) return '⚠ Nepotvrđen email';
    return '✅ Aktivan';
  }

  get parsedInterests(): string[] {
    if (!this.tourist?.interests) return [];
    try {
      const parsed = JSON.parse(this.tourist.interests);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
