import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../shared/models/user.model';
import { AdminCountPipe } from '../../shared/pipes/admin-count.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, AdminCountPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  users = signal<User[]>([]);
  loading = signal(true);
  error = signal('');
  today = new Date();
  searchQuery = signal('');

  currentUser = this.auth.currentUser;

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.users().filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  constructor(private auth: AuthService, private userService: UserService) {}

  ngOnInit() {
    this.userService.getAll().subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.error.set('Greška pri učitavanju korisnika.'); this.loading.set(false); }
    });
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  logout() {
    this.auth.logout();
  }

  getRoleBadge(role: string): string {
    return role === 'Admin' ? 'badge-admin' : 'badge-user';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getDayName(): string {
    const days = ['Nedelja','Ponedeljak','Utorak','Sreda','Četvrtak','Petak','Subota'];
    return days[this.today.getDay()];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('sr-RS');
  }
}
