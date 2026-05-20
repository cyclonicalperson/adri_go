import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity } from '@core/models/activity.model';
import { ActivityService } from '@core/services/activity.service';
import { catchError, finalize, of } from 'rxjs';

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
  proposalName = '';
  proposalSaving = false;
  proposalMessage = '';
  proposalError = '';
  loading = true;
  loadError = '';

  constructor(private activityService: ActivityService) { }

  ngOnInit(): void {
    this.activityService.getAll({ page: 1, pageSize: 200, sortBy: 'name', sortDir: 'asc' })
      .pipe(
        catchError(() => {
          this.loadError = 'Aktivnosti nisu mogle da se ucitaju.';
          return of({ data: [] } as any);
        }),
        finalize(() => { this.loading = false; }),
      )
      .subscribe(res => { this.all = res.data; });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggle(id: number): void {
    const next = this.isSelected(id)
      ? this.selectedIds.filter(x => x !== id)
      : [...this.selectedIds, id];
    this.selectedIds = next;
    this.selectedIdsChange.emit(next);
  }

  proposeActivity(): void {
    const name = this.proposalName.trim();
    if (!name || this.proposalSaving) return;

    this.proposalSaving = true;
    this.proposalError = '';
    this.proposalMessage = '';

    this.activityService.create({
      name,
      category: 'OTHER',
      status: 'pending',
    }).subscribe({
      next: res => {
        const activity = {
          ...res.data,
          name,
          status: 'pending' as const,
        };
        this.all = [activity, ...this.all];
        this.selectedIds = [...this.selectedIds, activity.activityId];
        this.selectedIdsChange.emit(this.selectedIds);
        this.proposalName = '';
        this.proposalSaving = false;
        this.proposalMessage = 'Predlog aktivnosti je poslat na odobrenje.';
      },
      error: err => {
        this.proposalSaving = false;
        this.proposalError = err?.error?.message ?? 'Predlog aktivnosti nije moguce poslati.';
      },
    });
  }
}
