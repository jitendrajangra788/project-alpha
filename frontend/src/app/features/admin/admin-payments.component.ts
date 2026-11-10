import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Commission, PaymentService, Payout } from '../../core/payment.service';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatCardModule, MatButtonModule, MatChipsModule],
  template: `
    <h1>Payments & commissions</h1>
    <p class="muted">Unsettled provider earnings and payout history.</p>

    <div class="grid">
      @for (c of commissions; track c.id) {
        <mat-card>
          <h3>Commission</h3>
          <p>Gross {{ c.gross_amount | currency: 'INR':'symbol':'1.0-0' }}</p>
          <p>Platform {{ c.commission_amount | currency: 'INR':'symbol':'1.0-0' }} ({{ c.commission_percent }}%)</p>
          <p>Provider {{ c.provider_amount | currency: 'INR':'symbol':'1.0-0' }}</p>
          <mat-chip-set>
            <mat-chip>{{ c.is_settled ? 'SETTLED' : 'UNSETTLED' }}</mat-chip>
          </mat-chip-set>
          @if (!c.is_settled) {
            <button mat-flat-button color="primary" type="button" (click)="settle(c)">Mark payout</button>
          }
        </mat-card>
      } @empty {
        <mat-card><p>No commissions yet.</p></mat-card>
      }
    </div>

    <h2>Recent payouts</h2>
    <div class="grid">
      @for (p of payouts; track p.id) {
        <mat-card>
          <h3>{{ p.payout_number }}</h3>
          <p>{{ p.amount | currency: 'INR':'symbol':'1.0-0' }} · {{ p.status }}</p>
          <p>{{ p.paid_at || p.created_at | date: 'medium' }}</p>
        </mat-card>
      } @empty {
        <mat-card><p>No payouts yet.</p></mat-card>
      }
    </div>
    @if (message) { <p class="ok">{{ message }}</p> }
    @if (error) { <p class="error">{{ error }}</p> }
  `,
  styles: `
    .muted { color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin: 1rem 0 2rem; }
    mat-card { padding: 1rem; display: grid; gap: 0.35rem; }
    h3 { margin: 0; color: #0f766e; }
    button { margin-top: 0.5rem; justify-self: start; }
    .ok { color: #047857; }
    .error { color: #b91c1c; }
  `,
})
export class AdminPaymentsComponent implements OnInit {
  private readonly api = inject(PaymentService);
  commissions: Commission[] = [];
  payouts: Payout[] = [];
  message = '';
  error = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.commissions(false).subscribe({ next: (items) => (this.commissions = items) });
    this.api.payouts().subscribe({ next: (items) => (this.payouts = items) });
  }

  settle(c: Commission): void {
    this.error = '';
    this.message = '';
    const payload: Record<string, unknown> = {
      settle_commission_ids: [c.id],
      amount: c.provider_amount,
    };
    if (c.organization_id) payload['organization_id'] = c.organization_id;
    if (c.doctor_id) payload['doctor_id'] = c.doctor_id;
    this.api.createPayout(payload).subscribe({
      next: () => {
        this.message = 'Payout recorded';
        this.reload();
      },
      error: (err) => (this.error = err?.error?.detail || 'Payout failed'),
    });
  }
}
