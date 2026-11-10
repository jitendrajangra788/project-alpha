import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking, BookingService } from '../../core/booking.service';
import { Organization } from '../../core/models';
import { OrganizationService } from '../../core/organization.service';
import { EarningsSummary, PaymentService } from '../../core/payment.service';
import { DashKpiComponent } from '../../shared/dash-kpi.component';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [RouterLink, DashKpiComponent],
  template: `
    <div class="page cc-dash">
      <section class="hero dash-card">
        <div>
          <p class="eyebrow">Hospital command center</p>
          <h2>{{ headline }}</h2>
          <p>{{ subtitle }} Live figures come from bookings and earnings APIs only.</p>
        </div>
        <div class="hero-actions">
          <a class="cc-btn cc-btn-accent" routerLink="/provider/opd">Open OPD</a>
          <a class="cc-btn cc-btn-ghost" routerLink="/provider/ot">OT board</a>
          <a class="cc-btn cc-btn-ghost" routerLink="/provider/admissions">IPD</a>
          <a class="cc-btn cc-btn-ghost" routerLink="/provider/emergency">Emergency</a>
        </div>
      </section>

      <div class="kpis">
        <app-dash-kpi label="Organizations" [value]="organizations.length" icon="🏥" tone="blue" link="/provider/profile" />
        <app-dash-kpi label="Today OPD" [value]="todayCount" icon="📅" tone="teal" link="/provider/opd" />
        <app-dash-kpi label="Active patients" [value]="patientCount" icon="👥" tone="purple" link="/provider/patients" />
        <app-dash-kpi label="Pending" [value]="count('PENDING')" icon="⏳" tone="orange" link="/provider/bookings" />
        <app-dash-kpi label="IPD / beds" [value]="bedsLabel" icon="🛏️" tone="navy" link="/provider/beds" hint="Bed inventory API pending" />
        <app-dash-kpi label="Revenue" [value]="earningsLabel" icon="₹" tone="teal" link="/provider/billing" />
      </div>

      <div class="modules">
        @for (m of modules; track m.link) {
          <a class="mod dash-card" [routerLink]="m.link">
            <span class="ico">{{ m.icon }}</span>
            <div>
              <strong>{{ m.title }}</strong>
              <p>{{ m.blurb }}</p>
            </div>
          </a>
        }
      </div>

      <div class="grid">
        <section class="dash-card span-2">
          <div class="card-head">
            <h3>My organizations</h3>
            <a routerLink="/provider/profile">Profiles</a>
          </div>
          <div class="orgs">
            @for (org of organizations; track org.id) {
              <article>
                <div class="row">
                  <div>
                    <h4>{{ org.name }}</h4>
                    <p>{{ org.organization_type }} · {{ org.city }} · {{ org.pin_code }}</p>
                  </div>
                  <span class="dash-badge" [class.ok]="org.is_verified" [class.warn]="org.verification_status === 'PENDING'">
                    {{ org.verification_status }}
                  </span>
                </div>
                <p>{{ org.address_line }}</p>
                <p>Documents: {{ org.documents.length }}</p>
                <div class="actions">
                  <input type="file" (change)="onFile($event, org)" accept=".pdf,image/*" />
                  <button class="cc-btn cc-btn-ghost" type="button" (click)="submit(org)" [disabled]="org.verification_status === 'VERIFIED'">
                    Resubmit verification
                  </button>
                </div>
              </article>
            } @empty {
              <p class="empty">No organizations yet. Register from Finance &amp; Admin → Register another org.</p>
            }
          </div>
          @if (message) {
            <p class="ok">{{ message }}</p>
          }
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Today’s board</h3>
            <a routerLink="/provider/bookings">All appointments</a>
          </div>
          <div class="list">
            @for (b of todayBookings.slice(0, 8); track b.id) {
              <article class="compact">
                <strong>{{ b.booking_number }}</strong>
                <p>{{ b.start_time || '—' }} · {{ b.status }} · {{ b.service_name || b.booking_type }}</p>
              </article>
            } @empty {
              <p class="empty">No appointments scheduled for today.</p>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.75rem; }
    .hero {
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: end;
      padding: 1rem 1.05rem;
      background:
        radial-gradient(1200px 180px at 10% -40%, rgba(22,119,232,0.16), transparent 60%),
        linear-gradient(135deg, #f7fbff, #eef8f7 55%, #f8fbff);
    }
    .eyebrow {
      margin: 0 0 0.25rem; text-transform: uppercase; letter-spacing: 0.08em;
      font-size: 0.68rem; font-weight: 750; color: var(--dash-blue);
    }
    .hero h2 { margin: 0; font-size: 1.25rem; font-family: var(--cc-font); color: var(--dash-text); }
    .hero p { margin: 0.25rem 0 0; color: var(--dash-muted); max-width: 40rem; font-size: 0.88rem; }
    .hero-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.65rem; }
    .modules {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.65rem;
    }
    .mod {
      display: flex; gap: 0.7rem; align-items: start; text-decoration: none; color: inherit;
      padding: 0.85rem; transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .mod:hover { border-color: #b9d4f5; transform: translateY(-1px); }
    .ico {
      width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center;
      background: #eef5ff; flex: 0 0 auto;
    }
    .mod strong { display: block; font-size: 0.9rem; color: var(--dash-text); }
    .mod p { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.78rem; line-height: 1.35; }
    .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0.7rem; }
    .span-2 { grid-column: span 1; }
    .dash-card { padding: 0.85rem; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .card-head h3 { margin: 0; font-size: 0.95rem; font-family: var(--cc-font); }
    .card-head a { color: var(--dash-blue); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
    .orgs { display: grid; gap: 0.55rem; }
    .orgs > article {
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.7rem; background: #f8fbff;
    }
    .row { display: flex; justify-content: space-between; gap: 0.75rem; align-items: start; }
    h4 { margin: 0; color: var(--dash-text); }
    p { margin: 0.3rem 0 0; color: var(--dash-muted); }
    .actions { display: flex; gap: 0.45rem; flex-wrap: wrap; align-items: center; margin-top: 0.45rem; }
    .list { display: grid; gap: 0.5rem; }
    .list article.compact {
      border: 1px solid var(--dash-border); border-radius: 12px; padding: 0.7rem 0.8rem; background: #f8fbff;
    }
    .empty { margin: 0; color: var(--dash-muted); }
    .ok { color: var(--dash-teal); margin: 0.75rem 0 0; }
    @media (max-width: 1200px) {
      .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .modules { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .kpis, .modules { grid-template-columns: 1fr; }
    }
  `,
})
export class ProviderDashboardComponent implements OnInit {
  private readonly orgsApi = inject(OrganizationService);
  private readonly bookingsApi = inject(BookingService);
  private readonly payments = inject(PaymentService);

