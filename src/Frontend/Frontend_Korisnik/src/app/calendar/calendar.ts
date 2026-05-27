import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService, CalendarItem, PendingSchedule } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService } from '../services/site-translate.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { AuthRequiredModalComponent } from '../shared/auth-required-modal/auth-required-modal.component';

interface DisplayEvent {
  id: number;       // PlannerItem id — used for removal
  postId: number | null;
  routeId: number | null;
  touristRouteId: number | null;
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
  imports: [CommonModule, FormsModule, AppHeaderComponent, AuthRequiredModalComponent],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit, OnDestroy {

  isLoading       = true;
  isGuest         = false;
  showAuthPopup   = false;
  addedEventTitle = '';
  currentDate     = new Date();
  weeks: CalendarDay[][] = [];
  selectedDay: CalendarDay | null = null;

  isPickerOpen = false;
  pickerYear   = new Date().getFullYear();

  upcomingEvents: DisplayEvent[] = [];
  pastEvents:     DisplayEvent[] = [];

  // ── Scheduling mode (entered from an "Add to calendar" action) ──────────
  schedulingItem: PendingSchedule | null = null;
  private eventStartFull: Date | null = null;
  private eventEndFull:   Date | null = null;

  showTimePicker   = false;
  scheduleDay: Date | null = null;
  scheduleTime     = '12:00';
  scheduleError    = '';
  isSavingSchedule = false;

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private translate: SiteTranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.isGuest   = true;
      this.isLoading = false;
      this.showAuthPopup = true;
      this.cdr.detectChanges();
      return;
    }

    const state = history.state as { addedTitle?: string; pendingSchedule?: PendingSchedule };

    // Entered with an item to place on the calendar — start scheduling mode.
    if (state?.pendingSchedule) {
      this.enterSchedulingMode(state.pendingSchedule);
      history.replaceState({}, '');
    } else if (state?.addedTitle) {
      // Toast when navigated from a legacy "Add to Calendar" action
      this.addedEventTitle = state.addedTitle;
      setTimeout(() => { this.addedEventTitle = ''; this.cdr.detectChanges(); }, 4000);
      history.replaceState({}, '');
    }

