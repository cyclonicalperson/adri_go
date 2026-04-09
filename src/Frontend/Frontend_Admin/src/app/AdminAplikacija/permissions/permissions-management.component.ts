import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserService } from '@core/services/user.service';
import { User, Permission, UserPermission, PermissionCode } from '@core/models/user.model';
import { environment } from '@env/environment';

interface PermissionGroup {
  category: string;
  label: string;
  icon: string;
  permissions: Permission[];
}

interface SimpleRegion {
  regionId: number;
  name: string;
}

interface ChangeLogEntry {
  icon: string;
  label: string;
  user: string;
  perm: string;
  entity: string;
  time: string;
  type: 'grant' | 'revoke' | 'approve';
}

@Component({
  selector: 'app-permissions-management',
  templateUrl: './permissions-management.component.html',
  styleUrl: './permissions-management.component.scss',
  imports: [FormsModule],
})
export class PermissionsManagementComponent implements OnInit {

  // ── Korisnici ─────────────────────────────────────────────────────────
  users: User[] = [];
  selectedUser: User | null = null;
  userSearch = '';
  usersLoading = true;

  // ── Sve dostupne dozvole ──────────────────────────────────────────────
  allPermissions: Permission[] = [];
  permissionGroups: PermissionGroup[] = [];

  // ── Aktivne dozvole selektovanog korisnika ────────────────────────────
  userPermissions: UserPermission[] = [];
  activePermCodes = new Set<PermissionCode>();
  permLoading = false;

  // ── Region scope (opcionalno — null znači globalna dozvola) ───────────
  regions: SimpleRegion[] = [];
  selectedRegionId: number | null = null;

  // ── Čuvanje ───────────────────────────────────────────────────────────
  saving = false;
  saveMsg: string | null = null;

  readonly changeLog: ChangeLogEntry[] = [
    { icon: '✅', label: 'Dozvola dodata', user: 'Marko Petrović', perm: 'create_event', entity: 'Ana Kovačević', time: 'Pre 12 min', type: 'grant' },
    { icon: '✗', label: 'Dozvola uklonjena', user: 'Marko Petrović', perm: 'delete_place', entity: 'Nikola Đurić', time: 'Pre 1 sat', type: 'revoke' },
    { icon: '✅', label: 'Dozvola dodata', user: 'Marko Petrović', perm: 'view_analytics', entity: 'Jovana Milić', time: 'Pre 3 sata', type: 'grant' },
    { icon: '✅', label: 'Admin odobren', user: 'Marko Petrović', perm: '—', entity: 'Stefan Radović', time: 'Pre 1 dan', type: 'approve' },
  ];

