import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Recept {
  id: number;
  naziv: string;
  opis: string;
  sastojci: string;
  koraci: string;
  kreirano: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReceptService {
  private apiUrl = 'http://localhost:5125/api/receptkontroler';

  constructor(private http: HttpClient) {}

  getSvi(): Observable<Recept[]> {
    return this.http.get<Recept[]>(this.apiUrl);
  }

  getJedan(id: number): Observable<Recept> {
    return this.http.get<Recept>(`${this.apiUrl}/${id}`);
  }

  kreiraj(recept: Recept): Observable<Recept> {
    return this.http.post<Recept>(this.apiUrl, recept);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
