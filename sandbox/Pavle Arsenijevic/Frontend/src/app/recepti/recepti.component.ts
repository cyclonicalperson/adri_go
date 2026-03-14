import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceptService, Recept } from '../recept.service';

@Component({
  selector: 'app-recepti',
  templateUrl: './recepti.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ReceptiComponent implements OnInit {
  recepti: Recept[] = [];
  odabraniRecept: Recept | null = null;
  private platformId = inject(PLATFORM_ID);

  noviRecept: Recept = {
    id: 0, naziv: '', opis: '', sastojci: '', koraci: '', kreirano: ''
  };

  constructor(private receptService: ReceptService) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.ucitajRecepte();
    }
  }

  ucitajRecepte(): void {
    this.receptService.getSvi().subscribe(data => {
      this.recepti = data;
    });
  }

  odaberiRecept(recept: Recept): void {
    this.odabraniRecept = recept;
  }

  zatvoriDetalje(): void {
    this.odabraniRecept = null;
  }

  dodajRecept(): void {
    this.receptService.kreiraj(this.noviRecept).subscribe(() => {
      this.ucitajRecepte();
      this.noviRecept = { id: 0, naziv: '', opis: '', sastojci: '', koraci: '', kreirano: '' };
    });
  }

  obrisiRecept(id: number): void {
    this.receptService.obrisi(id).subscribe(() => {
      this.ucitajRecepte();
      if (this.odabraniRecept?.id === id) this.odabraniRecept = null;
    });
  }
}
