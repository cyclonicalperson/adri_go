import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo'; // Importuješ fajl sa slike

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html', // Koristimo tvoj app.html fajl
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  private todoService = inject(TodoService);
  
  lista: any[] = [];
  noviZadatak = '';

  ngOnInit() {
    this.ucitajSve();
  }

  ucitajSve() {
    this.todoService.getTodos().subscribe(podaci => this.lista = podaci);
  }

  dodaj() {
    if (this.noviZadatak.trim()) {
      this.todoService.addTodo(this.noviZadatak).subscribe(() => {
        this.ucitajSve();
        this.noviZadatak = '';
      });
    }
  }
}