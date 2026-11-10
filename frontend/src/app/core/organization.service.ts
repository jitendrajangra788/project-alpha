import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Organization } from './models';

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  email?: string | null;
  membership_role: string;
  is_active: boolean;
  user_is_active: boolean;
}

export interface OrgLocation {
  id: string;
  organization_id: string;
  name: string;
  address_line: string;
  city: string;
  pin_code: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_primary: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/organizations`;

  create(payload: Record<string, unknown>) {
    return this.http.post<Organization>(this.base, payload);
  }

  mine() {
    return this.http.get<Organization[]>(`${this.base}/me`);
  }

  get(id: string) {
    return this.http.get<Organization>(`${this.base}/${id}`);
  }

  update(id: string, payload: Record<string, unknown>) {
    return this.http.patch<Organization>(`${this.base}/${id}`, payload);
  }

  uploadDocument(orgId: string, documentType: string, file: File) {
    const form = new FormData();
    form.append('document_type', documentType);
    form.append('file', file);
    return this.http.post<Organization>(`${this.base}/${orgId}/documents`, form);
  }

  submitVerification(orgId: string) {
    return this.http.post<Organization>(`${this.base}/${orgId}/submit-verification`, {});
  }

  listMembers(orgId: string, role?: string) {
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    return this.http.get<OrgMember[]>(`${this.base}/${orgId}/members`, { params });
  }

  addMember(orgId: string, payload: Record<string, unknown>) {
    return this.http.post<OrgMember>(`${this.base}/${orgId}/members`, payload);
  }

  updateMember(orgId: string, memberId: string, payload: Record<string, unknown>) {
    return this.http.patch<OrgMember>(`${this.base}/${orgId}/members/${memberId}`, payload);
  }

  removeMember(orgId: string, memberId: string) {
    return this.http.delete<void>(`${this.base}/${orgId}/members/${memberId}`);
  }

  listLocations(orgId: string) {
    return this.http.get<OrgLocation[]>(`${this.base}/${orgId}/locations`);
  }

  addLocation(orgId: string, payload: Record<string, unknown>) {
    return this.http.post<OrgLocation>(`${this.base}/${orgId}/locations`, payload);
  }

  updateLocation(orgId: string, locationId: string, payload: Record<string, unknown>) {
    return this.http.patch<OrgLocation>(`${this.base}/${orgId}/locations/${locationId}`, payload);
  }

  deleteLocation(orgId: string, locationId: string) {
    return this.http.delete<void>(`${this.base}/${orgId}/locations/${locationId}`);
  }
}
