import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RegionService } from '@core/services/region.service';
import { Region } from '@core/models/region.model';
import { PostService } from '@core/services/post.service';
import { MapComponent, MapClickEvent } from '@shared/components/map/map.component';
import { PostImagePickerComponent } from '@shared/components/post-image-picker/post-image-picker.component';

interface EventObjectOption {
  objectId: number;
  name: string;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, MapComponent, PostImagePickerComponent],
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
  objects: EventObjectOption[] = [];

  readonly categoryOptions = [
    { value: 'CONCERT', label: 'Koncert' },
    { value: 'FESTIVAL', label: 'Festival' },
    { value: 'SPORT', label: 'Sport / Takmicenje' },
    { value: 'EXHIBITION', label: 'Izlozba' },
    { value: 'TOUR', label: 'Tura' },
    { value: 'THEATER', label: 'Pozoriste' },
    { value: 'CONFERENCE', label: 'Konferencija' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private fb: FormBuilder,
    private destService: RegionService,
    private postService: PostService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(200),
      ]],
      category: ['CONCERT', Validators.required],
      description: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(2000),
      ]],
      regionId: [null],
      objectId: [null],
      startAt: ['', Validators.required],
      endAt: ['', Validators.required],
      ticketUrl: [''],
      externalUrl: [''],
      lat: [null],
      lng: [null],
      status: ['draft'],
      images: [[] as string[]],
    });

    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.destinations = res.data;
    });

    this.postService.getAll({ page: 1, pageSize: 200, excludeType: 'event' }).subscribe(res => {
      this.objects = (res.data ?? []).map(post => ({ objectId: post.postId, name: post.title }));
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.postService.getById(this.id!).subscribe({
        next: res => {
          const post = res.data;
          const details = post.details ?? {};
          const formatDateTime = (value?: string | null) => {
            if (!value) return '';
            return new Date(value).toISOString().slice(0, 16);
          };

          this.form.patchValue({
            title: post.title ?? '',
            category: details['category'] ?? 'OTHER',
            description: post.description ?? '',
            regionId: post.regionId ?? null,
            objectId: details['objectId'] ?? details['relatedObjectId'] ?? null,
            startAt: formatDateTime((details['startAt'] as string | null | undefined) ?? (details['eventStart'] as string | null | undefined)),
            endAt: formatDateTime((details['endAt'] as string | null | undefined) ?? (details['eventEnd'] as string | null | undefined)),
            ticketUrl: details['ticketUrl'] ?? post.externalUrl ?? '',
            externalUrl: post.externalUrl ?? '',
            lat: post.lat ?? null,
            lng: post.lng ?? null,
            status: post.status ?? 'draft',
            images: post.images ?? [],
          });
        },
        error: () => {
          this.error = 'Greska pri ucitavanju dogadjaja.';
        },
      });
    }
  }

  get formImages(): string[] {
    return this.form.get('images')?.value ?? [];
  }

  onImagesChange(urls: string[]): void {
    this.form.patchValue({ images: urls });
  }

  onMapClick(ev: MapClickEvent): void {
    this.form.patchValue({ lat: +ev.lat.toFixed(6), lng: +ev.lng.toFixed(6) });
  }

  get lat(): number { return this.form.get('lat')?.value ?? 43.85; }
  get lng(): number { return this.form.get('lng')?.value ?? 18.41; }

  f(name: string) { return this.form.get(name)!; }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const raw = this.form.value;
    const details = {
      category: raw.category,
      startAt: raw.startAt ? new Date(raw.startAt).toISOString() : null,
      endAt: raw.endAt ? new Date(raw.endAt).toISOString() : null,
      ticketUrl: raw.ticketUrl || null,
      objectId: raw.objectId || null,
    };

    const body = {
      title: raw.title,
      postType: 'event' as const,
      description: raw.description,
      regionId: raw.regionId || null,
      lat: raw.lat || null,
      lng: raw.lng || null,
      externalUrl: raw.ticketUrl || raw.externalUrl || null,
      externalUrlLabel: raw.ticketUrl ? 'Kupi kartu' : undefined,
      images: (raw.images as string[]) ?? [],
      details,
      status: raw.status || 'draft',
    };

    const request$ = this.isEdit
      ? this.postService.update(this.id!, body)
      : this.postService.create(body);

    request$.subscribe({
      next: () => this.router.navigate(['/admin/events']),
      error: (err: any) => {
        this.error = err?.error?.message ?? err?.message ?? 'Greska pri cuvanju.';
        this.saving = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/admin/events']); }
}
