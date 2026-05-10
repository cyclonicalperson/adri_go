import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouteDetourSuggestion } from '../../../services/recommendation.service';
import { formatPostType } from '../../../utils/post-type.utils';

@Component({
  selector: 'app-route-detours-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-detours-panel.component.html',
  styleUrls: ['./route-detours-panel.component.css'],
})
export class RouteDetoursPanelComponent {
  @Input() scenicSuggestions: RouteDetourSuggestion[] = [];
  @Output() detourAdded = new EventEmitter<RouteDetourSuggestion>();

  formatPostType(type?: string | null): string {
    return formatPostType(type);
  }
}
