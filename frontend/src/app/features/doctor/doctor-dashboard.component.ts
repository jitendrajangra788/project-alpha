import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking, BookingService } from '../../core/booking.service';
import { ClinicalService } from '../../core/clinical.service';
import { EarningsSummary, PaymentService } from '../../core/payment.service';
import { DashKpiComponent } from '../../shared/dash-kpi.component';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [RouterLink, DashKpiComponent, DatePipe],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <h2>Clinical workspace</h2>
          <p>Today’s appointments, patients, video consults and earnings.</p>
        </div>
        <div class="actions">
          <a class="cc-btn cc-btn-accent" routerLink="/doctor/bookings">Appointments</a>
          <a class="cc-btn cc-btn-ghost" routerLink="/doctor/prescriptions">Write prescription</a>
        </div>
      </div>

      <div class="kpis">
        <app-dash-kpi label="Today's Appointments" [value]="todayCount" icon="📅" tone="blue" link="/doctor/bookings" />
        <app-dash-kpi label="Pending" [value]="count('PENDING')" icon="⏳" tone="orange" link="/doctor/bookings" />
        <app-dash-kpi label="Confirmed / Upcoming" [value]="count('CONFIRMED')" icon="✅" tone="teal" />
        <app-dash-kpi label="Patients (from bookings)" [value]="uniquePatients" icon="👥" tone="purple" link="/doctor/patients" />
        <app-dash-kpi label="Video consults" [value]="videoCount" icon="🎥" tone="blue" link="/doctor/video" />
        <app-dash-kpi
          label="Monthly earnings"
          [value]="earningsLabel"
          icon="₹"
          tone="teal"
          link="/doctor/earnings"
          hint="Provider earnings summary"
        />
      </div>

      <div class="grid">
        <section class="dash-card span-2">
          <div class="card-head">
            <h3>Upcoming consultations</h3>
            <a routerLink="/doctor/calendar">Calendar</a>
          </div>
          <div class="list">
            @for (b of upcoming; track b.id) {
              <article>
                <div>
                  <strong>{{ b.booking_number }} · {{ b.service_name || b.booking_type }}</strong>
                  <p>{{ b.scheduled_date }} · {{ b.start_time }}–{{ b.end_time }}</p>
                </div>
                <div class="row-actions">
                  <span class="dash-badge" [class.ok]="b.status === 'CONFIRMED'" [class.warn]="b.status === 'PENDING'">{{ b.status }}</span>
                  @if (b.is_online) {
                    <a class="cc-btn cc-btn-ghost" routerLink="/doctor/video">Video</a>
                  }
                </div>
              </article>
            } @empty {
              <p class="empty">No upcoming appointments.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Recent patients</h3>
            <a routerLink="/doctor/patients">View all</a>
          </div>
          <div class="list">
            @for (p of recentPatients; track p) {
              <article class="compact"><strong>{{ p }}</strong><p>From booking history</p></article>
            } @empty {
              <p class="empty">Patient list fills from appointments.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Recent prescriptions</h3>
            <a routerLink="/doctor/prescriptions">Write</a>
          </div>
          <div class="list">
            @for (rx of prescriptions.slice(0, 5); track rx.id) {
              <article class="compact">
                <strong>{{ rx.diagnosis || 'Prescription' }}</strong>
                <p>{{ rx.created_at | date: 'mediumDate' }} · v{{ rx.version }}</p>
              </article>
            } @empty {
              <p class="empty">No prescriptions authored yet.</p>
            }
          </div>
        </section>

        <section class="dash-card span-2">
          <div class="card-head">
            <h3>Week activity</h3>
          </div>
          <div class="bars">
            @for (d of weekBars; track d.label) {
              <div class="col">
                <div class="bar" [style.height.%]="d.pct"></div>
                <small>{{ d.label }}</small>
                <em>{{ d.count }}</em>
              </div>
            }
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
    .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0.7rem; }
    .span-2 { grid-column: 1 / -1; }
    .dash-card { padding: 0.85rem; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .card-head h3 { margin: 0; font-size: 0.95rem; font-family: var(--cc-font); }
    .card-head a { color: var(--dash-blue); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
    .list { display: grid; gap: 0.4rem; }
    article {
      display: flex; justify-content: space-between; gap: 0.55rem; align-items: center; flex-wrap: wrap;
      padding: 0.55rem 0.7rem; border: 1px solid var(--dash-border); border-radius: 10px; background: #f8fbff;
    }
    article.compact { display: block; }
    article p { margin: 0.15rem 0 0; color: var(--dash-muted); font-size: 0.8rem; }
    .row-actions { display: flex; gap: 0.4rem; align-items: center; }
    .empty { margin: 0; color: var(--dash-muted); }
    .bars {
      height: 120px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.4rem;
      align-items: end;
    }
    .col { display: grid; justify-items: center; gap: 0.2rem; height: 100%; align-content: end; }
    .bar {
      width: 100%; max-width: 24px; border-radius: 7px 7px 3px 3px; min-height: 8px;
      background: linear-gradient(180deg, #1677e8, #0e9f9a);
    }
    .col small { color: var(--dash-muted); font-size: 0.72rem; }
    .col em { font-style: normal; font-size: 0.75rem; font-weight: 700; }
    @media (max-width: 1200px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 560px) { .kpis { grid-template-columns: 1fr; } }
  `,
})
export class DoctorDashboardComponent implements OnInit {
  private readonly bookingsApi = inject(BookingService);
  private readonly payments = inject(PaymentService);
  private readonly clinical = inject(ClinicalService);

  bookings: Booking[] = [];
  prescriptions: any[] = [];
  earnings: EarningsSummary | null = null;

  get todayCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings.filter((b) => b.scheduled_date === today).length;
  }

  get upcoming(): Booking[] {
    return this.bookings
      .filter((b) => !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(b.status))
      .slice(0, 6);
  }

  get videoCount(): number {
    return this.bookings.filter((b) => b.is_online && !['CANCELLED', 'COMPLETED'].includes(b.status)).length;
  }

  get uniquePatients(): number {
    return new Set(this.bookings.map((b) => b.booking_number)).size;
  }

  get recentPatients(): string[] {
    return [...new Set(this.bookings.map((b) => b.listing_name || b.booking_number))].slice(0, 5);
  }

  get earningsLabel(): string {
    const v = this.earnings?.provider_earnings;
    if (v == null) return '—';
    return `₹${Number(v).toLocaleString('en-IN')}`;
  }

  get weekBars(): Array<{ label: string; count: number; pct: number }> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    for (const b of this.bookings) {
      const d = new Date(b.scheduled_date);
      if (!Number.isNaN(d.getTime())) counts[d.getDay()] += 1;
    }
    const max = Math.max(...counts, 1);
    return days.map((label, i) => ({
      label,
      count: counts[i],
      pct: Math.max(8, (counts[i] / max) * 100),
    }));
  }

  count(status: string): number {
    return this.bookings.filter((b) => b.status === status).length;
  }

  ngOnInit(): void {
    this.bookingsApi.provider().subscribe({ next: (items) => (this.bookings = items) });
    this.payments.earnings().subscribe({ next: (e) => (this.earnings = e), error: () => undefined });
    this.clinical.prescriptions().subscribe({ next: (items) => (this.prescriptions = items), error: () => undefined });
  }
}
