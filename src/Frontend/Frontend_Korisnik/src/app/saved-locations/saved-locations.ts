import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LocationService, Location } from '../services/location.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-saved-locations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved-locations.html',
  styleUrls: ['./saved-locations.css']
})
export class SavedLocationsComponent implements OnInit {
  activeFilter: string = 'All';
  defaultImage: string = 'assets/plaza.jpg';
  isLoading: boolean = true;
  
  // URL tvog .NET Backenda za slike
  readonly IMAGE_BASE_URL = 'http://localhost:5125/'; 

  savedItems: any[] = [];

  constructor(
    private router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Provera da li je korisnik ulogovan pre nego što uopšte tražimo podatke
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadSavedLocations();
  }

  loadSavedLocations() {
    this.isLoading = true;
    
    // Pozivamo novi endpoint koji vraća listu DTO objekata
    this.locationService.getMySavedPosts().subscribe({
      next: (posts: Location[]) => {
        this.savedItems = posts.map(post => {
          
          // Obrada slika
          const imagesArr = this.locationService.parseImages(post.images);
          let firstImage = imagesArr.length > 0 ? imagesArr[0] : this.defaultImage;

          if (firstImage !== this.defaultImage && !firstImage.startsWith('http')) {
            const cleanPath = firstImage.startsWith('/') ? firstImage.substring(1) : firstImage;
            firstImage = `${this.IMAGE_BASE_URL}${cleanPath}`;
          }

          // Mapiranje na format koji tvoj HTML očekuje
          return {
            id: post.id,
            title: post.title,
            category: post.postType || 'Unknown',
            rating: post.avgRating || 0,
            reviews: post.reviewCount || 0,
            distance: 1.5, 
            status: post.status?.toLowerCase() === 'published' ? 'Open Now' : 'Closed',
            isOpen: post.status?.toLowerCase() === 'published',
            imageUrl: firstImage
          };
        });
        
        this.isLoading = false;
        this.cdr.markForCheck(); // Osiguravamo da Angular primeti promenu podataka
      },
      error: (err: any) => {
        console.error('Greška pri učitavanju sačuvanih lokacija:', err);
        this.isLoading = false;
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.cdr.markForCheck();
      }
    });
  }

  // Dinamičko filtriranje
  get filteredItems() {
    if (this.activeFilter === 'All') return this.savedItems;
    return this.savedItems.filter(item => 
      item.category.toLowerCase() === this.activeFilter.toLowerCase()
    );
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  goBack() {
    window.history.back();
  }

  viewDetails(id: number) {
    this.router.navigate(['/location-details', id]);
  }

  showOnMap() {
    this.router.navigate(['/map-home']);
  }

  // Brisanje iz sačuvanih (Unsave) koristeći Toggle endpoint
  removeSaved(id: number, event: Event) {
    event.stopPropagation(); // Sprečava otvaranje detalja

    // OPTIMISTIC UPDATE: Sklanjamo odmah sa ekrana
    const originalItems = [...this.savedItems];
    this.savedItems = this.savedItems.filter(item => item.id !== id);

    this.locationService.toggleSaveLocation(id).subscribe({
      next: (res: any) => {
        // Ako je res.isSaved true, znači da smo ga greškom opet dodali (malo verovatno)
        console.log(`Status lokacije ${id}: ${res.message}`);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Greška pri brisanju sa servera:', err);
        // Vraćamo na staro ako server javi grešku
        this.savedItems = originalItems;
        alert("Nije uspelo uklanjanje lokacije. Pokušajte ponovo.");
        this.cdr.markForCheck();
      }
    });
  }
}