  organizations: Organization[] = [];
  bookings: Booking[] = [];
  earnings: EarningsSummary | null = null;
  message = '';

  readonly modules = [
    { title: 'OPD Queue', blurb: 'Tokens, waiting & consult status', icon: '🏥', link: '/provider/opd' },
    { title: 'OT Board', blurb: 'Surgery schedule & theatres', icon: '🔪', link: '/provider/ot' },
    { title: 'IPD Admissions', blurb: 'Wards, stay & transfers', icon: '🛏️', link: '/provider/admissions' },
    { title: 'Emergency', blurb: 'Casualty triage board', icon: '🚨', link: '/provider/emergency' },
    { title: 'Pharmacy', blurb: 'Dispense & Rx queue', icon: '💊', link: '/provider/pharmacy' },
    { title: 'Lab orders', blurb: 'In-house diagnostics', icon: '🧪', link: '/provider/lab-orders' },
    { title: 'Wards & beds', blurb: 'Occupancy board', icon: '🏨', link: '/provider/beds' },
    { title: 'Billing', blurb: 'Payments & settlements', icon: '₹', link: '/provider/billing' },
  ];

  get headline(): string {
    const types = new Set(this.organizations.map((o) => o.organization_type));
    if (types.has('HOME_CARE')) return 'Home care agency dashboard';
    if (types.has('NURSING_HOME')) return 'Nursing home dashboard';
    if (types.has('HOSPITAL')) return 'Hospital operations dashboard';
    if (types.has('CLINIC')) return 'Clinic operations dashboard';
    return 'Provider organization dashboard';
  }

  get subtitle(): string {
    if (this.organizations.some((o) => o.organization_type === 'HOME_CARE')) {
      return 'Nurses, caregivers, visits, shifts and patient reports.';
    }
    return 'OPD, OT, IPD, emergency, pharmacy and workforce in one workspace.';
  }

  get todayCount(): number {
    return this.todayBookings.length;
  }

  get todayBookings(): Booking[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings.filter((b) => b.scheduled_date === today);
  }

  get patientCount(): number {
    return new Set(this.bookings.map((b) => b.booking_number)).size;
  }

  get bedsLabel(): string {
    return '—';
  }

  get earningsLabel(): string {
    const v = this.earnings?.provider_earnings;
    if (v == null) return '—';
    return `₹${Number(v).toLocaleString('en-IN')}`;
  }

  count(status: string): number {
    return this.bookings.filter((b) => b.status === status).length;
  }

  ngOnInit(): void {
    this.reload();
    this.bookingsApi.provider().subscribe({ next: (items) => (this.bookings = items) });
    this.payments.earnings().subscribe({ next: (e) => (this.earnings = e), error: () => undefined });
  }

  reload(): void {
    this.orgsApi.mine().subscribe({ next: (items) => (this.organizations = items) });
  }

  onFile(event: Event, org: Organization): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.orgsApi.uploadDocument(org.id, 'license', file).subscribe({
      next: () => {
        this.message = `Document uploaded for ${org.name}`;
        this.reload();
      },
      error: () => (this.message = 'Upload failed'),
    });
  }

  submit(org: Organization): void {
    this.orgsApi.submitVerification(org.id).subscribe({
      next: () => {
        this.message = 'Submitted for verification';
        this.reload();
      },
    });
  }
}
