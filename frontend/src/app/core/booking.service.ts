import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Slot {
  id: string;
  listing_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
  capacity: number;
  booked_count: number;
  remaining: number;
}

export interface Availability {
  listing_id: string;
  date: string;
  slots: Slot[];
}

export interface Booking {
  id: string;
  booking_number: string;
  booking_type: string;
  status: string;
  payment_status: string;
  listing_id?: string | null;
  listing_name?: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service_name?: string | null;
  amount?: number | null;
  is_home_service: boolean;
  is_online: boolean;
  patient_notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/bookings`;

  availability(listingId: string, date: string) {
    const params = new HttpParams().set('date', date);
    return this.http.get<Availability>(`${this.base}/availability/${listingId}`, { params });
  }

  create(payload: Record<string, unknown>) {
    return this.http.post<Booking>(this.base, payload);
  }

  mine() {
    return this.http.get<Booking[]>(`${this.base}/me`);
  }

  provider() {
    return this.http.get<Booking[]>(`${this.base}/provider`);
  }

  cancel(id: string, reason?: string) {
    const params = reason ? new HttpParams().set('reason', reason) : undefined;
    return this.http.post<Booking>(`${this.base}/${id}/cancel`, {}, { params });
  }

  updateStatus(id: string, status: string, note?: string, asProvider = true) {
    const params = new HttpParams().set('as_provider', String(asProvider));
    return this.http.post<Booking>(`${this.base}/${id}/status`, { status, note }, { params });
  }
}
