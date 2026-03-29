import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  @Input() value: number = 0;
  @Input() readonly: boolean = true;
  @Input() showValue: boolean = false;
  @Output() valueChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];
  hovered: number | null = null;

  select(star: number): void {
    this.value = star;
    this.valueChange.emit(star);
  }
}