    this.loadCalendar();
  }

  // ── Scheduling mode ──────────────────────────────────────────────────────

  get isSchedulingMode(): boolean {
    return !!this.schedulingItem;
  }

  /** Human label describing the date window an event can be scheduled in. */
  get schedulingRangeLabel(): string {
    if (!this.eventStartFull && !this.eventEndFull) return '';
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (this.eventStartFull && this.eventEndFull) {
      return this.sameDay(this.eventStartFull, this.eventEndFull)
        ? fmt(this.eventStartFull)
        : `${fmt(this.eventStartFull)} – ${fmt(this.eventEndFull)}`;
    }
    return fmt((this.eventStartFull || this.eventEndFull)!);
  }

  private enterSchedulingMode(item: PendingSchedule): void {
    this.schedulingItem = item;
    this.eventStartFull = null;
    this.eventEndFull   = null;

    if (item.kind === 'post' && item.isEvent) {
      if (item.eventStart) {
        const s = new Date(item.eventStart);
        if (!isNaN(s.getTime())) this.eventStartFull = s;
      }
      if (item.eventEnd) {
        const e = new Date(item.eventEnd);
        if (!isNaN(e.getTime())) this.eventEndFull = e;
      }
    }

    // Jump the calendar to the most relevant month.
    const now = new Date();
    const focus = this.eventStartFull && this.eventStartFull > now ? this.eventStartFull : now;
    this.currentDate = new Date(focus.getFullYear(), focus.getMonth(), 1);
    this.buildCalendar();
  }

  cancelScheduling(): void {
    this.schedulingItem = null;
    this.showTimePicker = false;
    this.eventStartFull = null;
    this.eventEndFull   = null;
    this.scheduleError  = '';
    this.setBodyScrollLock(false);
  }

  private get rangeStartDay(): Date | null {
    if (!this.eventStartFull) return null;
    const d = new Date(this.eventStartFull); d.setHours(0, 0, 0, 0); return d;
  }

  private get rangeEndDay(): Date | null {
    if (!this.eventEndFull) return null;
    const d = new Date(this.eventEndFull); d.setHours(0, 0, 0, 0); return d;
  }

  /** Whether a day can be chosen while scheduling (no past days, event range). */
  isDayAvailable(day: CalendarDay): boolean {
    if (!this.isSchedulingMode) return true;
    const d = new Date(day.date); d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) return false;
    const rs = this.rangeStartDay;
    const re = this.rangeEndDay;
    if (rs && d < rs) return false;
    if (re && d > re) return false;
    return true;
  }

  onDayClick(day: CalendarDay): void {
    if (this.isSchedulingMode) {
      if (this.isDayAvailable(day)) this.openTimePicker(day.date);
      return;
    }
    this.openDayDetails(day);
  }

  openTimePicker(date: Date): void {
    this.scheduleDay   = new Date(date);
    this.scheduleError = '';
    this.scheduleTime  = this.defaultScheduleTime();
    this.showTimePicker = true;
    this.setBodyScrollLock(true);
  }

  closeTimePicker(): void {
    this.showTimePicker = false;
    this.scheduleError  = '';
    this.setBodyScrollLock(false);
  }

  get scheduleDayLabel(): string {
    return this.scheduleDay?.toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    }) ?? '';
  }

  get scheduleTimeMin(): string {
    if (!this.scheduleDay) return '';
    let min: Date | null = null;
    const now = new Date();
    if (this.sameDay(this.scheduleDay, now)) min = now;
    if (this.eventStartFull && this.sameDay(this.scheduleDay, this.eventStartFull)) {
      if (!min || this.eventStartFull > min) min = this.eventStartFull;
    }
    return min ? this.toTimeString(min) : '';
  }

  get scheduleTimeMax(): string {
    if (!this.scheduleDay || !this.eventEndFull) return '';
    if (this.sameDay(this.scheduleDay, this.eventEndFull)) return this.toTimeString(this.eventEndFull);
    return '';
  }

  private defaultScheduleTime(): string {
    if (this.eventStartFull && this.scheduleDay && this.sameDay(this.scheduleDay, this.eventStartFull)) {
      return this.toTimeString(this.eventStartFull);
    }
    return this.scheduleTimeMin || '12:00';
  }

  confirmSchedule(): void {
    if (this.isSavingSchedule || !this.schedulingItem || !this.scheduleDay) return;
    if (!this.scheduleTime) { this.scheduleError = 'Choose a time.'; return; }

    const [h, m] = this.scheduleTime.split(':').map(Number);
    const dt = new Date(this.scheduleDay);
    dt.setHours(h || 0, m || 0, 0, 0);

    if (dt < new Date()) {
      this.scheduleError = 'Choose a future time.';
      return;
    }
    if (this.eventStartFull && dt < this.eventStartFull) {
      this.scheduleError = 'This is before the event starts.';
      return;
    }
    if (this.eventEndFull && dt > this.eventEndFull) {
      this.scheduleError = 'This is after the event ends.';
      return;
    }

    const scheduledAt = this.toDateTimeLocal(dt);
    const item = this.schedulingItem;
    let request$: Observable<any>;

    if (item.kind === 'post') {
      request$ = this.userService.addToCalendar(item.postId, { scheduledAt });
    } else if (item.kind === 'curatedRoute') {
      request$ = this.userService.addRouteToCalendar(item.routeId, { scheduledAt });
    } else {
      request$ = this.userService.addPrivateRouteToCalendar({ ...item.privateRoute, scheduledAt });
    }

    this.isSavingSchedule = true;
    this.scheduleError    = '';

    request$.subscribe({
      next: (res: any) => {
        this.isSavingSchedule = false;
        this.showTimePicker   = false;
        this.schedulingItem   = null;
        this.eventStartFull   = null;
        this.eventEndFull     = null;
        this.setBodyScrollLock(false);
        this.addedEventTitle = res?.alreadyAdded
          ? `"${item.title}" is already in your calendar`
          : `"${item.title}" added to your calendar!`;
        setTimeout(() => { this.addedEventTitle = ''; this.cdr.detectChanges(); }, 4000);
        this.loadCalendar();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSavingSchedule = false;
        this.scheduleError = err?.error?.message || 'Could not add to calendar.';
        this.cdr.detectChanges();
      },
    });
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private toTimeString(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private toDateTimeLocal(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  onChipClick(ev: MouseEvent, event: DisplayEvent): void {
    // In scheduling mode let the click fall through to the day cell.
    if (this.isSchedulingMode) return;
    ev.stopPropagation();
    this.viewEventDetails(event.id);
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
      touristRouteId: item.touristRouteId ?? null,
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
      return new Intl.DateTimeFormat(this.locale, { weekday: 'short' }).format(d);
    });
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString(this.locale, { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  /** Short month names for the picker grid (Jan, Feb, …). */
  get monthNames(): string[] {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2023, i, 1).toLocaleDateString('en-GB', { month: 'short' })
    );
  }

  togglePicker(): void {
    this.isPickerOpen = !this.isPickerOpen;
    if (this.isPickerOpen) {
      this.pickerYear = this.currentDate.getFullYear();
    }
  }

  closePicker(): void {
    this.isPickerOpen = false;
  }

  pickerPrevYear(): void {
    this.pickerYear--;
  }

  pickerNextYear(): void {
    this.pickerYear++;
  }

  selectMonth(monthIndex: number): void {
    this.currentDate = new Date(this.pickerYear, monthIndex, 1);
    this.isPickerOpen = false;
    this.buildCalendar();
  }

  isPickedMonth(monthIndex: number): boolean {
    return this.currentDate.getFullYear() === this.pickerYear
      && this.currentDate.getMonth() === monthIndex;
  }

  isCurrentRealMonth(monthIndex: number): boolean {
    const now = new Date();
    return now.getFullYear() === this.pickerYear && now.getMonth() === monthIndex;
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
    return this.selectedDay?.date.toLocaleDateString(this.locale, {
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

  goToToday(): void {
    this.currentDate = new Date();
    this.buildCalendar();
  }

  private get allItems(): DisplayEvent[] {
    return [...this.upcomingEvents, ...this.pastEvents];
  }

  private isRouteItem(item: DisplayEvent): boolean {
    return item.routeId != null || item.touristRouteId != null;
  }

  private isEventItem(item: DisplayEvent): boolean {
    return (item.type || '').toLowerCase() === 'event';
  }

  /** Count of items per category. */
  get destinationCount(): number {
    return this.allItems.filter(i => !this.isRouteItem(i) && !this.isEventItem(i)).length;
  }

  get eventCount(): number {
    return this.allItems.filter(i => !this.isRouteItem(i) && this.isEventItem(i)).length;
  }

  get routeCount(): number {
    return this.allItems.filter(i => this.isRouteItem(i)).length;
  }

  get totalItemCount(): number {
    return this.allItems.length;
  }

  /** Human-readable breakdown, e.g. "6 destinations · 1 event · 1 route". */
  get itinerarySummary(): string {
    const parts: string[] = [];
    const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    if (this.destinationCount > 0) parts.push(pluralize(this.destinationCount, 'destination'));
    if (this.eventCount > 0) parts.push(pluralize(this.eventCount, 'event'));
    if (this.routeCount > 0) parts.push(pluralize(this.routeCount, 'route'));
    return parts.length ? parts.join(' · ') : 'No scheduled items yet';
  }

  isTomorrow(event: DisplayEvent): boolean {
    const d = this.eventDate(event);
    if (!d) return false;
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getTime() === tomorrow.getTime();
  }

  formatShortDate(event: DisplayEvent): string {
    const d = this.eventDate(event);
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }).toUpperCase();
  }

  formatShortDateMixed(event: DisplayEvent): string {
    const d = this.eventDate(event);
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  }

  /** Deterministic palette color per event (used for sidebar accents and chip color). */
  getEventColor(event: DisplayEvent): string {
    const palette = [
      '#16a34a', // green
      '#f59e0b', // amber
      '#a855f7', // purple
      '#3b82f6', // blue
      '#ef4444', // red
      '#0ea5e9', // sky
      '#ec4899', // pink
      '#14b8a6', // teal
    ];
    const key = event.id || this.hashString(event.title || '');
    return palette[Math.abs(key) % palette.length];
  }

  private hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  formatEventRange(event: DisplayEvent): string {
    const date = this.eventDate(event);
    const dateLabel = date
      ? date.toLocaleDateString(this.locale, { day: '2-digit', month: '2-digit' })
      : 'No date';

    return event.time ? `${dateLabel} - ${event.time}` : dateLabel;
  }

  formatEventSchedule(event: DisplayEvent): string {
    const date = this.eventDate(event);
    const dateLabel = date
      ? date.toLocaleDateString(this.locale, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
      : 'No date';

    return event.time ? `${dateLabel} ${this.timeSeparator} ${event.time}` : dateLabel;
  }

  private get locale(): string {
    const map: Record<string, string> = {
      en: 'en-GB',
      sr: 'sr-Latn-RS',
      de: 'de-DE',
      it: 'it-IT',
      fr: 'fr-FR',
      ru: 'ru-RU',
      es: 'es-ES',
      nl: 'nl-NL',
    };
    return map[this.translate.currentLanguage] ?? 'en-GB';
  }

  private get timeSeparator(): string {
    return this.translate.currentLanguage === 'sr' ? 'u' : 'at';
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

  /** Events of a day rendered as colored dots (compact view, e.g. mobile). */
  dayDots(day: CalendarDay): DisplayEvent[] {
    return this.eventsForDayFull(day.date).slice(0, 4);
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
    } else if (ev.touristRouteId != null) {
      this.router.navigate(['/map-home'], { queryParams: { touristRouteId: ev.touristRouteId } });
    } else if (ev.postId != null) {
      this.router.navigate(['/location-details', ev.postId]);
    }
  }

  goBack(): void  { window.history.back(); }
  goToMap(): void { this.router.navigate(['/map-home']); }
  closeAuthPopup(): void { this.showAuthPopup = false; }
  goToLogin(): void {
    this.showAuthPopup = false;
    this.router.navigate(['/login']);
  }
}
