import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // Uvezi Router za navigaciju
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-find-stay-screen',
  standalone: true,
  imports: [CommonModule], // Ovde ostaje samo ono što je potrebno template-u
  templateUrl: './find-stay-screen.component.html',
  styleUrls: ['./find-stay-screen.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FindStayScreenComponent implements OnInit {
  
  exploreItems = [
    { id: 1, image: 'assets/Budva.jpg', name: 'Budva' },
    { id: 2, image: 'assets/Kotor.jpg', name: 'Kotor' },
    { id: 3, image: 'assets/Durmitor.jpg', name: 'Durmitor' },
    { id: 4, image: 'assets/Budva.jpg', name: 'Budva 2' }
  ];

  lastMinuteItems = [
    { id: 1, image: 'assets/Budva.jpg', name: 'Apartman 1', price: 300 },
    { id: 2, image: 'assets/Kotor.jpg', name: 'Apartman 2', price: 355 },
    { id: 3, image: 'assets/Durmitor.jpg', name: 'Apartman 3', price: 280 }
  ];

  // Ubaci router u konstruktor
  constructor(private router: Router) { }

  ngOnInit(): void { }

  // Funkcija koja se poziva na klik Search dugmeta
  goToResults() {
  // Dodaj /admin/ ispred rezultati
  this.router.navigate(['/admin/rezultati']); 
}
}