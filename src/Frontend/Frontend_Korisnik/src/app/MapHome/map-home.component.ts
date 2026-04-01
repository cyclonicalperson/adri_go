import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router'; 
import { LocationDetailsCardComponent } from '../location-details-card/location-details-card'; 
// Import može da ostane na vrhu, ali ga brišemo iz @Component.imports da sklonimo Warning

@Component({
  selector: 'app-map-home',
  standalone: true, 
  // IZBRISAN FiltersComponent odavde jer ideš preko rute!
  imports: [CommonModule, LocationDetailsCardComponent], 
  templateUrl: './map-home.component.html',
  styleUrls: ['./map-home.component.css']
})
export class MapHomeComponent implements OnInit {

  selectedLocation: any = null;

  // Mock podaci za Budvu
  oldTownBudvaData = {
    id: 1, // Dodali smo ID da bi navigacija bila logična
    category: 'Culture',
    imageUrl: 'assets/Budva.jpg', 
    title: 'Old Town Budva',
    rating: 4.9,
    reviews: 3502,
    distance: 0.8, 
    status: 'Open now'
  };

  constructor(private router: Router) { }

  ngOnInit(): void {}

  openOldTownBudva(): void {
    console.log('Kliknut pin za Budvu');
    this.selectedLocation = this.oldTownBudvaData;
  }

  closeLocationDetails(): void {
    this.selectedLocation = null;
  }

  onSearch(event: any): void {
    // Ovde ćeš kasnije dodati logiku za pretragu lokacija
  }

  // Prebacivanje na ekran sa listom (tri crtice ikonica)
  toggleListView(): void {
    this.router.navigate(['/location-list']);
  }

  // Otvaranje filtera preko rute
  openFilters(): void {
    console.log('Rerutiranje na filtere...');
    this.router.navigate(['/filters']);
  }

  // Navigacija na puni ekran sa detaljima (iz male kartice na mapi)
  viewFullDetails() {
    if (this.selectedLocation) {
      console.log('Otvaram detalje za ID:', this.selectedLocation.id);
      // Navigacija na /location-details/1
      this.router.navigate(['/location-details', this.selectedLocation.id]); 
    }
  }
}