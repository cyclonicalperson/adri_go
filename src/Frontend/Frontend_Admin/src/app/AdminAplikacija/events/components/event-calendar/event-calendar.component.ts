import { ChangeDetectorRef, Component, Input, Output, EventEmitter, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Post } from '@core/models/post.model';
import { SiteTranslateService } from '@core/services/site-translate.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Post[];
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  CONCERT: { bg: '#ede9fe', border: '#7c3aed', label: '🎵 Koncert' },
  FESTIVAL: { bg: '#fef3c7', border: '#d97706', label: '🎪 Festival' },
  SPORT: { bg: '#dbeafe', border: '#2563eb', label: '⚽ Sport' },
  EXHIBITION: { bg: '#f0fdf4', border: '#16a34a', label: '🖼️ Izložba' },
  CONFERENCE: { bg: '#f0f9ff', border: '#0284c7', label: '🎤 Konferencija' },
  FOOD: { bg: '#fff7ed', border: '#ea580c', label: '🍽️ Hrana' },
  ART: { bg: '#fdf4ff', border: '#9333ea', label: '🎨 Umetnost' },
  OTHER: { bg: '#f3f4f6', border: '#6b7280', label: '📅 Ostalo' },
};

@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [],
  templateUrl: './event-calendar.component.html',
  styleUrl: './event-calendar.component.scss',
})
export class EventCalendarComponent implements OnChanges, OnInit, OnDestroy {
  @Input() events: Post[] = [];
  @Output() editEvent = new EventEmitter<Post>();

  currentDate = new Date();
  weeks: CalendarDay[][] = [];

  private langSub?: Subscription;

  constructor(
    private translateService: SiteTranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.langSub = this.translateService.language$.subscribe(() => {
      this.buildCalendar();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  get dayNames(): string[] {
    const locale = this.getLocale();
    // 2023-01-02 is a Monday — iterate Mon–Sun
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2023, 0, 2 + i);
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
    });
  }

  readonly categoryLegend = Object.entries(CATEGORY_COLORS)
    .filter(([k]) => k !== 'OTHER')
    .map(([, v]) => ({ label: v.label, color: v.border }));

  ngOnChanges(): void {
    this.buildCalendar();
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString(this.getLocale(), { month: 'long', year: 'numeric' });
  }

  private getLocale(): string {
    const map: Record<string, string> = {
      sr: 'sr-RS', en: 'en-GB', de: 'de-DE', fr: 'fr-FR',
      it: 'it-IT', ru: 'ru-RU', es: 'es-ES', nl: 'nl-NL',
    };
    return map[this.translateService.currentLanguage] ?? 'sr-RS';
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

  private eventStartDate(e: Post): Date {
    const d = this.parseDetails(e);
    const raw = d?.startAt ?? d?.eventStart;
    const dt = raw ? new Date(raw) : new Date(e.createdAt);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  private eventEndDate(e: Post): Date {
    const d = this.parseDetails(e);
    const raw = d?.endAt ?? d?.eventEnd;
    const dt = raw ? new Date(raw) : this.eventStartDate(e);
    dt.setHours(23, 59, 59, 999);
    return dt;
  }

  private eventCategory(e: Post): string {
    const d = this.parseDetails(e);
    return (d?.category ?? 'OTHER').toUpperCase();
  }

  categoryColor(e: Post): string {
    return CATEGORY_COLORS[this.eventCategory(e)]?.bg ?? CATEGORY_COLORS['OTHER'].bg;
  }

  categoryColorDark(e: Post): string {
    return CATEGORY_COLORS[this.eventCategory(e)]?.border ?? CATEGORY_COLORS['OTHER'].border;
  }

  /** Vraća true ako je ovaj datum PRVI dan dogadjaja (prikazuje naziv) */
  isEventStart(date: Date, e: Post): boolean {
    const start = this.eventStartDate(e);
    return date.toDateString() === start.toDateString();
  }

  formatDateRange(e: Post): string {
    const start = this.eventStartDate(e);
    const end = this.eventEndDate(e);
    const fmt = (d: Date) => d.toLocaleDateString(this.getLocale(), { day: '2-digit', month: '2-digit' });
    return start.toDateString() === end.toDateString()
      ? fmt(start)
      : `${fmt(start)} – ${fmt(end)}`;
  }

  private buildCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

  private eventsForDay(date: Date): Post[] {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return this.events.filter(e => {
      const start = this.eventStartDate(e);
      const end = this.eventEndDate(e);
      return d >= start && d <= end;
    });
  }
}
