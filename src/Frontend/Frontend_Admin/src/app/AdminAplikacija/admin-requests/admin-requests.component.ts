import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminRegistrationService,
  PendingAdminDto,
} from '@core/services/admin-registration.service';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Zahtevi za admin nalog</h1>
      <p class="subtitle">Pregled i odobravanje novih admin registracija</p>
    </div>

    <div *ngIf="loading" class="loading">Učitavanje zahteva…</div>

    <div *ngIf="!loading && requests.length === 0" class="empty-state">
      Nema pending zahteva.
    </div>

    <div class="requests-list" *ngIf="!loading && requests.length > 0">
      <div class="request-card" *ngFor="let r of requests">
        <div class="card-info">
          <span class="name">{{ r.fullName }}</span>
          <span class="email">{{ r.email }}</span>
          <span class="org" *ngIf="r.isOrganization">
            🏢 {{ r.organizationName }} ({{ r.organizationEmail }})
          </span>
          <span class="individual" *ngIf="!r.isOrganization">👤 Individualni admin</span>
          <span class="date">Podnet: {{ r.submittedAt | date:'dd.MM.yyyy HH:mm' }}</span>
        </div>

        <div class="card-actions">
          <input
            *ngIf="rejectTarget === r.id"
            [(ngModel)]="rejectionReason"
            placeholder="Razlog odbijanja (opciono)"
            class="reject-input"
          />
          <button
            class="btn-approve"
            (click)="approve(r)"
            [disabled]="processingId === r.id"
          >
            ✅ Odobri
          </button>
          <button
            class="btn-reject"
            (click)="toggleReject(r)"
            [disabled]="processingId === r.id"
          >
            {{ rejectTarget === r.id ? 'Potvrdi odbijanje' : '✗ Odbij' }}
          </button>
          <button
            *ngIf="rejectTarget === r.id"
            class="btn-cancel"
            (click)="rejectTarget = null"
          >
            Odustani
          </button>
        </div>

        <div class="feedback success" *ngIf="feedbackId === r.id && feedbackType === 'success'">
          {{ feedbackMsg }}
        </div>
        <div class="feedback error" *ngIf="feedbackId === r.id && feedbackType === 'error'">
          {{ feedbackMsg }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .subtitle { color: #6b7280; margin-top: .25rem; }
    .loading, .empty-state { padding: 2rem; text-align: center; color: #6b7280; }
    .requests-list { display: flex; flex-direction: column; gap: 1rem; }
    .request-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .75rem;
    }
    .card-info { flex: 1; display: flex; flex-direction: column; gap: .2rem; }
    .name { font-weight: 600; }
    .email, .org, .individual, .date { font-size: .875rem; color: #6b7280; }
    .card-actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
    .reject-input { padding: .35rem .6rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .875rem; }
    .btn-approve { background: #16a34a; color: #fff; border: none; padding: .4rem .9rem; border-radius: 6px; cursor: pointer; font-size: .875rem; }
    .btn-approve:disabled { opacity: .5; cursor: not-allowed; }
    .btn-reject { background: #dc2626; color: #fff; border: none; padding: .4rem .9rem; border-radius: 6px; cursor: pointer; font-size: .875rem; }
    .btn-reject:disabled { opacity: .5; cursor: not-allowed; }
    .btn-cancel { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: .4rem .9rem; border-radius: 6px; cursor: pointer; font-size: .875rem; }
    .feedback { width: 100%; padding: .5rem .75rem; border-radius: 6px; font-size: .875rem; margin-top: .25rem; }
    .feedback.success { background: #dcfce7; color: #15803d; }
    .feedback.error { background: #fee2e2; color: #b91c1c; }
  `],
})
export class AdminRequestsComponent implements OnInit {
  requests: PendingAdminDto[] = [];
  loading = true;
  processingId: number | null = null;
  rejectTarget: number | null = null;
  rejectionReason = '';
  feedbackId: number | null = null;
  feedbackType: 'success' | 'error' | null = null;
  feedbackMsg = '';

  constructor(
    private svc: AdminRegistrationService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getPending().subscribe({
      next: data => { this.requests = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  approve(r: PendingAdminDto): void {
    this.processingId = r.id;
    this.svc.approve(r.id, this.auth.currentUser?.fullName).subscribe({
      next: res => {
        this.requests = this.requests.filter(x => x.id !== r.id);
        this.showFeedback(r.id, 'success', res.message);
        this.processingId = null;
      },
      error: err => {
        this.showFeedback(r.id, 'error', err?.error?.message ?? 'Greška pri odobravanju.');
        this.processingId = null;
      },
    });
  }

  toggleReject(r: PendingAdminDto): void {
    if (this.rejectTarget === r.id) {
      // Potvrđuje odbijanje
      this.processingId = r.id;
      this.svc.reject(r.id, this.rejectionReason, this.auth.currentUser?.fullName).subscribe({
        next: res => {
          this.requests = this.requests.filter(x => x.id !== r.id);
          this.showFeedback(r.id, 'success', res.message);
          this.rejectTarget = null;
          this.rejectionReason = '';
          this.processingId = null;
        },
        error: err => {
          this.showFeedback(r.id, 'error', err?.error?.message ?? 'Greška pri odbijanju.');
          this.processingId = null;
        },
      });
    } else {
      this.rejectTarget = r.id;
      this.rejectionReason = '';
    }
  }

  private showFeedback(id: number, type: 'success' | 'error', msg: string): void {
    this.feedbackId = id;
    this.feedbackType = type;
    this.feedbackMsg = msg;
    setTimeout(() => { this.feedbackId = null; }, 4000);
  }
}
