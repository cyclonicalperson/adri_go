import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule],
  // IZBRIŠI ".component" iz putanje ispod:
  templateUrl: './location-details.html', 
  styleUrls: ['./location-details.css']
})
export class LocationDetailsComponent implements OnInit {
  locationId: string | null = null;

  // Ovde bi u realnoj aplikaciji išao poziv servisu. Za sada koristimo mock.
  locationData = {
    title: 'Old Town Budva',
    category: 'Culture',
    rating: 4.8,
    reviews: 1240,
    address: 'Old Town, Budva 85310',
    description: 'The old town of Budva is one of the oldest urban centers on the Adriatic, more than 2,500 years old. Within its walls he finds a labyrinth of narrow...',
    workingHours: '00-24h',
    pass: 'Free',
    image: 'assets/Budva.jpg'
  };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Uzimamo ID iz rute (npr. /location-details/2)
    this.locationId = this.route.snapshot.paramMap.get('id');
  }

  goBack() {
    // Vraćamo korisnika na prethodnu stranu
    window.history.back();
  }

  getDirections() {
    console.log('Otvaram Google Maps za:', this.locationData.title);
  }
}