  constructor(
    private userService: UserService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    // Admini (ne superadmin — superadmin ima sve dozvole automatski)
    this.userService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.users = res.data.filter(u => u.role === 'admin');
      this.usersLoading = false;
    });

    this.userService.getAllPermissions().subscribe(res => {
      this.allPermissions = res.data;
      this.permissionGroups = this.buildGroups(res.data);
    });

    // Regioni za scope — direktan HTTP poziv da ne zavisimo od RegionService
    this.http.get<{ data: SimpleRegion[] }>(`${environment.apiUrl}/regions?pageSize=50`)
      .subscribe({
        next: res => { this.regions = res.data; },
        error: () => { this.regions = []; },
      });
  }

  private buildGroups(perms: Permission[]): PermissionGroup[] {
    const groupMeta: Record<string, { label: string; icon: string }> = {
      content: { label: 'Sadržaj', icon: '📝' },
      analytics: { label: 'Analitika', icon: '📊' },
      users: { label: 'Korisnici', icon: '👥' },
    };

    const grouped = new Map<string, Permission[]>();
    for (const p of perms) {
      if (!grouped.has(p.category)) grouped.set(p.category, []);
      grouped.get(p.category)!.push(p);
    }

    return Array.from(grouped.entries()).map(([cat, catPerms]) => ({
      category: cat,
      label: groupMeta[cat]?.label ?? cat,
      icon: groupMeta[cat]?.icon ?? '🔑',
      permissions: catPerms,
    }));
  }

  // ── Selekcija korisnika ──────────────────────────────────────────────
  get filteredUsers(): User[] {
    const q = this.userSearch.toLowerCase();
    return this.users.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  selectUser(u: User): void {
    this.selectedUser = u;
    this.activePermCodes = new Set();
    this.userPermissions = [];
    this.saveMsg = null;
    this.loadUserPerms(u.userId);
  }

  private loadUserPerms(userId: number): void {
    this.permLoading = true;
    this.userService.getUserPermissions(userId).subscribe({
      next: res => {
        this.userPermissions = res.data;
        this.activePermCodes = new Set(res.data.map(up => up.permission.code));
        this.permLoading = false;
      },
      error: () => { this.permLoading = false; },
    });
  }

  // ── Toggle dozvole ────────────────────────────────────────────────────
  hasPermission(code: PermissionCode): boolean {
    return this.activePermCodes.has(code);
  }

  /** Called from template with perm.code */
  togglePermission(permCode: PermissionCode): void {
    if (!this.selectedUser) return;
    const perm = this.allPermissions.find(p => p.code === permCode);
    if (!perm) return;

    if (this.activePermCodes.has(permCode)) {
      this.activePermCodes.delete(permCode);
      this.userService.revokePermission(this.selectedUser.userId, perm.id)
        .subscribe({ error: () => this.activePermCodes.add(permCode) });
    } else {
      this.activePermCodes.add(permCode);
      this.userService.grantPermission(
        this.selectedUser.userId,
        perm.id,
        this.selectedRegionId ?? undefined,
      ).subscribe({ error: () => this.activePermCodes.delete(permCode) });
    }
  }

  // ── Skupno čuvanje ────────────────────────────────────────────────────
  savePermissions(): void {
    if (!this.selectedUser) return;
    this.saving = true;
    this.saveMsg = null;

    const originalCodes = new Set(this.userPermissions.map(up => up.permission.code));
    const toGrant = this.allPermissions.filter(p => this.activePermCodes.has(p.code) && !originalCodes.has(p.code));
    const toRevoke = this.userPermissions.filter(up => !this.activePermCodes.has(up.permission.code));

    const userId = this.selectedUser.userId;
    let pending = toGrant.length + toRevoke.length;

    if (pending === 0) { this.saving = false; this.saveMsg = 'Nema promena.'; return; }

    const done = () => {
      pending--;
      if (pending === 0) {
        this.saving = false;
        this.saveMsg = 'Dozvole sačuvane.';
        this.loadUserPerms(userId);
        setTimeout(() => { this.saveMsg = null; }, 3000);
      }
    };

    for (const p of toGrant) {
      this.userService.grantPermission(userId, p.id, this.selectedRegionId ?? undefined)
        .subscribe({ next: done, error: done });
    }
    for (const up of toRevoke) {
      this.userService.revokePermission(userId, up.permission.id)
        .subscribe({ next: done, error: done });
    }
  }

  grantAll(): void { this.activePermCodes = new Set(this.allPermissions.map(p => p.code)); }
  revokeAll(): void { this.activePermCodes = new Set(); }

  // ── Helperi ────────────────────────────────────────────────────────────
  permCount(u: User): number { return u.permissionCount ?? 0; }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  avatarBg(name: string): string {
    const colors = ['#dcfce7', '#eff6ff', '#fef3c7', '#f3e8ff', '#fef2f2'];
    return colors[name.charCodeAt(0) % colors.length];
  }

  avatarColor(name: string): string {
    const colors = ['#15803d', '#1e40af', '#92400e', '#5b21b6', '#991b1b'];
    return colors[name.charCodeAt(0) % colors.length];
  }
}
