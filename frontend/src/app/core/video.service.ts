import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface VideoSession {
  id: string;
  booking_id: string;
  patient_id: string;
  doctor_id: string;
  room_code: string;
  status: string;
  notes?: string | null;
}

export interface VideoJoinInfo {
  session_id: string;
  room_code: string;
  role: string;
  access_token: string;
  expires_in: number;
  ice_servers: Array<{ urls: string | string[] }>;
  signaling_url: string;
  provider: string;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/video`;

  createSession(bookingId: string) {
    return this.http.post<VideoSession>(`${this.base}/sessions`, { booking_id: bookingId });
  }

  mine() {
    return this.http.get<VideoSession[]>(`${this.base}/sessions/me`);
  }

  get(sessionId: string) {
    return this.http.get<VideoSession>(`${this.base}/sessions/${sessionId}`);
  }

  join(sessionId: string) {
    return this.http.post<VideoJoinInfo>(`${this.base}/sessions/${sessionId}/join`, {});
  }

  end(sessionId: string, payload: Record<string, unknown> = {}) {
    return this.http.post<VideoSession>(`${this.base}/sessions/${sessionId}/end`, payload);
  }

  signalingWsUrl(signalingPath: string, roomToken: string): string {
    const api = new URL(environment.apiBaseUrl);
    const wsProtocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${api.host}${signalingPath}?token=${encodeURIComponent(roomToken)}`;
  }
}
