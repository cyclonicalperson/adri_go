import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
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

  // Stavljamo odmah validan datum da izbegnemo 400 gresku
  noviRecept: Recept = {
    id: 0, naziv: '', opis: '', sastojci: '', koraci: '',
    kreirano: new Date().toISOString()
  };

  // Dodajemo ChangeDetectorRef ovde
  constructor(
    private receptService: ReceptService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.ucitajRecepte();
    }
  }

  ucitajRecepte(): void {
    this.receptService.getSvi().subscribe(data => {
      this.recepti = data;
      this.cdr.detectChanges(); // Forsira osvezavanje HTML-a
    });
  }

  odaberiRecept(recept: Recept): void {
    this.odabraniRecept = recept;
  }

  zatvoriDetalje(): void {
    this.odabraniRecept = null;
  }

  dodajRecept(): void {
    // Generisemo siguran datum pre slanja
    this.noviRecept.kreirano = new Date().toISOString();

    this.receptService.kreiraj(this.noviRecept).subscribe(() => {
      this.ucitajRecepte();

      // Resetujemo formu
      this.noviRecept = {
        id: 0, naziv: '', opis: '', sastojci: '', koraci: '',
        kreirano: new Date().toISOString()
      };

      this.cdr.detectChanges();
    });
  }

  obrisiRecept(id: number): void {
    this.receptService.obrisi(id).subscribe(() => {
      this.ucitajRecepte();
      if (this.odabraniRecept?.id === id) this.odabraniRecept = null;
      this.cdr.detectChanges();
    });
  }
}
