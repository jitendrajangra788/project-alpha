import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ClinicalService } from '../../core/clinical.service';
import { VideoJoinInfo, VideoService, VideoSession } from '../../core/video.service';

interface ChatReportShare {
  reportId: string;
  title: string;
  status?: string;
  summary?: string;
  kind: 'lab' | 'prescription';
}

interface ChatMessage {
  id: string;
  text: string;
  fromRole: string;
  mine: boolean;
  at: Date;
  kind?: 'text' | 'report';
  report?: ChatReportShare;
}

function friendlyDetail(err: any, fallback: string): string {
  const detail = err?.error?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    if (/not found/i.test(detail)) return fallback;
    return detail;
  }
  if (err?.status === 404) return fallback;
  return fallback;
}

@Component({
  selector: 'app-video-consult',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, DatePipe],
  template: `
    <div class="shell" [class.has-panel]="!!sidePanel">
      <div class="ambient" aria-hidden="true"></div>

      <header class="topbar">
        <div class="brand-block">
          <a class="back" [routerLink]="dashboardLink">← Dashboard</a>
          <div class="title-row">
            <h1>Live consult</h1>
            <span
              class="pill"
              [class.live]="status === 'live'"
              [class.warn]="status === 'connecting' || status === 'joined' || status === 'need-media'"
              [class.bad]="status === 'error' || status === 'media-blocked'"
              [class.done]="status === 'ended'"
            >
              <i class="dot"></i>{{ statusLabel }}
            </span>
          </div>
          <p class="meta">
            <span>{{ roleLabel }}</span>
            <span class="sep">·</span>
            <span>{{ roomShort }}</span>
            @if (status === 'live') {
              <span class="sep">·</span>
              <span class="timer">{{ callClock }}</span>
            }
          </p>
        </div>

        <div class="top-actions">
          <button type="button" class="tab" [class.on]="sidePanel === 'chat'" (click)="togglePanel('chat')">
            Chat @if (chat.length) { <em>{{ chat.length }}</em> }
          </button>
          <button type="button" class="tab" [class.on]="sidePanel === 'reports'" (click)="togglePanel('reports')">Records</button>
          @if (joinInfo?.role === 'doctor') {
            <button type="button" class="tab" [class.on]="sidePanel === 'notes'" (click)="togglePanel('notes')">Notes</button>
          }
        </div>
      </header>

      <div class="workspace">
        <section class="stage">
          <div class="remote pane">
            <video #remoteVideo autoplay playsinline></video>
            <div class="vignette"></div>
            <span class="name-tag">{{ remoteLabel }}</span>

            @if (status !== 'live' && status !== 'ended') {
              <div class="overlay">
                <div class="rings" aria-hidden="true"><span></span><span></span><span></span></div>
                <h2>{{ waitingHeadline }}</h2>
                <p>{{ waitingText }}</p>
                @if (status === 'need-media' || status === 'media-blocked') {
                  <div class="perm-actions">
                    <button type="button" class="ghost-btn" [disabled]="mediaBusy" (click)="enableMedia(false)">
                      {{ mediaBusy ? 'Requesting…' : 'Allow camera & mic' }}
                    </button>
                    <button type="button" class="ghost-btn soft" [disabled]="mediaBusy" (click)="enableMedia(true)">
                      Join audio only
                    </button>
                  </div>
                  <p class="hint">{{ mediaHint }}</p>
                }
              </div>
            }

            @if (status === 'ended') {
              <div class="overlay soft">
                <h2>Consultation ended</h2>
                <p>{{ message || 'Returning to your dashboard…' }}</p>
              </div>
            }
          </div>

          <div class="local pane" [class.off]="cameraOff || !localStreamReady">
            <video #localVideo autoplay playsinline muted [attr.playsinline]="true" [muted]="true"></video>
            <span class="name-tag">You{{ muted ? ' · muted' : '' }}{{ cameraOff ? ' · cam off' : '' }}</span>
            @if (cameraOff || !localStreamReady) {
              <div class="local-fallback">{{ cameraOff ? 'Camera off' : 'Preview' }}</div>
            }
          </div>

          <div class="controls">
            <button type="button" class="ctrl" [class.active]="muted" (click)="toggleMute()" [attr.title]="muted ? 'Unmute' : 'Mute'">
              <span class="ico">{{ muted ? '🔇' : '🎤' }}</span>
              <small>{{ muted ? 'Unmute' : 'Mute' }}</small>
            </button>
            <button type="button" class="ctrl" [class.active]="cameraOff" (click)="toggleCamera()" [attr.title]="cameraOff ? 'Camera on' : 'Camera off'">
              <span class="ico">{{ cameraOff ? '📷' : '📹' }}</span>
              <small>{{ cameraOff ? 'Cam on' : 'Cam off' }}</small>
            </button>
            <button type="button" class="ctrl" [class.on]="sidePanel === 'chat'" (click)="togglePanel('chat')">
              <span class="ico">💬</span>
              <small>Chat</small>
            </button>
            <button type="button" class="ctrl" [class.on]="sidePanel === 'reports'" (click)="togglePanel('reports')">
              <span class="ico">📋</span>
              <small>Records</small>
            </button>
            <button type="button" class="ctrl end" (click)="hangup()" [disabled]="status === 'ended'" title="End call">
              <span class="ico">☎</span>
              <small>End</small>
            </button>
          </div>
        </section>

        @if (sidePanel) {
          <aside class="side">
            @if (sidePanel === 'chat') {
              <div class="side-head">
                <div>
                  <h2>In-call chat</h2>
                  <p>Secure messages during this session</p>
                </div>
                <button type="button" class="close" (click)="sidePanel = null">✕</button>
              </div>
              <div class="chat-log" #chatLog>
                @for (m of chat; track m.id) {
                  <div class="bubble" [class.mine]="m.mine" [class.report]="m.kind === 'report'">
                    <small>{{ m.mine ? 'You' : m.fromRole }} · {{ m.at | date: 'shortTime' }}</small>
                    @if (m.kind === 'report' && m.report) {
                      <div class="report-card">
                        <span class="badge">{{ m.report.kind === 'lab' ? 'Lab report' : 'Prescription' }}</span>
                        <strong>{{ m.report.title }}</strong>
                        @if (m.report.status) { <p>{{ m.report.status }}</p> }
                        @if (m.report.summary) { <p class="sum">{{ m.report.summary }}</p> }
                      </div>
                    } @else {
                      <p>{{ m.text }}</p>
                    }
                  </div>
                } @empty {
                  <div class="empty-state">
                    <strong>No messages yet</strong>
                    <p>Greet the other person or share a lab report from Records.</p>
                  </div>
                }
              </div>
              @if (joinInfo?.role === 'patient' && labReports.length && status !== 'ended') {
                <div class="quick-share">
                  <span>Quick share</span>
                  @for (r of labReports.slice(0, 3); track r.id) {
                    <button type="button" class="share-pill" (click)="shareLabReport(r)">{{ r.title || 'Lab report' }}</button>
                  }
                </div>
              }
              <form class="chat-form" (ngSubmit)="sendChat()">
                <input [(ngModel)]="chatDraft" name="chatDraft" placeholder="Write a message…" [disabled]="status === 'ended' || status === 'error' || status === 'media-blocked'" />
                <button type="submit" [disabled]="!chatDraft.trim() || status === 'ended'">Send</button>
              </form>
            }

            @if (sidePanel === 'reports') {
              <div class="side-head">
                <div>
                  <h2>{{ joinInfo?.role === 'doctor' ? 'Patient records' : 'My records' }}</h2>
                  <p>Labs, prescriptions & timeline</p>
                </div>
                <button type="button" class="close" (click)="sidePanel = null">✕</button>
              </div>
              @if (recordsLoading) {
                <div class="empty-state"><p>Loading clinical records…</p></div>
              } @else if (recordsError && !labReports.length && !prescriptions.length) {
                <div class="empty-state">
                  <strong>Records unavailable</strong>
                  <p>{{ recordsError }}</p>
                </div>
              } @else {
                <div class="reports">
                  <h3>Lab reports · {{ labReports.length }}</h3>
                  @for (r of labReports; track r.id) {
                    <article>
                      <strong>{{ r.title || 'Lab report' }}</strong>
                      <p>{{ r.status }} · {{ (r.published_at || r.created_at) | date: 'mediumDate' }}</p>
                      <ul>
                        @for (res of (r.results || []).slice(0, 4); track res.id) {
                          <li [class.abnormal]="res.is_abnormal">{{ res.parameter_name }}: {{ res.value }} {{ res.unit }}</li>
                        }
                      </ul>
                      @if (status !== 'ended' && status !== 'error' && status !== 'media-blocked') {
                        <button type="button" class="share-btn" (click)="shareLabReport(r)">Share in chat</button>
                      }
                    </article>
                  } @empty {
                    <p class="empty">No lab reports shared for this visit yet.</p>
                  }

                  <h3>Prescriptions · {{ prescriptions.length }}</h3>
                  @for (rx of prescriptions; track rx.id) {
                    <article>
                      <strong>{{ rx.diagnosis || 'Prescription' }}</strong>
                      <p>{{ rx.created_at | date: 'mediumDate' }}</p>
                      <ul>
                        @for (m of (rx.medicines || []).slice(0, 4); track m.id) {
                          <li>{{ m.medicine_name }} — {{ m.dosage }} · {{ m.frequency }}</li>
                        }
                      </ul>
                      @if (joinInfo?.role === 'patient' && status !== 'ended' && status !== 'error') {
                        <button type="button" class="share-btn" (click)="sharePrescription(rx)">Share in chat</button>
                      }
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
                    <p class="empty">Timeline will appear as care events are recorded.</p>
                  }
                </div>
              }
            }

            @if (sidePanel === 'notes' && joinInfo?.role === 'doctor') {
              <div class="side-head">
                <div>
                  <h2>Consultation notes</h2>
                  <p>Saved when you end the call</p>
                </div>
                <button type="button" class="close" (click)="sidePanel = null">✕</button>
              </div>
              <form class="notes" [formGroup]="notesForm">
                <label>Diagnosis<input formControlName="diagnosis" placeholder="Optional diagnosis" /></label>
                <label>Clinical notes<textarea formControlName="notes" rows="10" placeholder="Key findings, advice, follow-up…"></textarea></label>
              </form>
            }
          </aside>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .shell {
      position: relative; isolation: isolate;
      min-height: calc(100vh - var(--cc-header-h, 64px));
      padding: 0.85rem 1rem 1.1rem;
      color: #e8f2f8;
      background: #050b14;
      overflow: hidden;
    }
    .ambient {
      position: absolute; inset: -20% -10% auto; height: 70%;
      background:
        radial-gradient(circle at 20% 20%, rgba(20,184,166,0.22), transparent 42%),
        radial-gradient(circle at 80% 10%, rgba(56,189,248,0.16), transparent 40%),
        radial-gradient(circle at 50% 80%, rgba(14,116,144,0.18), transparent 45%);
      filter: blur(8px); pointer-events: none; z-index: 0;
      animation: drift 14s ease-in-out infinite alternate;
    }
    @keyframes drift {
      from { transform: translate3d(-1%, -1%, 0) scale(1); }
      to { transform: translate3d(2%, 2%, 0) scale(1.05); }
    }

    .topbar, .workspace { position: relative; z-index: 1; }
    .topbar {
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: end;
      margin-bottom: 0.85rem;
    }
    .back {
      color: rgba(226,240,248,0.72); text-decoration: none; font-size: 0.82rem; font-weight: 650;
    }
    .back:hover { color: #fff; }
    .title-row { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; margin-top: 0.2rem; }
    h1 {
      margin: 0; font-size: clamp(1.35rem, 2.4vw, 1.75rem); letter-spacing: -0.02em;
      font-family: var(--cc-display, Georgia, 'Times New Roman', serif); color: #fff;
    }
    .pill {
      display: inline-flex; align-items: center; gap: 0.35rem;
      border-radius: 999px; padding: 0.28rem 0.7rem; font-size: 0.72rem; font-weight: 750;
      letter-spacing: 0.04em; text-transform: uppercase;
      background: rgba(251,191,36,0.14); color: #fde68a; border: 1px solid rgba(251,191,36,0.28);
    }
    .pill .dot {
      width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block;
    }
    .pill.live { background: rgba(52,211,153,0.14); color: #6ee7b7; border-color: rgba(52,211,153,0.3); }
    .pill.live .dot { box-shadow: 0 0 0 0 rgba(52,211,153,0.7); animation: pulse 1.6s infinite; }
    .pill.warn { background: rgba(56,189,248,0.12); color: #7dd3fc; border-color: rgba(56,189,248,0.28); }
    .pill.bad { background: rgba(248,113,113,0.14); color: #fecaca; border-color: rgba(248,113,113,0.3); }
    .pill.done { background: rgba(148,163,184,0.14); color: #cbd5e1; border-color: rgba(148,163,184,0.28); }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.55); }
      70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
      100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
    }
    .meta { margin: 0.3rem 0 0; color: rgba(203,221,233,0.72); font-size: 0.84rem; display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .sep { opacity: 0.5; }
    .timer { font-variant-numeric: tabular-nums; color: #a7f3d0; font-weight: 700; }

    .top-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .tab {
      border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
      color: #dbe7f0; border-radius: 999px; padding: 0.5rem 0.9rem; font: inherit; font-weight: 650; cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    }
    .tab em {
      font-style: normal; margin-left: 0.35rem; background: rgba(20,184,166,0.25);
      border-radius: 999px; padding: 0.05rem 0.4rem; font-size: 0.72rem;
    }
    .tab:hover { background: rgba(255,255,255,0.08); transform: translateY(-1px); }
    .tab.on { background: rgba(20,184,166,0.22); border-color: rgba(45,212,191,0.45); color: #fff; }

    .workspace { display: grid; grid-template-columns: 1fr; gap: 0.85rem; min-height: 68vh; }
    .shell.has-panel .workspace { grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); }

    .stage {
      position: relative; border-radius: 24px; overflow: hidden; min-height: 66vh;
      background: linear-gradient(160deg, #07101c, #020617 55%, #04141f);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 24px 60px rgba(0,0,0,0.35);
    }
    .remote { position: relative; min-height: 66vh; }
    .remote video { width: 100%; height: 100%; min-height: 66vh; object-fit: cover; background: #020617; display: block; }
    .vignette {
      position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(180deg, rgba(2,6,23,0.15), transparent 30%, transparent 55%, rgba(2,6,23,0.72));
    }
    .name-tag {
      position: absolute; left: 1rem; bottom: 5.6rem; z-index: 3;
      background: rgba(2,6,23,0.62); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.12); color: #fff;
      padding: 0.35rem 0.7rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
    }
    .local {
      position: absolute; right: 1rem; top: 1rem; width: min(210px, 34vw); aspect-ratio: 3/4;
      border-radius: 18px; overflow: hidden; z-index: 4;
      border: 1px solid rgba(255,255,255,0.22);
      box-shadow: 0 16px 40px rgba(0,0,0,0.4);
      background: #0b1220;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .local video { width: 100%; height: 100%; object-fit: cover; display: block; background: #0b1220; }
    .local .name-tag { left: 0.55rem; bottom: 0.55rem; font-size: 0.7rem; padding: 0.22rem 0.5rem; }
    .local.off video { opacity: 0.15; }
    .local-fallback {
      position: absolute; inset: 0; display: grid; place-items: center;
      color: rgba(226,240,248,0.7); font-weight: 700; font-size: 0.85rem;
      background: radial-gradient(circle at 50% 40%, rgba(20,184,166,0.18), transparent 55%);
    }

    .overlay {
      position: absolute; inset: 0; z-index: 2; display: grid; place-content: center; gap: 0.45rem;
      text-align: center; padding: 1.5rem; background: rgba(2,6,23,0.42); backdrop-filter: blur(2px);
    }
    .overlay.soft { background: rgba(2,6,23,0.55); }
    .overlay h2 { margin: 0; font-size: 1.35rem; color: #fff; font-family: var(--cc-display, Georgia, serif); }
    .overlay p { margin: 0; color: rgba(203,221,233,0.86); max-width: 34rem; justify-self: center; line-height: 1.45; }
    .overlay .hint { margin-top: 0.55rem; font-size: 0.8rem; color: rgba(203,221,233,0.65); }
    .perm-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-top: 0.55rem; }
    .ghost-btn {
      border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color: #fff;
      border-radius: 999px; padding: 0.65rem 1rem; font: inherit; font-weight: 700; cursor: pointer;
    }
    .ghost-btn.soft { background: transparent; }
    .ghost-btn:hover { background: rgba(20,184,166,0.22); border-color: rgba(45,212,191,0.4); }

    .rings { position: relative; width: 84px; height: 84px; margin: 0 auto 0.6rem; }
    .rings span {
      position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(45,212,191,0.35);
      animation: ring 2.4s ease-out infinite;
    }
    .rings span:nth-child(2) { animation-delay: 0.55s; }
    .rings span:nth-child(3) { animation-delay: 1.1s; }
    @keyframes ring {
      0% { transform: scale(0.45); opacity: 0.9; }
      100% { transform: scale(1.35); opacity: 0; }
    }

    .controls {
      position: absolute; left: 50%; bottom: 1.05rem; transform: translateX(-50%);
      display: flex; gap: 0.55rem; z-index: 5; padding: 0.55rem 0.65rem;
      background: rgba(7,12,22,0.72); backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.35);
    }
    .ctrl {
      width: 68px; border: 0; border-radius: 18px; padding: 0.45rem 0.2rem 0.4rem;
      background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; font: inherit;
      display: grid; gap: 0.12rem; place-items: center; transition: transform 0.15s ease, background 0.2s ease;
    }
    .ctrl .ico { font-size: 1.15rem; line-height: 1; }
    .ctrl small { font-size: 0.68rem; font-weight: 700; opacity: 0.85; }
    .ctrl:hover { transform: translateY(-2px); background: rgba(255,255,255,0.12); }
    .ctrl.on, .ctrl.active { background: rgba(248,113,113,0.18); }
    .ctrl.end {
      background: linear-gradient(145deg, #ef4444, #b91c1c); width: 74px;
      box-shadow: 0 8px 20px rgba(185,28,28,0.35);
    }
    .ctrl.end:hover { filter: brightness(1.05); }
    .ctrl:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    .side {
      display: flex; flex-direction: column; min-height: 66vh; overflow: hidden;
      border-radius: 22px; border: 1px solid rgba(255,255,255,0.1);
      background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04));
      backdrop-filter: blur(18px); color: #e8f2f8;
      animation: slideIn 0.28s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .side-head {
      display: flex; justify-content: space-between; gap: 0.75rem; align-items: start;
      padding: 1rem 1rem 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .side-head h2 { margin: 0; font-size: 1.02rem; color: #fff; }
    .side-head p { margin: 0.2rem 0 0; color: rgba(203,221,233,0.65); font-size: 0.78rem; }
    .close {
      border: 0; width: 34px; height: 34px; border-radius: 12px; cursor: pointer;
      background: rgba(255,255,255,0.08); color: #fff;
    }

    .chat-log { flex: 1; overflow: auto; padding: 0.9rem; display: grid; gap: 0.55rem; align-content: start; }
    .bubble {
      max-width: 90%; border-radius: 16px; padding: 0.6rem 0.75rem;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08);
    }
    .bubble.mine { margin-left: auto; background: rgba(20,184,166,0.18); border-color: rgba(45,212,191,0.28); }
    .bubble.report { max-width: 96%; }
    .bubble small { display: block; color: rgba(203,221,233,0.6); font-size: 0.7rem; margin-bottom: 0.2rem; }
    .bubble p { margin: 0; font-size: 0.92rem; line-height: 1.4; color: #eef7fb; }
    .report-card { display: grid; gap: 0.2rem; }
    .report-card .badge {
      width: fit-content; border-radius: 999px; padding: 0.12rem 0.5rem;
      background: rgba(56,189,248,0.16); color: #7dd3fc; font-size: 0.66rem; font-weight: 750; text-transform: uppercase;
    }
    .report-card strong { color: #fff; font-size: 0.92rem; }
    .report-card .sum { color: rgba(203,221,233,0.78); font-size: 0.82rem; }
    .quick-share {
      display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;
      padding: 0.5rem 0.8rem; border-top: 1px solid rgba(255,255,255,0.08);
      font-size: 0.75rem; color: rgba(203,221,233,0.7); font-weight: 650;
    }
    .share-pill {
      border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e8f2f8;
      border-radius: 999px; padding: 0.28rem 0.6rem; font: inherit; font-size: 0.74rem; font-weight: 700; cursor: pointer;
      max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .chat-form {
      display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; padding: 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .chat-form input {
      border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 0.75rem 0.85rem;
      background: rgba(0,0,0,0.25); color: #fff; font: inherit;
    }
    .chat-form button {
      border: 0; border-radius: 14px; padding: 0 1rem; font: inherit; font-weight: 750; cursor: pointer;
      background: linear-gradient(135deg, #14b8a6, #0f766e); color: #fff;
    }
    .chat-form button:disabled { opacity: 0.45; cursor: not-allowed; }

    .reports { flex: 1; overflow: auto; padding: 0.85rem; display: grid; gap: 0.65rem; align-content: start; }
    .reports h3 {
      margin: 0.25rem 0 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em;
      color: rgba(203,221,233,0.55);
    }
    .reports article {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 0.75rem 0.85rem;
    }
    .reports article.compact { background: rgba(255,255,255,0.03); }
    .reports strong { display: block; font-size: 0.92rem; color: #fff; }
    .reports p { margin: 0.2rem 0 0; color: rgba(203,221,233,0.72); font-size: 0.82rem; }
    .reports ul { margin: 0.45rem 0 0; padding-left: 1rem; color: rgba(203,221,233,0.78); font-size: 0.82rem; }
    .share-btn {
      margin-top: 0.55rem; border: 1px solid rgba(45,212,191,0.35); background: rgba(20,184,166,0.12);
      color: #5eead4; border-radius: 999px; padding: 0.4rem 0.75rem; font: inherit; font-size: 0.78rem; font-weight: 750; cursor: pointer;
    }
    .abnormal { color: #fca5a5; font-weight: 700; }
    .empty { margin: 0.2rem 0; color: rgba(203,221,233,0.55); font-size: 0.86rem; }
    .empty-state {
      margin: 1.2rem 1rem; padding: 1.1rem; border-radius: 16px; text-align: center;
      background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.12);
    }
    .empty-state strong { display: block; color: #fff; margin-bottom: 0.25rem; }
    .empty-state p { margin: 0; color: rgba(203,221,233,0.7); font-size: 0.86rem; line-height: 1.4; }

    .notes { padding: 0.95rem; display: grid; gap: 0.75rem; }
    .notes label { display: grid; gap: 0.3rem; font-size: 0.78rem; font-weight: 700; color: rgba(203,221,233,0.7); }
    .notes input, .notes textarea {
      border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 0.75rem 0.85rem;
      background: rgba(0,0,0,0.25); color: #fff; font: inherit;
    }

    @media (max-width: 980px) {
      .shell.has-panel .workspace { grid-template-columns: 1fr; }
      .side { min-height: 420px; }
      .local { width: min(128px, 34vw); aspect-ratio: 3/4; }
      .controls { left: 0.75rem; right: 0.75rem; width: auto; transform: none; justify-content: space-between; border-radius: 22px; }
      .ctrl { width: auto; flex: 1; }
      .name-tag { bottom: 5.8rem; }
    }
  `,
})
export class VideoConsultComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('chatLog') chatLogRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  localStreamReady = false;
  mediaBusy = false;
  mediaHint = 'Tap Allow so the browser can show the camera/mic permission popup.';
  sidePanel: 'chat' | 'reports' | 'notes' | null = null;

  chat: ChatMessage[] = [];
  chatDraft = '';

  labReports: any[] = [];
  prescriptions: any[] = [];
  timeline: any[] = [];
  recordsLoading = false;
  recordsError = '';
  callClock = '00:00';

  readonly notesForm = this.fb.nonNullable.group({
    diagnosis: [''],
    notes: [''],
  });

  private localStream?: MediaStream;
  private pc?: RTCPeerConnection;
  private ws?: WebSocket;
  private makingOffer = false;
  private polite = false;
  private ending = false;
  private redirectTimer?: ReturnType<typeof setTimeout>;
  private callTimer?: ReturnType<typeof setInterval>;
  private callStartedAt?: number;
  private pendingJoinInfo?: VideoJoinInfo;

  get dashboardLink(): string {
    const role = this.joinInfo?.role;
    if (role === 'doctor') return '/doctor';
    if (role === 'patient') return '/patient';
    if (this.auth.hasAnyRole(['DOCTOR'])) return '/doctor';
    if (this.auth.hasAnyRole(['PATIENT'])) return '/patient';
    return '/';
  }

  get remoteLabel(): string {
    return this.joinInfo?.role === 'doctor' ? 'Patient' : 'Doctor';
  }

  get roleLabel(): string {
    const role = this.joinInfo?.role;
    if (role === 'doctor') return 'Doctor view';
    if (role === 'patient') return 'Patient view';
    return 'Connecting…';
  }

  get roomShort(): string {
    const code = this.joinInfo?.room_code || '';
    if (!code) return 'Preparing room';
    return code.length > 18 ? `Room ${code.slice(-8)}` : `Room ${code}`;
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'connecting':
        return 'Connecting';
      case 'joined':
        return 'Ready';
      case 'need-media':
        return 'Enable media';
      case 'live':
        return 'Live';
      case 'ended':
        return 'Ended';
      case 'media-blocked':
        return 'Permission needed';
      case 'error':
        return 'Unavailable';
      case 'peer-left':
        return 'Peer left';
      default:
        return this.status;
    }
  }

  get waitingHeadline(): string {
    if (this.status === 'need-media') return 'Start your camera';
    if (this.status === 'media-blocked') return 'Camera / mic blocked';
    if (this.status === 'error') return 'Unable to join';
    if (this.status === 'peer-left') return 'Participant left';
    return 'Waiting to connect';
  }

  get waitingText(): string {
    if (this.status === 'ended') return 'Call ended';
    if (this.status === 'error') return this.message || 'This consultation room is unavailable.';
    if (this.status === 'need-media') {
      return 'Browser security requires a tap before camera and microphone can start.';
    }
    if (this.status === 'media-blocked') {
      return this.message || 'Allow camera and microphone to start a secure video consult.';
    }
    if (this.status === 'peer-left') return 'Other participant left';
    return 'Hold on — we’ll connect as soon as the other person joins.';
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
      next: (info) => {
        this.joinInfo = info;
        this.pendingJoinInfo = info;
        this.polite = info.role === 'patient';
        // Wait for an explicit user tap — required on mobile browsers for getUserMedia.
        this.status = 'need-media';
        this.mediaHint = window.isSecureContext
          ? 'Tap Allow camera & mic. If no popup appears, check the lock icon in the address bar.'
          : 'This page must be opened on HTTPS for camera access.';
      },
      error: (err) => {
        this.message = typeof err?.error?.detail === 'string' ? err.error.detail : 'Unable to join room';
        this.status = 'error';
      },
    });
  }

  async ngOnDestroy(): Promise<void> {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    if (this.callTimer) clearInterval(this.callTimer);
    this.cleanupMedia();
  }

  togglePanel(panel: 'chat' | 'reports' | 'notes'): void {
    this.sidePanel = this.sidePanel === panel ? null : panel;
  }

  async retryMedia(audioOnly = false): Promise<void> {
    await this.enableMedia(audioOnly);
  }

  async enableMedia(audioOnly = false): Promise<void> {
    if (this.mediaBusy) return;
    const info = this.pendingJoinInfo || this.joinInfo;
    if (!info) return;
    this.mediaBusy = true;
    this.message = '';
    try {
      await this.startMedia(info, audioOnly);
    } finally {
      this.mediaBusy = false;
    }
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
        this.recordsError = friendlyDetail(
          err,
          'Patient clinical records are not available yet (consent or data may be missing).',
        );
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
          this.recordsError = friendlyDetail(err, 'Lab reports are not available for this patient yet.');
        }
        if (this.joinInfo?.role === 'patient' || this.auth.hasAnyRole(['PATIENT'])) {
          this.clinical.myLabReports().subscribe({
            next: (mine) => {
              this.labReports = mine;
              if (mine.length) this.recordsError = '';
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

  private async startMedia(info: VideoJoinInfo, audioOnly = false): Promise<void> {
    if (!window.isSecureContext) {
      this.localStreamReady = false;
      this.status = 'media-blocked';
      this.message = 'Camera/mic only work on HTTPS. Open the https:// CareConnect URL.';
      this.mediaHint = 'Use the Vercel https link, not http://localhost without secure context.';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.localStreamReady = false;
      this.status = 'media-blocked';
      this.message = 'This browser does not support camera/microphone APIs.';
      this.mediaHint = 'Try Chrome or Edge on desktop, or Safari/Chrome on phone.';
      return;
    }

    this.cleanupPeerOnly();

    try {
      this.localStream = await this.acquireStream(audioOnly);
      this.cameraOff = audioOnly || !this.localStream.getVideoTracks().length;
      this.muted = !this.localStream.getAudioTracks().length;
      this.localStreamReady = true;
      if (this.cameraOff && !audioOnly) {
        this.message = 'Camera unavailable — connected with microphone only.';
      }
    } catch (err) {
      this.localStreamReady = false;
      this.status = 'media-blocked';
      this.message = this.mediaErrorMessage(err, audioOnly);
      this.mediaHint =
        'Address bar → site settings (lock icon) → Camera & Microphone = Allow → reload → tap button again.';
      return;
    }

    await this.attachLocalPreview(this.localStream);
    this.status = 'joined';

    this.pc = new RTCPeerConnection({ iceServers: info.ice_servers as RTCIceServer[] });
    this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));
    this.pc.ontrack = (event) => {
      const remote = event.streams[0];
      const el = this.remoteVideoRef?.nativeElement;
      if (el && remote) {
        el.srcObject = remote;
        void el.play().catch(() => undefined);
      }
      this.markLive();
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

  private async acquireStream(audioOnly: boolean): Promise<MediaStream> {
    const attempts: MediaStreamConstraints[] = audioOnly
      ? [{ audio: true, video: false }, { audio: true }]
      : [
          { audio: true, video: { facingMode: 'user' } },
          { audio: true, video: true },
          { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 } } },
          { audio: true, video: false },
        ];

    let lastError: unknown;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!audioOnly && !stream.getVideoTracks().length) {
          // Keep going if we still want video and only got audio from a soft fallback later
        }
        return stream;
      } catch (err) {
        lastError = err;
        const name = (err as DOMException)?.name || '';
        // Permission denied won't succeed with other constraints
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
          throw err;
        }
      }
    }
    throw lastError || new Error('Unable to access media devices');
  }

  private async attachLocalPreview(stream?: MediaStream): Promise<void> {
    const el = this.localVideoRef?.nativeElement;
    if (!el) return;
    el.srcObject = stream || null;
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    if (stream) {
      try {
        await el.play();
      } catch {
        // Autoplay can fail until another gesture; muted+playsinline usually OK.
      }
    }
  }

  private mediaErrorMessage(err: unknown, audioOnly: boolean): string {
    const name = (err as DOMException)?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Permission blocked in browser. Allow Camera & Microphone for this site, then tap again.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return audioOnly
        ? 'No microphone found on this device.'
        : 'No camera/microphone found. Plug in a device or use audio-only.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera/mic is already in use by Zoom/Meet/another tab. Close it and retry.';
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'Camera settings not supported on this device. Try audio only.';
    }
    if (name === 'SecurityError') {
      return 'Browser blocked media for security reasons. Use HTTPS.';
    }
    return 'Could not start camera/microphone. Check browser permission and try again.';
  }

  private markLive(): void {
    if (this.status === 'live') return;
    this.status = 'live';
    this.callStartedAt = Date.now();
    this.callClock = '00:00';
    if (this.callTimer) clearInterval(this.callTimer);
    this.callTimer = setInterval(() => {
      if (!this.callStartedAt) return;
      const sec = Math.floor((Date.now() - this.callStartedAt) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      this.callClock = `${m}:${s}`;
    }, 1000);
  }

  private async handleSignal(msg: any): Promise<void> {
    if (msg.type === 'chat') {
      const payload = msg.payload || {};
      const report = payload.report as ChatReportShare | undefined;
      const text = String(payload.text || '').trim();
      if (!text && !report) return;
      this.chat = [
        ...this.chat,
        {
          id: `${Date.now()}-${Math.random()}`,
          text: text || report?.title || 'Shared report',
          fromRole: msg.from_role || 'peer',
          mine: false,
          at: new Date(),
          kind: report ? 'report' : 'text',
          report,
        },
      ];
      if (report) this.sidePanel = 'chat';
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
      this.markLive();
      return;
    }
    if (msg.type === 'answer') {
      await this.pc.setRemoteDescription(msg.payload);
      this.markLive();
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
      if (this.ending) return;
      this.message = msg.type === 'hangup' ? 'Other participant ended the consultation.' : 'Other participant left.';
      this.status = 'ended';
      this.cleanupMedia();
      this.goToDashboardSoon(1400);
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
    if (!text || this.status === 'ended' || this.status === 'error' || this.status === 'media-blocked') return;
    this.pushChatMessage({ text, kind: 'text' });
    this.chatDraft = '';
  }

  shareLabReport(report: any): void {
    if (this.status === 'ended' || this.status === 'error' || this.status === 'media-blocked') return;
    const results = (report.results || [])
      .slice(0, 3)
      .map((res: any) => `${res.parameter_name}: ${res.value}${res.unit ? ' ' + res.unit : ''}`)
      .join(' · ');
    const share: ChatReportShare = {
      reportId: String(report.id),
      title: report.title || 'Lab report',
      status: report.status,
      summary: results || undefined,
      kind: 'lab',
    };
    this.pushChatMessage({
      text: `Shared lab report: ${share.title}`,
      kind: 'report',
      report: share,
    });
    this.sidePanel = 'chat';
  }

  sharePrescription(rx: any): void {
    if (this.status === 'ended' || this.status === 'error' || this.status === 'media-blocked') return;
    const meds = (rx.medicines || [])
      .slice(0, 3)
      .map((m: any) => m.medicine_name)
      .filter(Boolean)
      .join(', ');
    const share: ChatReportShare = {
      reportId: String(rx.id),
      title: rx.diagnosis || 'Prescription',
      status: 'PRESCRIPTION',
      summary: meds || undefined,
      kind: 'prescription',
    };
    this.pushChatMessage({
      text: `Shared prescription: ${share.title}`,
      kind: 'report',
      report: share,
    });
    this.sidePanel = 'chat';
  }

  private pushChatMessage(input: { text: string; kind: 'text' | 'report'; report?: ChatReportShare }): void {
    this.sendSignal({
      type: 'chat',
      payload: {
        text: input.text,
        kind: input.kind,
        report: input.report || null,
        at: new Date().toISOString(),
      },
    });
    this.chat = [
      ...this.chat,
      {
        id: `${Date.now()}-me`,
        text: input.text,
        fromRole: this.joinInfo?.role || 'me',
        mine: true,
        at: new Date(),
        kind: input.kind,
        report: input.report,
      },
    ];
    this.scrollChat();
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = this.chatLogRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  toggleCamera(): void {
    if (!this.localStream?.getVideoTracks().length) {
      void this.enableMedia(false);
      return;
    }
    this.cameraOff = !this.cameraOff;
    this.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.cameraOff));
  }

  toggleMute(): void {
    if (!this.localStream?.getAudioTracks().length) {
      void this.enableMedia(true);
      return;
    }
    this.muted = !this.muted;
    this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.muted));
  }

  hangup(): void {
    if (this.ending) return;
    this.ending = true;
    this.sendSignal({ type: 'hangup', payload: {} });
    const notes = this.notesForm.getRawValue();
    const payload: Record<string, unknown> = { reason: 'ended_by_user' };
    if (this.joinInfo?.role === 'doctor' && (notes.notes || notes.diagnosis)) {
      payload['notes'] = notes.notes;
      payload['diagnosis'] = notes.diagnosis || null;
      payload['finalize_consultation'] = true;
    }
    this.videoApi.end(this.sessionId, payload).subscribe({
      next: () => {
        this.message = 'Consultation ended. Returning to dashboard…';
        this.status = 'ended';
        this.cleanupMedia();
        this.goToDashboardSoon(700);
      },
      error: () => {
        this.cleanupMedia();
        this.status = 'ended';
        this.message = 'Consultation ended. Returning to dashboard…';
        this.goToDashboardSoon(700);
      },
    });
  }

  private goToDashboardSoon(delayMs: number): void {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.redirectTimer = setTimeout(() => {
      void this.router.navigateByUrl(this.dashboardLink);
    }, delayMs);
  }

  private cleanupPeerOnly(): void {
    this.ws?.close();
    this.pc?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.ws = undefined;
    this.pc = undefined;
    this.localStream = undefined;
    this.localStreamReady = false;
  }

  private cleanupMedia(): void {
    if (this.callTimer) clearInterval(this.callTimer);
    this.cleanupPeerOnly();
  }
}
