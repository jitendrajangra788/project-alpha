import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClinicalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/clinical`;

  patientDashboard() {
    return this.http.get<any>(`${this.base}/patient/dashboard`);
  }

  myPatientId() {
    return this.http.get<{ patient_id: string }>(`${this.base}/patient/me/id`);
  }

  consents() {
    return this.http.get<any[]>(`${this.base}/consents`);
  }

  createConsent(payload: Record<string, unknown>) {
    return this.http.post(`${this.base}/consents`, payload);
  }

  revokeConsent(id: string) {
    return this.http.post(`${this.base}/consents/${id}/revoke`, {});
  }

  prescriptions(patientId?: string) {
    let params = new HttpParams();
    if (patientId) params = params.set('patient_id', patientId);
    return this.http.get<any[]>(`${this.base}/prescriptions`, { params });
  }

  createPrescription(payload: Record<string, unknown>) {
    return this.http.post(`${this.base}/prescriptions`, payload);
  }

  timeline(patientId: string) {
    return this.http.get<any[]>(`${this.base}/timeline/${patientId}`);
  }

  myLabReports() {
    return this.http.get<any[]>(`${this.base}/lab-reports/me`);
  }

  patientLabReports(patientId: string) {
    return this.http.get<any[]>(`${this.base}/lab-reports/patient/${patientId}`);
  }

  orgLabReports(orgId: string) {
    return this.http.get<any[]>(`${this.base}/lab-reports/org/${orgId}`);
  }

  createLabReport(payload: Record<string, unknown>) {
    return this.http.post(`${this.base}/lab-reports`, payload);
  }

  submitLabReport(id: string) {
    return this.http.post(`${this.base}/lab-reports/${id}/submit`, {});
  }

  publishLabReport(id: string) {
    return this.http.post(`${this.base}/lab-reports/${id}/publish`, {});
  }

  createLabTest(orgId: string, payload: Record<string, unknown>) {
    return this.http.post(`${this.base}/labs/${orgId}/tests`, payload);
  }

  listLabTests(orgId: string) {
    return this.http.get<any[]>(`${this.base}/labs/${orgId}/tests`);
  }
}
