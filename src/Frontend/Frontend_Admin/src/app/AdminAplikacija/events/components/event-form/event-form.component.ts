import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '@core/services/event.service';
import { RegionService } from '@core/services/region.service';
import { ObjectService } from '@core/services/object.service';
import { Region } from '@core/models/region.model';
import { TouristObject } from '@core/models/object.model';
import { EventCategory } from '@core/models/event.model';
import { MapComponent, MapClickEvent } from '@shared/components/map/map.component';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, MapComponent],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
})

export class EventFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;

  destinations: Region[] = [];
  objects: TouristObject[] = [];

  readonly categoryOptions: { value: EventCategory; label: string }[] = [
    { value: 'CONCERT', label: 'Koncert' },
    { value: 'FESTIVAL', label: 'Festival' },
    { value: 'SPORT', label: 'Sport' },
    { value: 'EXHIBITION', label: 'Izložba' },
    { value: 'TOUR', label: 'Tura' },
    { value: 'THEATER', label: 'Pozorište' },
    { value: 'CONFERENCE', label: 'Konferencija' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: EventService,
    private destService: RegionService,
    private objService: ObjectService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      category: ['CONCERT', Validators.required],
      description: ['', Validators.required],
      regionId: [null],
      objectId: [null],
      startAt: ['', Validators.required],
      endAt: ['', Validators.required],
      ticketUrl: [''],
      latitude: [null],
      longitude: [null],
    });

    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: Region[]; }) => {
      this.destinations = res.data;
    });

    this.objService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: TouristObject[]; }) => {
      this.objects = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe((res: { data: any; }) => {
        const e = res.data;
        this.form.patchValue({
          name: e.name,
          category: e.category,
          description: e.description,
          regionId: e.regionId,
          objectId: e.objectId,
          startAt: e.startAt.slice(0, 16),
          endAt: e.endAt.slice(0, 16),
          ticketUrl: e.ticketUrl,
          latitude: e.latitude,
          longitude: e.longitude,
        });
      });
    }
  }

  onMapClick(ev: MapClickEvent): void {
    this.form.patchValue({ latitude: ev.lat, longitude: ev.lng });
  }

  get lat(): number { return this.form.get('latitude')?.value ?? 43.85; }
  get lng(): number { return this.form.get('longitude')?.value ?? 18.41; }

  f(name: string) { return this.form.get(name)!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const raw = this.form.value;
    const payload = {
      ...raw,
      regionId: raw.regionId || undefined,
      objectId: raw.objectId || undefined,
      ticketUrl: raw.ticketUrl || undefined,
      latitude: raw.latitude || undefined,
      longitude: raw.longitude || undefined,
    };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/events']),
      error: (err: { message: string | null; }) => { this.error = err.message; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/events']); }
}
