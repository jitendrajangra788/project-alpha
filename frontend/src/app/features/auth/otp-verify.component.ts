import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <div class="card">
        <h1>OTP verification</h1>
        <p class="lead">Verify your mobile number for login, registration or password recovery.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label>Mobile<input formControlName="mobile" placeholder="10-digit mobile" /></label>
          <label>Purpose
            <select formControlName="purpose">
              <option value="login">Login</option>
              <option value="register">Registration</option>
              <option value="password_reset">Password reset</option>
            </select>
          </label>
          @if (otpSent) {
            <label>OTP code<input formControlName="otp" placeholder="Enter OTP" /></label>
            @if (devOtp) { <p class="ok">Dev OTP: {{ devOtp }}</p> }
          }
          @if (error) { <p class="error">{{ error }}</p> }
          @if (success) { <p class="ok">{{ success }}</p> }
          <div class="actions">
            <button class="cc-btn cc-btn-ghost" type="button" (click)="send()" [disabled]="form.controls.mobile.invalid || loading">
              {{ otpSent ? 'Resend OTP' : 'Send OTP' }}
            </button>
            @if (otpSent) {
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid || loading">
                {{ loading ? 'Verifying…' : 'Verify OTP' }}
              </button>
            }
          </div>
        </form>
        <p class="hint"><a routerLink="/login">Login</a> · <a routerLink="/forgot-password">Forgot password</a></p>
      </div>
    </div>
  `,
  styles: `
    .wrap { min-height: calc(100vh - var(--cc-header-h)); display: grid; place-items: center; padding: 1.5rem; }
    .card {
      width: min(440px, 100%); background: white; border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius-lg); padding: 1.75rem; box-shadow: var(--cc-shadow);
    }
    h1 { margin: 0; font-family: var(--cc-display); }
    .lead { margin: 0.35rem 0 1.1rem; color: var(--cc-slate); }
    form { display: grid; gap: 0.8rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; font-weight: 650; color: var(--cc-slate-soft); }
    input, select { border: 1px solid var(--cc-border); border-radius: 10px; padding: 0.75rem 0.85rem; font: inherit; }
    .actions { display: flex; gap: 0.55rem; flex-wrap: wrap; }
    .error { color: var(--cc-danger); margin: 0; }
    .ok { color: var(--cc-teal); margin: 0; }
    .hint { margin: 1rem 0 0; color: var(--cc-slate); }
    .hint a { color: var(--cc-teal); font-weight: 650; text-decoration: none; }
  `,
})
export class OtpVerifyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  loading = false;
  otpSent = false;
  error = '';
  success = '';
  devOtp = '';

  readonly form = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, Validators.minLength(10)]],
    purpose: ['login', Validators.required],
    otp: [''],
  });

  send(): void {
    const { mobile, purpose } = this.form.getRawValue();
    if (!mobile) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.auth.requestOtp(mobile, purpose).subscribe({
      next: (res) => {
        this.loading = false;
        this.otpSent = true;
        this.devOtp = res.dev_otp || '';
        this.form.controls.otp.setValidators([Validators.required, Validators.minLength(4)]);
        this.form.controls.otp.updateValueAndValidity();
        this.success = res.message || 'OTP sent';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Could not send OTP';
      },
    });
  }

  onSubmit(): void {
    const { mobile, purpose, otp } = this.form.getRawValue();
    if (!otp) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.auth.verifyOtp(mobile, otp, purpose).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = res.message;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'OTP verification failed';
      },
    });
  }
}
