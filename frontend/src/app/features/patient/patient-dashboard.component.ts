import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Booking, BookingService } from '../../core/booking.service';
import { ClinicalService } from '../../core/clinical.service';
import { DashKpiComponent } from '../../shared/dash-kpi.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, DashKpiComponent],
  template: `
    <div class="page cc-dash">
      <section class="hero dash-card">
        <div>
          <p class="eyebrow">Patient portal</p>
          <h2>Welcome back{{ firstName ? ', ' + firstName : '' }}</h2>
          <p class="sub">Your appointments, reports, prescriptions and care shortcuts.</p>
        </div>
        <div class="hero-actions">
          <a class="cc-btn cc-btn-accent" routerLink="/patient/find/doctors">Book a doctor</a>
          <a class="cc-btn cc-btn-ghost" routerLink="/patient/find/labs">Book a lab test</a>
        </div>
      </section>

      <div class="kpis">
        <app-dash-kpi label="Upcoming appointments" [value]="upcoming.length" icon="📅" tone="blue" link="/patient/appointments" [hint]="nextAppointmentMeta" />
        <app-dash-kpi label="Total consultations" [value]="bookings.length" icon="🩺" tone="teal" link="/patient/appointments" />
        <app-dash-kpi label="Pending lab reports" [value]="pendingLabs" icon="🧪" tone="orange" link="/patient/lab-reports" />
        <app-dash-kpi label="Prescriptions" [value]="prescriptions.length" icon="💊" tone="purple" link="/patient/prescriptions" />
        <app-dash-kpi label="Active consents" [value]="data?.consents ?? 0" icon="🔐" tone="navy" link="/patient/consents" />
        <app-dash-kpi label="Medical records" [value]="(data?.timeline || []).length" icon="📁" tone="blue" link="/patient/records" hint="Timeline events" />
      </div>

      <div class="grid">
        <section class="dash-card span-2">
          <div class="card-head">
            <h3>Upcoming appointments</h3>
            <a routerLink="/patient/appointments">View all</a>
          </div>
          <div class="list">
            @for (b of upcoming; track b.id) {
              <article class="row">
                <div>
                  <strong>{{ b.listing_name || 'Provider' }}</strong>
                  <p>{{ b.service_name || b.booking_type }} · {{ b.scheduled_date }} · {{ b.start_time }}</p>
                </div>
                <div class="row-actions">
                  <span class="dash-badge" [class.ok]="b.status === 'CONFIRMED'" [class.warn]="b.status === 'PENDING'">{{ b.status }}</span>
                  @if (b.is_online) {
                    <a class="cc-btn cc-btn-ghost" routerLink="/patient/video">Video</a>
                  }
                </div>
              </article>
            } @empty {
              <p class="empty">No upcoming appointments.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head"><h3>Book care</h3></div>
          <div class="actions">
            <a routerLink="/patient/find/doctors">Book a doctor</a>
            <a routerLink="/patient/find/labs">Book a lab test</a>
            <a routerLink="/patient/find/home-care">Book home care</a>
            <a routerLink="/patient/video">Video consultation</a>
            <a routerLink="/patient/vitals">My vitals</a>
            <a routerLink="/patient/records">Medical records</a>
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Recent lab reports</h3>
            <a routerLink="/patient/lab-reports">View all</a>
          </div>
          <div class="list">
            @for (r of labReports.slice(0, 4); track r.id) {
              <article class="row compact">
                <div>
                  <strong>{{ r.title || 'Lab report' }}</strong>
                  <p>{{ r.status }} · {{ r.created_at | date: 'mediumDate' }}</p>
                </div>
                <span class="dash-badge" [class.ok]="r.status === 'PUBLISHED'">{{ r.status }}</span>
              </article>
            } @empty {
              <p class="empty">No lab reports yet.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Recent prescriptions</h3>
            <a routerLink="/patient/prescriptions">View all</a>
          </div>
          <div class="list">
            @for (m of medicines.slice(0, 5); track $index) {
              <article class="row compact">
                <div>
                  <strong>{{ m.name }}</strong>
                  <p>{{ m.meta }}</p>
                </div>
              </article>
            } @empty {
              <p class="empty">No active medicines listed.</p>
            }
          </div>
        </section>

        <section class="dash-card span-2">
          <div class="card-head">
            <h3>Medical timeline</h3>
            <a routerLink="/patient/timeline">Full timeline</a>
          </div>
          <div class="list">
            @for (e of (data?.timeline || []).slice(0, 6); track e.id) {
              <article class="row compact">
                <div>
                  <strong>{{ e.title }}</strong>
                  <p>{{ e.event_type }} · {{ e.event_at | date: 'medium' }}</p>
                  <p>{{ e.summary }}</p>
                </div>
              </article>
            } @empty {
              <p class="empty">Timeline events appear as you book and receive care.</p>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .hero {
      display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: center;
      padding: 0.85rem 1rem;
      background: linear-gradient(135deg, #ffffff, #eef6ff);
    }
    .eyebrow { margin: 0; color: var(--dash-teal); font-size: 0.72rem; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; }
    h2 { margin: 0.15rem 0; font-family: var(--cc-font); font-size: 1.25rem; color: var(--dash-text); }
    .sub { margin: 0; color: var(--dash-muted); font-size: 0.88rem; }
    .hero-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.65rem; }
    .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0.7rem; }
    .span-2 { grid-column: 1 / -1; }
    .dash-card { padding: 0.85rem; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .card-head h3 { margin: 0; font-size: 0.95rem; font-family: var(--cc-font); color: var(--dash-text); }
    .card-head a { color: var(--dash-blue); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
    .list { display: grid; gap: 0.4rem; }
    .row {
      display: flex; justify-content: space-between; gap: 0.55rem; align-items: center; flex-wrap: wrap;
      padding: 0.55rem 0.7rem; border: 1px solid var(--dash-border); border-radius: 10px; background: #f8fbff;
    }
    .row.compact { background: white; }
    .row p { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.86rem; }
    .row-actions { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
    .actions { display: grid; gap: 0.45rem; }
    .actions a {
      text-decoration: none; color: var(--dash-text); font-weight: 650;
      padding: 0.7rem 0.85rem; border-radius: 12px; border: 1px solid var(--dash-border); background: #f4f7fc;
    }
    .empty { margin: 0; color: var(--dash-muted); }
    @media (max-width: 1200px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } }
  `,
})
export class PatientDashboardComponent implements OnInit {
  private readonly api = inject(ClinicalService);
  private readonly bookingsApi = inject(BookingService);
  private readonly auth = inject(AuthService);

