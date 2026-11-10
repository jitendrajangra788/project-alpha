import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlatformSettings } from './models';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  readonly settings = signal<PlatformSettings>({
    brand_name: 'CareConnect',
    tagline: 'Find the right healthcare, all in one place',
  });

  load() {
    return this.http.get<PlatformSettings>(`${environment.apiBaseUrl}/platform-settings`).pipe(
      tap((s) => this.settings.set(s))
    );
  }

  update(payload: Partial<PlatformSettings>) {
    return this.http
      .patch<PlatformSettings>(`${environment.apiBaseUrl}/platform-settings`, payload)
      .pipe(tap((s) => this.settings.set(s)));
  }
}
