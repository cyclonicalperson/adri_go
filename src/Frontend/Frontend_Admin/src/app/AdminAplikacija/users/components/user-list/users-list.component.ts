import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { User, Role } from '@core/models/user.model';
import { PageRequest } from '@core/models/api-response.model';
import { AdminRole } from '@core/auth/auth.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';

type Tab = 'all' | 'active' | 'suspended';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  imports: [ConfirmDialogComponent, DateLocalPipe],
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  total = 0;
  totalPages = 1;
  loading = true;
  deleteTarget: User | null = null;
  activeTab: Tab = 'all';

  // Counts — loaded from separate calls so cards stay accurate
  activeCount = 0;
  suspendedCount = 0;
  pendingCount = 0;

  req: PageRequest & { role?: AdminRole; accountStatus?: string } = {
    page: 1, pageSize: 10, sortBy: 'fullName', sortDir: 'asc',
  };

  constructor(
    private service: UserService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.service.getRoles().subscribe(res => { this.roles = res.data; });
    this.loadCounts();
    this.load();
  }

  private loadCounts(): void {
    // Globalni brojevi — nezavisni od filtera stranice
    this.service.getAll({ page: 1, pageSize: 1000 }).subscribe(res => {
      this.activeCount = res.data.filter(u => u.accountStatus === 'active').length;
      this.suspendedCount = res.data.filter(u => u.accountStatus === 'suspended').length;
    });
    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' }).subscribe({
      next: res => { this.pendingCount = res.total; },
      error: () => { this.pendingCount = 0; },
    });
  }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.users = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    // Mapiramo tab na accountStatus parametar koji backend razumije
    const statusMap: Record<Tab, string | undefined> = {
      all: undefined,
      active: 'active',
      suspended: 'suspended',
    };
    this.req = { ...this.req, page: 1, accountStatus: statusMap[tab] };
    this.load();
  }

  onSearch(q: string): void { this.req = { ...this.req, search: q, page: 1 }; this.load(); }

  onRoleChange(role: string): void {
    this.req = { ...this.req, role: (role || undefined) as AdminRole | undefined, page: 1 };
    this.load();
  }

  onActiveChange(val: string): void {
    const map: Record<string, string | undefined> = {
      '': undefined,
      'true': 'active',
      'false': 'suspended',
    };
    this.req = { ...this.req, accountStatus: map[val], page: 1 };
    this.load();
  }

  onSort(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) { this.req = { ...this.req, page: p }; this.load(); }
  }

  goNew(): void { this.router.navigate(['/admin/users/new']); }
  goEdit(u: User): void { this.router.navigate(['/admin/users', u.userId, 'edit']); }

  // ── Suspend / Activate ────────────────────────────────────────────────
  toggleSuspend(u: User): void {
    const actionLabel = u.isActive ? 'suspendujete' : 'aktivirate';
    const confirmed = window.confirm(`Da li ste sigurni da želite da ${actionLabel} nalog "${u.fullName}"?`);
    if (!confirmed) return;

    const action$ = u.isActive
      ? this.service.suspend(u.userId)
      : this.service.activate(u.userId);

    action$.subscribe({
      next: res => {
        const updated = res.data;
        const idx = this.users.findIndex(x => x.userId === u.userId);
        if (idx !== -1 && updated) this.users[idx] = { ...this.users[idx], ...updated, isActive: updated.accountStatus === 'active' };
        this.load();
        this.loadCounts();
      },
      error: () => { },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  confirmDelete(u: User): void { this.deleteTarget = u; }
  cancelDelete(): void { this.deleteTarget = null; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.userId).subscribe({
      next: () => {
        this.deleteTarget = null;
        // Ukloni iz lokalne liste odmah, pa osvježi
        this.load();
        this.loadCounts();
      },
      error: () => { this.deleteTarget = null; },
    });
  }

  printReport(): void { window.print(); }

  get pageStart(): number { return (this.req.page - 1) * this.req.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.req.page * this.req.pageSize, this.total); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  // Mapira DB role ENUM ('superadmin'|'admin') na badge klasu
  roleBadge(role?: string): string {
    return { superadmin: 'badge-red', admin: 'badge-blue' }[role ?? ''] ?? 'badge-gray';
  }

  roleLabel(role?: string): string {
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[role ?? ''] ?? (role ?? '—');
  }
}