  data: any;
  bookings: Booking[] = [];
  prescriptions: any[] = [];
  labReports: any[] = [];

  get firstName(): string {
    const name = this.auth.user()?.full_name || '';
    return name.split(' ')[0] || '';
  }

  get upcoming(): Booking[] {
    return this.bookings
      .filter((b) => !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(b.status))
      .slice(0, 5);
  }

  get nextAppointmentMeta(): string {
    const next = this.upcoming[0];
    if (!next) return 'None scheduled';
    return `${next.scheduled_date} · ${next.start_time}`;
  }

  get pendingLabs(): number {
    return this.labReports.filter((r) => r.status !== 'PUBLISHED').length;
  }

  get medicines(): Array<{ name: string; meta: string }> {
    const out: Array<{ name: string; meta: string }> = [];
    for (const rx of this.prescriptions) {
      for (const m of rx.medicines || []) {
        out.push({
          name: m.medicine_name,
          meta: [m.dosage, m.frequency, m.duration].filter(Boolean).join(' · '),
        });
      }
    }
    return out;
  }

  ngOnInit(): void {
    this.api.patientDashboard().subscribe({ next: (d) => (this.data = d) });
    this.bookingsApi.mine().subscribe({ next: (items) => (this.bookings = items) });
    this.api.prescriptions().subscribe({ next: (items) => (this.prescriptions = items) });
    this.api.myLabReports().subscribe({ next: (items) => (this.labReports = items) });
  }
}
