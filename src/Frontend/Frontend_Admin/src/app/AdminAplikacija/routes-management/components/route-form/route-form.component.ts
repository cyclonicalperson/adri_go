import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Region } from '@core/models/region.model';
import { RouteDifficulty, RouteStatus, Waypoint } from '@core/models/route.model';
import { RegionService } from '@core/services/region.service';
import { RouteService } from '@core/services/route.service';
import { WaypointEditorComponent } from '../waypoint-editor/waypoint-editor.component';

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [ReactiveFormsModule, WaypointEditorComponent],
  templateUrl: './route-form.component.html',
  styleUrl: './route-form.component.scss',
})
export class RouteFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;

  destinations: Region[] = [];
  waypoints: Omit<Waypoint, 'waypointId' | 'routeId'>[] = [];
  submitted = false;

  readonly difficultyOptions: { value: RouteDifficulty; label: string }[] = [
    { value: 'EASY', label: 'Lako' },
    { value: 'MODERATE', label: 'Srednje' },
    { value: 'HARD', label: 'Tesko' },
    { value: 'EXPERT', label: 'Ekspertsko' },
  ];

  readonly statusOptions: { value: RouteStatus; label: string; hint: string }[] = [
    { value: 'draft', label: 'Na cekanju', hint: 'Ruta ceka pregled i nije vidljiva turistima.' },
    { value: 'published', label: 'Objavljena', hint: 'Ruta je aktivna i dostupna turistima.' },
    { value: 'archived', label: 'Arhivirana', hint: 'Ruta se cuva u bazi, ali nije javno prikazana.' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: RouteService,
    private destService: RegionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      regionId: [null],
      proposedRegionName: [''],
      name: ['', Validators.required],
      difficulty: ['MODERATE', Validators.required],
      distanceKm: [null, [Validators.required, Validators.min(0.1)]],
      durationMin: [null, [Validators.required, Validators.min(1)]],
      elevationGainM: [null],
      status: ['draft', Validators.required],
      description: ['', Validators.required],
    });

    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: Region[] }) => {
      this.destinations = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe((res: { data: any }) => {
        const r = res.data;
        this.form.patchValue({
          regionId: r.destinationId ?? r.regionId,
          proposedRegionName: r.proposedRegionName ?? '',
          name: r.name,
          difficulty: r.difficulty,
          durationMin: r.durationMin,
          elevationGainM: r.elevationGainM,
          status: r.status ?? (r.isActive ? 'published' : 'draft'),
          description: r.description,
        });

        const mappedWaypoints = r.waypoints?.map((w: { latitude: number; longitude: number; sequenceOrder: number }) => ({
          latitude: w.latitude,
          longitude: w.longitude,
          sequenceOrder: w.sequenceOrder,
        })) ?? [];

        this.setWaypoints(mappedWaypoints, r.distanceKm ?? null);
      });
    }
  }

  get centerLat(): number {
    return this.waypoints[0]?.latitude ?? 43.85;
  }

  get centerLng(): number {
    return this.waypoints[0]?.longitude ?? 18.41;
  }

  get selectedStatusOption() {
    if (!this.form) {
      return this.statusOptions[0];
    }

    return this.statusOptions.find(option => option.value === this.f('status').value) ?? this.statusOptions[0];
  }

  get selectedDifficultyLabel(): string {
    if (!this.form) {
      return '-';
    }

    return this.difficultyOptions.find(option => option.value === this.f('difficulty').value)?.label ?? '-';
  }

  f(name: string) {
    return this.form.get(name)!;
  }

  onWaypointsChange(next: Omit<Waypoint, 'waypointId' | 'routeId'>[]): void {
    this.setWaypoints(next);
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid || !this.hasRegionChoice()) {
      this.form.markAllAsTouched();
      if (!this.hasRegionChoice()) {
        this.error = 'Izaberite destinaciju/region ili upisite predlog novog regiona.';
      }
      return;
    }

    if (this.waypoints.length < 2) {
      this.error = 'Ruta mora imati najmanje 2 tacke (pocetak i kraj).';
      return;
    }

    this.saving = true;
    this.error = null;

    const first = this.waypoints[0];
    const last = this.waypoints[this.waypoints.length - 1];

    const payload = {
      ...this.form.value,
      regionId: this.proposedRegionName ? null : this.form.value.regionId,
      destinationId: this.proposedRegionName ? null : this.form.value.regionId,
      proposedRegionName: this.proposedRegionName,
      startLatitude: first.latitude,
      startLongitude: first.longitude,
      endLatitude: last.latitude,
      endLongitude: last.longitude,
      waypoints: this.waypoints,
    };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => void this.router.navigate(['/admin/routes-management']),
      error: err => {
        this.error = err?.error?.message ?? err?.message ?? 'Doslo je do greske pri cuvanju rute.';
        this.saving = false;
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/admin/routes-management']);
  }

  get regionChoiceInvalid(): boolean {
    return this.submitted && !this.hasRegionChoice();
  }

  get proposedRegionName(): string | null {
    return this.normalizeProposedRegionName(this.form?.get('proposedRegionName')?.value);
  }

  onRegionSelected(): void {
    if (this.form.get('regionId')?.value) {
      this.form.patchValue({ proposedRegionName: '' }, { emitEvent: false });
    }
  }

  onProposedRegionInput(): void {
    if (this.proposedRegionName) {
      this.form.patchValue({ regionId: null }, { emitEvent: false });
    }
  }

  private setWaypoints(
    next: Omit<Waypoint, 'waypointId' | 'routeId'>[],
    fallbackDistanceKm: number | null = null,
  ): void {
    this.waypoints = next.map((waypoint, index) => ({
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      sequenceOrder: index + 1,
    }));

    const distanceKm = this.waypoints.length >= 2
      ? this.calculateDistanceKm(this.waypoints)
      : fallbackDistanceKm;

    this.f('distanceKm').patchValue(distanceKm, { emitEvent: false });
  }

  private calculateDistanceKm(waypoints: Omit<Waypoint, 'waypointId' | 'routeId'>[]): number {
    let totalKm = 0;

    for (let index = 1; index < waypoints.length; index += 1) {
      totalKm += this.haversineKm(waypoints[index - 1], waypoints[index]);
    }

    return Number(totalKm.toFixed(1));
  }

  private haversineKm(
    start: Omit<Waypoint, 'waypointId' | 'routeId'>,
    end: Omit<Waypoint, 'waypointId' | 'routeId'>,
  ): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(end.latitude - start.latitude);
    const dLng = this.toRadians(end.longitude - start.longitude);
    const startLat = this.toRadians(start.latitude);
    const endLat = this.toRadians(end.latitude);

    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }

  private hasRegionChoice(): boolean {
    return !!this.form?.get('regionId')?.value || !!this.proposedRegionName;
  }

  private normalizeProposedRegionName(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
