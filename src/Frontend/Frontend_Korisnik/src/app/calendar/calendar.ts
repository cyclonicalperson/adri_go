import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent {
  
  // Grupisaćemo događaje po mesecima (kao na pravim aplikacijama)
  upcomingEvents = [
    {
      id: 1,
      title: 'Old Town Budva Tour',
      date: 'April 15, 2026',
      time: '10:00 AM',
      location: 'Budva, Montenegro',
      type: 'Culture',
      image: 'assets/Budva.jpg'
    },
    {
      id: 2,
      title: 'Mogren Beach Yoga',
      date: 'April 18, 2026',
      time: '08:30 AM',
      location: 'Budva',
      type: 'Activity',
      image: 'assets/Morgen.jpg'
    }
  ];

  pastEvents = [
    {
      id: 3,
      title: 'Lovćen Hiking',
      date: 'March 20, 2026',
      time: '09:00 AM',
      location: 'Cetinje',
      type: 'Nature',
      image: 'assets/Lovcen.jpg'
    }
  ];

  constructor(private router: Router) {}

  goBack() {
    window.history.back();
  }

  viewEventDetails(id: number) {
    this.router.navigate(['/location-details', id]);
  }
}