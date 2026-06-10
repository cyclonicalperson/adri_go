import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-choose-role',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choose-role.component.html',
  styleUrls: ['./choose-role.component.css']
})
export class ChooseRoleComponent {
  selectedRole: 'tourist' | 'admin' = 'tourist';

  constructor(private router: Router) {}

  selectRole(role: 'tourist' | 'admin'): void {
    this.selectedRole = role;
  }

  goBack(): void {
    window.history.back();
  }

  onContinue(): void {
    if (this.selectedRole === 'admin') {
      window.location.assign(`${environment.adminAppUrl}/register`);
      return;
    }

    this.router.navigate(['/register']);
  }
}
