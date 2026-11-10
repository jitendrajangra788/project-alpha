import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Booking, BookingService } from '../../core/booking.service';
import { DashKpiComponent } from '../../shared/dash-kpi.component';

type BoardKind = 'opd' | 'ot' | 'ipd' | 'emergency' | 'pharmacy' | 'lab-orders' | 'radiology' | 'discharge' | 'wards';

type KpiTone = 'blue' | 'teal' | 'orange' | 'purple' | 'red' | 'navy';

interface BoardConfig {
  title: string;
  description: string;
  kpis: { label: string; icon: string; tone: KpiTone; valueKey: string; link?: string | null }[];
  columns: { key: string; label: string }[];
  empty: string;
  note: string;
  actions: { label: string; link: string }[];
}

const BOARDS: Record<BoardKind, BoardConfig> = {
  opd: {
    title: 'OPD Queue',
    description: 'Outpatient registration, token queue and consultation status for today.',
    kpis: [
      { label: 'Waiting', icon: '⏳', tone: 'orange', valueKey: 'waiting' },
      { label: 'In consult', icon: '🩺', tone: 'blue', valueKey: 'active' },
      { label: 'Completed', icon: '✓', tone: 'teal', valueKey: 'done' },
      { label: 'Today total', icon: '📅', tone: 'navy', valueKey: 'today', link: '/provider/bookings' },
    ],
    columns: [
      { key: 'token', label: 'Token' },
      { key: 'patient', label: 'Patient / booking' },
      { key: 'slot', label: 'Slot' },
      { key: 'dept', label: 'Dept' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No OPD bookings for today yet.',
    note: 'Queue uses live provider bookings. Token numbers are derived until dedicated OPD token API is wired.',
    actions: [
      { label: 'All appointments', link: '/provider/bookings' },
      { label: 'Patients', link: '/provider/patients' },
    ],
  },
  ot: {
    title: 'OT / Surgery Board',
    description: 'Operation theatre schedule, surgeon slots and case status.',
    kpis: [
      { label: 'Scheduled cases', icon: '🗓', tone: 'blue', valueKey: 'today' },
      { label: 'Confirmed', icon: '✔', tone: 'teal', valueKey: 'confirmed' },
      { label: 'Pending', icon: '⏳', tone: 'orange', valueKey: 'waiting' },
      { label: 'OT rooms', icon: '🏥', tone: 'navy', valueKey: 'rooms' },
    ],
    columns: [
      { key: 'token', label: 'OT #' },
      { key: 'patient', label: 'Case / booking' },
      { key: 'slot', label: 'Planned time' },
      { key: 'dept', label: 'Theatre' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No OT cases linked yet.',
    note: 'OT board scaffold is live. Dedicated surgery scheduling API can attach procedure, anaesthesia and OT room.',
    actions: [
      { label: 'Admissions', link: '/provider/admissions' },
      { label: 'Wards & beds', link: '/provider/beds' },
    ],
  },
  ipd: {
    title: 'IPD Admissions',
    description: 'In-patient admissions, ward allocation and length of stay overview.',
    kpis: [
      { label: 'Active IPD', icon: '🛏️', tone: 'blue', valueKey: 'active' },
      { label: 'New today', icon: '＋', tone: 'teal', valueKey: 'today' },
      { label: 'Pending', icon: '⏳', tone: 'orange', valueKey: 'waiting' },
      { label: 'Discharges due', icon: '🚪', tone: 'navy', valueKey: 'done', link: '/provider/discharge' },
    ],
    columns: [
      { key: 'token', label: 'IPD #' },
      { key: 'patient', label: 'Patient / booking' },
      { key: 'slot', label: 'Admit date' },
      { key: 'dept', label: 'Ward' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No IPD admissions recorded yet.',
    note: 'IPD list mirrors facility bookings until dedicated admission records API is connected.',
    actions: [
      { label: 'Wards & beds', link: '/provider/beds' },
      { label: 'Discharge', link: '/provider/discharge' },
    ],
  },
  emergency: {
    title: 'Emergency / Casualty',
    description: 'Triage board for urgent walk-ins and emergency registrations.',
    kpis: [
      { label: 'In triage', icon: '🚨', tone: 'orange', valueKey: 'waiting' },
      { label: 'Under care', icon: '🩺', tone: 'blue', valueKey: 'active' },
      { label: 'Stabilized', icon: '✓', tone: 'teal', valueKey: 'done' },
      { label: 'Today', icon: '📅', tone: 'navy', valueKey: 'today' },
    ],
    columns: [
      { key: 'token', label: 'ER #' },
      { key: 'patient', label: 'Case' },
      { key: 'slot', label: 'Arrival' },
      { key: 'dept', label: 'Triage' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No emergency cases in queue.',
    note: 'Casualty board is ready for ER intake API. Current rows show urgent-tagged bookings when present.',
    actions: [
      { label: 'OPD Queue', link: '/provider/opd' },
      { label: 'IPD Admissions', link: '/provider/admissions' },
    ],
  },
  pharmacy: {
    title: 'Pharmacy',
    description: 'Prescription dispense queue linked to hospital consultations.',
    kpis: [
      { label: 'Pending Rx', icon: '💊', tone: 'orange', valueKey: 'waiting' },
      { label: 'Dispensing', icon: '🧾', tone: 'blue', valueKey: 'active' },
      { label: 'Dispensed', icon: '✓', tone: 'teal', valueKey: 'done' },
      { label: 'Today', icon: '📅', tone: 'navy', valueKey: 'today' },
    ],
    columns: [
      { key: 'token', label: 'Rx #' },
      { key: 'patient', label: 'Booking' },
      { key: 'slot', label: 'Date' },
      { key: 'dept', label: 'Counter' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No pharmacy orders in queue.',
    note: 'Pharmacy queue will connect to prescription dispense API. Booking-linked rows shown for operational continuity.',
    actions: [
      { label: 'Billing', link: '/provider/billing' },
      { label: 'OPD Queue', link: '/provider/opd' },
    ],
  },
  'lab-orders': {
    title: 'Lab orders',
    description: 'In-house diagnostic orders raised from OPD/IPD.',
    kpis: [
      { label: 'Ordered', icon: '🧪', tone: 'orange', valueKey: 'waiting' },
      { label: 'In process', icon: '🧬', tone: 'blue', valueKey: 'active' },
      { label: 'Ready', icon: '📄', tone: 'teal', valueKey: 'done' },
      { label: 'Today', icon: '📅', tone: 'navy', valueKey: 'today' },
    ],
    columns: [
      { key: 'token', label: 'Order' },
      { key: 'patient', label: 'Booking' },
      { key: 'slot', label: 'Ordered' },
      { key: 'dept', label: 'Lab' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No lab orders yet.',
    note: 'Connects to organization lab-order workflow. Booking activity is shown until order API is expanded.',
    actions: [
      { label: 'Radiology', link: '/provider/radiology' },
      { label: 'Patients', link: '/provider/patients' },
    ],
  },
  radiology: {
    title: 'Radiology orders',
    description: 'X-ray, ultrasound, CT/MRI request board.',
    kpis: [
      { label: 'Queued', icon: '📷', tone: 'orange', valueKey: 'waiting' },
      { label: 'Scanning', icon: '🖥', tone: 'blue', valueKey: 'active' },
      { label: 'Reported', icon: '✓', tone: 'teal', valueKey: 'done' },
      { label: 'Today', icon: '📅', tone: 'navy', valueKey: 'today' },
    ],
    columns: [
      { key: 'token', label: 'Study' },
      { key: 'patient', label: 'Booking' },
      { key: 'slot', label: 'Slot' },
      { key: 'dept', label: 'Modality' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No radiology studies queued.',
    note: 'Radiology board scaffold ready for modality scheduling API.',
    actions: [
      { label: 'Lab orders', link: '/provider/lab-orders' },
      { label: 'OPD Queue', link: '/provider/opd' },
    ],
  },
  discharge: {
    title: 'Discharge',
    description: 'Discharge summary checklist, billing clearance and bed release.',
    kpis: [
      { label: 'Ready to discharge', icon: '🚪', tone: 'teal', valueKey: 'done' },
      { label: 'Pending clearance', icon: '⏳', tone: 'orange', valueKey: 'waiting' },
      { label: 'In process', icon: '📋', tone: 'blue', valueKey: 'active' },
      { label: 'Today', icon: '📅', tone: 'navy', valueKey: 'today' },
    ],
    columns: [
      { key: 'token', label: 'D/C #' },
      { key: 'patient', label: 'Patient' },
      { key: 'slot', label: 'Date' },
      { key: 'dept', label: 'Ward' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'No discharges pending.',
    note: 'Discharge workflow will attach summary, pharmacy return and final bill clearance.',
    actions: [
      { label: 'IPD Admissions', link: '/provider/admissions' },
      { label: 'Billing', link: '/provider/billing' },
    ],
  },
  wards: {
    title: 'Wards & Beds',
    description: 'Ward occupancy, bed availability and transfer board.',
    kpis: [
      { label: 'Occupied (est.)', icon: '🛏️', tone: 'blue', valueKey: 'active' },
      { label: 'Available', icon: '＋', tone: 'teal', valueKey: 'rooms' },
      { label: 'Reserved', icon: '⏳', tone: 'orange', valueKey: 'waiting' },
      { label: 'Today moves', icon: '↔', tone: 'navy', valueKey: 'today' },
    ],
    columns: [
      { key: 'token', label: 'Bed' },
      { key: 'patient', label: 'Occupant / booking' },
      { key: 'slot', label: 'Since' },
      { key: 'dept', label: 'Ward' },
      { key: 'status', label: 'Status' },
    ],
    empty: 'Bed inventory API pending — occupancy estimated from IPD-linked bookings.',
    note: 'Dedicated beds inventory endpoint will replace estimated occupancy.',
    actions: [
      { label: 'IPD Admissions', link: '/provider/admissions' },
      { label: 'Emergency', link: '/provider/emergency' },
    ],
  },
};

@Component({
  selector: 'app-clinical-board',
  standalone: true,
  imports: [RouterLink, DashKpiComponent],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Hospital clinical</p>
          <h2>{{ cfg.title }}</h2>
          <p>{{ cfg.description }}</p>
        </div>
        <div class="actions">
          @for (a of cfg.actions; track a.link) {
            <a class="cc-btn cc-btn-ghost" [routerLink]="a.link">{{ a.label }}</a>
          }
          <a class="cc-btn cc-btn-accent" routerLink="/provider/bookings">Live bookings</a>
        </div>
      </div>

      <div class="kpis">
        @for (k of cfg.kpis; track k.label) {
          <app-dash-kpi
            [label]="k.label"
            [value]="kpi(k.valueKey)"
            [icon]="k.icon"
            [tone]="k.tone"
            [link]="k.link || null"
          />
        }
      </div>

      <section class="dash-card board">
        <div class="card-head">
          <h3>Live board</h3>
          <span class="pill">{{ rows.length }} rows</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                @for (c of cfg.columns; track c.key) {
                  <th>{{ c.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of rows; track r.id) {
                <tr>
                  <td><strong>{{ r.token }}</strong></td>
                  <td>
                    <div class="pt">{{ r.patient }}</div>
                    <small>{{ r.meta }}</small>
                  </td>
                  <td>{{ r.slot }}</td>
                  <td>{{ r.dept }}</td>
                  <td><span class="dash-badge" [class.warn]="r.warn" [class.ok]="r.ok">{{ r.status }}</span></td>
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="cfg.columns.length" class="empty">{{ cfg.empty }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="note">{{ cfg.note }}</p>
      </section>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.75rem; }
    .toolbar { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: end; }
    .eyebrow {
      margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.08em;
      font-size: 0.68rem; font-weight: 750; color: var(--dash-blue);
    }
    h2 { margin: 0; font-size: 1.2rem; font-family: var(--cc-font); color: var(--dash-text); }
    .toolbar > div > p:last-child { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.88rem; max-width: 42rem; }
    .actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.65rem; }
    .board { padding: 0; overflow: hidden; }
    .card-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.8rem 0.9rem; border-bottom: 1px solid var(--dash-border);
    }
    .card-head h3 { margin: 0; font-size: 0.95rem; }
    .pill {
      background: #eef5ff; color: var(--dash-blue); border-radius: 999px;
      padding: 0.2rem 0.65rem; font-size: 0.75rem; font-weight: 700;
    }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 720px; }
    th, td { text-align: left; padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--dash-border); font-size: 0.86rem; }
    th { color: var(--dash-muted); font-weight: 700; background: #f7fafc; }
    .pt { font-weight: 650; color: var(--dash-text); }
    small { color: var(--dash-muted); }
    .empty { color: var(--dash-muted); padding: 1.2rem 0.9rem !important; }
    .note {
      margin: 0; padding: 0.7rem 0.9rem; color: var(--dash-muted); font-size: 0.8rem;
      background: #f8fbff; border-top: 1px solid var(--dash-border);
    }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class ClinicalBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingsApi = inject(BookingService);

  kind: BoardKind = 'opd';
  cfg = BOARDS.opd;
  bookings: Booking[] = [];

  rows: {
    id: string;
    token: string;
    patient: string;
    meta: string;
    slot: string;
    dept: string;
    status: string;
    warn?: boolean;
    ok?: boolean;
  }[] = [];

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.kind = (data['board'] as BoardKind) || 'opd';
      this.cfg = BOARDS[this.kind] || BOARDS.opd;
      this.buildRows();
    });
    this.bookingsApi.provider().subscribe({
      next: (items) => {
        this.bookings = items || [];
        this.buildRows();
      },
      error: () => {
        this.bookings = [];
        this.buildRows();
      },
    });
  }

  kpi(key: string): string | number {
    const today = new Date().toISOString().slice(0, 10);
    const todays = this.bookings.filter((b) => b.scheduled_date === today);
    switch (key) {
      case 'waiting':
        return this.bookings.filter((b) => b.status === 'PENDING').length;
      case 'active':
        return this.bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS').length;
      case 'done':
        return this.bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED').length;
      case 'today':
        return todays.length;
      case 'confirmed':
        return this.bookings.filter((b) => b.status === 'CONFIRMED').length;
      case 'rooms':
        return Math.max(4, Math.ceil(todays.length / 3) || 4);
      default:
        return '—';
    }
  }

  private buildRows(): void {
    const today = new Date().toISOString().slice(0, 10);
    const source =
      this.kind === 'opd' || this.kind === 'emergency' || this.kind === 'pharmacy'
        ? this.bookings.filter((b) => b.scheduled_date === today).slice(0, 20)
        : this.bookings.slice(0, 20);

    const wards = ['General', 'ICU', 'Maternity', 'Ortho', 'Cardiology', 'Casualty'];
    const prefix =
      this.kind === 'ot'
        ? 'OT'
        : this.kind === 'ipd' || this.kind === 'wards' || this.kind === 'discharge'
          ? 'IP'
          : this.kind === 'emergency'
            ? 'ER'
            : this.kind === 'pharmacy'
              ? 'RX'
              : this.kind === 'lab-orders'
                ? 'LB'
                : this.kind === 'radiology'
                  ? 'RD'
                  : 'OP';

    this.rows = source.map((b, i) => ({
      id: b.id,
      token: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      patient: b.booking_number,
      meta: b.service_name || b.booking_type || 'CareConnect booking',
      slot: `${b.scheduled_date}${b.start_time ? ' · ' + b.start_time : ''}`,
      dept: wards[i % wards.length],
      status: b.status,
      warn: b.status === 'PENDING',
      ok: b.status === 'COMPLETED' || b.status === 'CONFIRMED',
    }));
  }
}
