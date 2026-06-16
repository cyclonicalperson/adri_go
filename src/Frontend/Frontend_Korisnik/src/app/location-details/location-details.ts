import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocationService, Location, Review } from '../services/location.service';
import { AuthService } from '../services/auth.service';
import { UserService, PendingSchedule } from '../services/user.service';
import { RoutePlannerService } from '../services/route-planner.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import { TouristPreferencesService } from '../services/tourist-preferences.service';
import { SiteTranslateService } from '../services/site-translate.service';
import { LocationStateService } from '../services/location-state.service';
import { DesktopFooterComponent } from '../shared/desktop-footer.component';
import { MobileTouristNavComponent } from '../shared/mobile-tourist-nav.component';
import { formatPostType } from '../utils/post-type.utils';

import * as L from 'leaflet';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DesktopFooterComponent, MobileTouristNavComponent],
  templateUrl: './location-details.html',
  styleUrls: ['./location-details.css']
})
export class LocationDetailsComponent implements OnInit, AfterViewInit, OnDestroy {

  location: Location | null = null;
  reviews: Review[] = [];
  images: string[] = [];
  currentImageIndex = 0;
  isLoading = true;
  errorMessage = '';
  likeMessage  = '';
  saveMessage  = '';
  actionErrorMessage = '';
  showAllHours       = false;
  showReviewForm     = false;
  showFullDescription = false;
  descriptionTruncateLength = 120;
  distanceKm: number | null = null;
  newRating          = 5;
  newComment         = '';
  reviewError        = '';
  reviewSuccess      = '';
  isSubmittingReview = false;

  // Sliding dot indicator
  readonly DOT_WINDOW = 6;
  get visibleDotWindow(): number[] {
    const total = this.images.length;
    const windowStart = Math.max(0, Math.min(this.currentImageIndex - 2, total - this.DOT_WINDOW));
    const end = Math.min(windowStart + this.DOT_WINDOW, total);
    return Array.from({ length: end - windowStart }, (_, i) => windowStart + i);
  }

  // Lightbox
  lightboxOpen = false;
  lightboxIndex = 0;

  openLightbox(index: number): void {
    if (!this.images.length) return;
    this.lightboxIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  lightboxPrev(e: Event): void {
    e.stopPropagation();
    this.lightboxIndex = (this.lightboxIndex - 1 + this.images.length) % this.images.length;
  }

  lightboxNext(e: Event): void {
    e.stopPropagation();
    this.lightboxIndex = (this.lightboxIndex + 1) % this.images.length;
  }

  // Mini mapa
  private detailMap: L.Map | null = null;
  locationLat: number | null = null;
  locationLng: number | null = null;

  private readonly svgIcons: Record<string, string> = {
    beach:         '<path d="M13.127 14.56l1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73l2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02l-.01.01c-.38 3.01 1.17 6.88 4.7 10.41l5.39-5.39c-3.53-3.53-7.4-5.09-10.08-5.03z"/>',
    culture:       '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    monument:      '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    food:          '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>',
    nightlife:     '<path d="M7 2h10l2 6-7 14L5 8l2-6zm1.44 6l3.56 7.13L15.56 8H8.44zM9 4l-.67 2h7.34L15 4H9z"/>',
    activity:      '<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>',
    events:        '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>',
    accommodation: '<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>',
    shop:          '<path d="M16 6V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6h-6zm-6-2h4v2h-4V4zM11 17H9v-6h2v6zm4 0h-2v-6h2v6z"/>',
    default:       '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
  };

  private readonly categoryColors: Record<string, { bg: string; icon: string }> = {
    accommodation:   { bg: '#3b82f6', icon: 'accommodation' },
    restaurant:      { bg: '#ef4444', icon: 'food' },
    club:            { bg: '#8b5cf6', icon: 'nightlife' },
    cultural_site:   { bg: '#f59e0b', icon: 'culture' },
    monument:        { bg: '#d97706', icon: 'monument' },
    sports_facility: { bg: '#22c55e', icon: 'activity' },
    event:           { bg: '#ec4899', icon: 'events' },
    attraction:      { bg: '#10b981', icon: 'beach' },
    shop:            { bg: '#f97316', icon: 'shop' },
    other:           { bg: '#6b7280', icon: 'default' },
  };

  calendarMessage = '';
  showAuthModal = false;
  hasReviewed = false;
  myReviewStatus: string | null = null;
  private toastTimerIds: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    public authService: AuthService,
    private userService: UserService,
    private routePlanner: RoutePlannerService,
    private analytics: TouristAnalyticsService,
    private preferences: TouristPreferencesService,
    private siteTranslate: SiteTranslateService,
    private locationState: LocationStateService,
    private cdr: ChangeDetectorRef
  ) { }

