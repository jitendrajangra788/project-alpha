import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Payment, PaymentService } from '../../core/payment.service';

@Component({
  selector: 'app-my-payments',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatCardModule, MatChipsModule],
  template: `
    <div class="page">
      <h1>My payments</h1>
      <div class="list">
        @for (p of payments; track p.id) {
          <mat-card>
            <div class="row">
              <div>
                <h2>{{ p.payment_number }}</h2>
                <p>{{ p.purpose.replaceAll('_', ' ') }} · {{ p.created_at | date: 'medium' }}</p>
                <p>{{ p.amount | currency: 'INR':'symbol':'1.0-0' }}</p>
              </div>
              <mat-chip-set>
                <mat-chip>{{ p.status }}</mat-chip>
              </mat-chip-set>
            </div>
          </mat-card>
        } @empty {
          <mat-card><p>No payments yet.</p></mat-card>
        }
      </div>
    </div>
  `,
  styles: `
    .page { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
    .list { display: grid; gap: 1rem; margin-top: 1rem; }
    mat-card { padding: 1rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; }
    h2 { margin: 0; color: #134e4a; }
  `,
})
export class MyPaymentsComponent implements OnInit {
  private readonly api = inject(PaymentService);
  payments: Payment[] = [];

  ngOnInit(): void {
    this.api.mine().subscribe({ next: (items) => (this.payments = items) });
  }
}
