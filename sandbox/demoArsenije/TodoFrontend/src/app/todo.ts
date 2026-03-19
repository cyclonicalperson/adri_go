import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TodoService { // Preimenovali smo klasu u TodoService radi jasnoće
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5114/api/todos'; // Proveri svoj port!

  getTodos() {
    return this.http.get<any[]>(this.apiUrl);
  }

  addTodo(title: string) {
    return this.http.post(this.apiUrl, { title });
  }
}