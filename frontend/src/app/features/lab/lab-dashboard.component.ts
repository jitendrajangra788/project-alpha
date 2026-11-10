import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Booking, BookingService } from '../../core/booking.service';
import { ClinicalService } from '../../core/clinical.service';
import { OrganizationService } from '../../core/organization.service';
import { EarningsSummary, PaymentService } from '../../core/payment.service';
import { DashKpiComponent } from '../../shared/dash-kpi.component';

@Component({
  selector: 'app-lab-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DashKpiComponent, DatePipe],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <h2>Lab & diagnostic operations</h2>
          <p>Bookings, samples, report workflow and earnings.</p>
        </div>
        <div class="actions">
          <a class="cc-btn cc-btn-accent" routerLink="/lab/bookings">Lab bookings</a>
          <a class="cc-btn cc-btn-ghost" routerLink="/lab/reports">Reports</a>
        </div>
      </div>

      <div class="kpis">
        <app-dash-kpi label="Lab bookings" [value]="bookings.length" icon="🧪" tone="blue" link="/lab/bookings" />
        <app-dash-kpi label="Today's collections" [value]="todayCount" icon="🩸" tone="teal" link="/lab/samples" />
        <app-dash-kpi label="Reports total" [value]="reports.length" icon="📄" tone="purple" link="/lab/reports" />
        <app-dash-kpi label="Pending approval" [value]="pendingReports" icon="⏳" tone="orange" link="/lab/approvals" />
        <app-dash-kpi label="Published" [value]="publishedReports" icon="✅" tone="teal" link="/lab/published" />
        <app-dash-kpi label="Revenue" [value]="earningsLabel" icon="₹" tone="navy" link="/lab/payments" />
      </div>

      <div class="grid">
        <section class="dash-card">
          <div class="card-head">
            <h3>Recent lab bookings</h3>
            <a routerLink="/lab/bookings">View all</a>
          </div>
          <div class="list">
            @for (b of bookings.slice(0, 6); track b.id) {
              <article>
                <div>
                  <strong>{{ b.booking_number }}</strong>
                  <p>{{ b.scheduled_date }} · {{ b.status }}</p>
                </div>
                <span class="dash-badge" [class.ok]="b.status === 'CONFIRMED'" [class.warn]="b.status === 'PENDING'">{{ b.status }}</span>
              </article>
            } @empty {
              <p class="empty">No lab bookings yet.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Report approval queue</h3>
            <a routerLink="/lab/approvals">Queue</a>
          </div>
          <div class="list">
            @for (r of reports.slice(0, 6); track r.id) {
              <article>
                <div>
                  <strong>{{ r.title }}</strong>
                  <p>{{ r.status }} · {{ (r.created_at) | date: 'mediumDate' }}</p>
                </div>
                <span class="dash-badge" [class.ok]="r.status === 'PUBLISHED'" [class.warn]="r.status !== 'PUBLISHED'">{{ r.status }}</span>
              </article>
            } @empty {
              <p class="empty">No reports yet. Create a draft below.</p>
            }
          </div>
        </section>

        <section class="dash-card span-2">
          <div class="card-head">
            <h3>Create draft report</h3>
          </div>
          <form [formGroup]="form" (ngSubmit)="create()" class="form">
            <label>Organization ID<input formControlName="organization_id" /></label>
            <label>Patient ID<input formControlName="patient_id" /></label>
            <label>Report title<input formControlName="title" /></label>
            <label>Parameter<input formControlName="parameter_name" /></label>
            <label>Value<input formControlName="value" /></label>
            <label>Unit<input formControlName="unit" /></label>
            <label>Reference range<input formControlName="reference_range" /></label>
            <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid">Save draft</button>
          </form>
          @if (message) { <p class="ok">{{ message }}</p> }
          @if (orgs.length) {
            <div class="org-ids">
              @for (o of orgs; track o.id) {
                <button type="button" class="chip" (click)="form.patchValue({ organization_id: o.id })">{{ o.name }}</button>
              }
            </div>
          }
        </section>

        <section class="dash-card span-2">
          <div class="card-head"><h3>Operations shortcuts</h3></div>
          <div class="links">
            <a routerLink="/lab/samples">Sample collection</a>
            <a routerLink="/lab/tracking">Sample tracking</a>
            <a routerLink="/lab/processing">Test processing</a>
            <a routerLink="/lab/tests">Test catalog</a>
            <a routerLink="/lab/packages">Health packages</a>
            <a routerLink="/lab/analytics">Analytics</a>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .toolbar { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: end; }
    .toolbar h2 { margin: 0; font-size: 1.1rem; font-family: var(--cc-font); color: var(--dash-text); }
    .toolbar p { margin: 0.15rem 0 0; color: var(--dash-muted); font-size: 0.86rem; }
    .actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.65rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
    .span-2 { grid-column: 1 / -1; }
    .dash-card { padding: 0.85rem; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .card-head h3 { margin: 0; font-size: 0.95rem; font-family: var(--cc-font); }
    .card-head a { color: var(--dash-blue); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
    .list { display: grid; gap: 0.4rem; }
    article {
      display: flex; justify-content: space-between; gap: 0.55rem; align-items: center;
      padding: 0.55rem 0.7rem; border: 1px solid var(--dash-border); border-radius: 10px; background: #f8fbff;
    }
    article p { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.84rem; }
    .form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.7rem; }
    label { display: grid; gap: 0.28rem; font-size: 0.78rem; font-weight: 650; color: var(--dash-muted); }
    input {
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.65rem 0.75rem; font: inherit; color: var(--dash-text);
    }
    .links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
    .links a {
      text-decoration: none; color: var(--dash-text); border: 1px solid var(--dash-border);
      border-radius: 12px; padding: 0.75rem; background: #f4f7fc; font-weight: 650;
    }
    .org-ids { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.75rem; }
    .chip {
      border: 1px solid var(--dash-border); background: white; border-radius: 999px; padding: 0.4rem 0.7rem;
      cursor: pointer; font: inherit; font-size: 0.82rem;
    }
    .empty { margin: 0; color: var(--dash-muted); }
    .ok { color: var(--dash-teal); margin: 0.75rem 0 0; }
    @media (max-width: 1200px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 900px) {
      .grid, .form, .links { grid-template-columns: 1fr; }
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } }
  `,
})
export class LabDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clinical = inject(ClinicalService);
  private readonly orgsApi = inject(OrganizationService);
  private readonly bookingsApi = inject(BookingService);
  private readonly payments = inject(PaymentService);

  orgs: any[] = [];
  bookings: Booking[] = [];
  reports: any[] = [];
  earnings: EarningsSummary | null = null;
  message = '';

  readonly form = this.fb.nonNullable.group({
    organization_id: ['', Validators.required],
    patient_id: ['', Validators.required],
    title: ['CBC Report', Validators.required],
    parameter_name: ['Hemoglobin', Validators.required],
    value: ['13.2', Validators.required],
    unit: ['g/dL'],
    reference_range: ['12-16'],
  });

  get todayCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings.filter((b) => b.scheduled_date === today).length;
  }

  get pendingReports(): number {
    return this.reports.filter((r) => r.status !== 'PUBLISHED').length;
  }

  get publishedReports(): number {
    return this.reports.filter((r) => r.status === 'PUBLISHED').length;
  }

  get earningsLabel(): string {
    const v = this.earnings?.provider_earnings;
    if (v == null) return '—';
    return `₹${Number(v).toLocaleString('en-IN')}`;
  }

  ngOnInit(): void {
    this.orgsApi.mine().subscribe({
      next: (orgs) => {
        this.orgs = orgs;
        if (orgs[0]) {
          this.form.patchValue({ organization_id: orgs[0].id });
          this.clinical.orgLabReports(orgs[0].id).subscribe({
            next: (items) => (this.reports = items),
            error: () => undefined,
          });
        }
      },
    });
    this.bookingsApi.provider().subscribe({ next: (items) => (this.bookings = items) });
    this.payments.earnings().subscribe({ next: (e) => (this.earnings = e), error: () => undefined });
  }

  create(): void {
    const raw = this.form.getRawValue();
    this.clinical
      .createLabReport({
        organization_id: raw.organization_id,
        patient_id: raw.patient_id,
        title: raw.title,
        results: [
          {
            parameter_name: raw.parameter_name,
            value: raw.value,
            unit: raw.unit,
            reference_range: raw.reference_range,
            is_abnormal: false,
          },
        ],
      })
      .subscribe({
        next: (r: any) => {
          this.message = `Draft report created: ${r.id}`;
          this.clinical.orgLabReports(raw.organization_id).subscribe({ next: (items) => (this.reports = items) });
        },
        error: (err) => (this.message = err?.error?.detail || 'Failed'),
      });
  }
}
