import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth.service';
import { BookingService, Slot } from '../../core/booking.service';
import { ListingDetail, MarketplaceService } from '../../core/marketplace.service';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/search">← Back</a>
      @if (listing) {
        <mat-card>
          <h1>Book {{ listing.name }}</h1>
          <p>{{ listing.city }} · {{ listing.listing_type.replaceAll('_', ' ') }}</p>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="scheduled_date" (change)="loadSlots()" />
            </mat-form-field>

            <div class="slots">
              @for (slot of openSlots; track slot.id) {
                <button
                  type="button"
                  class="slot"
                  [class.active]="selectedSlot?.id === slot.id"
                  (click)="selectSlot(slot)"
                >
                  {{ slot.start_time.slice(0, 5) }} - {{ slot.end_time.slice(0, 5) }}
                </button>
              } @empty {
                <p>No open slots for this date.</p>
              }
            </div>

            <mat-checkbox formControlName="is_online" [disabled]="!listing.online_consultation_available">
              Online / video consultation
            </mat-checkbox>
            <mat-checkbox formControlName="is_home_service" [disabled]="!(listing.home_visit_available || listing.sample_collection_available)">
              Home visit / sample collection
            </mat-checkbox>

            @if (form.value.is_home_service) {
              <mat-form-field appearance="outline" class="full">
                <mat-label>Home address</mat-label>
                <input matInput formControlName="address_line" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>City</mat-label>
                <input matInput formControlName="city" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>PIN code</mat-label>
                <input matInput formControlName="pin_code" />
              </mat-form-field>
            }

            <mat-form-field appearance="outline" class="full">
              <mat-label>Notes for provider</mat-label>
              <textarea matInput rows="3" formControlName="patient_notes"></textarea>
            </mat-form-field>

            @if (error) { <p class="error">{{ error }}</p> }
            @if (success) { <p class="ok">{{ success }} <a routerLink="/my-bookings">View my bookings</a></p> }

            <button mat-flat-button color="primary" [disabled]="!selectedSlot || loading || form.invalid">
              {{ loading ? 'Booking...' : 'Confirm booking' }}
            </button>
          </form>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .page { max-width: 720px; margin: 0 auto; padding: 1.5rem; }
    mat-card { padding: 1.25rem; }
    .full { width: 100%; display: block; margin: 0.5rem 0; }
    .slots { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0 1rem; }
    .slot { border: 1px solid #99f6e4; background: #f0fdfa; border-radius: 999px; padding: 0.45rem 0.8rem; cursor: pointer; }
    .slot.active { background: #0f766e; color: white; border-color: #0f766e; }
    .error { color: #b91c1c; }
    .ok { color: #0f766e; }
  `,
})
export class BookComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly bookings = inject(BookingService);
  private readonly marketplace = inject(MarketplaceService);

  listing: ListingDetail | null = null;
  openSlots: Slot[] = [];
  selectedSlot: Slot | null = null;
  loading = false;
  error = '';
  success = '';

  readonly form = this.fb.nonNullable.group({
    scheduled_date: [this.tomorrow(), Validators.required],
    is_online: [false],
    is_home_service: [false],
    address_line: [''],
    city: [''],
    pin_code: [''],
    patient_notes: [''],
  });

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;
    this.marketplace.listing(slug).subscribe({
      next: (listing) => {
        this.listing = listing;
        this.form.patchValue({ city: listing.city, pin_code: listing.pin_code });
        this.loadSlots();
      },
    });
  }

  loadSlots(): void {
    if (!this.listing) return;
    this.selectedSlot = null;
    const day = this.form.value.scheduled_date!;
    this.bookings.availability(this.listing.id, day).subscribe({
      next: (res) => {
        this.openSlots = res.slots.filter((s) => s.remaining > 0 && s.status !== 'BLOCKED');
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Could not load slots';
        this.openSlots = [];
      },
    });
  }

  selectSlot(slot: Slot): void {
    this.selectedSlot = slot;
  }

  submit(): void {
    if (!this.listing || !this.selectedSlot) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    const raw = this.form.getRawValue();
    this.bookings
      .create({
        listing_id: this.listing.id,
        slot_id: this.selectedSlot.id,
        scheduled_date: raw.scheduled_date,
        start_time: this.selectedSlot.start_time,
        end_time: this.selectedSlot.end_time,
        is_online: raw.is_online,
        is_home_service: raw.is_home_service,
        address_line: raw.address_line || null,
        city: raw.city || null,
        pin_code: raw.pin_code || null,
        patient_notes: raw.patient_notes || null,
      })
      .subscribe({
        next: (booking) => {
          this.loading = false;
          this.success = `Booked ${booking.booking_number} (${booking.status}).`;
          this.loadSlots();
        },
        error: (err) => {
          this.loading = false;
          this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Booking failed';
        },
      });
  }

  private tomorrow(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
}
