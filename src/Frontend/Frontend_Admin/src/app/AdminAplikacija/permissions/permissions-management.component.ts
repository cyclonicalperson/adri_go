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
  type: 'grant' | 'revoke';
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

  // ── Region scope ──────────────────────────────────────────────────────
  regions: SimpleRegion[] = [];
  selectedRegionId: number | null = null;

  // ── Čuvanje ───────────────────────────────────────────────────────────
  saving = false;
  saveMsg: string | null = null;

  // ── Log izmjena — dinamički gradi se iz akcija ─────────────────────────
  changeLog: ChangeLogEntry[] = [];

  constructor(
    private userService: UserService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.userService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.users = res.data.filter(u => u.role === 'admin');
      this.usersLoading = false;
    });

    this.userService.getAllPermissions().subscribe(res => {
      this.allPermissions = res.data;
      this.permissionGroups = this.buildGroups(res.data);
    });

    this.http.get<{ data: SimpleRegion[] }>(`${environment.apiUrl}/regions?pageSize=50`).subscribe({
      next: res => { this.regions = res.data; },
      error: () => { this.regions = []; },
    });

    // Load persistent permission change log
    this.loadChangeLog();
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

  // ── Selekcija korisnika ───────────────────────────────────────────────
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
        // Ažuriraj permissionCount u listi korisnika
        const idx = this.users.findIndex(u => u.userId === userId);
        if (idx !== -1) {
          this.users[idx] = { ...this.users[idx], permissionCount: res.data.length };
        }
      },
      error: () => { this.permLoading = false; },
    });
  }

  // ── Toggle individual dozvole — ODMAH šalje na backend ──────────────────
  hasPermission(code: PermissionCode): boolean {
    return this.activePermCodes.has(code);
  }

  togglePermission(permCode: PermissionCode): void {
    if (!this.selectedUser) return;
    const perm = this.allPermissions.find(p => p.code === permCode);
    if (!perm) return;

    if (this.activePermCodes.has(permCode)) {
      // Revoke
      this.activePermCodes.delete(permCode);
      this.userService.revokePermission(this.selectedUser.userId, perm.id).subscribe({
        next: () => {
          this.addLog('revoke', permCode, this.selectedUser!.fullName);
          this.refreshPermCount(this.selectedUser!.userId, -1);
        },
        error: () => { this.activePermCodes.add(permCode); },
      });
    } else {
      // Grant
      this.activePermCodes.add(permCode);
      this.userService.grantPermission(
        this.selectedUser.userId,
        perm.id,
        this.selectedRegionId ?? undefined,
      ).subscribe({
        next: () => {
          this.addLog('grant', permCode, this.selectedUser!.fullName);
          this.refreshPermCount(this.selectedUser!.userId, +1);
        },
        error: () => { this.activePermCodes.delete(permCode); },
      });
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
        .subscribe({ next: () => { this.addLog('grant', p.code, this.selectedUser?.fullName ?? ''); done(); }, error: done });
    }
    for (const up of toRevoke) {
      this.userService.revokePermission(userId, up.permission.id)
        .subscribe({ next: () => { this.addLog('revoke', up.permission.code, this.selectedUser?.fullName ?? ''); done(); }, error: done });
    }
  }

  grantAll(): void {
    if (!this.selectedUser) return;
    const previous = new Set(this.activePermCodes);
    this.activePermCodes = new Set(this.allPermissions.map(p => p.code));
    this.allPermissions
      .filter(p => !previous.has(p.code))
      .forEach(p => this.addLog('grant', p.code, this.selectedUser?.fullName ?? ''));
    this.refreshPermCount(this.selectedUser.userId, null); // null = recompute from activePermCodes
  }

  revokeAll(): void {
    if (!this.selectedUser) return;
    const previous = new Set(this.activePermCodes);
    this.activePermCodes = new Set();
    this.allPermissions
      .filter(p => previous.has(p.code))
      .forEach(p => this.addLog('revoke', p.code, this.selectedUser?.fullName ?? ''));
    this.refreshPermCount(this.selectedUser.userId, null);
  }

  // ── Log izmjena ────────────────────────────────────────────────────────
  private addLog(type: 'grant' | 'revoke', permCode: string, targetName: string): void {
    const entry: ChangeLogEntry = {
      icon: type === 'grant' ? '✅' : '✗',
      label: type === 'grant' ? 'Dozvola dodata' : 'Dozvola uklonjena',
      user: 'Ja',
      perm: permCode,
      entity: targetName,
      time: new Date().toLocaleString('sr-RS'),
      type,
    };
    this.changeLog.unshift(entry);
    if (this.changeLog.length > 50) this.changeLog = this.changeLog.slice(0, 50);

    // Persist in localStorage (nema backend endpoint za permission log)
    this.saveChangeLog();
  }

  private saveChangeLog(): void {
    try {
      localStorage.setItem('th_permission_log', JSON.stringify(this.changeLog));
    } catch { /* ignore */ }
  }

  // Učitaj log iz localStorage pri inicijalizaciji
  private loadChangeLog(): void {
    try {
      const raw = localStorage.getItem('th_permission_log');
      this.changeLog = raw ? JSON.parse(raw) : [];
    } catch {
      this.changeLog = [];
    }
  }

  // Ažurira permissionCount u listi korisnika odmah
  // delta=null means recompute from current activePermCodes
  private refreshPermCount(userId: number, delta: number | null): void {
    const newCount = delta === null
      ? this.activePermCodes.size
      : Math.max(0, (this.users.find(u => u.userId === userId)?.permissionCount ?? 0) + delta);

    const idx = this.users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], permissionCount: newCount };
    }
    if (this.selectedUser?.userId === userId) {
      this.selectedUser = { ...this.selectedUser, permissionCount: newCount };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
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
