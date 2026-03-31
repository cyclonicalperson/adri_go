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
    ADMIN: {
      roleName: 'Administrator',
      badge: 'danger',
      permissions: [
        'Upravljanje svim destinacijama, objektima, dogadjajima i rutama',
        'Upravljanje korisnicima i rolama',
        'Moderacija recenzija',
        'Pristup svim analitikama',
        'Upravljanje organizacijama',
      ],
    },
    ORG: {
      roleName: 'Organizacija',
      badge: 'info',
      permissions: [
        'Kreiranje i upravljanje vlastitim dogadjajima',
        'Pregled recenzija vlastitih dogadjaja',
        'Pregled analitike za vlastite entitete',
      ],
    },
    TOURIST: {
      roleName: 'Turist',
      badge: 'success',
      permissions: [
        'Pregled destinacija, objekata, dogadjaja i ruta',
        'Pisanje recenzija',
        'Čuvanje favorita',
        'Pristup preporukama',
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
