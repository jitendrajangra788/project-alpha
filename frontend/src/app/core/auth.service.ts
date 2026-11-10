import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, TokenPair, User } from './models';

const ACCESS_KEY = 'cc_access';
const REFRESH_KEY = 'cc_refresh';
const USER_KEY = 'cc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(this.readUser());
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal() && !!this.getAccessToken());
  readonly roles = computed(() => this.userSignal()?.roles ?? []);

  login(identifier: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, { identifier, password })
      .pipe(tap((res) => this.persist(res)));
  }

  registerPatient(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/register/patient`, payload)
      .pipe(tap((res) => this.persist(res)));
  }

  registerDoctor(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/register/doctor`, payload)
      .pipe(tap((res) => this.persist(res)));
  }

  requestOtp(mobile: string, purpose = 'login') {
    return this.http.post<{ message: string; expires_in?: number; channel?: string; dev_otp?: string }>(
      `${environment.apiBaseUrl}/auth/otp/request`,
      { mobile, purpose }
    );
  }

  verifyOtp(mobile: string, otp: string, purpose = 'login') {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/otp/verify`, {
      mobile,
      otp,
      purpose,
    });
  }

  forgotPassword(mobile: string) {
    return this.http.post<{ message: string; expires_in?: number; channel?: string; dev_otp?: string }>(
      `${environment.apiBaseUrl}/auth/password/forgot`,
      { mobile }
    );
  }

  resetPassword(mobile: string, otp: string, new_password: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/password/reset`, {
      mobile,
      otp,
      new_password,
    });
  }

  refresh(): Observable<TokenPair> {
    const refresh_token = this.getRefreshToken();
    return this.http
      .post<TokenPair>(`${environment.apiBaseUrl}/auth/refresh`, { refresh_token })
      .pipe(
        tap((tokens) => {
          localStorage.setItem(ACCESS_KEY, tokens.access_token);
          localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
        })
      );
  }

  logout(): void {
    const refresh_token = this.getRefreshToken();
    if (refresh_token) {
      this.http.post(`${environment.apiBaseUrl}/auth/logout`, { refresh_token }).subscribe({
        error: () => undefined,
      });
    }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
    void this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.roles().some((r) => roles.includes(r));
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, res.tokens.access_token);
    localStorage.setItem(REFRESH_KEY, res.tokens.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.userSignal.set(res.user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
