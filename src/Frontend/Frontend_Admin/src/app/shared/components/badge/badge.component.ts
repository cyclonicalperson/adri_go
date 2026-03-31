import { Component, Input } from '@angular/core';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  | 'green' | 'amber' | 'red' | 'blue' | 'gray';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  // NgClass intentionally NOT imported — we use [class] binding in template
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';
}
