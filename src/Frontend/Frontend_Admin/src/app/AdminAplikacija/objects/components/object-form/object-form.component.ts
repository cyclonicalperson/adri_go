import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ObjectService } from '@core/services/object.service';
import { RegionService } from '@core/services/region.service';
import { Region } from '@core/models/region.model';
import { ObjectCategory } from '@core/models/object.model';
import { Media } from '@core/models/destination.model';
import { ObjectMapPickerComponent } from '../object-map-picker/object-map-picker.component';
import { MediaUploaderComponent } from '../media-uploader/media-uploader.component';
import { ActivitiesSelectorComponent } from '../activities-selector/activities-selector.component';

@Component({
  selector: 'app-object-form',
  imports: [
    ReactiveFormsModule,
    ObjectMapPickerComponent,
    MediaUploaderComponent,
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
  media: Media[] = [];

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
      regionId: [null, Validators.required],
      name: ['', Validators.required],
      category: ['HOTEL', Validators.required],
      description: ['', Validators.required],
      address: ['', Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      phone: [''],
      website: [''],
      workingHours: [''],
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
        this.media = o.media ?? [];
      });
    }
  }

  onLocationPicked(loc: { lat: number; lng: number }): void {
    this.form.patchValue({ latitude: loc.lat, longitude: loc.lng });
  }

  get lat(): number { return this.form.get('latitude')?.value ?? 43.85; }
  get lng(): number { return this.form.get('longitude')?.value ?? 20.45; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const payload = { ...this.form.value, activityIds: this.selectedActivityIds };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/lokacije']),
      error: (err: any) => { this.error = err.message ?? 'Greška pri čuvanju.'; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/lokacije']); }
  f(name: string) { return this.form.get(name)!; }
}
