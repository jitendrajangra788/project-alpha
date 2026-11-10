import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/auth.service';
import {
  EarningsSummary,
  OrgSubscription,
  PaymentService,
  SubscriptionPlan,
} from '../../core/payment.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface OrgBrief {
  id: string;
  name: string;
}

@Component({
  selector: 'app-provider-billing',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatCardModule, MatButtonModule, MatChipsModule],
  template: `
    <h1>Billing & subscriptions</h1>

    <div class="stats">
      <mat-card>
        <h3>Gross collected</h3>
        <p>{{ earnings?.gross_collected || 0 | currency: 'INR':'symbol':'1.0-0' }}</p>
      </mat-card>
      <mat-card>
        <h3>Your earnings</h3>
        <p>{{ earnings?.provider_earnings || 0 | currency: 'INR':'symbol':'1.0-0' }}</p>
      </mat-card>
      <mat-card>
        <h3>Unsettled</h3>
        <p>{{ earnings?.unsettled_amount || 0 | currency: 'INR':'symbol':'1.0-0' }}</p>
      </mat-card>
      <mat-card>
        <h3>Platform commission</h3>
        <p>{{ earnings?.commission_total || 0 | currency: 'INR':'symbol':'1.0-0' }}</p>
      </mat-card>
    </div>

    @if (orgs.length) {
      <label>
        Organization
        <select [value]="selectedOrgId" (change)="onOrgChange($event)">
          @for (o of orgs; track o.id) {
            <option [value]="o.id">{{ o.name }}</option>
          }
        </select>
      </label>
    }

    <h2>Plans</h2>
    <div class="plans">
      @for (plan of plans; track plan.id) {
        <mat-card>
          <h3>{{ plan.name }}</h3>
          <p class="price">{{ plan.price_monthly | currency: 'INR':'symbol':'1.0-0' }}/mo</p>
          <p>{{ plan.description }}</p>
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="!selectedOrgId || paying"
            (click)="subscribe(plan)"
          >
            Subscribe
          </button>
        </mat-card>
      }
    </div>

    <h2>Active subscriptions</h2>
    <div class="list">
      @for (s of subscriptions; track s.id) {
        <mat-card>
          <div class="row">
            <div>
              <h3>{{ s.plan_name || s.plan_code }}</h3>
              <p>{{ s.starts_at | date }} – {{ s.ends_at | date }}</p>
            </div>
            <mat-chip>{{ s.status }}</mat-chip>
          </div>
        </mat-card>
      } @empty {
        <mat-card><p>No subscriptions yet.</p></mat-card>
      }
    </div>

    @if (message) { <p class="ok">{{ message }}</p> }
    @if (error) { <p class="error">{{ error }}</p> }
  `,
  styles: `
    .stats, .plans { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    mat-card { padding: 1rem; }
    h3 { margin: 0; color: #0f766e; }
    .price { font-size: 1.4rem; font-weight: 700; margin: 0.35rem 0; }
    label { display: grid; gap: 0.35rem; max-width: 320px; margin-bottom: 1rem; }
    select { padding: 0.5rem; border-radius: 8px; border: 1px solid #cbd5e1; }
    .list { display: grid; gap: 0.75rem; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .ok { color: #047857; }
    .error { color: #b91c1c; }
  `,
})
export class ProviderBillingComponent implements OnInit {
  private readonly payments = inject(PaymentService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  orgs: OrgBrief[] = [];
  selectedOrgId = '';
  plans: SubscriptionPlan[] = [];
  subscriptions: OrgSubscription[] = [];
  earnings: EarningsSummary | null = null;
  paying = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.payments.plans().subscribe({ next: (plans) => (this.plans = plans) });
    this.payments.earnings().subscribe({ next: (e) => (this.earnings = e) });
    this.http.get<OrgBrief[]>(`${environment.apiBaseUrl}/organizations/me`).subscribe({
      next: (orgs) => {
        this.orgs = orgs;
        if (orgs.length) {
          this.selectedOrgId = orgs[0].id;
          this.loadSubs();
        }
      },
    });
  }

  onOrgChange(event: Event): void {
    this.selectedOrgId = (event.target as HTMLSelectElement).value;
    this.loadSubs();
  }

  loadSubs(): void {
    if (!this.selectedOrgId) return;
    this.payments.orgSubscriptions(this.selectedOrgId).subscribe({
      next: (items) => (this.subscriptions = items),
    });
  }

  subscribe(plan: SubscriptionPlan): void {
    if (!this.selectedOrgId) return;
    this.paying = true;
    this.error = '';
    this.message = '';
    this.payments.subscribe(this.selectedOrgId, plan.id).subscribe({
      next: (order) => {
        if (order.mock) {
          this.payments.mockComplete(order.payment.id).subscribe({
            next: () => {
              this.message = `Subscribed to ${plan.name}`;
              this.paying = false;
              this.loadSubs();
              this.payments.earnings().subscribe({ next: (e) => (this.earnings = e) });
            },
            error: (err) => {
              this.error = err?.error?.detail || 'Payment failed';
              this.paying = false;
            },
          });
        } else {
          this.message = 'Complete Razorpay checkout with the returned order (live keys configured).';
          this.paying = false;
        }
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Could not start subscription';
        this.paying = false;
      },
    });
  }
}
