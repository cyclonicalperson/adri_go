import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '@core/models/activity.model';
import { ActivityService } from '@core/services/activity.service';

@Component({
  selector: 'app-activities-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './activities-selector.component.html',
  styleUrl: './activities-selector.component.scss',
})

export class ActivitiesSelectorComponent implements OnInit {
  @Input() selectedIds: number[] = [];
  @Output() selectedIdsChange = new EventEmitter<number[]>();

  all: Activity[] = [];

  constructor(private activityService: ActivityService) { }

  ngOnInit(): void {
    this.activityService.getAll({ page: 1, pageSize: 200, sortBy: 'name', sortDir: 'asc' })
      .subscribe(res => { this.all = res.data; });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggle(id: number): void {
    const next = this.isSelected(id)
      ? this.selectedIds.filter(x => x !== id)
      : [...this.selectedIds, id];
    this.selectedIdsChange.emit(next);
  }
}
