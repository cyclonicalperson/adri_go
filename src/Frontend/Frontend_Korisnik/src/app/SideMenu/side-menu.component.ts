import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.css']
})
export class SideMenuComponent {
  @Output() onClose = new EventEmitter<void>();

  constructor(private router: Router) {}

  // Navigacione funkcije
  logout() {
    console.log('Korisnik se odjavljuje...');
    this.router.navigate(['/login']);
  }

  goToAccount() {
  console.log('Navigacija na Account...');
  this.router.navigate(['/account']);
}
  goToSaved() { 
    this.router.navigate(['/saved']) 
  }
  goToCalendar() { 
    this.router.navigate(['/calendar'])
   }
  goToTickets() {
     this.router.navigate(['/tickets']);
     }
  goToNotifications() { 
    this.router.navigate(['/notifications']); 
  }
  goToSettings() { 
    this.router.navigate(['/settings']);
   }
}