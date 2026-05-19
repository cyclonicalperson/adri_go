import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteTranslateService } from './services/site-translate.service';
import { AppVisitService } from './services/app-visit.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Frontend_Korisnik');

  constructor(
    private translate: SiteTranslateService,
    private appVisit: AppVisitService,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.themeService.init();
    this.translate.init();
    // Bilježi sesiju otvaranja aplikacije za "Posete platformi" widget
    this.appVisit.recordVisit();
  }
}
