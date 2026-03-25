import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-selected-stay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-stay.component.html',
  styleUrls: ['./selected-stay.component.scss']
})
export class SelectedStayComponent implements OnInit {

  // Podaci mogu posle dolaziti preko servisa, sad ih kucamo "hardcoded"
  stay = {
    naziv: 'Apartman 1',
    lokacija: 'Budva, Montenegro',
    adresa: 'Stevana Filipovića 15, Budva',
    ocena: 4.8,
    recenzije: 133,
    cena: 80,
    vlasnik: {
      ime: 'Marko Jovanović',
      telefon: '+382 67 123 456',
      email: 'marko@gmail.com',
      slika: 'assets/owner.jpg' // Stavi neku profilnu sliku u assets
    }
  };

  constructor(private router: Router) { }

  ngOnInit(): void {}

  goBack() {
    // Vraća te direktno na rezultate pretrage
    this.router.navigate(['/admin/rezultati']);
  }

  onBookNow() {
    alert('Booking request sent!');
  }

  onCall() {
    window.open('tel:' + this.stay.vlasnik.telefon);
  }

  onEmail() {
    window.open('mailto:' + this.stay.vlasnik.email);
  }
}