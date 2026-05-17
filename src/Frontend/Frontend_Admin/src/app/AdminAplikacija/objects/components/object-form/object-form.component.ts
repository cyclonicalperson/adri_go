import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ObjectService } from '@core/services/object.service';
import { RegionService } from '@core/services/region.service';
import { Region } from '@core/models/region.model';
import { ObjectCategory } from '@core/models/object.model';
import { ObjectMapPickerComponent } from '../object-map-picker/object-map-picker.component';
import { ActivitiesSelectorComponent } from '../activities-selector/activities-selector.component';
import { PostImagePickerComponent } from '@shared/components/post-image-picker/post-image-picker.component';

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
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      regionId: [null],
      proposedRegionName: [''],
      name: ['', Validators.required],
      category: ['HOTEL', Validators.required],
      description: ['', Validators.required],
      address: ['', Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      phone: ['', [Validators.pattern(/^(\+?[0-9\s\-\(\)]{6,20})?$/)]],
      website: ['', [Validators.pattern(/^(https?:\/\/[^\s]+)?$/)]],
      workingHours: ['', [Validators.pattern(/^([0-2]?[0-9]:[0-5][0-9]\s*[–\-]\s*[0-2]?[0-9]:[0-5][0-9]|Non[\-\s]stop|Nonstop|24\/7)?$/i)]],
    });

    this.destService.getAll({ page: 1, pageSize: 200 }).subscribe(res => {
      this.destinations = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe(res => {
        const o = res.data;
        this.form.patchValue({
          regionId: o.regionId,
          proposedRegionName: (o as any).proposedRegionName ?? '',
          name: o.name,
          category: o.category,
          description: o.description,
          address: o.address,
          latitude: o.latitude,
          longitude: o.longitude,
          phone: o.phone,
          website: o.website,
          workingHours: o.workingHours,
        });
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
    this.saving = true;
    this.error = null;

    const media = this.formImages.map((url, idx) => ({ mediaId: idx + 1, url, sortOrder: idx, caption: undefined }));
    const proposedRegionName = this.normalizeProposedRegionName(this.form.value.proposedRegionName);
    const payload = {
      ...this.form.value,
      regionId: proposedRegionName ? null : this.form.value.regionId,
      proposedRegionName,
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

  get regionChoiceInvalid(): boolean {
    return this.submitted && !this.hasRegionChoice();
  }

  onRegionSelected(): void {
    if (this.form.get('regionId')?.value) {
      this.form.patchValue({ proposedRegionName: '' }, { emitEvent: false });
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
      const address = typeof data?.display_name === 'string' ? data.display_name : '';
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
}
