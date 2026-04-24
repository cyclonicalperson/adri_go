import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteTranslateService } from '@core/services/site-translate.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly siteTranslate = inject(SiteTranslateService);

  constructor() {
    this.siteTranslate.init();
  }
}
