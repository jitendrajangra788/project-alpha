import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/admin.service';
import { MarketplaceService } from '../../core/marketplace.service';
import { AdminDashboard, Organization } from '../../core/models';
import { Commission, PaymentService } from '../../core/payment.service';
import { DashKpiComponent } from '../../shared/dash-kpi.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DashKpiComponent, CurrencyPipe, FormsModule],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <h2>Platform overview</h2>
          <p>Live metrics from CareConnect APIs — empty values stay blank until data exists.</p>
        </div>
        <div class="toolbar-actions">
          <label>
            Range
            <select [(ngModel)]="range" name="range">
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
          <a class="cc-btn cc-btn-accent" routerLink="/admin/verifications">Review verifications</a>
        </div>
      </div>

      @if (loading) {
        <div class="skeleton-row">
          @for (_ of [1,2,3,4,5,6]; track $index) {
            <div class="skel"></div>
          }
        </div>
      } @else if (error) {
        <div class="banner">{{ error }}</div>
      } @else {
        <div class="kpis">
          <app-dash-kpi label="Total Patients" [value]="stats?.total_patients ?? 0" icon="👥" tone="blue" link="/admin/patients" />
          <app-dash-kpi label="Total Doctors" [value]="stats?.total_doctors ?? 0" icon="🩺" tone="teal" link="/admin/doctors" />
          <app-dash-kpi label="Organizations" [value]="stats?.total_organizations ?? 0" icon="🏥" tone="purple" link="/admin/hospitals" />
          <app-dash-kpi label="Pending Verifications" [value]="stats?.pending_verifications ?? 0" icon="📄" tone="orange" link="/admin/verifications" hint="Needs admin review" />
          <app-dash-kpi label="Platform Users" [value]="stats?.total_users ?? 0" icon="🔐" tone="navy" link="/admin/users" />
          <app-dash-kpi
            label="Gross Commission Volume"
            [value]="revenueLabel"
            icon="₹"
            tone="teal"
            link="/admin/payments"
            hint="From commission records"
          />
        </div>
      }

      <div class="grid">
        <section class="dash-card chart-card">
          <div class="card-head">
            <div>
              <h3>Platform growth overview</h3>
              <p>Relative scale from current live totals (patients / doctors / orgs).</p>
            </div>
          </div>
          <div class="bars">
            @for (b of growthBars; track b.label) {
              <div class="bar-col">
                <div class="track">
                  <div class="bar" [style.height.%]="b.pct">
                    <span>{{ b.value }}</span>
                  </div>
                </div>
                <small>{{ b.label }}</small>
              </div>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <div>
              <h3>Provider mix</h3>
              <p>Organizations by type from verification queue.</p>
            </div>
            <a routerLink="/admin/verifications">View all</a>
          </div>
          <div class="donut-wrap">
            <div class="donut" [style.background]="donutGradient">
              <div class="donut-hole">
                <strong>{{ orgs.length }}</strong>
                <span>orgs</span>
              </div>
            </div>
            <ul class="legend">
              @for (s of orgSlices; track s.label) {
                <li>
                  <i [style.background]="s.color"></i>
                  <span>{{ s.label }}</span>
                  <strong>{{ s.count }}</strong>
                </li>
              } @empty {
                <li>No organizations loaded yet.</li>
              }
            </ul>
          </div>
        </section>

        <section class="dash-card span-2">
          <div class="card-head">
            <div>
              <h3>Verification queue</h3>
              <p>Latest provider submissions.</p>
            </div>
            <a routerLink="/admin/verifications">Open queue</a>
          </div>
          <div class="table">
            <div class="thead">
              <span>Organization</span><span>Type</span><span>City</span><span>Status</span>
            </div>
            @for (o of orgs.slice(0, 8); track o.id) {
              <div class="trow">
                <span>{{ o.name }}</span>
                <span>{{ o.organization_type }}</span>
                <span>{{ o.city }}</span>
                <span class="dash-badge" [class.warn]="o.verification_status === 'PENDING'" [class.ok]="o.is_verified">
                  {{ o.verification_status }}
                </span>
              </div>
            } @empty {
              <p class="empty">No verification records yet.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <div>
              <h3>Popular categories</h3>
              <p>Marketplace categories currently seeded.</p>
            </div>
            <a routerLink="/admin/categories">Manage</a>
          </div>
          <div class="cats">
            @for (c of categories; track c.id || c.code) {
              <a class="cat" routerLink="/search" [queryParams]="{ category: c.code }">{{ c.name }}</a>
            } @empty {
              <p class="empty">No categories returned.</p>
            }
          </div>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <div>
              <h3>Commission snapshot</h3>
              <p>Recent platform commission rows.</p>
            </div>
            <a routerLink="/admin/payments">Payments</a>
          </div>
          <div class="list">
            @for (c of commissions.slice(0, 5); track c.id) {
              <article>
                <div>
                  <strong>{{ c.gross_amount | currency: 'INR':'symbol':'1.0-0' }} gross</strong>
                  <p>Platform {{ c.commission_amount | currency: 'INR':'symbol':'1.0-0' }} · {{ c.commission_percent }}%</p>
                </div>
                <span class="dash-badge" [class.ok]="c.is_settled" [class.warn]="!c.is_settled">
                  {{ c.is_settled ? 'Settled' : 'Unsettled' }}
                </span>
              </article>
            } @empty {
              <p class="empty">No commission data yet.</p>
            }
          </div>
        </section>

        <section class="dash-card span-2 promo">
          <div>
            <h3>Better healthcare operations</h3>
            <p>Verify providers, monitor payments, and keep marketplace categories healthy.</p>
            <div class="promo-actions">
              <a class="cc-btn cc-btn-accent" routerLink="/admin/settings">Platform settings</a>
              <a class="cc-btn cc-btn-ghost" routerLink="/admin/analytics">Analytics</a>
            </div>
          </div>
          <div class="quick-stats">
            <div><strong>{{ stats?.pending_verifications ?? 0 }}</strong><span>Pending verifications</span></div>
            <div><strong>{{ unsettledCount }}</strong><span>Unsettled commissions</span></div>
            <div><strong>{{ categories.length }}</strong><span>Categories live</span></div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .toolbar { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: end; }
    .toolbar h2 { margin: 0; font-size: 1.1rem; color: var(--dash-text); font-family: var(--cc-font); }
    .toolbar p { margin: 0.15rem 0 0; color: var(--dash-muted); font-size: 0.86rem; }
    .toolbar-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: end; }
    label { display: grid; gap: 0.2rem; font-size: 0.72rem; font-weight: 700; color: var(--dash-muted); }
    select {
      border: 1px solid var(--dash-border); border-radius: 8px; padding: 0.45rem 0.6rem;
      background: white; font: inherit; color: var(--dash-text);
    }
    .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.65rem; }
    .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0.7rem; }
    .span-2 { grid-column: 1 / -1; }
    .dash-card { padding: 0.85rem; }
    .card-head { display: flex; justify-content: space-between; gap: 0.55rem; align-items: start; margin-bottom: 0.55rem; }
    .card-head h3 { margin: 0; font-size: 0.95rem; color: var(--dash-text); font-family: var(--cc-font); }
    .card-head p { margin: 0.15rem 0 0; color: var(--dash-muted); font-size: 0.8rem; }
    .card-head a { color: var(--dash-blue); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
    .bars {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
      align-items: end; min-height: 0;
    }
    .bar-col { display: grid; gap: 0.35rem; justify-items: center; }
    .track {
      width: 100%; max-width: 84px; height: 140px;
      display: flex; align-items: flex-end; justify-content: center;
      background: linear-gradient(180deg, #f4f7fc, #eef3fa);
      border-radius: 12px; padding: 0.35rem 0.25rem 0; box-sizing: border-box;
    }
    .bar {
      width: 100%; border-radius: 10px 10px 6px 6px;
      background: linear-gradient(180deg, #1677e8, #0e9f9a); min-height: 24px;
      display: grid; place-items: start center; padding-top: 0.35rem; color: white; font-size: 0.78rem; font-weight: 750;
    }
    .bar-col small { color: var(--dash-muted); font-weight: 650; font-size: 0.78rem; }
    .donut-wrap { display: grid; grid-template-columns: 120px 1fr; gap: 0.75rem; align-items: center; }
    .donut {
      width: 118px; height: 118px; border-radius: 50%;
      display: grid; place-items: center;
    }
    .donut-hole {
      width: 66px; height: 66px; border-radius: 50%; background: white;
      display: grid; place-items: center; text-align: center;
    }
    .donut-hole strong { font-size: 1.2rem; }
    .donut-hole span { font-size: 0.72rem; color: var(--dash-muted); }
    .legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
    .legend li { display: grid; grid-template-columns: 10px 1fr auto; gap: 0.55rem; align-items: center; font-size: 0.86rem; }
    .legend i { width: 10px; height: 10px; border-radius: 50%; }
    .table { display: grid; gap: 0.35rem; }
    .thead, .trow {
      display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 0.9fr; gap: 0.5rem;
      padding: 0.5rem 0.25rem; align-items: center;
    }
    .thead { color: var(--dash-muted); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 750; }
    .trow { border-top: 1px solid var(--dash-border); font-size: 0.9rem; }
    .cats { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .cat {
      text-decoration: none; color: var(--dash-text); background: #f4f7fc; border: 1px solid var(--dash-border);
      border-radius: 12px; padding: 0.55rem 0.75rem; font-weight: 650; font-size: 0.86rem;
    }
    .list { display: grid; gap: 0.55rem; }
    .list article {
      display: flex; justify-content: space-between; gap: 0.75rem; align-items: center;
      padding: 0.7rem 0.75rem; border: 1px solid var(--dash-border); border-radius: 12px; background: #f8fbff;
    }
    .list p { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.82rem; }
    .promo {
      display: grid; grid-template-columns: 1.3fr 1fr; gap: 0.75rem; align-items: center;
      background: linear-gradient(135deg, #082b55, #0e4f7a 55%, #0e9f9a); color: white; border: 0;
    }
    .promo h3, .promo p { color: white; }
    .promo h3 { margin: 0; font-size: 1.05rem; }
    .promo p { opacity: 0.85; margin: 0.35rem 0 0; font-size: 0.88rem; }
    .promo-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.65rem; }
    .quick-stats { display: grid; gap: 0.45rem; }
    .quick-stats div {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px; padding: 0.55rem 0.7rem;
    }
    .quick-stats strong { display: block; font-size: 1.1rem; }
    .quick-stats span { font-size: 0.76rem; opacity: 0.8; }
    .empty { margin: 0; color: var(--dash-muted); }
    .banner { padding: 0.65rem 0.85rem; border-radius: 10px; background: #fff5f5; color: #b91c1c; border: 1px solid #fecaca; }
    .skeleton-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.65rem; }
    .skel { height: 88px; border-radius: 12px; background: linear-gradient(90deg, #eef2f7, #f8fafc, #eef2f7); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
    @media (max-width: 1200px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 900px) {
      .grid, .promo, .donut-wrap { grid-template-columns: 1fr; }
      .kpis, .skeleton-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .thead, .trow { grid-template-columns: 1.2fr 0.9fr; }
      .thead span:nth-child(3), .thead span:nth-child(4),
      .trow span:nth-child(3), .trow span:nth-child(4) { display: none; }
    }
    @media (max-width: 560px) { .kpis, .skeleton-row { grid-template-columns: 1fr; } }
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly payments = inject(PaymentService);
  private readonly marketplace = inject(MarketplaceService);

  stats: AdminDashboard | null = null;
  orgs: Organization[] = [];
  commissions: Commission[] = [];
  categories: any[] = [];
  loading = true;
  error = '';
  range = '30';

  private readonly palette = ['#1677e8', '#0e9f9a', '#7c3aed', '#f59e0b', '#ef4444', '#0891b2'];

  get revenueLabel(): string {
    const total = this.commissions.reduce((sum, c) => sum + Number(c.gross_amount || 0), 0);
    if (!total) return '₹0';
    if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`;
    return `₹${Math.round(total).toLocaleString('en-IN')}`;
  }

  get unsettledCount(): number {
    return this.commissions.filter((c) => !c.is_settled).length;
  }

  get growthBars(): Array<{ label: string; value: number; pct: number }> {
    const patients = this.stats?.total_patients ?? 0;
    const doctors = this.stats?.total_doctors ?? 0;
    const orgs = this.stats?.total_organizations ?? 0;
    const max = Math.max(patients, doctors, orgs, 1);
    return [
      { label: 'Patients', value: patients, pct: Math.max(12, (patients / max) * 100) },
      { label: 'Doctors', value: doctors, pct: Math.max(12, (doctors / max) * 100) },
      { label: 'Orgs', value: orgs, pct: Math.max(12, (orgs / max) * 100) },
    ];
  }

  get orgSlices(): Array<{ label: string; count: number; color: string }> {
    const map = new Map<string, number>();
    for (const o of this.orgs) {
      map.set(o.organization_type, (map.get(o.organization_type) || 0) + 1);
    }
    return [...map.entries()].map(([label, count], i) => ({
      label,
      count,
      color: this.palette[i % this.palette.length],
    }));
  }

  get donutGradient(): string {
    const slices = this.orgSlices;
    const total = slices.reduce((s, x) => s + x.count, 0) || 1;
    if (!slices.length) return 'conic-gradient(#e5ecf5 0 100%)';
    let cursor = 0;
    const parts = slices.map((s) => {
      const start = cursor;
      const end = cursor + (s.count / total) * 100;
      cursor = end;
      return `${s.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  ngOnInit(): void {
    let pending = 4;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.loading = false;
    };

    this.admin.dashboard().subscribe({
      next: (s) => {
        this.stats = s;
        done();
      },
      error: () => {
        this.error = 'Could not load admin dashboard metrics.';
        done();
      },
    });

    this.admin.verifications().subscribe({
      next: (items) => {
        this.orgs = items;
        done();
      },
      error: () => done(),
    });

    this.payments.commissions(false).subscribe({
      next: (items) => {
        this.commissions = items;
        done();
      },
      error: () => done(),
    });

    this.marketplace.categories().subscribe({
      next: (cats) => {
        this.categories = cats;
        done();
      },
      error: () => done(),
    });
  }
}
