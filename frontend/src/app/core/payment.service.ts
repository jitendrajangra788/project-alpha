import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Payment {
  id: string;
  payment_number: string;
  purpose: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  commission_percent: number;
  commission_amount: number;
  provider_amount: number;
  booking_id?: string | null;
  organization_id?: string | null;
  doctor_id?: string | null;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface PaymentOrder {
  payment: Payment;
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  mock: boolean;
  checkout_hint: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price_monthly: number;
  currency: string;
  features_json?: string | null;
  featured_listings: number;
  is_active: boolean;
}

export interface OrgSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  plan_code?: string | null;
  plan_name?: string | null;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  auto_renew: boolean;
}

export interface EarningsSummary {
  gross_collected: number;
  commission_total: number;
  provider_earnings: number;
  unsettled_amount: number;
  currency: string;
}

export interface Commission {
  id: string;
  payment_id: string;
  booking_id?: string | null;
  organization_id?: string | null;
  doctor_id?: string | null;
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  provider_amount: number;
  is_settled: boolean;
  payout_id?: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  payout_number: string;
  organization_id?: string | null;
  doctor_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at?: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/payments`;
  private readonly subs = `${environment.apiBaseUrl}/subscriptions`;

  createBookingOrder(bookingId: string) {
    return this.http.post<PaymentOrder>(`${this.base}/orders`, { booking_id: bookingId });
  }

  mockComplete(paymentId: string) {
    return this.http.post<Payment>(`${this.base}/${paymentId}/mock-complete`, {});
  }

  verify(payload: {
    payment_id: string;
    provider_order_id: string;
    provider_payment_id: string;
    provider_signature: string;
  }) {
    return this.http.post<Payment>(`${this.base}/verify`, payload);
  }

  mine() {
    return this.http.get<Payment[]>(`${this.base}/me`);
  }

  invoice(paymentId: string) {
    return this.http.get(`${this.base}/${paymentId}/invoice`);
  }

  plans() {
    return this.http.get<SubscriptionPlan[]>(`${this.subs}/plans`);
  }

  subscribe(organizationId: string, planId: string) {
    return this.http.post<PaymentOrder>(`${this.subs}/subscribe`, {
      organization_id: organizationId,
      plan_id: planId,
    });
  }

  orgSubscriptions(organizationId: string) {
    return this.http.get<OrgSubscription[]>(`${this.subs}/organizations/${organizationId}`);
  }

  earnings(organizationId?: string, doctorId?: string) {
    let params = new HttpParams();
    if (organizationId) params = params.set('organization_id', organizationId);
    if (doctorId) params = params.set('doctor_id', doctorId);
    return this.http.get<EarningsSummary>(`${this.base}/earnings`, { params });
  }

  commissions(unsettledOnly = false) {
    const params = new HttpParams().set('unsettled_only', String(unsettledOnly));
    return this.http.get<Commission[]>(`${this.base}/commissions`, { params });
  }

  createPayout(payload: Record<string, unknown>) {
    return this.http.post<Payout>(`${this.base}/payouts`, payload);
  }

  payouts() {
    return this.http.get<Payout[]>(`${this.base}/payouts`);
  }
}
