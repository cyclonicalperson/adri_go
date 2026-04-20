import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Post } from '@core/models/post.model';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Post[];
}

@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [],
  templateUrl: './event-calendar.component.html',
  styleUrl: './event-calendar.component.scss',
})
export class EventCalendarComponent implements OnChanges {
  @Input() events: Post[] = [];
  @Output() editEvent = new EventEmitter<Post>();

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
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  private parseDetails(e: Post): any {
    const d = e.details;
    if (!d) return null;
    if (typeof d === 'object') return d;
    try { return JSON.parse(d as any); } catch { return null; }
  }

  private eventStart(e: Post): Date {
    const d = this.parseDetails(e);
    const raw = d?.eventStart ?? d?.startAt;
    return raw ? new Date(raw) : new Date(e.createdAt);
  }

  private eventEnd(e: Post): Date {
    const d = this.parseDetails(e);
    const raw = d?.eventEnd ?? d?.endAt;
    return raw ? new Date(raw) : new Date(e.createdAt);
  }

  private buildCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
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

  private eventsForDay(date: Date): Post[] {
    return this.events.filter(e => {
      const start = this.eventStart(e);
      const end = this.eventEnd(e);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  }

  categoryColor(e: Post): string {
    const cat = (e.details as any)?.category ?? '';
    const map: Record<string, string> = {
      CONCERT: '#8B5CF6',
      FESTIVAL: '#F59E0B',
      SPORT: '#3FA26E',
      EXHIBITION: '#1A73E8',
      TOUR: '#10B981',
      THEATER: '#7C3AED',
      CONFERENCE: '#2563EB',
      OTHER: '#6B7280',
    };
    return map[cat] ?? '#6B7280';
  }

  eventTitle(e: Post): string {
    return e.title;
  }
}
