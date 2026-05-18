import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteTranslateService } from './services/site-translate.service';
import { AppVisitService } from './services/app-visit.service';
import { TouristNotificationService } from './services/tourist-notification.service';

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
    private touristNotifications: TouristNotificationService,
  ) {}

  ngOnInit(): void {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    this.translate.init();
    // Bilježi sesiju otvaranja aplikacije za "Posete platformi" widget
    this.appVisit.recordVisit();
    void this.touristNotifications.connect();
  }
}
