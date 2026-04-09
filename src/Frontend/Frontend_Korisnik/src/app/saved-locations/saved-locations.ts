import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-saved-locations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved-locations.html',
  styleUrls: ['./saved-locations.css']
})
export class SavedLocationsComponent {
  activeFilter: string = 'All';
  
  // Default slika (fallback zaštita ako neka slika nekada ne uspe da se učita)
  defaultImage: string = 'assets/plaza.jpg';

  savedItems = [
    {
      id: 101,
      title: 'Emerald Bay Coastal Trail',
      category: 'Nature',
      rating: 4.8,
      reviews: 1240,
      distance: 1.2,
      status: 'Open Now',
      isOpen: true,
      imageUrl: 'assets/emerald-bay.jpg'
    },
    {
      id: 102,
      title: 'Old Town Heritage Museum',
      category: 'Culture',
      rating: 4.8,
      reviews: 856,
      distance: 0.5,
      status: 'Closed',
      isOpen: false,
      imageUrl: 'assets/museum.jpg'
    },
    {
      id: 103,
      title: "The Fisherman's Wharf",
      category: 'Food',
      rating: 4.8,
      reviews: 2105,
      distance: 2.8,
      status: 'Open Now',
      isOpen: true,
      imageUrl: 'assets/plaza.jpg' // <-- Vraćena slika za treću lokaciju!
    }
  ];

  constructor(private router: Router) {}

  get filteredItems() {
    if (this.activeFilter === 'All') return this.savedItems;
    return this.savedItems.filter(item => item.category === this.activeFilter);
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
}