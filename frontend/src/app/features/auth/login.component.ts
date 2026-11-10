import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { panelHomeForRoles } from '../../core/panel-home';
import { PlatformService } from '../../core/platform.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth">
      <aside>
        <div class="brand">
          <span class="mark">C</span>
          <div>
            <strong>{{ platform.settings().brand_name }}</strong>
            <small>Trusted healthcare marketplace</small>
          </div>
        </div>

        <h1>The care network for patients &amp; providers.</h1>
        <p class="aside-copy">
          Sign in to book appointments, manage clinics, review lab reports, and keep medical access consent-based.
        </p>

        <div class="points">
          <article>
            <span class="dot"></span>
            <div>
              <strong>Verified providers</strong>
              <span>Admin-reviewed documents &amp; listings</span>
            </div>
          </article>
          <article>
            <span class="dot"></span>
            <div>
              <strong>Secure dashboards</strong>
              <span>Role-based access for every panel</span>
            </div>
          </article>
          <article>
            <span class="dot"></span>
            <div>
              <strong>Clinical workflow</strong>
              <span>Prescriptions, labs, video &amp; payments</span>
            </div>
          </article>
          <article>
            <span class="dot"></span>
            <div>
              <strong>India-ready search</strong>
              <span>City, PIN and specialty discovery</span>
            </div>
          </article>
        </div>

        <p class="aside-foot">© {{ year }} {{ platform.settings().brand_name }}</p>
      </aside>

      <section>
        <div class="card">
          <div class="card-top">
            <p class="eyebrow">Account access</p>
            <h2>Welcome back</h2>
            <p class="lead">Enter your CareConnect credentials to continue.</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <label class="field">
              <span>Email or mobile</span>
              <input
                formControlName="identifier"
                placeholder="patient@careconnect.local"
                autocomplete="username"
              />
            </label>

            <div class="field">
              <div class="label-row">
                <span>Password</span>
                <a routerLink="/forgot-password">Forgot?</a>
              </div>
              <div class="pass-wrap">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                />
                <button class="eye" type="button" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            @if (error) {
              <p class="error">{{ error }}</p>
            }

            <button class="submit" type="submit" [disabled]="form.invalid || loading">
              <span>{{ loading ? 'Signing in…' : 'Sign in to platform' }}</span>
              @if (!loading) {
                <span class="arrow" aria-hidden="true">→</span>
              }
            </button>
          </form>

          <div class="divider"><span>Create an account</span></div>

          <div class="regs">
            <a routerLink="/register">
              <strong>Patient</strong>
              <span>Book care &amp; records</span>
            </a>
            <a routerLink="/register/doctor">
              <strong>Doctor</strong>
              <span>Practice &amp; consults</span>
            </a>
            <a routerLink="/list-your-business">
              <strong>Provider</strong>
              <span>Hospital, clinic, lab</span>
            </a>
            <a routerLink="/otp-verify">
              <strong>OTP verify</strong>
              <span>Mobile confirmation</span>
            </a>
          </div>

          <p class="card-foot">
            Need help? <a routerLink="/contact">Contact support</a>
            · <a routerLink="/verification-status">Verification status</a>
          </p>
        </div>
      </section>
    </div>
  `,
  styles: `
    .auth {
      min-height: calc(100vh - var(--cc-header-h));
      display: grid;
      grid-template-columns: minmax(320px, 1.05fr) minmax(360px, 1fr);
      background:
        radial-gradient(circle at 85% 12%, rgba(20, 184, 166, 0.14), transparent 28%),
        radial-gradient(circle at 70% 88%, rgba(11, 31, 58, 0.06), transparent 30%),
        var(--cc-sky-soft);
    }

    aside {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at top right, rgba(20, 184, 166, 0.28), transparent 42%),
        linear-gradient(165deg, #07182c 0%, var(--cc-navy) 42%, #0a3d3a 100%);
      color: #e8f1f8;
      padding: clamp(1.75rem, 4vw, 3.25rem);
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    aside::after {
      content: '';
      position: absolute;
      inset: auto -20% -25% auto;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(20,184,166,0.22), transparent 68%);
      pointer-events: none;
    }

    .brand { display: flex; gap: 0.8rem; align-items: center; position: relative; z-index: 1; }
    .mark {
      width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
      background: linear-gradient(145deg, var(--cc-teal-bright), var(--cc-teal));
      color: white; font-weight: 800; font-size: 1.15rem;
      box-shadow: 0 10px 24px rgba(15, 118, 110, 0.35);
    }
    .brand strong { display: block; font-size: 1.05rem; letter-spacing: 0.01em; }
    .brand small { display: block; margin-top: 0.15rem; opacity: 0.68; font-size: 0.78rem; }

    aside h1 {
      position: relative; z-index: 1;
      margin: 0.6rem 0 0;
      font-family: var(--cc-display);
      font-size: clamp(1.9rem, 3.2vw, 2.7rem);
      line-height: 1.12;
      color: #fff;
      max-width: 11ch;
    }
    .aside-copy {
      position: relative; z-index: 1;
      margin: 0; color: #c5d7e8; max-width: 34rem; line-height: 1.6; font-size: 0.98rem;
    }

    .points {
      position: relative; z-index: 1;
      margin-top: 0.35rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.7rem;
    }
    .points article {
      display: flex; gap: 0.65rem; align-items: flex-start;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      padding: 0.9rem 0.85rem;
      backdrop-filter: blur(6px);
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; margin-top: 0.4rem;
      background: var(--cc-teal-bright); box-shadow: 0 0 0 4px rgba(20,184,166,0.18);
      flex: 0 0 auto;
    }
    .points strong { display: block; font-size: 0.9rem; color: #fff; }
    .points span { display: block; margin-top: 0.2rem; font-size: 0.76rem; line-height: 1.4; color: #9fb4c8; }
    .aside-foot {
      position: relative; z-index: 1;
      margin-top: auto; padding-top: 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.08);
      font-size: 0.78rem; color: #8ea6bb;
    }

    section {
      display: grid;
      place-items: center;
      padding: clamp(1.25rem, 3vw, 2.5rem);
    }

    .card {
      width: min(460px, 100%);
      background: #fff;
      border: 1px solid rgba(219, 231, 240, 0.95);
      border-radius: 28px;
      padding: 1.85rem 1.75rem 1.4rem;
      box-shadow:
        0 1px 0 rgba(255,255,255,0.8) inset,
        0 18px 50px rgba(11, 31, 58, 0.1);
      position: relative;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 1.5rem; right: 1.5rem;
      height: 3px;
      border-radius: 0 0 8px 8px;
      background: linear-gradient(90deg, var(--cc-teal), var(--cc-teal-bright), #67e8f9);
    }

    .eyebrow {
      margin: 0 0 0.45rem;
      color: var(--cc-teal);
      font-size: 0.72rem;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h2 {
      margin: 0;
      font-family: var(--cc-display);
      color: var(--cc-navy);
      font-size: 2rem;
      line-height: 1.1;
    }
    .lead {
      margin: 0.45rem 0 0;
      color: var(--cc-slate);
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .card-top { margin-bottom: 1.35rem; }

    form { display: grid; gap: 1rem; }
    .field { display: grid; gap: 0.4rem; }
    .field > span,
    .label-row span {
      font-size: 0.72rem;
      font-weight: 750;
      color: var(--cc-slate-soft);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }
    .label-row a {
      color: var(--cc-teal);
      font-weight: 750;
      font-size: 0.72rem;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .label-row a:hover { color: var(--cc-navy); }

    input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--cc-border);
      border-radius: 14px;
      padding: 0.9rem 1rem;
      font: inherit;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--cc-navy);
      background: #f7fbfe;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    input:hover { background: #fff; }
    input:focus {
      outline: none;
      background: #fff;
      border-color: rgba(20, 184, 166, 0.55);
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
    }

    .pass-wrap { position: relative; }
    .pass-wrap input { padding-right: 4.2rem; }
    .eye {
      position: absolute;
      right: 0.45rem;
      top: 50%;
      transform: translateY(-50%);
      border: 0;
      background: transparent;
      color: var(--cc-teal);
      font: inherit;
      font-size: 0.78rem;
      font-weight: 750;
      padding: 0.45rem 0.65rem;
      border-radius: 10px;
      cursor: pointer;
    }
    .eye:hover { background: var(--cc-sky); }

    .error {
      margin: 0;
      padding: 0.7rem 0.85rem;
      border-radius: 12px;
      background: #fff5f5;
      border: 1px solid #fecaca;
      color: var(--cc-danger);
      font-size: 0.9rem;
    }

    .submit {
      margin-top: 0.15rem;
      width: 100%;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 0.55rem;
      border: 0;
      border-radius: 14px;
      padding: 0.95rem 1.1rem;
      background: linear-gradient(135deg, var(--cc-teal), #0d9488 55%, #0f766e);
      color: #fff;
      font: inherit;
      font-weight: 750;
      font-size: 0.98rem;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(15, 118, 110, 0.28);
      transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
    }
    .submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 16px 34px rgba(15, 118, 110, 0.34);
      filter: brightness(1.03);
    }
    .submit:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
    .arrow { font-size: 1.1rem; line-height: 1; }

    .divider {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 0.75rem;
      align-items: center;
      margin: 1.35rem 0 0.9rem;
      color: var(--cc-slate-soft);
      font-size: 0.7rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .divider::before,
    .divider::after {
      content: '';
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--cc-border), transparent);
    }

    .regs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }
    .regs a {
      text-decoration: none;
      color: var(--cc-navy);
      background: linear-gradient(180deg, #fff, var(--cc-sky-soft));
      border: 1px solid var(--cc-border);
      border-radius: 14px;
      padding: 0.85rem 0.8rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
    }
    .regs a:hover {
      border-color: rgba(20, 184, 166, 0.45);
      box-shadow: var(--cc-shadow-sm);
      transform: translateY(-1px);
    }
    .regs strong {
      display: block;
      font-size: 0.9rem;
      margin-bottom: 0.15rem;
    }
    .regs span {
      display: block;
      color: var(--cc-slate-soft);
      font-size: 0.76rem;
      line-height: 1.35;
    }

    .card-foot {
      margin: 1.1rem 0 0;
      text-align: center;
      color: var(--cc-slate-soft);
      font-size: 0.82rem;
    }
    .card-foot a {
      color: var(--cc-teal);
      font-weight: 650;
      text-decoration: none;
    }
    .card-foot a:hover { text-decoration: underline; }

    @media (max-width: 960px) {
      .auth { grid-template-columns: 1fr; }
      aside { min-height: auto; padding-bottom: 1.75rem; }
      aside h1 { max-width: none; }
      .aside-foot { display: none; }
    }
    @media (max-width: 520px) {
      .points, .regs { grid-template-columns: 1fr; }
      .card { padding: 1.4rem 1.15rem 1.15rem; border-radius: 22px; }
      h2 { font-size: 1.7rem; }
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly platform = inject(PlatformService);

  loading = false;
  error = '';
  showPassword = false;
  readonly year = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { identifier, password } = this.form.getRawValue();
    this.auth.login(identifier, password).subscribe({
      next: (res) => {
        this.loading = false;
        void this.router.navigate([panelHomeForRoles(res.user.roles)]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Login failed';
      },
    });
  }
}
