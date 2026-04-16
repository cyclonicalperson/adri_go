import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { RegionService } from '@core/services/region.service';
import { Region } from '@core/models/region.model';
import { ObjectService } from '@core/services/object.service';
import { TouristObject } from '@core/models/object.model';
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

  readonly categoryOptions = [
    { value: 'CONCERT', label: 'Koncert' },
    { value: 'FESTIVAL', label: 'Festival' },
    { value: 'SPORT', label: 'Sport / Takmičenje' },
    { value: 'EXHIBITION', label: 'Izložba' },
    { value: 'TOUR', label: 'Tura' },
    { value: 'THEATER', label: 'Pozorište' },
    { value: 'CONFERENCE', label: 'Konferencija' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private destService: RegionService,
    private objectService: ObjectService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      category: ['CONCERT', Validators.required],
      description: ['', Validators.required],
      regionId: [null],
      objectId: [null],
      startAt: ['', Validators.required],
      endAt: ['', Validators.required],
      ticketUrl: [''],
      externalUrl: [''],
      lat: [null],
      lng: [null],
      status: ['draft'],
    });

    // Učitaj regije za dropdown
    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.destinations = res.data;
    });

    // Učitaj objekte za dropdown
    this.objectService.getAll({ page: 1, pageSize: 200 }).subscribe(res => {
      this.objects = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      // Direktan HTTP poziv na /posts/{id} — backend vraća PostDto
      this.http.get<any>(`${environment.apiUrl}/posts/${this.id}`).subscribe({
        next: post => {
          // PostDto ima: title, postType, description, lat, lng, regionId,
          // details (JSON string): { eventStart, eventEnd, category, ticketUrl }
          let det: any = {};
          if (post.details) {
            try { det = typeof post.details === 'string' ? JSON.parse(post.details) : post.details; }
            catch { det = {}; }
          }

          // Formatiramo datetime-local input (YYYY-MM-DDTHH:MM)
          const fmtDt = (s: string | undefined) => {
            if (!s) return '';
            return new Date(s).toISOString().slice(0, 16);
          };

          this.form.patchValue({
            title: post.title ?? '',
            category: det.category ?? 'OTHER',
            description: post.description ?? '',
            regionId: post.regionId ?? null,
            objectId: det.objectId ?? post.objectId ?? null,
            startAt: fmtDt(det.eventStart),
            endAt: fmtDt(det.eventEnd),
            ticketUrl: det.ticketUrl ?? post.externalUrl ?? '',
            externalUrl: post.externalUrl ?? '',
            lat: post.lat ?? null,
            lng: post.lng ?? null,
            status: post.status ?? 'draft',
          });
        },
        error: () => {
          this.error = 'Greška pri učitavanju dogadjaja.';
        },
      });
    }
  }

  onMapClick(ev: MapClickEvent): void {
    this.form.patchValue({ lat: +ev.lat.toFixed(6), lng: +ev.lng.toFixed(6) });
  }

  get lat(): number { return this.form.get('lat')?.value ?? 43.85; }
  get lng(): number { return this.form.get('lng')?.value ?? 18.41; }

  f(name: string) { return this.form.get(name)!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const raw = this.form.value;

    // Backend /api/posts PUT/POST prihvata PostType, Details itd.
    const details = JSON.stringify({
      category: raw.category,
      eventStart: raw.startAt ? new Date(raw.startAt).toISOString() : null,
      eventEnd: raw.endAt ? new Date(raw.endAt).toISOString() : null,
      ticketUrl: raw.ticketUrl || null,
    });

    const body: any = {
      title: raw.title,
      postType: 'event',
      description: raw.description,
      regionId: raw.regionId || null,
      objectId: raw.objectId || null,
      lat: raw.lat || null,
      lng: raw.lng || null,
      externalUrl: raw.ticketUrl || raw.externalUrl || null,
      externalUrlLabel: raw.ticketUrl ? 'Kupi kartu' : null,
      details,
      status: raw.status || 'draft',
    };

    const req$ = this.isEdit
      ? this.http.put<any>(`${environment.apiUrl}/posts/${this.id}`, body)
      : this.http.post<any>(`${environment.apiUrl}/posts`, body);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/events']),
      error: (err: any) => {
        this.error = err?.error?.message ?? err?.message ?? 'Greška pri čuvanju.';
        this.saving = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/admin/events']); }
}
