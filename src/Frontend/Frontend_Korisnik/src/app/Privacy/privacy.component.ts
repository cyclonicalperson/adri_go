import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MobileTouristNavComponent } from '../shared/mobile-tourist-nav.component';
import { DesktopFooterComponent } from '../shared/desktop-footer.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, MobileTouristNavComponent, DesktopFooterComponent],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css']
})
export class PrivacyComponent {

  activeTab: 'privacy' | 'terms' = 'privacy';

  constructor() {}

  goBack() { window.history.back(); }
}
