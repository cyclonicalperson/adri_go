import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AdminTouristService, TouristUser } from '@core/services/admin-tourist.service';
import { PageRequest } from '@core/models/api-response.model';

type Tab = 'all' | 'active' | 'inactive' | 'unverified';

@Component({
  selector: 'app-turisti',
  templateUrl: './turisti.component.html',
  styleUrl: './turisti.component.scss',
  imports: [RouterLink, DateLocalPipe, ConfirmDialogComponent],
})
export class TuristiComponent implements OnInit {
  tourists: TouristUser[] = [];
  total      = 0;
  totalPages = 1;
  loading    = true;
  activeTab: Tab = 'all';

  // Counts for stat chips
  activeCount      = 0;
  inactiveCount    = 0;
  unverifiedCount  = 0;

  req: PageRequest & { accountStatus?: string } = {
    page: 1, pageSize: 15, sortBy: 'createdAt', sortDir: 'desc',
  };

  // Confirm dialog targets
  suspendTarget:  TouristUser | null = null;
  activateTarget: TouristUser | null = null;
  deleteTarget:   TouristUser | null = null;

  constructor(private service: AdminTouristService) {}

  ngOnInit(): void {
    this.loadCounts();
    this.load();
  }

  private loadCounts(): void {
    this.service.getAll({ page: 1, pageSize: 1, accountStatus: 'active' }).subscribe(r => {
      this.activeCount = r.total;
    });
    this.service.getAll({ page: 1, pageSize: 1, accountStatus: 'inactive' }).subscribe(r => {
      this.inactiveCount = r.total;
    });
    this.service.getAll({ page: 1, pageSize: 1, accountStatus: 'unverified' }).subscribe(r => {
      this.unverifiedCount = r.total;
    });
  }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.tourists   = res.data;
        this.total      = res.total;
        this.totalPages = res.totalPages;
        this.loading    = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    const statusMap: Record<Tab, string | undefined> = {
      all:        undefined,
      active:     'active',
      inactive:   'inactive',
      unverified: 'unverified',
    };
    this.req = { ...this.req, page: 1, accountStatus: statusMap[tab] };
    this.load();
  }

  onSearch(q: string): void {
    this.req = { ...this.req, search: q || undefined, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.req = { ...this.req, page: p };
      this.load();
    }
  }

  // ── Suspend / Activate ────────────────────────────────────────────────────
  confirmToggle(t: TouristUser): void {
    if (t.isActive) this.suspendTarget = t;
    else            this.activateTarget = t;
  }

  cancelSuspend():  void { this.suspendTarget  = null; }
  cancelActivate(): void { this.activateTarget = null; }

  doToggle(t: TouristUser): void {
    this.suspendTarget  = null;
    this.activateTarget = null;
    const action$ = t.isActive
      ? this.service.suspend(t.id)
      : this.service.activate(t.id);

    action$.subscribe({
      next: res => {
        const idx = this.tourists.findIndex(x => x.id === t.id);
        if (idx !== -1 && res.data) this.tourists[idx] = res.data;
        this.load();
        this.loadCounts();
      },
      error: () => {},
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  confirmDelete(t: TouristUser): void { this.deleteTarget = t; }
  cancelDelete():                void { this.deleteTarget = null; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.deleteTarget = null;
        this.load();
        this.loadCounts();
      },
      error: () => { this.deleteTarget = null; },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  initials(name: string): string {
    return (name || '?')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  statusBadge(t: TouristUser): string {
    if (!t.isActive)        return 'badge-red';
    if (!t.isEmailVerified) return 'badge-amber';
    return 'badge-green';
  }

  statusLabel(t: TouristUser): string {
    if (!t.isActive)        return '⏸ Suspendovan';
    if (!t.isEmailVerified) return '⚠ Nepotvrđen email';
    return '✅ Aktivan';
  }

  languageFlag(code: string): string {
    const flags: Record<string, string> = {
      en: '🇬🇧', sr: '🇷🇸', de: '🇩🇪', it: '🇮🇹',
      fr: '🇫🇷', ru: '🇷🇺', es: '🇪🇸', nl: '🇳🇱',
    };
    return flags[code] ?? '🌐';
  }

  get pageStart(): number { return (this.req.page - 1) * this.req.pageSize + 1; }
  get pageEnd():   number { return Math.min(this.req.page * this.req.pageSize, this.total); }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i++) {
      pages.push(i);
    }
    return pages;
  }
}
