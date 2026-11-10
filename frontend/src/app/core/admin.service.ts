import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AdminDashboard, Organization, User } from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  dashboard() {
    return this.http.get<AdminDashboard>(`${environment.apiBaseUrl}/admin/dashboard`);
  }

  users(page = 1, pageSize = 20) {
    const params = new HttpParams().set('page', page).set('page_size', pageSize);
    return this.http.get<{ items: User[]; total: number; page: number; page_size: number }>(
      `${environment.apiBaseUrl}/admin/users`,
      { params }
    );
  }

  verifications(status?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Organization[]>(`${environment.apiBaseUrl}/admin/verifications`, { params });
  }

  setVerification(orgId: string, status: string, notes?: string, requested_documents?: string) {
    return this.http.post<Organization>(
      `${environment.apiBaseUrl}/organizations/${orgId}/verification`,
      { status, notes, requested_documents }
    );
  }
}
