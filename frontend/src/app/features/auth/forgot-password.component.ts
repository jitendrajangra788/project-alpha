import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <div class="card">
        <h1>Forgot password</h1>
        <p class="lead">Reset your CareConnect password with a mobile OTP.</p>

        @if (phase === 'request') {
          <form [formGroup]="requestForm" (ngSubmit)="requestOtp()">
            <label>Registered mobile<input formControlName="mobile" placeholder="10-digit mobile" /></label>
            @if (error) { <p class="error">{{ error }}</p> }
            <button class="cc-btn cc-btn-accent" type="submit" [disabled]="requestForm.invalid || loading">
              {{ loading ? 'Sending…' : 'Send OTP' }}
            </button>
          </form>
        }

        @if (phase === 'reset') {
          <form [formGroup]="resetForm" (ngSubmit)="reset()">
            <label>Mobile<input formControlName="mobile" readonly /></label>
            <label>OTP<input formControlName="otp" placeholder="6-digit OTP" /></label>
            @if (devOtp) { <p class="ok">Dev OTP: {{ devOtp }}</p> }
            <label>New password<input type="password" formControlName="new_password" /></label>
            @if (error) { <p class="error">{{ error }}</p> }
            @if (success) { <p class="ok">{{ success }}</p> }
            <button class="cc-btn cc-btn-accent" type="submit" [disabled]="resetForm.invalid || loading">
              {{ loading ? 'Updating…' : 'Reset password' }}
            </button>
          </form>
        }

        <p class="hint"><a routerLink="/login">Back to login</a> · <a routerLink="/otp-verify">OTP verification</a></p>
      </div>
    </div>
  `,
  styles: `
    .wrap { min-height: calc(100vh - var(--cc-header-h)); display: grid; place-items: center; padding: 1.5rem; }
    .card {
      width: min(440px, 100%); background: white; border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius-lg); padding: 1.75rem; box-shadow: var(--cc-shadow);
    }
    h1 { margin: 0; font-family: var(--cc-display); color: var(--cc-navy); }
    .lead { margin: 0.35rem 0 1.1rem; color: var(--cc-slate); }
    form { display: grid; gap: 0.8rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; font-weight: 650; color: var(--cc-slate-soft); }
    input { border: 1px solid var(--cc-border); border-radius: 10px; padding: 0.75rem 0.85rem; font: inherit; }
    .error { color: var(--cc-danger); margin: 0; }
    .ok { color: var(--cc-teal); margin: 0; }
    .hint { margin: 1rem 0 0; color: var(--cc-slate); }
    .hint a { color: var(--cc-teal); font-weight: 650; text-decoration: none; }
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  phase: 'request' | 'reset' = 'request';
  loading = false;
  error = '';
  success = '';
  devOtp = '';

  readonly requestForm = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, Validators.minLength(10)]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    mobile: ['', Validators.required],
    otp: ['', [Validators.required, Validators.minLength(4)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  requestOtp(): void {
    if (this.requestForm.invalid) return;
    this.loading = true;
    this.error = '';
    const mobile = this.requestForm.value.mobile!;
    this.auth.forgotPassword(mobile).subscribe({
      next: (res) => {
        this.loading = false;
        this.phase = 'reset';
        this.resetForm.patchValue({ mobile });
        this.devOtp = res.dev_otp || '';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Could not send OTP';
      },
    });
  }

  reset(): void {
    if (this.resetForm.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    const { mobile, otp, new_password } = this.resetForm.getRawValue();
    this.auth.resetPassword(mobile, otp, new_password).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = res.message;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Password reset failed';
      },
    });
  }
}
