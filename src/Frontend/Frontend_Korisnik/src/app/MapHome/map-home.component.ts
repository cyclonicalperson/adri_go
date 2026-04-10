import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { LocationDetailsCardComponent } from '../location-details-card/location-details-card';
import { SideMenuComponent } from '../SideMenu/side-menu.component';

@Component({
  selector: 'app-map-home',
  standalone: true,
  imports: [CommonModule, LocationDetailsCardComponent, SideMenuComponent],
  templateUrl: './map-home.component.html',
  styleUrls: ['./map-home.component.css']
})
export class MapHomeComponent implements AfterViewInit, OnDestroy {

  selectedLocation: any = null;
  isMenuOpen = false;
  activeTab: string = 'map';
  private map: L.Map | undefined;

  // Pravimo niz lokacija, svaka ima svoje koordinate (lat, lng) i podatke
  locationsList = [
    {
      id: 1,
      lat: 42.2784, 
      lng: 18.8372,
      category: 'Culture',
      imageUrl: 'assets/Budva.jpg',
      title: 'Old Town Budva',
      rating: 4.9,
      reviews: 3502,
      distance: 0.8,
      status: 'Open now'
    },
    {
      id: 2,
      lat: 42.2760, 
      lng: 18.8400,
      category: 'Nature',
      imageUrl: 'assets/plaza.jpg', // Koristimo plazu kao fallback ovde
      title: 'Mogren Beach',
      rating: 4.7,
      reviews: 1205,
      distance: 1.2,
      status: 'Open now'
    }
  ];

  // U konstruktor smo ubacili NgZone
  constructor(
    private router: Router, 
    private zone: NgZone, 
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: false
    }).setView([42.2784, 18.8372], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const locationIcon = L.divIcon({
      html: '<div style="font-size: 32px; text-shadow: 0 4px 8px rgba(0,0,0,0.3); cursor: pointer;">📍</div>',
      className: 'custom-emoji-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Prolazimo kroz sve naše lokacije i crtamo pinove
    this.locationsList.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lng], { icon: locationIcon }).addTo(this.map!);

      // Dodali smo 'L.LeafletMouseEvent' tip da rešimo TypeScript grešku
      marker.on('click', (event: L.LeafletMouseEvent) => {
        
        // 1. OVO JE KLJUČNO: Sprečava da klik prođe "kroz" pin i aktivira samu mapu ispod
        L.DomEvent.stopPropagation(event as any);

        // 2. Budimo Angular i naređujemo mu da odmah nacrta HTML
        this.zone.run(() => {
          this.selectedLocation = loc;
          this.cdr.detectChanges(); // Apsolutna potvrda osvežavanja!
        });
        
      });
    });
  }

  closeLocationDetails(): void {
    this.selectedLocation = null;
  }

  viewFullDetails() {
    if (this.selectedLocation) {
      this.router.navigate(['/location-details', this.selectedLocation.id]);
    }
  }

  // --- Ostale navigacione metode ostaju iste ---
  onSearch(event: any): void {}

  toggleListView(): void {
    this.activeTab = 'list';
    this.router.navigate(['/location-list']);
  }

  openFilters(): void {
    this.router.navigate(['/filters']);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToSaved(): void {
    this.activeTab = 'saved';
    this.router.navigate(['/saved']);
  }

  goToTickets(): void {
    this.activeTab = 'tickets';
    this.router.navigate(['/tickets']);
  }

  goToAccount(): void {
    this.activeTab = 'account';
    this.router.navigate(['/account']);
  }
}