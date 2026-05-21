import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivityService } from '@core/services/activity.service';
import { PostService } from '@core/services/post.service';
import { MapComponent, MapClickEvent } from '@shared/components/map/map.component';

interface SimpleObject { objectId: number; name: string; }

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
    { value: 'SPORT', label: 'Sport' },
    { value: 'ADVENTURE', label: 'Priroda / Avantura' },
    { value: 'WELLNESS', label: 'Wellness' },
    { value: 'SHOPPING', label: 'Shopping' },
    { value: 'DINING', label: 'Ishrana / Kulinarstvo' },
    { value: 'NIGHTLIFE', label: 'Klupsko / Nocni zivot' },
    { value: 'BUSINESS', label: 'Poslovno' },
    { value: 'CULTURE', label: 'Kultura' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private activityService: ActivityService,
    private postService: PostService,
    private route: ActivatedRoute,
    private router: Router,
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
      objectIds: [[]],
      objectSearch: [''],
      latitude: [null],
      longitude: [null],
      status: ['pending'],
    });

    this.postService.getAll({ page: 1, pageSize: 500, excludeType: 'event', sortBy: 'title', sortDir: 'asc' })
      .subscribe(res => {
        this.objects = (res.data ?? []).map(post => ({
          objectId: post.postId,
          name: post.title,
        }));
      });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.activityService.getById(this.id!).subscribe(res => {
        const activity = res.data;
        this.form.patchValue({
          name: activity.name,
          category: activity.category,
          description: activity.description ?? '',
          duration: activity.duration ?? '',
          difficulty: activity.difficulty ?? '',
          maxCapacity: activity.maxCapacity ?? null,
          tags: activity.tags ?? '',
          objectIds: activity.postIds?.length ? activity.postIds : (activity.postId ? [activity.postId] : []),
          latitude: activity.lat ?? null,
          longitude: activity.lng ?? null,
          status: (activity.status ?? 'pending').toLowerCase(),
        });

        if (activity.lat && activity.lng) {
          setTimeout(() => this.mapComp?.setPickedLocation(activity.lat!, activity.lng!), 300);
        }
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const raw = this.form.value;
    const objectIds = this.normalizeObjectIds(raw.objectIds);

    const payload = {
      name: raw.name,
      category: raw.category,
      status: (raw.status ?? 'pending').toLowerCase(),
      description: raw.description ?? '',
      duration: raw.duration ?? '',
      difficulty: raw.difficulty ?? '',
      maxCapacity: raw.maxCapacity ?? null,
      tags: raw.tags ?? '',
      latitude: raw.latitude,
      longitude: raw.longitude,
      postId: objectIds[0] ?? null,
      postIds: objectIds,
      clearPost: objectIds.length === 0,
    };

    const request$ = this.isEdit
      ? this.activityService.update(this.id!, payload)
      : this.activityService.create(payload);

    request$.subscribe({
      next: () => this.router.navigate(['/admin/aktivnosti']),
      error: (err: any) => {
        this.error = err.error?.message ?? 'Greska pri cuvanju.';
        this.saving = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/admin/aktivnosti']); }
  f(name: string) { return this.form.get(name)!; }

  onMapClick(ev: MapClickEvent): void {
    this.form.patchValue({ latitude: +ev.lat.toFixed(4), longitude: +ev.lng.toFixed(4) });
    this.mapComp?.setPickedLocation(ev.lat, ev.lng);
  }

  isObjectSelected(objectId: number): boolean {
    return this.normalizeObjectIds(this.form.value.objectIds).includes(objectId);
  }

  toggleObject(objectId: number): void {
    const selected = this.normalizeObjectIds(this.form.value.objectIds);
    const next = selected.includes(objectId)
      ? selected.filter(id => id !== objectId)
      : [...selected, objectId];
    this.form.patchValue({ objectIds: next });
  }

  clearObjectSelection(): void {
    this.form.patchValue({ objectIds: [] });
  }

  get selectedObjectCount(): number {
    return this.normalizeObjectIds(this.form.value.objectIds).length;
  }

  get selectedObjects(): SimpleObject[] {
    const ids = this.normalizeObjectIds(this.form.value.objectIds);
    return this.objects.filter(object => ids.includes(object.objectId));
  }

  get filteredObjects(): SimpleObject[] {
    const term = String(this.form?.value?.objectSearch ?? '').trim().toLowerCase();
    if (!term) {
      return this.objects;
    }

    return this.objects.filter(object => object.name.toLowerCase().includes(term));
  }

  private normalizeObjectIds(value: unknown): number[] {
    return Array.isArray(value)
      ? value.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0)
      : [];
  }
}
