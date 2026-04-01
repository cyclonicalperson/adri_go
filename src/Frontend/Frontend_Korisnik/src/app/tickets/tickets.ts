import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tickets.html',
  styleUrls: ['./tickets.css']
})
export class TicketsComponent {
  activeTab: string = 'Active';

  upcomingTickets = [
    {
      id: 1,
      title: 'Sea Dance Festival',
      location: 'Budva, Montenegro',
      date: 'June 24, 2026',
      time: '17:30',
      userName: 'Alex Johnson',
      orderId: '#ADRI-88219',
      status: 'ACTIVE',
      image: 'assets/Budva.jpg'
    },
    {
      id: 2,
      title: 'Podgorica Museums',
      location: 'Podgorica',
      date: 'June 30, 2026',
      time: '09:00',
      userName: 'Alex Johnson',
      orderId: '#ADRI-88212',
      status: 'ACTIVE',
      image: 'assets/Durmitor.jpg'
    }
  ];

  pastTickets = [
    {
      id: 3,
      title: 'Venice Gondola Ride',
      location: 'Venice',
      date: 'Aug 12, 2025',
      time: '11:00',
      userName: 'Alex Johnson',
      orderId: '#ADRI-88219',
      image: 'assets/Morgen.jpg'
    }
  ];

  constructor(private router: Router) {}

  goBack() {
    window.history.back();
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  openTicket(id: number) {
    console.log('Otvaram digitalni tiket za ID:', id);
    // Ovde bi išla logika za QR kod
  }
}