import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Map } from '../map/map';
import { CategoryService } from '../services/category-service';
import { Category } from '../models/category';
import { LocationService } from '../services/location-service';
import { Location } from '../models/locations';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [ Map , FormsModule, CommonModule ],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  categories: Category[] = [];
  selected: number = 0;
  locations: Location[] = [];
  nameQuery: string = '';

  showNewLocationForm = false;
  newLocation: Location = {
    id: 0,
    name: '',
    description: '',
    categoryId: 0,
    city: '',
    rating: 0,
    latitude: 0,
    longitude: 0,
  };

  constructor(private category: CategoryService, private router: Router, private cdr: ChangeDetectorRef, private locationService: LocationService) {}

  ngOnInit() {
    this.getCategories();
  }

  getCategories() {
    this.category.getCategories().subscribe({
      next: res => {
        this.categories = res ?? [];
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load categories', err);
      }
    });
  }

  loadLocationsByCategory(){
    this.locationService.getLocationsByCategory(this.selected).subscribe({next: res => { this.locations = res ?? []; this.cdr.detectChanges(); }, error: e => console.error(e)});
  }

  loadTopLocations(){
    this.locationService.getTopLocations(this.selected).subscribe({next: res => { this.locations = res ?? []; this.cdr.detectChanges();}, error: e => console.error(e)});
  }

  searchByName(){
    if(!this.nameQuery) return;
    this.locationService.searchByName(this.nameQuery).subscribe({next: res => { this.locations = res ?? []; this.cdr.detectChanges(); }, error: e => console.error(e)});
  }

  onMapLocationSelected(coords: { latitude: number; longitude: number }) {
    this.showNewLocationForm = true;
    this.newLocation.latitude = coords.latitude;
    this.newLocation.longitude = coords.longitude;
  }

  onMapDeleteLocationSelected(location:Location){
    this.locations = this.locations.filter(
      (item) => item !== location
    );
    this.removeLocation(location.id);
    this.cdr.detectChanges();
  }

  removeLocation(location:number){
    this.locationService.deleteLocation(location).subscribe();
  }

  createLocation() {
    

    this.locationService.addLocation(this.newLocation).subscribe({
      next: created => {
        
        this.showNewLocationForm = false;
        this.newLocation = { id: 0, name: '', description: '', categoryId: 0, city: '', rating: 0, latitude: 0, longitude: 0 };
        this.locations=[created]
        this.cdr.detectChanges();
      },
      error: err => console.error('Failed creating location', err),
    });
  }
}

