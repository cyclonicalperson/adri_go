import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-details.html', 
  styleUrls: ['./location-details.css']
})
export class LocationDetailsComponent implements OnInit {
  locationId: string | null = null;
  
  // Putanja do default slike
  defaultImage = 'assets/plaza.jpg';

  // Mock podaci (ostavio sam image prazan da bi se testirao fallback na plaza.jpg)
  locationData: any = {
    title: 'Old Town Budva',
    category: 'Culture',
    rating: 4.8,
    reviews: 1240,
    address: 'Old Town, Budva 85310',
    description: 'The old town of Budva is one of the oldest urban centers on the Adriatic, more than 2,500 years old. Within its walls he finds a labyrinth of narrow...',
    workingHours: '00-24h',
    pass: 'Free',
    image: '' // Ako ovde staviš 'assets/Budva.jpg', prikazaće nju
  };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.locationId = this.route.snapshot.paramMap.get('id');
  }

  // Pametan getter za sliku
  get heroImage(): string {
    return this.locationData?.image ? this.locationData.image : this.defaultImage;
  }

  goBack() {
    window.history.back();
  }

  getDirections() {
    console.log('Otvaram Google Maps rutu za:', this.locationData.title);
  }
}