import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ClinicalService } from '../../core/clinical.service';
import { VideoJoinInfo, VideoService, VideoSession } from '../../core/video.service';

interface ChatMessage {
  id: string;
  text: string;
  fromRole: string;
  mine: boolean;
  at: Date;
}

@Component({
  selector: 'app-video-consult',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, DatePipe],
  template: `
    <div class="page">
      <header class="top">
        <div>
          <a class="back" [routerLink]="backLink">← Back</a>
          <h1>Video consultation</h1>
          <p class="meta">
            Room {{ joinInfo?.room_code || '…' }}
            · Role: {{ joinInfo?.role || '…' }}
            · <span class="status" [class.live]="status === 'live'" [class.ended]="status === 'ended'">{{ status }}</span>
          </p>
        </div>
        <div class="top-actions">
          <button type="button" class="chip" [class.on]="sidePanel === 'chat'" (click)="sidePanel = 'chat'">Chat</button>
          <button type="button" class="chip" [class.on]="sidePanel === 'reports'" (click)="sidePanel = 'reports'">Reports</button>
          @if (joinInfo?.role === 'doctor') {
            <button type="button" class="chip" [class.on]="sidePanel === 'notes'" (click)="sidePanel = 'notes'">Notes</button>
          }
        </div>
      </header>

      @if (message && status === 'error') {
        <div class="banner error">{{ message }}</div>
      }

      <div class="workspace" [class.panel-open]="sidePanel">
        <section class="stage">
          <div class="remote pane">
            <video #remoteVideo autoplay playsinline></video>
            <span class="tag">{{ remoteLabel }}</span>
            @if (status !== 'live' && status !== 'ended') {
              <div class="waiting">
                <p>{{ waitingText }}</p>
              </div>
            }
          </div>
          <div class="local pane">
            <video #localVideo autoplay playsinline muted></video>
            <span class="tag">You</span>
          </div>

          <div class="controls">
            <button type="button" class="ctrl" (click)="toggleMute()">{{ muted ? 'Unmute' : 'Mute' }}</button>
            <button type="button" class="ctrl" (click)="toggleCamera()">{{ cameraOff ? 'Camera on' : 'Camera off' }}</button>
            <button type="button" class="ctrl" (click)="sidePanel = 'chat'">Chat</button>
            <button type="button" class="ctrl" (click)="sidePanel = 'reports'">Reports</button>
            <button type="button" class="ctrl end" (click)="hangup()" [disabled]="status === 'ended'">End</button>
          </div>

          @if (status === 'ended') {
            <p class="ended-msg">{{ message || 'Consultation ended.' }}</p>
          }
        </section>

        <aside class="side">
          @if (sidePanel === 'chat') {
            <div class="side-head">
              <h2>In-call chat</h2>
              <button type="button" class="close" (click)="sidePanel = null">✕</button>
            </div>
            <div class="chat-log" #chatLog>
              @for (m of chat; track m.id) {
                <div class="bubble" [class.mine]="m.mine">
                  <small>{{ m.mine ? 'You' : m.fromRole }} · {{ m.at | date: 'shortTime' }}</small>
                  <p>{{ m.text }}</p>
                </div>
              } @empty {
                <p class="empty">Say hello — messages stay in this live session.</p>
              }
            </div>
            <form class="chat-form" (ngSubmit)="sendChat()">
              <input [(ngModel)]="chatDraft" name="chatDraft" placeholder="Type a message…" [disabled]="status === 'ended' || status === 'error'" />
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="!chatDraft.trim() || status === 'ended'">Send</button>
            </form>
          }

          @if (sidePanel === 'reports') {
            <div class="side-head">
              <h2>{{ joinInfo?.role === 'doctor' ? 'Patient reports' : 'My reports' }}</h2>
              <button type="button" class="close" (click)="sidePanel = null">✕</button>
            </div>
            @if (recordsError) {
              <p class="empty warn">{{ recordsError }}</p>
            } @else if (recordsLoading) {
              <p class="empty">Loading clinical records…</p>
            } @else {
              <div class="reports">
                <h3>Lab reports ({{ labReports.length }})</h3>
                @for (r of labReports; track r.id) {
                  <article>
                    <strong>{{ r.title || 'Lab report' }}</strong>
                    <p>{{ r.status }} · {{ (r.published_at || r.created_at) | date: 'mediumDate' }}</p>
                    <ul>
                      @for (res of (r.results || []).slice(0, 4); track res.id) {
                        <li [class.abnormal]="res.is_abnormal">
                          {{ res.parameter_name }}: {{ res.value }} {{ res.unit }}
                        </li>
                      }
                    </ul>
                  </article>
                } @empty {
                  <p class="empty">No lab reports available.</p>
                }

                <h3>Prescriptions ({{ prescriptions.length }})</h3>
                @for (rx of prescriptions; track rx.id) {
                  <article>
                    <strong>{{ rx.diagnosis || 'Prescription' }}</strong>
                    <p>{{ rx.created_at | date: 'mediumDate' }}</p>
                    <ul>
                      @for (m of (rx.medicines || []).slice(0, 4); track m.id) {
                        <li>{{ m.medicine_name }} — {{ m.dosage }} · {{ m.frequency }}</li>
                      }
                    </ul>
                  </article>
                } @empty {
                  <p class="empty">No prescriptions yet.</p>
                }

                <h3>Timeline</h3>
                @for (e of timeline.slice(0, 8); track e.id) {
                  <article class="compact">
                    <strong>{{ e.title }}</strong>
                    <p>{{ e.event_type }} · {{ e.event_at | date: 'short' }}</p>
                  </article>
                } @empty {
                  <p class="empty">No timeline events.</p>
                }
              </div>
            }
          }

          @if (sidePanel === 'notes' && joinInfo?.role === 'doctor') {
            <div class="side-head">
              <h2>Consultation notes</h2>
              <button type="button" class="close" (click)="sidePanel = null">✕</button>
            </div>
            <form class="notes" [formGroup]="notesForm">
              <label>Diagnosis<input formControlName="diagnosis" placeholder="Optional diagnosis" /></label>
              <label>Notes<textarea formControlName="notes" rows="8" placeholder="Clinical notes for this consult"></textarea></label>
              <p class="hint">Notes are saved when you end the consultation.</p>
            </form>
          }
        </aside>
      </div>
    </div>
  `,
  styles: `
    .page {
      min-height: calc(100vh - var(--cc-header-h));
      background: linear-gradient(180deg, #07111f, #0b1f3a 40%, #08262a);
      color: #e8f1f8;
      padding: 1rem 1.15rem 1.5rem;
    }
    .top {
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: end;
      margin-bottom: 0.9rem;
    }
    .back { color: #9fb4c8; text-decoration: none; font-weight: 650; font-size: 0.88rem; }
    h1 { margin: 0.25rem 0 0; font-family: var(--cc-display); font-size: 1.55rem; color: #fff; }
    .meta { margin: 0.25rem 0 0; color: #9fb4c8; font-size: 0.86rem; }
    .status { text-transform: uppercase; letter-spacing: 0.04em; font-weight: 750; color: #fbbf24; }
    .status.live { color: #34d399; }
    .status.ended { color: #fca5a5; }
    .top-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
    .chip {
      border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06);
      color: #dbe7f0; border-radius: 999px; padding: 0.45rem 0.85rem; font: inherit; font-weight: 650; cursor: pointer;
    }
    .chip.on { background: rgba(20,184,166,0.22); border-color: rgba(20,184,166,0.45); color: #fff; }
    .banner {
      margin-bottom: 0.85rem; padding: 0.75rem 0.9rem; border-radius: 12px;
      background: rgba(185,28,28,0.18); border: 1px solid rgba(252,165,165,0.35); color: #fecaca;
    }

    .workspace {
      display: grid; grid-template-columns: 1fr; gap: 0.9rem; min-height: 70vh;
    }
    .workspace.panel-open { grid-template-columns: minmax(0, 1fr) minmax(300px, 360px); }

    .stage {
      position: relative; border-radius: 22px; overflow: hidden;
      background: #020617; border: 1px solid rgba(255,255,255,0.08);
      min-height: 62vh; display: grid;
    }
    .remote { position: relative; min-height: 62vh; }
    .local {
      position: absolute; right: 1rem; top: 1rem; width: min(220px, 34vw); aspect-ratio: 4/3;
      border-radius: 16px; overflow: hidden; border: 2px solid rgba(255,255,255,0.25);
      box-shadow: 0 12px 30px rgba(0,0,0,0.35); z-index: 3;
    }
    video { width: 100%; height: 100%; object-fit: cover; background: #020617; display: block; }
    .remote video { min-height: 62vh; }
    .tag {
      position: absolute; left: 0.75rem; bottom: 0.75rem; z-index: 2;
      background: rgba(0,0,0,0.55); color: #fff; padding: 0.25rem 0.55rem; border-radius: 8px; font-size: 0.78rem; font-weight: 650;
    }
    .local .tag { left: 0.5rem; bottom: 0.5rem; }
    .waiting {
      position: absolute; inset: 0; display: grid; place-items: center; background: rgba(2,6,23,0.45); z-index: 1;
    }
    .waiting p { margin: 0; color: #cbd5e1; font-weight: 650; }

    .controls {
      position: absolute; left: 50%; bottom: 1rem; transform: translateX(-50%);
      display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; z-index: 4;
      background: rgba(7,17,31,0.72); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; padding: 0.45rem;
    }
    .ctrl {
      border: 0; border-radius: 999px; padding: 0.65rem 0.95rem; font: inherit; font-weight: 700;
      background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
    }
    .ctrl:hover { background: rgba(255,255,255,0.18); }
    .ctrl.end { background: linear-gradient(135deg, #dc2626, #b91c1c); }
    .ctrl:disabled { opacity: 0.5; cursor: not-allowed; }
    .ended-msg { position: absolute; left: 1rem; bottom: 4.5rem; color: #34d399; font-weight: 650; z-index: 4; }

    .side {
      background: rgba(255,255,255,0.96); color: var(--cc-navy);
      border-radius: 20px; border: 1px solid rgba(219,231,240,0.9);
      display: flex; flex-direction: column; min-height: 62vh; overflow: hidden;
      box-shadow: var(--cc-shadow);
    }
    .side-head {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
      padding: 0.95rem 1rem; border-bottom: 1px solid var(--cc-border);
    }
    .side-head h2 { margin: 0; font-size: 1.05rem; }
    .close {
      border: 0; background: var(--cc-sky); width: 32px; height: 32px; border-radius: 10px; cursor: pointer; color: var(--cc-navy);
    }

    .chat-log { flex: 1; overflow: auto; padding: 0.9rem; display: grid; gap: 0.55rem; align-content: start; background: var(--cc-sky-soft); }
    .bubble {
      max-width: 88%; background: white; border: 1px solid var(--cc-border); border-radius: 14px;
      padding: 0.55rem 0.7rem; box-shadow: var(--cc-shadow-sm);
    }
    .bubble.mine { margin-left: auto; background: #ecfeff; border-color: #a5f3fc; }
    .bubble small { display: block; color: var(--cc-slate-soft); font-size: 0.72rem; margin-bottom: 0.2rem; }
    .bubble p { margin: 0; font-size: 0.92rem; line-height: 1.4; }
    .chat-form {
      display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; padding: 0.75rem;
      border-top: 1px solid var(--cc-border); background: white;
    }
    .chat-form input {
      border: 1px solid var(--cc-border); border-radius: 12px; padding: 0.7rem 0.8rem; font: inherit;
    }

    .reports { flex: 1; overflow: auto; padding: 0.85rem; display: grid; gap: 0.65rem; align-content: start; }
    .reports h3 { margin: 0.35rem 0 0; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cc-slate-soft); }
    .reports article {
      background: var(--cc-sky-soft); border: 1px solid var(--cc-border); border-radius: 12px; padding: 0.7rem 0.8rem;
    }
    .reports article.compact { background: white; }
    .reports strong { display: block; font-size: 0.92rem; }
    .reports p { margin: 0.2rem 0 0; color: var(--cc-slate); font-size: 0.82rem; }
    .reports ul { margin: 0.45rem 0 0; padding-left: 1rem; color: var(--cc-slate); font-size: 0.82rem; }
    .abnormal { color: var(--cc-danger); font-weight: 650; }
    .empty { margin: 0.35rem 0; color: var(--cc-slate-soft); font-size: 0.88rem; }
    .empty.warn { color: var(--cc-danger); }

    .notes { padding: 0.9rem; display: grid; gap: 0.75rem; }
    .notes label { display: grid; gap: 0.3rem; font-size: 0.8rem; font-weight: 650; color: var(--cc-slate-soft); }
    .notes input, .notes textarea {
      border: 1px solid var(--cc-border); border-radius: 12px; padding: 0.7rem 0.8rem; font: inherit; color: var(--cc-navy);
    }
    .hint { margin: 0; color: var(--cc-slate-soft); font-size: 0.82rem; }

    @media (max-width: 980px) {
      .workspace.panel-open { grid-template-columns: 1fr; }
      .side { min-height: 420px; }
      .local { width: min(150px, 38vw); }
      .controls { width: calc(100% - 1.5rem); left: 0.75rem; transform: none; border-radius: 18px; }
    }
  `,
})
export class VideoConsultComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('chatLog') chatLogRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly videoApi = inject(VideoService);
  private readonly clinical = inject(ClinicalService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  sessionId = '';
  session: VideoSession | null = null;
  joinInfo: VideoJoinInfo | null = null;
  status = 'connecting';
  message = '';
  muted = false;
  cameraOff = false;
  sidePanel: 'chat' | 'reports' | 'notes' | null = 'chat';

  chat: ChatMessage[] = [];
  chatDraft = '';

  labReports: any[] = [];
  prescriptions: any[] = [];
  timeline: any[] = [];
  recordsLoading = false;
  recordsError = '';

  readonly notesForm = this.fb.nonNullable.group({
    diagnosis: [''],
    notes: [''],
  });

  private localStream?: MediaStream;
  private pc?: RTCPeerConnection;
  private ws?: WebSocket;
  private makingOffer = false;
  private polite = false;

  get backLink(): string {
    const role = this.joinInfo?.role;
    if (role === 'doctor') return '/doctor/bookings';
    if (role === 'patient') return '/patient/appointments';
    return '/my-bookings';
  }

  get remoteLabel(): string {
    return this.joinInfo?.role === 'doctor' ? 'Patient' : 'Doctor';
  }

  get waitingText(): string {
    if (this.status === 'ended') return 'Call ended';
    if (this.status === 'error') return 'Unable to join';
    if (this.status === 'peer-left') return 'Other participant left';
    return 'Waiting for the other participant…';
  }

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (!this.sessionId) return;

    this.videoApi.get(this.sessionId).subscribe({
      next: (session) => {
        this.session = session;
        this.loadRecords(session.patient_id);
      },
      error: () => undefined,
    });

    this.videoApi.join(this.sessionId).subscribe({
      next: async (info) => {
        this.joinInfo = info;
        this.polite = info.role === 'patient';
        this.status = 'joined';
        if (info.role === 'doctor') this.sidePanel = 'reports';
        await this.startMedia(info);
      },
      error: (err) => {
        this.message = typeof err?.error?.detail === 'string' ? err.error.detail : 'Unable to join room';
        this.status = 'error';
      },
    });
  }

  async ngOnDestroy(): Promise<void> {
    this.cleanupMedia();
  }

  private loadRecords(patientId: string): void {
    this.recordsLoading = true;
    this.recordsError = '';
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.recordsLoading = false;
    };

    this.clinical.prescriptions(patientId).subscribe({
      next: (items) => {
        this.prescriptions = items;
        done();
      },
      error: (err) => {
        this.recordsError = err?.error?.detail || 'Could not load prescriptions (consent may be required).';
        done();
      },
    });

    this.clinical.patientLabReports(patientId).subscribe({
      next: (items) => {
        this.labReports = items;
        done();
      },
      error: (err) => {
        if (!this.recordsError) {
          this.recordsError = err?.error?.detail || 'Could not load lab reports.';
        }
        // Patient fallback to /me
        if (this.joinInfo?.role === 'patient' || this.auth.hasAnyRole(['PATIENT'])) {
          this.clinical.myLabReports().subscribe({
            next: (mine) => {
              this.labReports = mine;
              if (this.recordsError.includes('lab')) this.recordsError = '';
            },
          });
        }
        done();
      },
    });

    this.clinical.timeline(patientId).subscribe({
      next: (items) => {
        this.timeline = items;
        done();
      },
      error: () => done(),
    });
  }

  private async startMedia(info: VideoJoinInfo): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      this.message = 'Camera/microphone permission is required for video consult.';
      this.status = 'error';
      return;
    }
    if (this.localVideoRef) {
      this.localVideoRef.nativeElement.srcObject = this.localStream;
    }

    this.pc = new RTCPeerConnection({ iceServers: info.ice_servers as RTCIceServer[] });
    this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));
    this.pc.ontrack = (event) => {
      if (this.remoteVideoRef) {
        this.remoteVideoRef.nativeElement.srcObject = event.streams[0];
      }
      this.status = 'live';
    };
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: 'ice-candidate', payload: event.candidate });
      }
    };

    const wsUrl = this.videoApi.signalingWsUrl(info.signaling_url, info.access_token);
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      await this.handleSignal(msg);
    };
    this.ws.onopen = async () => {
      if (info.role === 'doctor') {
        await this.createOffer();
      }
    };
  }

  private async handleSignal(msg: any): Promise<void> {
    if (msg.type === 'chat') {
      const text = String(msg.payload?.text || '').trim();
      if (!text) return;
      this.chat = [
        ...this.chat,
        {
          id: `${Date.now()}-${Math.random()}`,
          text,
          fromRole: msg.from_role || 'peer',
          mine: false,
          at: new Date(),
        },
      ];
      this.scrollChat();
      return;
    }

    if (!this.pc) return;
    if (msg.type === 'peer-joined' && this.joinInfo?.role === 'doctor') {
      await this.createOffer();
      return;
    }
    if (msg.type === 'offer') {
      const offerCollision = this.makingOffer || this.pc.signalingState !== 'stable';
      if (offerCollision && !this.polite) return;
      await this.pc.setRemoteDescription(msg.payload);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.sendSignal({ type: 'answer', payload: answer });
      this.status = 'live';
      return;
    }
    if (msg.type === 'answer') {
      await this.pc.setRemoteDescription(msg.payload);
      this.status = 'live';
      return;
    }
    if (msg.type === 'ice-candidate' && msg.payload) {
      try {
        await this.pc.addIceCandidate(msg.payload);
      } catch {
        // ignore late candidates
      }
    }
    if (msg.type === 'peer-left' || msg.type === 'hangup') {
      this.status = 'peer-left';
    }
  }

  private async createOffer(): Promise<void> {
    if (!this.pc) return;
    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal({ type: 'offer', payload: offer });
    } finally {
      this.makingOffer = false;
    }
  }

  private sendSignal(message: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendChat(): void {
    const text = this.chatDraft.trim();
    if (!text || this.status === 'ended' || this.status === 'error') return;
    this.sendSignal({
      type: 'chat',
      payload: { text, at: new Date().toISOString() },
    });
    this.chat = [
      ...this.chat,
      {
        id: `${Date.now()}-me`,
        text,
        fromRole: this.joinInfo?.role || 'me',
        mine: true,
        at: new Date(),
      },
    ];
    this.chatDraft = '';
    this.scrollChat();
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = this.chatLogRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !this.muted));
  }

  toggleCamera(): void {
    this.cameraOff = !this.cameraOff;
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = !this.cameraOff));
  }

  hangup(): void {
    this.sendSignal({ type: 'hangup', payload: {} });
    const notes = this.notesForm.getRawValue();
    const payload: Record<string, unknown> = { reason: 'ended_by_user' };
    if (this.joinInfo?.role === 'doctor' && notes.notes) {
      payload['notes'] = notes.notes;
      payload['diagnosis'] = notes.diagnosis || null;
      payload['finalize_consultation'] = true;
    }
    this.videoApi.end(this.sessionId, payload).subscribe({
      next: () => {
        this.message = 'Consultation ended.';
        this.status = 'ended';
        this.cleanupMedia();
      },
      error: () => {
        this.cleanupMedia();
        this.status = 'ended';
      },
    });
  }

  private cleanupMedia(): void {
    this.ws?.close();
    this.pc?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.ws = undefined;
    this.pc = undefined;
    this.localStream = undefined;
  }
}