  get currentLanguage(): string {
    return this.siteTranslate.currentLanguage;
  }

  ngAfterViewInit(): void {
    // Mapa se inicijalizuje tek kad se dobiju koordinate (via timeout u ngOnInit)
  }

  private initDetailMap(): void {
    if (this.detailMap) {
      this.detailMap.remove();
      this.detailMap = null;
    }
    const el = document.getElementById('detail-map');
    if (!el || !this.locationLat || !this.locationLng) return;

    this.detailMap = L.map(el, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      attributionControl: true,
    }).setView([this.locationLat, this.locationLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '\u00a9 OpenStreetMap'
    }).addTo(this.detailMap);

    const category = (this.location?.postType || this.location?.category || 'default').toLowerCase().replace(/\s+/g, '_');
    const catStyle = this.categoryColors[category] ?? this.categoryColors['other'];
    const iconPath = this.svgIcons[catStyle.icon] ?? this.svgIcons['default'];
    const pinHtml = `<div style="width:36px;height:36px;background:${catStyle.bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid rgba(255,255,255,0.6);"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="16" height="16" fill="white">${iconPath}</svg></div></div>`;

    const icon = L.divIcon({ html: pinHtml, className: '', iconSize: [36, 36], iconAnchor: [18, 36] });
    L.marker([this.locationLat, this.locationLng], { icon }).addTo(this.detailMap);

