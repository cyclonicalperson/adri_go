import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rezultat-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rezultat-screen.component.html',
  styleUrls: ['./rezultat-screen.component.scss']
})
export class RezultatScreenComponent implements OnInit {

  apartmani = [
    {
      id: 1,
      naziv: 'Apartman 1',
      lokacija: 'Budva, Montenegro',
      ocena: 4.8,
      brojRecenzija: 133,
      cena: 80,
      slika: 'assets/Budva.jpg'
    },
    {
      id: 2,
      naziv: 'Apartman LUX',
      lokacija: 'Budva, Montenegro',
      ocena: 4.9,
      brojRecenzija: 85,
      cena: 120,
      slika: 'assets/Kotor.jpg'
    }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {}

  goBack() {
    // Vraća te nazad na /admin/find-stay
    this.router.navigate(['/admin/find-stay']);
  }

  goToDetails(id: number) {
    console.log('Idem na detalje apartmana:', id);
    // Navigacija na tvoju novu rutu unutar admina
    this.router.navigate(['/admin/selected-stay']);
  }
}