import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { TouristEvent } from '@core/models/event.model';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: TouristEvent[];
}

@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [],
  templateUrl: './event-calendar.component.html',
  styleUrl: './event-calendar.component.scss',
})

export class EventCalendarComponent implements OnChanges {
  @Input() events: TouristEvent[] = [];
  @Output() editEvent = new EventEmitter<TouristEvent>();

  currentDate = new Date();
  weeks: CalendarDay[][] = [];

  readonly dayNames = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

  ngOnChanges(): void {
    this.buildCalendar();
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1, 1,
    );
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1, 1,
    );
    this.buildCalendar();
  }

  private buildCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ponedeljak kao prvi dan nedelje
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(start.getDate() - startOffset);

    this.weeks = [];
    let current = new Date(start);

    for (let w = 0; w < 6; w++) {
      const week: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(current);
        week.push({
          date,
          isCurrentMonth: date.getMonth() === month,
          isToday: date.getTime() === today.getTime(),
          events: this.eventsForDay(date),
        });
        current.setDate(current.getDate() + 1);
      }
      this.weeks.push(week);
      if (current.getMonth() !== month && current.getDate() > 7) break;
    }
  }

  private eventsForDay(date: Date): TouristEvent[] {
    return this.events.filter(e => {
      const start = new Date(e.startAt);
      const end = new Date(e.endAt);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  }

  categoryColor(cat: string): string {
    const map: Record<string, string> = {
      CONCERT: '#8B5CF6', FESTIVAL: '#F59E0B', SPORT: '#3FA26E',
      EXHIBITION: '#1A73E8', TOUR: '#10B981', THEATER: '#7C3AED',
      CONFERENCE: '#2563EB', OTHER: '#6B7280',
    };
    return map[cat] ?? '#6B7280';
  }
}
