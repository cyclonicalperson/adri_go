import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { Region } from '@core/models/region.model';
import { RouteDifficulty, RouteStatus, Waypoint } from '@core/models/route.model';
import { RegionService } from '@core/services/region.service';
import { RouteService } from '@core/services/route.service';
import { RouteSafetyService, RouteValidationResult } from '@core/services/route-safety.service';
import { PostImagePickerComponent } from '@shared/components/post-image-picker/post-image-picker.component';
import { RouteMetrics, WaypointEditorComponent } from '../waypoint-editor/waypoint-editor.component';
import { DEFAULT_COUNTRY, WORLD_COUNTRIES } from '@shared/data/world-countries';

type RouteValidationStatus = 'idle' | 'checking' | 'valid' | 'error';

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [ReactiveFormsModule, WaypointEditorComponent, PostImagePickerComponent],
  templateUrl: './route-form.component.html',
  styleUrl: './route-form.component.scss',
})
export class RouteFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;
  routeValidationStatus: RouteValidationStatus = 'idle';
  routeValidationMessage: string | null = null;

  destinations: Region[] = [];
  waypoints: Omit<Waypoint, 'waypointId' | 'routeId'>[] = [];
  submitted = false;
  readonly countries = WORLD_COUNTRIES;
  private routeValidationRunId = 0;
  private readonly routeValidationTimeoutMs = 12000;

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
    private routeSafety: RouteSafetyService,
    private destService: RegionService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      regionId: [null],
      proposedRegionName: [''],
      country: [DEFAULT_COUNTRY, [Validators.required, Validators.maxLength(100)]],
      name: ['', Validators.required],
      difficulty: ['MODERATE', Validators.required],
      distanceKm: [null, [Validators.required, Validators.min(0.1)]],
      durationMin: [null, [Validators.required, Validators.min(1)]],
      elevationGainM: [null],
      status: ['draft', Validators.required],
      description: ['', Validators.required],
      images: [[] as string[]],
    });

    this.syncProposedRegionControl();
    this.f('regionId').valueChanges.subscribe(() => this.syncProposedRegionControl());

    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: Region[] }) => {
      this.destinations = res.data;
    });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe((res: { data: any }) => {
        const r = res.data;
        if (!this.canManageRoute(r)) {
          this.router.navigate(['/admin/dashboard']);
          return;
        }

        this.form.patchValue({
          regionId: r.destinationId ?? r.regionId,
          proposedRegionName: r.proposedRegionName ?? '',
          country: r.country ?? r.destination?.country ?? DEFAULT_COUNTRY,
          name: r.name,
          difficulty: r.difficulty,
          durationMin: r.durationMin,
          elevationGainM: r.elevationGainM,
          status: r.status ?? (r.isActive ? 'published' : 'draft'),
          description: r.description,
          images: r.images ?? [],
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

  get formImages(): string[] {
    return this.form?.get('images')?.value ?? [];
  }

  f(name: string) {
    return this.form.get(name)!;
  }

  onWaypointsChange(next: Omit<Waypoint, 'waypointId' | 'routeId'>[]): void {
    this.setWaypoints(next);
    this.error = null;
    this.validateCurrentWaypoints();
  }

  onImagesChange(urls: string[]): void {
    this.form.patchValue({ images: urls });
  }

  onRouteMetricsChange(metrics: RouteMetrics | null): void {
    if (!metrics) {
      return;
    }

    this.form.patchValue({
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
    }, { emitEvent: false });
  }

  async submit(): Promise<void> {
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
      this.setRouteValidationState('error', this.error);
      return;
    }

    if (this.routeValidationStatus === 'error') {
      this.error = null;
      return;
    }

    this.saving = true;
    this.error = null;

    const scopeRegionId = this.proposedRegionName ? undefined : this.selectedRegionIdForPermission;
    if (this.form.value.regionId && this.proposedRegionName) {
      this.error = 'Ne mozete istovremeno izabrati region i poslati predlog novog regiona.';
      this.saving = false;
      return;
    }

    if (!this.isEdit &&
        (!this.auth.hasPermission('manage_own_posts', scopeRegionId) ||
         !this.auth.hasPermission('create_route', scopeRegionId))) {
      this.error = 'Nemate dozvolu za kreiranje rute u izabranom regionu.';
      this.saving = false;
      return;
    }

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
      images: (this.form.value.images as string[]) ?? [],
    };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => void this.router.navigate(['/admin/routes-management']),
      error: err => {
        const message = err?.error?.message ?? err?.message ?? 'Doslo je do greske pri cuvanju rute.';
        if (this.isRouteValidationMessage(message)) {
          this.error = null;
          this.setRouteValidationState('error', message);
        } else {
          this.error = message;
        }
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
    this.syncProposedRegionControl();
  }

  onCountryChanged(): void {
    const selectedRegionId = Number(this.form.get('regionId')?.value);
    if (selectedRegionId && !this.filteredDestinations.some(region => region.regionId === selectedRegionId)) {
      this.form.patchValue({ regionId: null }, { emitEvent: false });
    }
  }

  get filteredDestinations(): Region[] {
    const country = this.form?.get('country')?.value;
    return country ? this.destinations.filter(region => region.country === country) : this.destinations;
  }

  onProposedRegionInput(): void {
    if (this.proposedRegionName) {
      this.form.patchValue({ regionId: null }, { emitEvent: false });
      this.syncProposedRegionControl();
    }
  }

  private syncProposedRegionControl(): void {
    const control = this.f('proposedRegionName');
    const hasRegion = !!this.form.get('regionId')?.value;

    if (hasRegion) {
      control.patchValue('', { emitEvent: false });
      control.disable({ emitEvent: false });
      return;
    }

    control.enable({ emitEvent: false });
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

    const distanceKm = fallbackDistanceKm ?? (this.waypoints.length >= 2
      ? this.calculateDistanceKm(this.waypoints)
      : null);

    this.f('distanceKm').patchValue(distanceKm, { emitEvent: false });
  }

  private validateCurrentWaypoints(): void {
    const validationRunId = ++this.routeValidationRunId;
    const waypointsForValidation = this.cloneWaypoints();

    this.setRouteValidationState('idle', null);

    if (waypointsForValidation.length < 2) {
      return;
    }

    this.setRouteValidationState('checking', 'Proveravam da li je ruta routabilna...');
    void this.validateWaypointsWithTimeout(waypointsForValidation)
      .then(validation => {
        if (validationRunId !== this.routeValidationRunId) {
          return;
        }

        this.ngZone.run(() => {
          if (validation.valid) {
            this.setRouteValidationState('valid', 'Ruta je routabilna.');
            return;
          }

          this.setRouteValidationState(
            'error',
            validation.message ?? 'Ruta nije routabilna. Pomerite tacke na kopno/put.',
          );
        });
      })
      .catch(() => {
        if (validationRunId !== this.routeValidationRunId) {
          return;
        }

        this.ngZone.run(() => {
          this.setRouteValidationState('error', this.routeValidationUnavailableMessage());
        });
      });
  }

  private setRouteValidationState(status: RouteValidationStatus, message: string | null): void {
    this.routeValidationStatus = status;
    this.routeValidationMessage = message;
    if (status === 'valid' && this.isRouteValidationMessage(this.error)) {
      this.error = null;
    }
    this.cdr.markForCheck();
  }

  private validateWaypointsWithTimeout(
    waypoints: Omit<Waypoint, 'waypointId' | 'routeId'>[],
  ): Promise<RouteValidationResult> {
    return new Promise(resolve => {
      let settled = false;
      let timeoutId: number | undefined;
      const finish = (result: RouteValidationResult) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        resolve(result);
      };

      timeoutId = window.setTimeout(() => {
        finish({
          valid: false,
          message: this.routeValidationUnavailableMessage(),
        });
      }, this.routeValidationTimeoutMs);

      void this.routeSafety.validateWaypoints(waypoints)
        .then(finish)
        .catch(() => finish({
          valid: false,
          message: this.routeValidationUnavailableMessage(),
        }));
    });
  }

  private routeValidationUnavailableMessage(): string {
    return 'Servis za proveru ruta trenutno ne odgovara. Proverite internet konekciju ili pokusajte ponovo za par trenutaka.';
  }

  private isRouteValidationMessage(message: string | null): boolean {
    if (!message) {
      return false;
    }

    return message.includes('nije routabilna')
      || message.includes('Servis za proveru ruta')
      || message.includes('Ruta mora imati najmanje 2 tacke');
  }

  private cloneWaypoints(): Omit<Waypoint, 'waypointId' | 'routeId'>[] {
    return this.waypoints.map(waypoint => ({
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      sequenceOrder: waypoint.sequenceOrder,
    }));
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

  private get selectedRegionIdForPermission(): number | undefined {
    const regionId = Number(this.form?.get('regionId')?.value);
    return Number.isFinite(regionId) && regionId > 0 ? regionId : undefined;
  }

  private canManageRoute(route: { createdBy: number; regionId?: number | null; destinationId?: number | null; proposedRegionName?: string | null }): boolean {
    return this.auth.isSuperAdmin ||
      (
        this.auth.hasPermission('manage_own_posts', this.routeScopeRegionId(route)) &&
        route.createdBy === this.auth.currentUser?.userId
      );
  }

  private routeScopeRegionId(route: { regionId?: number | null; destinationId?: number | null; proposedRegionName?: string | null }): number | undefined {
    if (route.proposedRegionName) {
      return undefined;
    }

    const regionId = route.regionId ?? route.destinationId;
    return typeof regionId === 'number' && regionId > 0 ? regionId : undefined;
  }

  private normalizeProposedRegionName(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
