import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';
import { Location } from '../models/locations';

@Injectable({
  providedIn: 'root',
})
export class LocationService {

  

  constructor(private http:HttpClient){}
  
  getLocationsByCategory(category:number):Observable<Location[]>{
    return this.http.get<Location[]>(environment.apiUrl+`/location/category/${encodeURIComponent(category)}`);
  }

  getTopLocations(category:number):Observable<Location[]>{
    return this.http.get<Location[]>(environment.apiUrl+"/location/top/"+category);
  }

  getByCity(city:string):Observable<Location[]>{
    return this.http.get<Location[]>(environment.apiUrl+`/location/city/${encodeURIComponent(city)}`);
  }

  searchByName(name:string):Observable<Location[]>{
    return this.http.get<Location[]>(environment.apiUrl+`/location/search?name=${encodeURIComponent(name)}`);
  }

  addLocation(location: Location): Observable<Location> {
    return this.http.post<Location>(environment.apiUrl + '/location', location);
  }

  deleteLocation(location:number): Observable<void> {
    return this.http.delete<void>(environment.apiUrl + '/location/'+ location);
  }
}
