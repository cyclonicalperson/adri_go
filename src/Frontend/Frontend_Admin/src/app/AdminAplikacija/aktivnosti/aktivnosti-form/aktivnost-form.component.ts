import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { MapComponent, MapClickEvent } from '@shared/components/map/map.component';

interface SimpleObject { objectId: number; name: string; }
// Lokacija (post) koji se prikazuje u dropdownu aktivnosti
interface SimplePost { id: number; title: string; postType: string; }

@Component({
  selector: 'app-aktivnost-form',
  templateUrl: './aktivnost-form.component.html',
  styleUrl: './aktivnost-form.component.scss',
  imports: [ReactiveFormsModule, MapComponent],
})
export class AktivnostFormComponent implements OnInit {
  @ViewChild(MapComponent) mapComp?: MapComponent;

  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;
  objects: SimpleObject[] = [];

  readonly categoryOptions = [
    { value: 'SPORT', label: '🏊 Sport' },
    { value: 'ADVENTURE', label: '⛰️ Priroda / Avantura' },
    { value: 'WELLNESS', label: '💆 Wellness' },
    { value: 'SHOPPING', label: '🛍️ Shopping' },
    { value: 'DINING', label: '🍽️ Ishrana / Kulinarstvo' },
    { value: 'NIGHTLIFE', label: '🎶 Klupsko / Noćni život' },
    { value: 'BUSINESS', label: '💼 Poslovno' },
    { value: 'CULTURE', label: '🎭 Kultura' },
    { value: 'OTHER', label: '➕ Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      category: ['SPORT', Validators.required],
      description: [''],
      duration: [''],
      difficulty: [''],
      maxCapacity: [null],
      tags: [''],
      objectId: [null],
      latitude: [null],
      longitude: [null],
      status: ['pending'],
    });

    // Učitavamo sve ne-event postove kao listu lokacija za dropdown
    this.http.get<{ data: SimplePost[] }>(`${environment.apiUrl}/posts?pageSize=100`)
      .subscribe(res => {
        // Filtriramo evente i mapiramo u SimpleObject format
        this.objects = (res.data ?? [])
          .filter((p: SimplePost) => p.postType !== 'event')
          .map((p: SimplePost) => ({ objectId: p.id, name: p.title }));
      });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.http.get<{ data: any }>(`${environment.apiUrl}/activities/${this.id}`)
        .subscribe(res => {
          const a = res.data;
          this.form.patchValue({
            name: a.name, category: a.category, description: a.description ?? '',
            duration: a.duration, difficulty: a.difficulty, maxCapacity: a.maxCapacity,
            tags: Array.isArray(a.tags) ? a.tags.join(', ') : (a.tags ?? ''),
            objectId: a.objectId,
            latitude: a.latitude ?? a.lat ?? null,
            longitude: a.longitude ?? a.lng ?? null,
            status: (a.status ?? 'pending').toLowerCase(),
          });
          const lat = a.latitude ?? a.lat;
          const lng = a.longitude ?? a.lng;
          if (lat && lng) {
            setTimeout(() => this.mapComp?.setPickedLocation(lat, lng), 300);
          }
        });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const raw = this.form.value;
    const payload: any = {
      name: raw.name,
      category: raw.category,
      status: (raw.status ?? 'pending').toLowerCase(),
      latitude: raw.latitude,
      longitude: raw.longitude,
      description: raw.description ?? null,
      duration: raw.duration ?? null,
      difficulty: raw.difficulty ?? null,
      maxCapacity: raw.maxCapacity ?? null,
      tags: raw.tags ?? null,
    };

    const url = this.isEdit
      ? `${environment.apiUrl}/activities/${this.id}`
      : `${environment.apiUrl}/activities`;
    const req$ = this.isEdit
      ? this.http.put(url, payload)
      : this.http.post(url, payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/aktivnosti']),
      error: (err: any) => { this.error = err.error?.message ?? 'Greška pri čuvanju.'; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/aktivnosti']); }
  f(name: string) { return this.form.get(name)!; }

  onMapClick(ev: MapClickEvent): void {
    this.form.patchValue({ latitude: +ev.lat.toFixed(4), longitude: +ev.lng.toFixed(4) });
    this.mapComp?.setPickedLocation(ev.lat, ev.lng);
  }
}
