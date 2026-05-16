import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, CalendarItem } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';

interface DisplayEvent {
  id: number;       // PlannerItem id — used for removal
  postId: number | null;
  routeId: number | null;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
  imageUrl: string | null;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: DisplayEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit, OnDestroy {

  isLoading       = true;
  isGuest         = false;
  addedEventTitle = '';
  currentDate     = new Date();
  weeks: CalendarDay[][] = [];
  selectedDay: CalendarDay | null = null;

  upcomingEvents: DisplayEvent[] = [];
  pastEvents:     DisplayEvent[] = [];

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.isGuest   = true;
      this.isLoading = false;
      this.router.navigate(['/login']);
      this.cdr.detectChanges();
      return;
    }

    // Toast when navigated from "Add to Calendar"
    const state = history.state as { addedTitle?: string };
    if (state?.addedTitle) {
      this.addedEventTitle = state.addedTitle;
      setTimeout(() => { this.addedEventTitle = ''; this.cdr.detectChanges(); }, 4000);
      history.replaceState({}, '');
    }

    this.loadCalendar();
  }

  loadCalendar(): void {
    this.isLoading = true;
    this.userService.getCalendar().subscribe({
      next: (items) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcoming: DisplayEvent[] = [];
        const past:     DisplayEvent[] = [];

        for (const item of items) {
          const ev = this.toDisplayEvent(item);
          const d  = this.parseCalendarDate(item.date);
          if (d && !isNaN(d.getTime()) && d < now) {
            past.push(ev);
          } else {
            upcoming.push(ev);
          }
        }

        this.upcomingEvents = upcoming.sort((left, right) => this.eventSortValue(left) - this.eventSortValue(right));
        this.pastEvents     = past.sort((left, right) => this.eventSortValue(right) - this.eventSortValue(left));
        this.buildCalendar();
        this.isLoading      = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private toDisplayEvent(item: CalendarItem): DisplayEvent {
    return {
      id:       item.id,
      postId:   item.postId,
      routeId:  item.routeId ?? null,
      title:    item.title,
      date:     item.date,
      time:     item.scheduledTime,
      location: item.address || '',
      type:     item.postType,
      imageUrl: item.imageUrl
    };
  }

  getEventImage(event: DisplayEvent): string {
    return resolveBackendAssetUrl(event.imageUrl, 'assets/Budva.jpg');
  }

  get dayNames(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2023, 0, 2 + i);
      return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d);
    });
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  openDayDetails(day: CalendarDay): void {
    const events = this.eventsForDayFull(day.date);
    this.selectedDay = {
      ...day,
      events,
    };
    this.setBodyScrollLock(true);
  }

  closeDayDetails(): void {
    this.selectedDay = null;
    this.setBodyScrollLock(false);
  }

  ngOnDestroy(): void {
    this.setBodyScrollLock(false);
  }

  private setBodyScrollLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = locked ? 'hidden' : '';
    document.body.style.touchAction = locked ? 'none' : '';
  }

  get selectedDayLabel(): string {
    return this.selectedDay?.date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) ?? '';
  }

  removeEvent(plannerItemId: number): void {
    const ev = [...this.upcomingEvents, ...this.pastEvents].find(e => e.id === plannerItemId);
    if (!ev) return;

    // Optimistic UI removal
    this.upcomingEvents = this.upcomingEvents.filter(e => e.id !== plannerItemId);
    this.pastEvents     = this.pastEvents.filter(e => e.id !== plannerItemId);
    this.buildCalendar();
    if (this.selectedDay) {
      const refreshed = this.findCalendarDay(this.selectedDay.date);
      this.selectedDay = refreshed && refreshed.events.length > 0
        ? {
            ...refreshed,
            events: [...refreshed.events].sort((left, right) => this.eventSortValue(left) - this.eventSortValue(right)),
          }
        : null;
    }
    this.cdr.detectChanges();

    this.userService.removeCalendarItem(plannerItemId).subscribe({
      error: () => this.loadCalendar()   // rollback on failure
    });
  }

  trackWeek = (index: number): number => index;
  trackDay = (_: number, day: CalendarDay): string => day.date.toISOString();
  trackEvent = (_: number, event: DisplayEvent): number => event.id;

  formatEventRange(event: DisplayEvent): string {
    const date = this.eventDate(event);
    const dateLabel = date
      ? date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
      : 'No date';

    return event.time ? `${dateLabel} - ${event.time}` : dateLabel;
  }

  formatEventSchedule(event: DisplayEvent): string {
    const date = this.eventDate(event);
    const dateLabel = date
      ? date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
      : 'No date';

    return event.time ? `${dateLabel} at ${event.time}` : dateLabel;
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

  private eventsForDay(date: Date): DisplayEvent[] {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return [...this.upcomingEvents, ...this.pastEvents]
      .filter(event => {
        const eventDate = this.eventDate(event);
        return !!eventDate && eventDate.getTime() === target.getTime();
      })
      .sort((left, right) => this.eventSortValue(left) - this.eventSortValue(right))
      .slice(0, 3);
  }

  eventsForDayFull(date: Date): DisplayEvent[] {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return [...this.upcomingEvents, ...this.pastEvents]
      .filter(event => {
        const eventDate = this.eventDate(event);
        return !!eventDate && eventDate.getTime() === target.getTime();
      })
      .sort((left, right) => this.eventSortValue(left) - this.eventSortValue(right));
  }

  hiddenEventCount(day: CalendarDay): number {
    return Math.max(0, this.eventsForDayFull(day.date).length - day.events.length);
  }

  private findCalendarDay(date: Date): CalendarDay | null {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    for (const week of this.weeks) {
      const day = week.find(item => {
        const d = new Date(item.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === target.getTime();
      });
      if (day) {
        return {
          ...day,
          events: this.eventsForDayFull(day.date),
        };
      }
    }
    return null;
  }

  private eventSortValue(event: DisplayEvent): number {
    const date = this.eventDate(event)?.getTime() ?? 0;
    const [hours, minutes] = (event.time || '23:59').split(':').map(Number);
    return date + ((hours || 0) * 60 + (minutes || 0)) * 60000;
  }

  private eventDate(event: DisplayEvent): Date | null {
    const raw = event.date || event.time;
    if (!raw) return null;

    const date = this.parseCalendarDate(raw);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private parseCalendarDate(raw: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw || '');
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    return new Date(raw);
  }

  viewEventDetails(plannerItemId: number): void {
    const ev = [...this.upcomingEvents, ...this.pastEvents].find(e => e.id === plannerItemId);
    if (!ev) return;
    if (ev.routeId != null) {
      this.router.navigate(['/map-home'], { queryParams: { routeId: ev.routeId } });
    } else if (ev.postId != null) {
      this.router.navigate(['/location-details', ev.postId]);
    }
  }

  goBack(): void  { window.history.back(); }
  goToMap(): void { this.router.navigate(['/map-home']); }
}
