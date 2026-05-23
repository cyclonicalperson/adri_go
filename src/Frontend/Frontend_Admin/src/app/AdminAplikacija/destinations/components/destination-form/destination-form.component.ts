import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { DestinationService } from '@core/services/destination.service';
import { DestinationType } from '@core/models/destination.model';
import { MapComponent, MapClickEvent } from '@shared/components/map/map.component';
import { DEFAULT_COUNTRY, WORLD_COUNTRIES } from '@shared/data/world-countries';

@Component({
  selector: 'app-destination-form',
  standalone: true,
  imports: [ReactiveFormsModule, MapComponent],
  templateUrl: './destination-form.component.html',
  styleUrl: './destination-form.component.scss',
})

export class DestinationFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;
  readonly countries = WORLD_COUNTRIES;

  readonly typeOptions: { value: DestinationType; label: string }[] = [
    { value: 'CITY', label: 'Grad' },
    { value: 'MOUNTAIN', label: 'Planina' },
    { value: 'LAKE', label: 'Jezero' },
    { value: 'NATIONAL_PARK', label: 'Nacionalni park' },
    { value: 'BEACH', label: 'Plaža' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: DestinationService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['CITY', Validators.required],
      description: ['', Validators.required],
      country: [DEFAULT_COUNTRY, Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    this.auth.ensurePermissionsLoaded().subscribe(() => {
      if (!this.canManageDestinations) {
        this.router.navigate([this.canManageContent && !this.isEdit ? '/admin/lokacije/new' : '/admin/lokacije']);
        return;
      }

      if (this.isEdit) {
        this.service.getById(this.id!).subscribe((res: { data: any; }) => {
          const d = res.data;
          this.form.patchValue({
            name: d.name,
            type: d.type,
            description: d.description,
            country: d.country ?? DEFAULT_COUNTRY,
            latitude: d.latitude,
            longitude: d.longitude,
          });
        });
      }
    });
  }

  onMapClick(ev: MapClickEvent): void {
    this.form.patchValue({ latitude: ev.lat, longitude: ev.lng });
  }

  get lat(): number { return this.form.get('latitude')?.value ?? 43.85; }
  get lng(): number { return this.form.get('longitude')?.value ?? 18.41; }

  get canManageDestinations(): boolean {
    return this.auth.isSuperAdmin;
  }

  get canManageContent(): boolean {
    return this.auth.hasPermissionInAnyScope('manage_own_posts');
  }

  submit(): void {
    if (!this.canManageDestinations) {
      this.router.navigate([this.canManageContent && !this.isEdit ? '/admin/lokacije/new' : '/admin/lokacije']);
      return;
    }

    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const payload = this.form.value;
    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/destinations']),
      error: err => { this.error = err.message; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/destinations']); }
}
