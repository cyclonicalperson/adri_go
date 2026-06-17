import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ObjectService } from '@core/services/object.service';
import { RegionService } from '@core/services/region.service';
import { AuthService } from '@core/auth/auth.service';
import { Region } from '@core/models/region.model';
import { ObjectCategory } from '@core/models/object.model';
import { ObjectMapPickerComponent } from '../object-map-picker/object-map-picker.component';
import { ActivitiesSelectorComponent } from '../activities-selector/activities-selector.component';
import { PostImagePickerComponent } from '@shared/components/post-image-picker/post-image-picker.component';
import { DEFAULT_COUNTRY, WORLD_COUNTRIES } from '@shared/data/world-countries';

type WorkingDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

@Component({
  selector: 'app-object-form',
  imports: [
    ReactiveFormsModule,
    ObjectMapPickerComponent,
    PostImagePickerComponent,
    ActivitiesSelectorComponent,
  ],
  templateUrl: './object-form.component.html',
  styleUrl: './object-form.component.scss',
})
export class ObjectFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;

  destinations: Region[] = [];
  selectedActivityIds: number[] = [];
  formImages: string[] = [];
  readonly countries = WORLD_COUNTRIES;
  readonly workingDayOptions: { key: WorkingDayKey; label: string }[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ];
  private originalCategory: ObjectCategory | null = null;
  resolvingAddress = false;
  submitted = false;

  readonly categoryOptions: { value: ObjectCategory; label: string }[] = [
    { value: 'HOTEL', label: '🏔️ Hotel' },
    { value: 'APARTMENT', label: '🏠 Apartman / Smeštaj' },
    { value: 'RESTAURANT', label: '🍽️ Restoran' },
    { value: 'CAFE', label: '☕ Kafić' },
    { value: 'CLUB', label: '🎵 Klub' },
    { value: 'SHOP', label: '🛍️ Prodavnica' },
    { value: 'CULTURAL', label: '🎭 Kulturni objekat' },
    { value: 'MONUMENT', label: '🗿 Spomenik' },
    { value: 'SPORT', label: '⚽ Sportski objekat' },
    { value: 'NATURE', label: '🌿 Priroda' },
    { value: 'OTHER', label: '📍 Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: ObjectService,
    private destService: RegionService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      regionId: [null],
      proposedRegionName: [''],
      country: [DEFAULT_COUNTRY, [Validators.required, Validators.maxLength(100)]],
      name: ['', Validators.required],
      category: ['HOTEL', Validators.required],
      description: ['', Validators.required],
      address: ['', Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      phone: ['', [Validators.pattern(/^(\+?[0-9\s\-\(\)]{6,20})?$/)]],
      website: ['', [Validators.pattern(/^(https?:\/\/[^\s]+)?$/)]],
      workingHours: this.buildWorkingHoursForm(),
    });

    this.destService.getAll({ page: 1, pageSize: 200 }).subscribe(res => {
      this.destinations = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (!this.isEdit) {
      const firstAllowed = this.categoryOptions.find(opt => this.canUseCategory(opt.value));
      if (!firstAllowed) {
        this.router.navigate(['/admin/dashboard']);
        return;
      }
      this.form.patchValue({ category: firstAllowed.value });
    }

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe(res => {
        const o = res.data;
        if (!this.canEditObject(o)) {
          this.router.navigate(['/admin/dashboard']);
          return;
        }
        this.originalCategory = o.category;
        this.form.patchValue({
          regionId: o.regionId,
          proposedRegionName: (o as any).proposedRegionName ?? '',
          country: o.country ?? o.region?.country ?? DEFAULT_COUNTRY,
          name: o.name,
          category: o.category,
          description: o.description,
          address: o.address,
          latitude: o.latitude,
          longitude: o.longitude,
          phone: o.phone,
          website: o.website,
        });
        this.patchWorkingHours((o as any).workingHoursSchedule ?? o.workingHours);
        this.selectedActivityIds = o.activities?.map((a: any) => a.activityId) ?? [];
        this.formImages = (o.media ?? []).map(m => m.url).filter(url => !!url);
      });
    }
  }

  async onLocationPicked(loc: { lat: number; lng: number }): Promise<void> {
    this.form.patchValue({ latitude: loc.lat, longitude: loc.lng });
    await this.resolveAddress(loc.lat, loc.lng);
  }

  get lat(): number { return this.form.get('latitude')?.value ?? 43.85; }
  get lng(): number { return this.form.get('longitude')?.value ?? 20.45; }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid || !this.hasRegionChoice()) {
      this.form.markAllAsTouched();
      if (!this.hasRegionChoice()) {
        this.error = 'Izaberite region ili upisite predlog novog regiona.';
      }
      return;
    }

    const formValue = this.form.getRawValue();
    const proposedRegionName = this.normalizeProposedRegionName(formValue.proposedRegionName);
    if (formValue.regionId && proposedRegionName) {
      this.error = 'Ne mozete istovremeno izabrati region i poslati predlog novog regiona.';
      return;
    }
    const scopeRegionId = proposedRegionName ? undefined : this.selectedRegionIdForPermission;
    if (!this.auth.hasPermission('manage_own_posts', scopeRegionId) ||
        !this.canUseCategory(formValue.category, scopeRegionId)) {
      this.error = 'Nemate dozvolu za kreiranje ili promenu ove kategorije u izabranom regionu.';
      return;
    }

    this.saving = true;
    this.error = null;

    const media = this.formImages.map((url, idx) => ({ mediaId: idx + 1, url, sortOrder: idx, caption: undefined }));
    const { workingHours, ...payloadValues } = formValue;
    const payload = {
      ...payloadValues,
      regionId: proposedRegionName ? null : formValue.regionId,
      proposedRegionName,
      workingHours: this.buildWorkingHoursPayload(),
      activityIds: this.selectedActivityIds,
      media,
    };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/lokacije']),
      error: (err: any) => { this.error = err?.error?.message ?? err?.message ?? 'Greška pri čuvanju.'; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/lokacije']); }
  f(name: string) { return this.form.get(name)!; }

  workingDayGroup(key: WorkingDayKey): FormGroup {
    return this.form.get(['workingHours', key]) as FormGroup;
  }

  isWorkingDayEnabled(key: WorkingDayKey): boolean {
    return !!this.workingDayGroup(key).get('enabled')?.value;
  }

  applyMondayHoursToAll(): void {
    const source = this.workingDayGroup('mon').getRawValue();
    this.workingDayOptions.forEach(day => {
      this.workingDayGroup(day.key).patchValue({
        enabled: source.enabled,
        open: source.open || '09:00',
        close: source.close || '17:00',
      });
    });
  }

  clearWorkingHours(): void {
    this.workingDayOptions.forEach(day => {
      this.workingDayGroup(day.key).patchValue({
        enabled: false,
        open: '09:00',
        close: '17:00',
      });
    });
  }

  canUseCategory(category: ObjectCategory, regionId?: number | null): boolean {
    if (this.auth.isSuperAdmin) {
      return true;
    }

    if (this.isEdit && category === this.originalCategory) {
      return true;
    }

    const permission = this.createPermissionForCategory(category);
    return !permission || this.auth.hasPermission(permission, regionId);
  }

  get selectedRegionIdForPermission(): number | undefined {
    const regionId = Number(this.form?.get('regionId')?.value);
    return Number.isFinite(regionId) && regionId > 0 ? regionId : undefined;
  }

  private canEditObject(objectItem: { createdBy: number; regionId?: number; destinationId?: number; proposedRegionName?: string | null }): boolean {
    const regionId = objectItem.proposedRegionName
      ? undefined
      : this.objectScopeRegionId(objectItem);

    return this.auth.isSuperAdmin ||
      (this.auth.hasPermission('manage_own_posts', regionId) && objectItem.createdBy === this.auth.currentUser?.userId);
  }

  get regionChoiceInvalid(): boolean {
    return this.submitted && !this.hasRegionChoice();
  }

  get filteredDestinations(): Region[] {
    const country = this.form?.get('country')?.value;
    return country ? this.destinations.filter(region => region.country === country) : this.destinations;
  }

  onRegionSelected(): void {
    if (this.form.get('regionId')?.value) {
      this.form.patchValue({ proposedRegionName: '' }, { emitEvent: false });
    }
  }

  onCountryChanged(): void {
    const selectedRegionId = Number(this.form.get('regionId')?.value);
    if (selectedRegionId && !this.filteredDestinations.some(region => region.regionId === selectedRegionId)) {
      this.form.patchValue({ regionId: null }, { emitEvent: false });
    }
  }

  onProposedRegionInput(): void {
    if (this.normalizeProposedRegionName(this.form.get('proposedRegionName')?.value)) {
      this.form.patchValue({ regionId: null }, { emitEvent: false });
    }
  }

  private async resolveAddress(lat: number, lng: number): Promise<void> {
    this.resolvingAddress = true;
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        zoom: '18',
        addressdetails: '1',
        'accept-language': 'sr,en',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      const address = this.buildShortAddress(data);
      if (address) this.form.patchValue({ address });
      this.tryAutoSelectRegion(lat, lng, data);
    } catch {
      // Reverse geocoding is best-effort; coordinates remain selected.
    } finally {
      this.resolvingAddress = false;
    }
  }

  private tryAutoSelectRegion(lat: number, lng: number, geocoded: any): void {
    if (this.form.get('regionId')?.value ||
        this.normalizeProposedRegionName(this.form.get('proposedRegionName')?.value) ||
        this.destinations.length === 0) {
      return;
    }

    const addressParts = Object.values(geocoded?.address ?? {})
      .filter((value): value is string => typeof value === 'string');
    const haystack = this.normalizeText([
      geocoded?.display_name,
      ...addressParts,
    ].filter(Boolean).join(' '));

    const textMatch = this.destinations.find(region => {
      const regionName = this.normalizeText(region.name);
      return !!regionName && haystack.includes(regionName);
    });

    if (textMatch) {
      this.form.patchValue({ regionId: textMatch.regionId });
      return;
    }

    const nearest = this.destinations
      .filter(region => region.lat != null && region.lng != null)
      .map(region => ({
        region,
        distanceKm: this.distanceKm(lat, lng, Number(region.lat), Number(region.lng)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];

    if (nearest && nearest.distanceKm <= 75) {
      this.form.patchValue({ regionId: nearest.region.regionId });
    }
  }

  private buildShortAddress(geocoded: any): string {
    const address = geocoded?.address ?? {};
    const street = [
      address.road,
      address.pedestrian,
      address.footway,
      address.path,
      address.cycleway,
      address.neighbourhood,
    ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const houseNumber = typeof address.house_number === 'string' ? address.house_number.trim() : '';
    const locality = [
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.suburb,
      address.county,
    ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const streetLine = [street, houseNumber].filter(Boolean).join(' ').trim();
    const parts = [streetLine, locality]
      .filter((part): part is string => typeof part === 'string')
      .map(part => part.trim())
      .filter((part, index, arr) => part && arr.indexOf(part) === index);

    if (parts.length > 0) return parts.join(', ');

    return typeof geocoded?.display_name === 'string'
      ? geocoded.display_name.split(',').map((part: string) => part.trim()).filter(Boolean).slice(0, 2).join(', ')
      : '';
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'dj');
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const radiusKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180)
      * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLng / 2) ** 2;
    return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private hasRegionChoice(): boolean {
    return !!this.form?.get('regionId')?.value ||
      !!this.normalizeProposedRegionName(this.form?.get('proposedRegionName')?.value);
  }

  private normalizeProposedRegionName(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private buildWorkingHoursForm(): FormGroup {
    const controls = this.workingDayOptions.reduce((acc, day) => {
      acc[day.key] = this.fb.group({
        enabled: [false],
        open: ['09:00'],
        close: ['17:00'],
      });
      return acc;
    }, {} as Record<WorkingDayKey, FormGroup>);

    return this.fb.group(controls);
  }

  private buildWorkingHoursPayload(): Record<string, string> | null {
    const hasAnyOpenDay = this.workingDayOptions.some(day => this.isWorkingDayEnabled(day.key));
    if (!hasAnyOpenDay) return null;

    return this.workingDayOptions.reduce((schedule, day) => {
      const group = this.workingDayGroup(day.key).getRawValue();
      schedule[day.key] = group.enabled
        ? `${group.open || '09:00'}-${group.close || '17:00'}`
        : 'closed';
      return schedule;
    }, {} as Record<string, string>);
  }

  private patchWorkingHours(value: unknown): void {
    const schedule = this.parseWorkingHoursSchedule(value);
    if (!schedule) {
      this.clearWorkingHours();
      return;
    }

    this.workingDayOptions.forEach(day => {
      const hours = schedule[day.key];
      if (!hours || hours === 'closed') {
        this.workingDayGroup(day.key).patchValue({ enabled: false });
        return;
      }

      const [open, close] = hours.split('-').map(part => part.trim());
      this.workingDayGroup(day.key).patchValue({
        enabled: true,
        open: open || '09:00',
        close: close || '17:00',
      });
    });
  }

  private parseWorkingHoursSchedule(value: unknown): Record<string, string> | null {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const source = value as Record<string, unknown>;
      if (typeof source['text'] === 'string') return this.buildScheduleFromLegacyText(source['text']);
      return Object.fromEntries(
        Object.entries(source)
          .filter(([, hours]) => typeof hours === 'string' && hours.trim())
          .map(([day, hours]) => [day, String(hours).trim()])
      );
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return null;
      try {
        return this.parseWorkingHoursSchedule(JSON.parse(text));
      } catch {
        return this.buildScheduleFromLegacyText(text);
      }
    }

    return null;
  }

  private buildScheduleFromLegacyText(text: string): Record<string, string> | null {
    const normalized = text.trim();
    if (!normalized) return null;

    const hours = /^(non[\-\s]?stop|24\/7)$/i.test(normalized)
      ? '00:00-24:00'
      : normalized.replace(/\s*[–-]\s*/g, '-');

    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(hours)) return null;
    return Object.fromEntries(this.workingDayOptions.map(day => [day.key, hours]));
  }

  private createPermissionForCategory(category: ObjectCategory): string | null {
    const map: Partial<Record<ObjectCategory, string>> = {
      HOTEL: 'create_accommodation',
      APARTMENT: 'create_accommodation',
      RESTAURANT: 'create_restaurant',
      CAFE: 'create_restaurant',
      CLUB: 'create_club',
      SHOP: 'create_shop',
      CULTURAL: 'create_cultural_site',
      MONUMENT: 'create_monument',
      SPORT: 'create_sports',
    };
    return map[category] ?? null;
  }

  private objectScopeRegionId(objectItem: { regionId?: number; destinationId?: number }): number | undefined {
    const regionId = objectItem.regionId ?? objectItem.destinationId;
    return typeof regionId === 'number' && regionId > 0 ? regionId : undefined;
  }
}
