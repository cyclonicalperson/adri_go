import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteTranslateService } from './services/site-translate.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Frontend_Korisnik');

  constructor(private translate: SiteTranslateService) {}

  ngOnInit(): void {
    this.translate.init();
  }
}
