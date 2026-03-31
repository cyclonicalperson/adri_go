import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Activity } from '@core/models/activity.model';
import { environment } from '@env/environment';

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

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get<{ data: Activity[] }>(`${environment.apiUrl}/activities`)
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
