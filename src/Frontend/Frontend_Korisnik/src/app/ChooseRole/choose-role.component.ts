import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // <-- 1. Dodaj ovaj import

@Component({
  selector: 'app-choose-role',
  standalone: true,
  imports: [CommonModule], // <-- 2. Ubaci ga ovde
  templateUrl: './choose-role.component.html',
  styleUrls: ['./choose-role.component.css']
})
export class ChooseRoleComponent {
  // Čuvamo izabranu ulogu, podrazumevano je turista
  selectedRole: 'tourist' | 'admin' = 'tourist';

  // Ubačen Router u konstruktor
  constructor(private router: Router) {}

  // Metoda za promenu uloge na klik
  selectRole(role: 'tourist' | 'admin'): void {
    this.selectedRole = role;
  }

  // Akcija za Continue dugme
  onContinue(): void {
    console.log('Izabrana uloga:', this.selectedRole);
    // Kada korisnik izabere ulogu i klikne Continue, ide na registraciju profila
    this.router.navigate(['/register']);
  }
}