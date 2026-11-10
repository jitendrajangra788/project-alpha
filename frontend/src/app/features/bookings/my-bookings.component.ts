import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Booking, BookingService } from '../../core/booking.service';
import { PaymentService } from '../../core/payment.service';
import { VideoService } from '../../core/video.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, MatCardModule, MatButtonModule, MatChipsModule],
  template: `
    <div class="page">
      <h1>My bookings</h1>
      <div class="top">
        <a mat-stroked-button routerLink="/search">Find providers</a>
        <a mat-button routerLink="/my-payments">Payment history</a>
      </div>
      <div class="list">
        @for (b of bookings; track b.id) {
          <mat-card>
            <div class="row">
              <div>
                <h2>{{ b.listing_name || 'Provider' }}</h2>
                <p>{{ b.booking_number }} · {{ b.booking_type.replaceAll('_', ' ') }}</p>
                <p>{{ b.scheduled_date | date }} · {{ b.start_time.slice(0, 5) }} - {{ b.end_time.slice(0, 5) }}</p>
                @if (b.amount != null) {
                  <p>{{ b.amount | currency: 'INR':'symbol':'1.0-0' }} · {{ b.payment_status }}</p>
                }
              </div>
              <mat-chip-set>
                <mat-chip>{{ b.status }}</mat-chip>
                @if (b.is_online) { <mat-chip>Online</mat-chip> }
              </mat-chip-set>
            </div>
            <div class="actions">
              @if (canPay(b)) {
                <button
                  mat-flat-button
                  color="accent"
                  type="button"
                  [disabled]="payingId === b.id"
                  (click)="pay(b)"
                >
                  {{ payingId === b.id ? 'Paying…' : 'Pay now' }}
                </button>
              }
              @if (canJoinVideo(b)) {
                <button mat-flat-button color="primary" type="button" (click)="startVideo(b)">Join video</button>
              }
              @if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
                <button mat-button color="warn" type="button" (click)="cancel(b)">Cancel</button>
              }
            </div>
          </mat-card>
        } @empty {
          <mat-card><p>No bookings yet.</p></mat-card>
        }
      </div>
      @if (message) { <p class="ok">{{ message }}</p> }
      @if (error) { <p class="error">{{ error }}</p> }
    </div>
  `,
  styles: `
    .page { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
    .top { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .list { display: grid; gap: 1rem; margin-top: 1rem; }
    mat-card { padding: 1rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    h2 { margin: 0; color: #134e4a; }
    .error { color: #b91c1c; }
    .ok { color: #047857; }
  `,
})
export class MyBookingsComponent implements OnInit {
  private readonly api = inject(BookingService);
  private readonly payments = inject(PaymentService);
  private readonly video = inject(VideoService);
  private readonly router = inject(Router);
  bookings: Booking[] = [];
  error = '';
  message = '';
  payingId = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.mine().subscribe({ next: (items) => (this.bookings = items) });
  }

  canPay(b: Booking): boolean {
    return (
      !!b.amount &&
      b.amount > 0 &&
      ['UNPAID', 'PENDING', 'FAILED'].includes(b.payment_status) &&
      !['CANCELLED', 'REJECTED', 'REFUNDED'].includes(b.status)
    );
  }

  canJoinVideo(b: Booking): boolean {
    return (
      b.is_online &&
      ['PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'].includes(b.status)
    );
  }

  pay(booking: Booking): void {
    this.error = '';
    this.message = '';
    this.payingId = booking.id;
    this.payments.createBookingOrder(booking.id).subscribe({
      next: (order) => {
        if (order.mock) {
          this.payments.mockComplete(order.payment.id).subscribe({
            next: () => {
              this.message = `Paid ${order.payment.payment_number}`;
              this.payingId = '';
              this.reload();
            },
            error: (err) => {
              this.error = err?.error?.detail || 'Payment failed';
              this.payingId = '';
            },
          });
        } else {
          this.message = 'Use Razorpay checkout with the created order (live mode).';
          this.payingId = '';
        }
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Could not start payment';
        this.payingId = '';
      },
    });
  }

  startVideo(booking: Booking): void {
    this.error = '';
    this.video.createSession(booking.id).subscribe({
      next: (session) => void this.router.navigate(['/video', session.id]),
      error: (err) => (this.error = err?.error?.detail || 'Could not start video session'),
    });
  }

  cancel(booking: Booking): void {
    this.api.cancel(booking.id, 'Cancelled by patient').subscribe({ next: () => this.reload() });
  }
}
