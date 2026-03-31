import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '@core/services/user.service';
import { User } from '@core/models/user.model';

interface Entity {
  id: string;
  name: string;
  type: string;
  location: string;
  icon: string;
  iconBg: string;
}

interface PermDef {
  key: string;
  desc: string;
}

interface LogEntry {
  actionLabel: string;
  type: 'added' | 'removed' | 'approved' | 'pending';
  user: string;
  permission: string;
  entity: string;
  time: string;
}

@Component({
  selector: 'app-permissions-management',
  templateUrl: './permissions-management.component.html',
  styleUrl: './permissions-management.component.scss',
  imports: [FormsModule],
})
export class PermissionsManagementComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  selectedEntity: Entity | null = null;
  userSearch = '';
  saving = false;

  // Active permissions for the selected user+entity combination
  activePermissions = new Set<string>(['manage_place', 'create_event', 'add_users', 'view_analytics']);

  readonly allPermissions: PermDef[] = [
    { key: 'manage_place', desc: 'Izmena podataka, slika, radno vreme' },
    { key: 'create_event', desc: 'Kreiranje eventa u ovoj lokaciji' },
    { key: 'add_users', desc: 'Dodavanje zaposlenih i tim dozvole' },
    { key: 'view_analytics', desc: 'Statistika lokacije' },
    { key: 'delete_place', desc: 'Brisanje lokacije iz sistema' },
    { key: 'manage_activity', desc: 'Upravljanje aktivnostima lokacije' },
  ];

  readonly availableEntities: Entity[] = [
    { id: '1', name: 'Kafić "Centar"', type: 'Lokacija', location: 'Kragujevac', icon: '☕', iconBg: '#f0fdf4' },
    { id: '2', name: 'Grad Kragujevac', type: 'Grad', location: 'Šumadija', icon: '🏙️', iconBg: '#eff6ff' },
  ];

  readonly changeLog: LogEntry[] = [
    { actionLabel: '✅ Dozvola dodata', type: 'added', user: 'Ana P.', permission: 'add_users', entity: 'Kafić Centar', time: 'Pre 12 min' },
    { actionLabel: '✗ Dozvola uklonjena', type: 'removed', user: 'Marko J.', permission: 'delete_place', entity: 'Grad Novi Sad', time: 'Pre 1 sat' },
    { actionLabel: '✅ Nova lokacija', type: 'added', user: 'Jelena M.', permission: 'manage_place', entity: 'Spa Vrnjci', time: 'Pre 2 sata' },
    { actionLabel: '🔐 Zahtev odobren', type: 'approved', user: 'Stefan K.', permission: 'verify_event', entity: 'Beograd', time: 'Pre 5 sati' },
    { actionLabel: '⏳ Zahtev na čekanju', type: 'pending', user: 'Novi admin', permission: 'manage_place', entity: 'Niš', time: 'Pre 1 dan' },
  ];

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.getAll({ page: 1, pageSize: 50 }).subscribe(res => {
      this.users = res.data;
    });
  }

  get filteredUsers(): User[] {
    const q = this.userSearch.toLowerCase();
    return this.users.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  selectUser(u: User): void {
    this.selectedUser = u;
    this.selectedEntity = null;
    this.activePermissions = new Set(['manage_place', 'create_event', 'view_analytics']);
  }

  selectEntity(e: Entity): void {
    this.selectedEntity = e;
  }

  hasPermission(key: string): boolean {
    return this.activePermissions.has(key);
  }

  togglePermission(key: string): void {
    if (this.activePermissions.has(key)) {
      this.activePermissions.delete(key);
    } else {
      this.activePermissions.add(key);
    }
  }

  savePermissions(): void {
    this.saving = true;
    // TODO: call API to save permissions for selectedUser + selectedEntity
    setTimeout(() => { this.saving = false; }, 800);
  }

  permCount(u: User): number {
    // Placeholder — would come from API
    return 3;
  }

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
