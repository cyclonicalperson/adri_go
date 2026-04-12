import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Role } from '@core/models/user.model';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';

interface RoleInfo {
  roleName: string;
  badge: BadgeVariant;
  permissions: string[];
}

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './roles-permissions.component.html',
  styleUrl: './roles-permissions.component.scss',
})

export class RolesPermissionsComponent {
  @Input() roles: Role[] = [];
  @Input() selectedRoleId: number | null = null;
  @Output() roleSelected = new EventEmitter<number>();

  readonly roleInfo: Record<string, RoleInfo> = {
    superadmin: {
      roleName: 'Super Administrator',
      badge: 'danger',
      permissions: [
        'Upravljanje svim lokacijama, aktivnostima, dogadjajima i rutama',
        'Upravljanje adminima i rolama',
        'Moderacija svih recenzija',
        'Pristup svim analitikama',
        'Upravljanje organizacijama i dozvolama',
        'Odobravanje zahteva za registraciju',
      ],
    },
    admin: {
      roleName: 'Administrator',
      badge: 'info',
      permissions: [
        'Kreiranje i upravljanje dodeljenim sadržajem',
        'Pregled recenzija vlastitih objava',
        'Pregled analitike za vlastite entitete',
        'Pristup ograničen dodeljenim dozvolama',
      ],
    },
  };

  getInfo(roleName: string): RoleInfo | null {
    return this.roleInfo[roleName] ?? null;
  }

  select(roleId: number): void {
    this.roleSelected.emit(roleId);
  }
}
