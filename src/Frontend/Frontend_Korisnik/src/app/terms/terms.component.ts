import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.css']
})
export class TermsComponent implements OnInit {
  constructor(private router: Router) {}
  ngOnInit(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
  goBack() { window.history.back(); }
}
