import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteService } from '@core/services/route.service';
import { RegionService } from '@core/services/region.service';
import { Region } from '@core/models/region.model';
import { RouteType, RouteDifficulty, Waypoint } from '@core/models/route.model';
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

  readonly typeOptions: { value: RouteType; label: string }[] = [
    { value: 'HIKING', label: 'Pešačenje' },
    { value: 'CYCLING', label: 'Biciklizam' },
    { value: 'WALKING', label: 'Šetnja' },
    { value: 'DRIVING', label: 'Automobilom' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  readonly difficultyOptions: { value: RouteDifficulty; label: string }[] = [
    { value: 'EASY', label: 'Lako' },
    { value: 'MODERATE', label: 'Srednje' },
    { value: 'HARD', label: 'Teško' },
    { value: 'EXPERT', label: 'Ekspertsko' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: RouteService,
    private destService: RegionService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      regionId: [null, Validators.required],
      name: ['', Validators.required],
      routeType: ['HIKING', Validators.required],
      difficulty: ['EASY', Validators.required],
      distanceKm: [null, [Validators.required, Validators.min(0.1)]],
      durationMin: [null, [Validators.required, Validators.min(1)]],
      elevationGainM: [null],
      description: ['', Validators.required],
      isActive: [true],
    });

    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: Region[]; }) => {
      this.destinations = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe((res: { data: any; }) => {
        const r = res.data;
        this.form.patchValue({
          regionId: r.destinationId ?? r.regionId,
          name: r.name,
          routeType: r.routeType,
          difficulty: r.difficulty,
          distanceKm: r.distanceKm,
          durationMin: r.durationMin,
          elevationGainM: r.elevationGainM,
          description: r.description,
          isActive: r.isActive,
        });
        this.waypoints = r.waypoints?.map((w: { latitude: any; longitude: any; sequenceOrder: any; }) => ({
          latitude: w.latitude,
          longitude: w.longitude,
          sequenceOrder: w.sequenceOrder,
        })) ?? [];
      });
    }
  }

  get centerLat(): number {
    return this.waypoints[0]?.['latitude'] ?? 43.85;
  }

  get centerLng(): number {
    return this.waypoints[0]?.['longitude'] ?? 18.41;
  }

  f(name: string) { return this.form.get(name)!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.waypoints.length < 2) {
      this.error = 'Ruta mora imati najmanje 2 tačke (start i kraj).';
      return;
    }

    this.saving = true;
    this.error = null;

    const first = this.waypoints[0];
    const last = this.waypoints[this.waypoints.length - 1];

    const payload = {
      ...this.form.value,
      destinationId: this.form.value.regionId,
      startLatitude: first['latitude'],
      startLongitude: first['longitude'],
      endLatitude: last['latitude'],
      endLongitude: last['longitude'],
      waypoints: this.waypoints,
    };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/routes-management']),
      error: (err: { message: string | null; }) => { this.error = err.message; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/routes-management']); }
}
