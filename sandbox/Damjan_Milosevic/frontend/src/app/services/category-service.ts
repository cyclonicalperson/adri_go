import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { Category } from '../models/category';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private http:HttpClient){}

  getCategories():Observable<Category[]>{
    return this.http.get<Category[]>(environment.apiUrl+"/categories");
  }
}
