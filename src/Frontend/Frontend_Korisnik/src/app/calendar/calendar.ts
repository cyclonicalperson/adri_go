import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, CalendarItem } from '../services/user.service';
import { AuthService } from '../services/auth.service';

interface DisplayEvent {
  id: number;       // PlannerItem id — used for removal
  postId: number;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
  imageUrl: string | null;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit {

  isLoading       = true;
  isGuest         = false;
  addedEventTitle = '';

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
          const d  = item.date ? new Date(item.date) : null;
          if (d && !isNaN(d.getTime()) && d < now) {
            past.push(ev);
          } else {
            upcoming.push(ev);
          }
        }

        this.upcomingEvents = upcoming;
        this.pastEvents     = past;
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
      title:    item.title,
      date:     item.date,
      time:     item.scheduledTime,
      location: item.address || '',
      type:     item.postType,
      imageUrl: item.imageUrl
    };
  }

  getEventImage(event: DisplayEvent): string {
    if (!event.imageUrl) return 'assets/Budva.jpg';
    if (!event.imageUrl.startsWith('http')) {
      const clean = event.imageUrl.startsWith('/') ? event.imageUrl.slice(1) : event.imageUrl;
      return `http://localhost:5125/${clean}`;
    }
    return event.imageUrl;
  }

  removeEvent(plannerItemId: number): void {
    const ev = [...this.upcomingEvents, ...this.pastEvents].find(e => e.id === plannerItemId);
    if (!ev) return;

    // Optimistic UI removal
    this.upcomingEvents = this.upcomingEvents.filter(e => e.id !== plannerItemId);
    this.pastEvents     = this.pastEvents.filter(e => e.id !== plannerItemId);
    this.cdr.detectChanges();

    this.userService.removeFromCalendar(ev.postId).subscribe({
      error: () => this.loadCalendar()   // rollback on failure
    });
  }

  viewEventDetails(plannerItemId: number): void {
    const ev = [...this.upcomingEvents, ...this.pastEvents].find(e => e.id === plannerItemId);
    if (ev) this.router.navigate(['/location-details', ev.postId]);
  }

  goBack(): void  { window.history.back(); }
  goToMap(): void { this.router.navigate(['/map-home']); }
}