    el.addEventListener('click', () => this.openOnMap());
    el.style.cursor = 'pointer';
  }

  openOnMap(): void {
    if (!this.location) return;
    this.router.navigate(['/map-home'], {
      queryParams: { focusId: this.location.id }
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/location-list']); return; }

    this.locationService.registerView(id).subscribe({
      next: (res) => {
        if (res.viewCount !== undefined && this.location) {
          this.location = { ...this.location, viewCount: res.viewCount };
          this.cdr.markForCheck();
        }
      },
      error: () => {},
    });

    if (this.preferences.snapshot.locationSharing && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          if (this.location) {
            const lat = (this.location as any).lat ?? (this.location as any).latitude;
            const lng = (this.location as any).lng ?? (this.location as any).longitude;
            if (lat && lng) this.distanceKm = this.haversineKm(userLat, userLng, lat, lng);
          } else {
            (this as any)._userPos = [userLat, userLng];
          }
          this.cdr.markForCheck();
        },
        () => {}
      );
    }

    this.locationService.getLocationById(id).subscribe({
      next: (loc) => {
        this.location = loc;
        this.images   = this.locationService.parseImages(loc.images);
        this.currentImageIndex = 0;

        this.locationLat = (loc as any).lat ?? (loc as any).latitude ?? null;
        this.locationLng = (loc as any).lng ?? (loc as any).longitude ?? null;
        if (this.locationLat && this.locationLng) {
          setTimeout(() => this.initDetailMap(), 100);
        }

        if (!this.authService.isLoggedIn) {
          this.location.isLiked = false;
          (this.location as any).isSaved = false;
        } else {
          if ((loc as any).isSaved !== undefined) {
            (this.location as any).isSaved = !!(loc as any).isSaved;
          } else {
            (this.location as any).isSaved = false;
          }
          if (loc.isLiked === undefined) {
            this.location.isLiked = false;
          }
        }

        const savedPos = (this as any)._userPos as [number, number] | undefined;
        if (savedPos) {
          const lat = (loc as any).lat ?? (loc as any).latitude;
          const lng = (loc as any).lng ?? (loc as any).longitude;
          if (lat && lng) this.distanceKm = this.haversineKm(savedPos[0], savedPos[1], lat, lng);
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('getLocationById error:', err);
        this.errorMessage = 'Location not found.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });

    this.locationService.getReviews(id).subscribe({
      next: (res) => {
        this.reviews = res.data ?? [];
        if (this.location && res.total !== undefined) {
          this.location.reviewCount = res.total;
        }
        this.myReviewStatus = res.myReviewStatus ?? null;
        this.hasReviewed = this.myReviewStatus === 'PENDING' ||
          this.myReviewStatus === 'APPROVED' ||
          (!!this.authService.touristId && this.reviews.some(r => r.touristId === this.authService.touristId));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('getReviews error:', err)
    });
  }

  openAuthModal(): void  { this.showAuthModal = true; }
  closeAuthModal(): void { this.showAuthModal = false; }
  goToLoginFromModal(): void { this.router.navigate(['/login']); }

  // ── LIKE ─────────────────────────────────────────────────────────
  onLike(): void {
    if (!this.location) return;

    if (!this.authService.isLoggedIn) {
      this.openAuthModal();
      return;
    }

    if (this.location.isLiked) {
      this.locationService.unlikeLocation(this.location.id).subscribe({
        next: (res) => {
          if (this.location) {
            this.location.isLiked = false;
            this.location.likeCount = Math.max(0, (this.location.likeCount || 0) - 1);
            // ✅ Obavesti ostale komponente o promeni
            this.locationState.emit({ id: this.location.id, isLiked: false, likeCount: this.location.likeCount });
          }
          this.likeMessage = 'Like removed';
          this.clearToastAfter('likeMessage');
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthFailure(err)) {
            this.showActionError('Could not update like right now.');
          }
        }
      });
    } else {
      this.locationService.likeLocation(this.location.id).subscribe({
        next: (res) => {
          if (this.location) {
            this.location.isLiked = true;
            this.location.likeCount = (this.location.likeCount || 0) + 1;
            // ✅ Obavesti ostale komponente o promeni
            this.locationState.emit({ id: this.location.id, isLiked: true, likeCount: this.location.likeCount });
          }
          this.likeMessage = '❤️ Liked!';
          this.clearToastAfter('likeMessage');
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (!this.handleAuthFailure(err)) {
            this.showActionError('Could not update like right now.');
          }
        }
      });
    }
  }

  private toggleGuestLike(id: number): void {
    const liked: number[] = [];
    const idx = liked.indexOf(id);
    if (idx >= 0) {
      liked.splice(idx, 1);
      this.likeMessage = 'Like removed';
      if (this.location) {
        this.location.isLiked = false;
        this.location.likeCount = Math.max(0, (this.location.likeCount || 0) - 1);
      }
    } else {
      liked.push(id);
      this.likeMessage = '❤️ Liked!';
      if (this.location) {
        this.location.isLiked = true;
        this.location.likeCount = (this.location.likeCount || 0) + 1;
      }
    }
    this.openAuthModal();
    this.clearToastAfter('likeMessage');
    this.cdr.markForCheck();
  }

  // ── SAVE ─────────────────────────────────────────────────────────
  onSave(): void {
    if (!this.location) return;

    if (!this.authService.isLoggedIn) {
      this.openAuthModal();
      return;
    }

    this.locationService.toggleSaveLocation(this.location.id).subscribe({
      next: (res) => {
        if (this.location) {
          (this.location as any).isSaved = res.isSaved;
          if (res.isSaved) {
            this.location.saveCount = (this.location.saveCount || 0) + 1;
          } else {
            this.location.saveCount = Math.max(0, (this.location.saveCount || 0) - 1);
          }
          // ✅ Obavesti ostale komponente o promeni
          this.locationState.emit({ id: this.location.id, isSaved: res.isSaved, saveCount: this.location.saveCount });
        }
        this.saveMessage = res.isSaved ? '🔖 Saved!' : 'Removed from saved';
        this.clearToastAfter('saveMessage');
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (!this.handleAuthFailure(err)) {
          this.showActionError('Could not update saved state right now.');
        }
      }
    });
  }

  private toggleGuestSave(id: number): void {
    const saved: number[] = [];
    const idx = saved.indexOf(id);
    if (idx >= 0) {
      saved.splice(idx, 1);
      this.saveMessage = 'Removed from saved';
      if (this.location) {
        (this.location as any).isSaved = false;
        this.location.saveCount = Math.max(0, (this.location.saveCount || 0) - 1);
      }
    } else {
      saved.push(id);
      this.saveMessage = '🔖 Saved!';
      if (this.location) {
        (this.location as any).isSaved = true;
        this.location.saveCount = (this.location.saveCount || 0) + 1;
      }
    }
    this.openAuthModal();
    this.clearToastAfter('saveMessage');
    this.cdr.markForCheck();
  }

  // ── WORKING HOURS ─────────────────────────────────────────────────
  parseOpeningHours(raw?: string): { day: string; hours: string }[] {
    if (!raw) return [];
    try {
      const obj = JSON.parse(raw);
      const dayNames: Record<string, string> = {
        mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
        thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
      };
      return Object.entries(obj).map(([k, v]) => ({
        day:   dayNames[k.toLowerCase()] || k,
        hours: String(v)
      }));
    } catch {
      return [{ day: '', hours: raw }];
    }
  }

  get isCurrentlyOpen(): boolean {
    if (!this.location?.openingHours) return false;
    try {
      const obj = JSON.parse(this.location.openingHours);
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayKey = dayKeys[new Date().getDay()];
      const hours: string = obj[todayKey];
      if (!hours || hours === 'closed') return false;
      if (hours === '00:00-24:00' || hours === '0:00-24:00') return true;
      const [openStr, closeStr] = hours.split('-');
      const toMins = (t: string) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const openMins = toMins(openStr);
      const closeMins = toMins(closeStr);
      if (closeMins <= openMins) {
        return nowMins >= openMins || nowMins < closeMins;
      }
      return nowMins >= openMins && nowMins < closeMins;
    } catch { return false; }
  }

  formatPostType(type?: string | null): string {
    return this.siteTranslate.instant(formatPostType(type));
  }

  get activityItems(): Array<{ id?: number; name: string }> {
    const loc = this.location as any;
    const names = this.readActivityNames(loc);
    const ids = this.readActivityIds(loc);
    const seen = new Set<string>();

    return names
      .map((name, index) => ({
        id: ids[index],
        name: String(name ?? '').trim(),
      }))
      .filter(item => {
        if (!item.name) return false;
        const key = item.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  openActivity(item: { id?: number; name: string }): void {
    this.router.navigate(['/location-list'], {
      queryParams: {
        type: 'destinations',
        tagId: item.id ?? null,
        tag: item.name,
      },
    });
  }

  private readActivityNames(loc: any): string[] {
    const directNames = loc?.tagNames ?? loc?.TagNames ?? loc?.activityTagNames ?? loc?.activityTags;
    const directList = this.toStringList(directNames);
    if (directList.length > 0) return directList;

    const nested = [loc?.tags, loc?.activities, loc?.linkedActivities]
      .find(value => Array.isArray(value));

    return Array.isArray(nested)
      ? nested
          .map(item => typeof item === 'string' ? item : (item?.name ?? item?.tagName ?? item?.title))
          .map(value => String(value ?? '').trim())
          .filter(Boolean)
      : [];
  }

  private readActivityIds(loc: any): Array<number | undefined> {
    const directIds = loc?.tagIds ?? loc?.TagIds ?? loc?.activityTagIds;
    const ids = Array.isArray(directIds)
      ? directIds
      : String(directIds ?? '').split(/[;,]/);

    if (ids.length > 0) {
      return ids.map(id => {
        const value = Number(id);
        return Number.isFinite(value) ? value : undefined;
      });
    }

    const nested = [loc?.tags, loc?.activities, loc?.linkedActivities]
      .find(value => Array.isArray(value));

    return Array.isArray(nested)
      ? nested.map(item => {
          const value = Number(item?.id ?? item?.tagId ?? item?.activityId);
          return Number.isFinite(value) ? value : undefined;
        })
      : [];
  }

  private toStringList(value: unknown): string[] {
    const items = Array.isArray(value)
      ? value
      : String(value ?? '').split(/[;,]/);

    return items
      .map(item => {
        const source = item as any;
        return String(
          typeof source === 'string'
            ? source
            : (source?.name ?? source?.tagName ?? source?.title ?? '')
        ).trim();
      })
      .filter(Boolean);
  }

  get isEvent(): boolean {
    return (this.location?.postType || '').toLowerCase() === 'event';
  }

  get externalActionLabel(): string {
    return this.siteTranslate.instant(this.isEvent ? 'Buy ticket' : 'Booking');
  }

  private touchStartX = 0;
  private touchStartY = 0;

  onTouchStart(e: TouchEvent): void {
    const t = e.changedTouches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  }

  onTouchEnd(e: TouchEvent): void {
    if (this.images.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) this.nextImage(); else this.prevImage();
  }

  get eventHasPassed(): boolean {
    const eventRange = this.getEventRange();
    return this.isEvent && !!eventRange?.end && eventRange.end < new Date();
  }

  prevImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }

  nextImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  get isDescriptionTruncated(): boolean {
    return !!this.location?.description && this.location.description.length > this.descriptionTruncateLength;
  }

  get descriptionPreview(): string {
    if (!this.location?.description) return '';
    return this.location.description.slice(0, this.descriptionTruncateLength);
  }

  toggleDescription(): void {
    this.showFullDescription = !this.showFullDescription;
  }

  // ── REVIEWS ───────────────────────────────────────────────────────
  submitReview(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) return;
    this.reviewError   = '';
    this.reviewSuccess = '';
    this.isSubmittingReview = true;
    this.locationService.addReview(this.location.id, touristId, this.newRating, this.newComment).subscribe({
      next: (review) => {
        const status = (review.status ?? '').toUpperCase();
        if (status === 'APPROVED') {
          this.reviews.unshift(review);
        }
        this.reviewSuccess  = status === 'APPROVED'
          ? 'Review submitted!'
          : 'Review submitted for moderation.';
        this.clearToastAfter('reviewSuccess');
        this.hasReviewed    = true;
        this.myReviewStatus = status || 'PENDING';
        this.newRating      = 5;
        this.newComment     = '';
        this.isSubmittingReview = false;
        this.showReviewForm = false;
        if (this.location && status === 'APPROVED') {
          this.location.reviewCount++;
          const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
          this.location.avgRating = Math.round((total / this.reviews.length) * 10) / 10;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 409) {
          this.reviewError = 'You have already reviewed this location.';
          this.hasReviewed = true;
          this.showReviewForm = false;
        } else {
          this.reviewError = err?.error?.message || 'Error submitting review.';
        }
        this.isSubmittingReview = false;
        this.cdr.markForCheck();
      }
    });
  }

  getStars(rating: number): string {
    const r = Math.min(5, Math.max(0, Math.round(rating)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  goToLogin(): void { this.showAuthModal = true; }

  get reviewStatusLabel(): string {
    switch ((this.myReviewStatus ?? '').toUpperCase()) {
      case 'PENDING':
        return 'Review pending';
      case 'APPROVED':
        return 'Reviewed';
      default:
        return 'Reviewed';
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    this.router.navigate(['/location-list']);
  }

  getDirections(): void {
    if (!this.location) {
      return;
    }

    this.routePlanner.replaceStops([this.location], { plannerMode: true });
    this.analytics.track('planner_started', {
      source: 'location-details',
      postId: this.location.id,
      postType: this.location.postType,
      regionName: this.location.regionName,
    });

    this.router.navigate(['/map-home'], {
      queryParams: {
        planner: '1',
        focusRoute: '1',
        focusId: this.location.id,
      }
    });
  }

  addToRoutePlanner(): void {
    if (!this.location) {
      return;
    }

    this.routePlanner.addStop(this.location);
    this.routePlanner.setPlannerMode(true);
    this.analytics.track('planner_stop_added', {
      source: 'location-details',
      postId: this.location.id,
      postType: this.location.postType,
      regionName: this.location.regionName,
    });

    this.router.navigate(['/map-home'], {
      queryParams: {
        planner: '1',
        focusId: this.location.id,
      }
    });
  }

  openExternalLink(): void {
    const location = this.location;
    const url = location?.externalUrl;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    this.analytics.track('external_link_opened', {
      source: 'location-details',
      postId: location.id,
      postType: location.postType,
      regionName: location.regionName,
    });
  }

  shareLocation(): void {
    const url = window.location.href;
    const title = this.location?.title || 'Check this location on AdriGo';
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.saveMessage = '🔗 Link copied to clipboard!';
        this.clearToastAfter('saveMessage');
        this.cdr.markForCheck();
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    }
  }

  openCalendarScheduler(): void {
    if (!this.location) return;
    if (!this.authService.isLoggedIn) {
      this.openAuthModal();
      return;
    }
    if (this.eventHasPassed) {
      this.calendarMessage = 'This event has already ended.';
      this.clearToastAfter('calendarMessage');
      return;
    }

    const eventRange = this.getEventRange();
    const pending: PendingSchedule = {
      kind: 'post',
      postId: this.location.id,
      title: this.location.title,
      postType: this.location.postType,
      isEvent: this.isEvent,
      eventStart: this.isEvent ? (eventRange?.start?.toISOString() ?? null) : null,
      eventEnd:   this.isEvent ? (eventRange?.end?.toISOString() ?? null) : null,
      address:    this.location.address || this.location.regionName || '',
      imageUrl:   this.location.imageUrl ?? null,
    };

    this.router.navigate(['/calendar'], { state: { pendingSchedule: pending } });
  }

  ngOnDestroy(): void {
    this.setBodyScrollLock(false);
    this.toastTimerIds.forEach(timerId => clearTimeout(timerId));
    this.toastTimerIds = [];
    if (this.detailMap) {
      this.detailMap.remove();
      this.detailMap = null;
    }
    if (this.lightboxOpen) {
      document.body.style.overflow = '';
    }
  }

  private clearToastAfter(field: 'likeMessage' | 'saveMessage' | 'actionErrorMessage' | 'calendarMessage' | 'reviewSuccess', delayMs = 3000): void {
    const timerId = setTimeout(() => {
      this[field] = '';
      this.cdr.detectChanges();
    }, delayMs);
    this.toastTimerIds.push(timerId);
  }

  private handleAuthFailure(err: any): boolean {
    if (err?.status !== 401) return false;
    this.authService.logout();
    this.router.navigate(['/login']);
    return true;
  }

  private showActionError(message: string): void {
    this.actionErrorMessage = message;
    this.clearToastAfter('actionErrorMessage');
    this.cdr.markForCheck();
  }

  private setBodyScrollLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('calendar-scheduler-open', locked);
  }

  addToCalendar(): void {
    if (!this.location) return;

    if (!this.authService.isLoggedIn) {
      this.openAuthModal();
      return;
    }
  }

  private getEventRange(): { start: Date | null; end: Date | null } | null {
    if (!this.location?.details) return null;

    try {
      const details = JSON.parse(this.location.details);
      const start = details?.startAt ? new Date(details.startAt) : null;
      const end = details?.endAt ? new Date(details.endAt) : null;
      return {
        start: start && !isNaN(start.getTime()) ? start : null,
        end: end && !isNaN(end.getTime()) ? end : null,
      };
    } catch {
      return null;
    }
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }
}
