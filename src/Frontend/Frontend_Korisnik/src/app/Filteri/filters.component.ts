import { Component, EventEmitter, Output } from '@angular/core'; // 🔥 OVO JE SADA ISPRAVNO
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.css']
})
export class FiltersComponent {
  @Output() onClose = new EventEmitter<void>();
  @Output() onApply = new EventEmitter<any>();

  // Glavne kategorije
  categories = [
    { id: 'beaches', label: 'Beaches', icon: '🏖️', selected: false },
    { id: 'restaurants', label: 'Restaurants', icon: '🍴', selected: false },
    { id: 'culture', label: 'Culture', icon: '🏛️', selected: false },
    { id: 'nature', label: 'Nature', icon: '🌲', selected: false },
    { id: 'activities', label: 'Activities', icon: '🎡', selected: false },
    { id: 'events', label: 'Events', icon: '📅', selected: false }
  ];

  // Podkategorije tačno po tvojoj specifikaciji
  subcategoriesMap: Record<string, {id: number, label: string}[]> = {
    beaches: [
      { id: 1, label: 'Sandy' }, { id: 2, label: 'Pebble' }, { id: 3, label: 'Pet Friendly' },
      { id: 4, label: 'Beach Clubs' }, { id: 5, label: 'Wild' }, { id: 6, label: 'Blue Flag' }, { id: 7, label: 'Sunset' }
    ],
    restaurants: [
      { id: 1, label: 'Local' }, { id: 2, label: 'Seafood' }, { id: 3, label: 'Fine Dining' },
      { id: 4, label: 'Family' }, { id: 5, label: 'Pizzeria' }, { id: 6, label: 'Steakhouse' }, { id: 7, label: 'Vegan' }, { id: 8, label: 'Fast Food' }
    ],
    culture: [
      { id: 1, label: 'Old Towns' }, { id: 2, label: 'Museums' }, { id: 3, label: 'Castles' },
      { id: 4, label: 'Churches' }, { id: 5, label: 'Ruins' }, { id: 6, label: 'Theaters' }, { id: 7, label: 'Ethno' }
    ],
    nature: [
      { id: 1, label: 'Parks' }, { id: 2, label: 'Viewpoints' }, { id: 3, label: 'Lakes' },
      { id: 4, label: 'Caves' }, { id: 5, label: 'Waterfalls' }, { id: 6, label: 'Mountains' }, { id: 7, label: 'Forests' }, { id: 8, label: 'Islands' }
    ],
    activities: [
      { id: 1, label: 'Boat' }, { id: 2, label: 'Diving' }, { id: 3, label: 'Hiking' },
      { id: 4, label: 'Kayaking' }, { id: 5, label: 'Adrenaline' }, { id: 7, label: 'Wine' }, { id: 8, label: 'Shopping' }
    ],
    events: [
      { id: 1, label: 'Music' }, { id: 2, label: 'Local' }, { id: 3, label: 'Carnivals' },
      { id: 4, label: 'Sport' }, { id: 7, label: 'Concerts' }
    ]
  };

  selectedSubcategories: Set<string> = new Set();
  
  // Search logika
  searchQuery: string = '';
  recommendations: string[] = [];
  allSubLabels: string[] = [];

  // Ostali filteri
  radius: number = 15;
  minRating: number = 4;
  openNow: boolean = true;
  fromDate: string = '';
  toDate: string = '';

  constructor(private router: Router) {
    // Punimo listu svih mogućih podkategorija za lakšu pretragu
    Object.values(this.subcategoriesMap).forEach(subs => {
      subs.forEach(s => {
        // Izbegavamo duplikate (npr. ako se reč pojavi 2 puta)
        if (!this.allSubLabels.includes(s.label)) {
          this.allSubLabels.push(s.label);
        }
      });
    });
  }

  toggleCategory(cat: any) {
    cat.selected = !cat.selected;
    
    // Ako korisnik ugasi glavnu kategoriju, brišemo i sve njene označene podkategorije
    if (!cat.selected) {
      this.subcategoriesMap[cat.id]?.forEach(s => {
        this.selectedSubcategories.delete(`${cat.id}-${s.id}`);
      });
    }
  }

  toggleSubcategory(catId: string, subId: number) {
    const key = `${catId}-${subId}`;
    if (this.selectedSubcategories.has(key)) {
      this.selectedSubcategories.delete(key);
    } else {
      this.selectedSubcategories.add(key);
    }
  }

  onSearchChange() {
    if (this.searchQuery.trim().length > 1) {
      // Pravimo neosetljivost na velika/mala slova (i)
      const regex = new RegExp(this.searchQuery.trim(), 'i');
      this.recommendations = this.allSubLabels
        .filter(label => regex.test(label))
        .slice(0, 5); // Maksimalno 5 predloga da ne zagušimo ekran
    } else {
      this.recommendations = [];
    }
  }

  selectRecommendation(label: string) {
    this.searchQuery = ''; // Čistimo polje nakon selekcije
    this.recommendations = [];
    
    // Pronalazimo kojoj kategoriji pripada odabrani label
    for (const catId of Object.keys(this.subcategoriesMap)) {
      const found = this.subcategoriesMap[catId].find(s => s.label === label);
      if (found) {
        // Palimo glavnu kategoriju ako nije upaljena
        const cat = this.categories.find(c => c.id === catId);
        if (cat) cat.selected = true;
        
        // Dodajemo podkategoriju u odabrane
        this.selectedSubcategories.add(`${catId}-${found.id}`);
        break;
      }
    }
  }

  setRating(rating: number) {
    this.minRating = rating;
  }

  clearAll() {
    this.categories.forEach(c => c.selected = false);
    this.selectedSubcategories.clear();
    this.radius = 1;
    this.minRating = 0;
    this.openNow = false;
    this.searchQuery = '';
    this.fromDate = '';
    this.toDate = '';
  }

  closeFilters() {
    this.router.navigate(['/map-home']);
  }

  applyFilters() {
    const activeFilters = {
      categories: this.categories.filter(c => c.selected).map(c => c.id),
      subcategories: Array.from(this.selectedSubcategories), // Slanje niza npr. ['beaches-1', 'restaurants-4']
      radius: this.radius,
      minRating: this.minRating,
      openNow: this.openNow,
      period: { from: this.fromDate, to: this.toDate }
    };
    
    console.log('Primeni filtere:', activeFilters);
    this.onApply.emit(activeFilters);
    this.router.navigate(['/map-home']);
  }
}