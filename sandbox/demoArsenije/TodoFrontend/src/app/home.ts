import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-group">
      <input [(ngModel)]="noviZadatak" placeholder="Šta planiraš danas?" (keyup.enter)="dodaj()">
      <button (click)="dodaj()">Dodaj</button>
    </div>

    <ul>
      @for (t of lista; track t.id) {
        <li><span>🔹 {{ t.title }}</span></li>
      }
    </ul>
  `
})
export class HomeComponent implements OnInit {
  private todoService = inject(TodoService);
  lista: any[] = [];
  noviZadatak = '';

  ngOnInit() { this.ucitajSve(); }
  ucitajSve() { this.todoService.getTodos().subscribe(p => this.lista = p); }
  dodaj() {
    if (this.noviZadatak.trim()) {
      this.todoService.addTodo(this.noviZadatak).subscribe(() => {
        this.ucitajSve();
        this.noviZadatak = '';
      });
    }
  }
}