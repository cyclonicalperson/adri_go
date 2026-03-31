import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'range';
  options?: FilterOption[];
  min?: number;
  max?: number;
}

export type FilterValues = Record<string, string | number | null>;

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './filter-panel.component.html',
  styleUrl: './filter-panel.component.scss',
})
export class FilterPanelComponent implements OnInit {
  @Input() filters: FilterConfig[] = [];
  @Input() values: FilterValues = {};
  @Output() valuesChange = new EventEmitter<FilterValues>();
  @Output() applied = new EventEmitter<FilterValues>();
  @Output() cleared = new EventEmitter<void>();

  local: FilterValues = {};

  ngOnInit(): void {
    this.local = { ...this.values };
  }

  apply(): void {
    this.valuesChange.emit({ ...this.local });
    this.applied.emit({ ...this.local });
  }

  clear(): void {
    this.local = {};
    this.valuesChange.emit({});
    this.cleared.emit();
  }

  hasActive(): boolean {
    return Object.values(this.local).some(v => v !== null && v !== '' && v !== undefined);
  }
}
