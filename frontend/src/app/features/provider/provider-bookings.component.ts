import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Booking, BookingService } from '../../core/booking.service';
import { VideoService } from '../../core/video.service';

@Component({
  selector: 'app-provider-bookings',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatButtonModule, MatChipsModule],
  template: `
    <h1>Booking management</h1>
    <p>Confirm, reject or complete patient bookings for your listings.</p>
    <div class="list">
      @for (b of bookings; track b.id) {
        <mat-card>
          <div class="row">
            <div>
              <h2>{{ b.listing_name || 'Listing' }}</h2>
              <p>{{ b.booking_number }} · {{ b.scheduled_date | date }} · {{ b.start_time.slice(0, 5) }}</p>
              <p>{{ b.service_name }} · {{ b.booking_type.replaceAll('_', ' ') }}</p>
            </div>
            <mat-chip>{{ b.status }}</mat-chip>
          </div>
          <div class="actions">
            @if (b.status === 'PENDING') {
              <button mat-flat-button color="primary" type="button" (click)="act(b, 'CONFIRMED')">Confirm</button>
              <button mat-stroked-button color="warn" type="button" (click)="act(b, 'REJECTED')">Reject</button>
            }
            @if (b.is_online && ['PENDING','CONFIRMED','ASSIGNED','IN_PROGRESS'].includes(b.status)) {
              <button mat-stroked-button color="primary" type="button" (click)="startVideo(b)">Start video</button>
            }
            @if (b.status === 'CONFIRMED' || b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS') {
              <button mat-flat-button color="accent" type="button" (click)="act(b, 'COMPLETED')">Complete</button>
            }
          </div>
        </mat-card>
      } @empty {
        <mat-card><p>No provider bookings yet.</p></mat-card>
      }
    </div>
    @if (error) { <p class="error">{{ error }}</p> }
  `,
  styles: `
    .list { display: grid; gap: 1rem; margin-top: 1rem; }
    mat-card { padding: 1rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
    h2 { margin: 0; color: #134e4a; }
    .error { color: #b91c1c; }
  `,
})
export class ProviderBookingsComponent implements OnInit {
  private readonly api = inject(BookingService);
  private readonly video = inject(VideoService);
  private readonly router = inject(Router);
  bookings: Booking[] = [];
  error = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.provider().subscribe({ next: (items) => (this.bookings = items) });
  }

  act(booking: Booking, status: string): void {
    this.api.updateStatus(booking.id, status).subscribe({ next: () => this.reload() });
  }

  startVideo(booking: Booking): void {
    this.error = '';
    this.video.createSession(booking.id).subscribe({
      next: (session) => void this.router.navigate(['/video', session.id]),
      error: (err) => (this.error = err?.error?.detail || 'Could not start video'),
    });
  }
}
