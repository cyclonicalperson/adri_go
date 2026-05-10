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
      objectId: [null],
      latitude: [null],
      longitude: [null],
      status: ['pending'],
    });

    this.postService.getAll({ page: 1, pageSize: 100, excludeType: 'event' })
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
          objectId: activity.postId ?? null,
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
    const objectId = raw.objectId;

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
      postId: objectId ?? null,
      clearPost: objectId === null || objectId === undefined,
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
}
