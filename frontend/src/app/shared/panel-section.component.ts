import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService } from '../core/booking.service';
import { PaymentService } from '../core/payment.service';
import { MarketplaceService } from '../core/marketplace.service';
import { AdminService } from '../core/admin.service';
import { ClinicalService } from '../core/clinical.service';

@Component({
  selector: 'app-panel-section',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>{{ title }}</h2>
          <p>{{ description }}</p>
        </div>
        @if (primaryLink) {
          <a class="cc-btn cc-btn-accent" [routerLink]="primaryLink">{{ primaryLabel }}</a>
        }
      </div>

      @if (error) {
        <div class="banner error">{{ error }}</div>
      }
      @if (loading) {
        <div class="banner">Loading…</div>
      }

      @if (stats.length) {
        <div class="stats">
          @for (s of stats; track s.label) {
            <article>
              <h3>{{ s.label }}</h3>
              <p>{{ s.value }}</p>
            </article>
          }
        </div>
      }

      @if (rows.length) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                @for (c of columns; track c) {
                  <th>{{ c }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track $index) {
                <tr>
                  @for (cell of row; track $index) {
                    <td>{{ cell }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading) {
        <div class="empty">
          <h3>{{ emptyTitle }}</h3>
          <p>{{ emptyBody }}</p>
          @if (links.length) {
            <div class="links">
              @for (l of links; track l.label) {
                <a class="cc-btn cc-btn-ghost" [routerLink]="l.link" [queryParams]="l.queryParams || {}">{{ l.label }}</a>
              }
            </div>
          }
        </div>
      }

      @if (apiNote) {
        <p class="note">{{ apiNote }}</p>
      }
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .head { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: start; }
    h2 { margin: 0 0 0.2rem; font-size: 1.15rem; }
    .head p { margin: 0; color: var(--cc-slate); max-width: 48rem; line-height: 1.45; font-size: 0.9rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.65rem;
    }
    .stats article, .empty, .table-wrap, .banner {
      background: white;
      border: 1px solid var(--cc-border);
      border-radius: 12px;
      box-shadow: var(--cc-shadow-sm);
    }
    .stats article { padding: 0.75rem 0.85rem; }
    .stats h3 { margin: 0; color: var(--cc-slate-soft); font-size: 0.78rem; font-weight: 700; }
    .stats p { margin: 0.3rem 0 0; font-size: 1.35rem; font-weight: 750; color: var(--cc-navy); }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.65rem 0.8rem; text-align: left; border-bottom: 1px solid var(--cc-border); font-size: 0.9rem; }
    th { color: var(--cc-slate-soft); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .empty { padding: 1rem; }
    .empty h3 { margin: 0 0 0.3rem; font-size: 1rem; }
    .empty p { margin: 0; color: var(--cc-slate); font-size: 0.9rem; }
    .links { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.75rem; }
    .banner { padding: 0.65rem 0.85rem; color: var(--cc-slate); }
    .banner.error { color: var(--cc-danger); border-color: #fecaca; background: #fff7f7; }
    .note { margin: 0; color: var(--cc-slate-soft); font-size: 0.86rem; }
    @media (max-width: 560px) {
      .head { gap: 0.5rem; }
      h2 { font-size: 1.05rem; }
      .stats { grid-template-columns: 1fr 1fr; }
      th, td { padding: 0.55rem 0.65rem; font-size: 0.84rem; }
    }
  `,
})
export class PanelSectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookings = inject(BookingService);
  private readonly payments = inject(PaymentService);
  private readonly marketplace = inject(MarketplaceService);
  private readonly admin = inject(AdminService);
  private readonly clinical = inject(ClinicalService);

  title = 'Section';
  description = '';
  emptyTitle = 'Nothing here yet';
  emptyBody = 'Data will appear when available from CareConnect APIs.';
  primaryLink: string | any[] | null = null;
  primaryLabel = 'Continue';
  apiNote = '';
  links: Array<{ label: string; link: string | any[]; queryParams?: Record<string, string> }> = [];

  loading = false;
  error = '';
  stats: Array<{ label: string; value: string | number }> = [];
  columns: string[] = [];
  rows: string[][] = [];

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = (data['title'] as string) || 'Section';
      this.description = (data['description'] as string) || '';
      this.emptyTitle = (data['emptyTitle'] as string) || this.emptyTitle;
      this.emptyBody = (data['emptyBody'] as string) || this.emptyBody;
      this.primaryLink = (data['primaryLink'] as string) || null;
      this.primaryLabel = (data['primaryLabel'] as string) || 'Continue';
      this.apiNote = (data['apiNote'] as string) || '';
      this.links = (data['links'] as typeof this.links) || [];
      const source = (data['source'] as string) || '';
      this.loadSource(source, data);
    });
  }

  private loadSource(source: string, data: Record<string, unknown>): void {
    this.loading = true;
    this.error = '';
    this.stats = [];
    this.columns = [];
    this.rows = [];

    if (!source) {
      this.loading = false;
      return;
    }

    if (source === 'admin-dashboard') {
      this.admin.dashboard().subscribe({
        next: (s) => {
          this.stats = [
            { label: 'Patients', value: s.total_patients },
            { label: 'Doctors', value: s.total_doctors },
            { label: 'Organizations', value: s.total_organizations },
            { label: 'Pending verifications', value: s.pending_verifications },
            { label: 'Users', value: s.total_users },
          ];
          this.loading = false;
        },
        error: () => this.fail('Could not load admin dashboard'),
      });
      return;
    }

    if (source === 'admin-users') {
      this.admin.users(1, 50).subscribe({
        next: (res) => {
          this.columns = ['Name', 'Email', 'Mobile', 'Roles'];
          this.rows = res.items.map((u) => [
            u.full_name,
            u.email || '—',
            u.mobile,
            (u.roles || []).join(', '),
          ]);
          this.stats = [{ label: 'Total users', value: res.total }];
          this.loading = false;
        },
        error: () => this.fail('Could not load users'),
      });
      return;
    }

    if (source === 'admin-verifications') {
      const status = (data['status'] as string) || undefined;
      this.admin.verifications(status).subscribe({
        next: (items) => {
          this.columns = ['Organization', 'Type', 'City', 'Status'];
          this.rows = items.map((o) => [o.name, o.organization_type, o.city, o.verification_status]);
          this.stats = [{ label: 'Records', value: items.length }];
          this.loading = false;
        },
        error: () => this.fail('Could not load organizations'),
      });
      return;
    }

    if (source === 'provider-bookings' || source === 'doctor-bookings') {
      this.bookings.provider().subscribe({
        next: (items) => {
          this.columns = ['Booking', 'Type', 'Date', 'Status', 'Payment'];
          this.rows = items.map((b) => [
            b.booking_number,
            b.booking_type,
            b.scheduled_date,
            b.status,
            b.payment_status,
          ]);
          this.stats = [
            { label: 'Total', value: items.length },
            { label: 'Pending', value: items.filter((b) => b.status === 'PENDING').length },
            { label: 'Confirmed', value: items.filter((b) => b.status === 'CONFIRMED').length },
          ];
          this.loading = false;
        },
        error: () => this.fail('Could not load bookings'),
      });
      return;
    }

    if (source === 'patient-bookings') {
      this.bookings.mine().subscribe({
        next: (items) => {
          this.columns = ['Booking', 'Provider', 'Date', 'Status', 'Payment'];
          this.rows = items.map((b) => [
            b.booking_number,
            b.listing_name || 'Provider',
            b.scheduled_date,
            b.status,
            b.payment_status,
          ]);
          this.loading = false;
        },
        error: () => this.fail('Could not load appointments'),
      });
      return;
    }

    if (source === 'payments-me') {
      this.payments.mine().subscribe({
        next: (items) => {
          this.columns = ['Payment', 'Purpose', 'Amount', 'Status', 'Date'];
          this.rows = items.map((p) => [
            p.payment_number,
            p.purpose,
            `₹${p.amount}`,
            p.status,
            p.created_at?.slice(0, 10) || '—',
          ]);
          this.stats = [
            { label: 'Payments', value: items.length },
            { label: 'Paid', value: items.filter((p) => p.status === 'PAID').length },
          ];
          this.loading = false;
        },
        error: () => this.fail('Could not load payments'),
      });
      return;
    }

    if (source === 'earnings') {
      this.payments.earnings().subscribe({
        next: (e) => {
          this.stats = [
            { label: 'Gross collected', value: `₹${e.gross_collected}` },
            { label: 'Your earnings', value: `₹${e.provider_earnings}` },
            { label: 'Unsettled', value: `₹${e.unsettled_amount}` },
            { label: 'Commission', value: `₹${e.commission_total}` },
          ];
          this.loading = false;
        },
        error: () => this.fail('Could not load earnings'),
      });
      return;
    }

    if (source === 'subscription-plans') {
      this.payments.plans().subscribe({
        next: (plans) => {
          this.columns = ['Plan', 'Code', 'Monthly', 'Featured slots', 'Active'];
          this.rows = plans.map((p) => [
            p.name,
            p.code,
            `₹${p.price_monthly}`,
            String(p.featured_listings),
            p.is_active ? 'Yes' : 'No',
          ]);
          this.loading = false;
        },
        error: () => this.fail('Could not load plans'),
      });
      return;
    }

    if (source === 'categories') {
      this.marketplace.categories().subscribe({
        next: (cats) => {
          this.columns = ['Name', 'Code', 'Sort'];
          this.rows = cats.map((c) => [c.name, c.code, String(c.sort_order)]);
          this.loading = false;
        },
        error: () => this.fail('Could not load categories'),
      });
      return;
    }

    if (source === 'patient-dashboard') {
      this.clinical.patientDashboard().subscribe({
        next: (d: any) => {
          this.stats = [
            { label: 'Prescriptions', value: d.prescriptions ?? 0 },
            { label: 'Lab reports', value: d.lab_reports ?? 0 },
            { label: 'Bookings', value: d.bookings ?? 0 },
            { label: 'Consents', value: d.consents ?? 0 },
          ];
          this.columns = ['Event', 'Type', 'When'];
          this.rows = (d.timeline || []).slice(0, 20).map((e: any) => [
            e.title,
            e.event_type,
            (e.event_at || '').toString().slice(0, 16).replace('T', ' '),
          ]);
          this.loading = false;
        },
        error: () => this.fail('Could not load patient data'),
      });
      return;
    }

    this.loading = false;
  }

  private fail(message: string): void {
    this.error = message;
    this.loading = false;
  }
}
