import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { User, Role } from '@core/models/user.model';
import { PageRequest } from '@core/models/api-response.model';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { BadgeVariant } from '@shared/components/badge/badge.component';

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

  activeCount = 0;
  suspendedCount = 0;
  pendingCount = 0;

  req: PageRequest & { roleId?: number; isActive?: boolean } = {
    page: 1, pageSize: 10, sortBy: 'fullName', sortDir: 'asc',
  };

  constructor(
    private service: UserService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.service.getRoles().subscribe(res => { this.roles = res.data; });
    this.load();
    this.loadPendingCount();
  }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.users = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.activeCount = res.data.filter(u => u.isActive).length;
        this.suspendedCount = res.data.filter(u => !u.isActive).length;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private loadPendingCount(): void {
    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' }).subscribe({
      next: res => { this.pendingCount = res.total; },
      error: () => { this.pendingCount = 0; },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.req = {
      ...this.req, page: 1,
      isActive: tab === 'all' ? undefined : tab === 'active',
    };
    this.load();
  }

  onSearch(q: string): void { this.req = { ...this.req, search: q, page: 1 }; this.load(); }
  onRoleChange(id: string): void { this.req = { ...this.req, roleId: id ? +id : undefined, page: 1 }; this.load(); }
  onActiveChange(val: string): void {
    const map: Record<string, boolean | undefined> = { '': undefined, 'true': true, 'false': false };
    this.req = { ...this.req, isActive: map[val], page: 1 };
    this.load();
  }
  onSort(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }
  onPage(p: number): void { if (p >= 1 && p <= this.totalPages) { this.req = { ...this.req, page: p }; this.load(); } }

  goNew(): void { this.router.navigate(['/admin/users/new']); }
  goEdit(u: User): void { this.router.navigate(['/admin/users', u.userId, 'edit']); }
  confirmDelete(u: User): void { this.deleteTarget = u; }
  cancelDelete(): void { this.deleteTarget = null; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.userId).subscribe(() => { this.deleteTarget = null; this.load(); });
  }
  printReport(): void { window.print(); }

  get pageStart(): number { return (this.req.page - 1) * this.req.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.req.page * this.req.pageSize, this.total); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i++) pages.push(i);
    return pages;
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  roleBadge(role?: string): string {
    return { ADMIN: 'badge-red', ORG: 'badge-blue', TOURIST: 'badge-green' }[role ?? ''] ?? 'badge-gray';
  }

  roleLabel(role?: string): string {
    return { ADMIN: 'Super Admin', ORG: 'Organizacija', TOURIST: 'Turist' }[role ?? ''] ?? (role ?? '—');
  }
}
