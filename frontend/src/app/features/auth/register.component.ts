import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <aside class="steps">
        <p class="eyebrow">Patient registration</p>
        <h1>Create your CareConnect patient account</h1>
        <ol>
          <li [class.active]="step === 1" [class.done]="step > 1"><span>1</span> Personal information</li>
          <li [class.active]="step === 2" [class.done]="step > 2"><span>2</span> Contact & security</li>
          <li [class.active]="step === 3"><span>3</span> Review & submit</li>
        </ol>
        <a routerLink="/login">Already registered? Login</a>
      </aside>

      <section class="card">
        @if (step === 1) {
          <h2>Personal information</h2>
          <form [formGroup]="personalForm" (ngSubmit)="next()">
            <div class="grid2">
              <label>Full name *<input formControlName="full_name" placeholder="Enter full name" /></label>
              <label>Gender
                <select formControlName="gender">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <label>Date of birth<input type="date" formControlName="date_of_birth" /></label>
            <button class="cc-btn cc-btn-accent" type="submit" [disabled]="personalForm.invalid">Next</button>
          </form>
        }

        @if (step === 2) {
          <h2>Contact & security</h2>
          <form [formGroup]="accountForm" (ngSubmit)="next()">
            <div class="grid2">
              <label>Mobile *<input formControlName="mobile" placeholder="10-digit mobile" /></label>
              <label>Email<input type="email" formControlName="email" placeholder="optional@email.com" /></label>
            </div>
            <label>Password *<input type="password" formControlName="password" placeholder="Min 8 characters" /></label>
            <div class="actions">
              <button class="cc-btn cc-btn-ghost" type="button" (click)="step = 1">Back</button>
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="accountForm.invalid">Next</button>
            </div>
          </form>
        }

        @if (step === 3) {
          <h2>Review & submit</h2>
          <div class="review">
            <p><strong>Name:</strong> {{ personalForm.value.full_name }}</p>
            <p><strong>Mobile:</strong> {{ accountForm.value.mobile }}</p>
            <p><strong>Email:</strong> {{ accountForm.value.email || '—' }}</p>
            <p><strong>Gender:</strong> {{ personalForm.value.gender || '—' }}</p>
            <p><strong>DOB:</strong> {{ personalForm.value.date_of_birth || '—' }}</p>
          </div>
          @if (error) { <p class="error">{{ error }}</p> }
          <div class="actions">
            <button class="cc-btn cc-btn-ghost" type="button" (click)="step = 2">Back</button>
            <button class="cc-btn cc-btn-accent" type="button" (click)="submit()" [disabled]="loading">
              {{ loading ? 'Creating…' : 'Create patient account' }}
            </button>
          </div>
          <p class="hint">Need OTP verification later? <a routerLink="/otp-verify">Open OTP page</a></p>
        }
      </section>
    </div>
  `,
  styles: `
    .wrap {
      min-height: calc(100vh - var(--cc-header-h)); display: grid; grid-template-columns: 280px 1fr;
      gap: 1rem; padding: 1.5rem; max-width: 1100px; margin: 0 auto;
    }
    .steps, .card {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      box-shadow: var(--cc-shadow-sm); padding: 1.35rem;
    }
    .eyebrow { margin: 0; color: var(--cc-teal); font-size: 0.75rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.06em; }
    h1 { margin: 0.4rem 0 1rem; font-size: 1.35rem; font-family: var(--cc-display); color: var(--cc-navy); }
    ol { list-style: none; padding: 0; margin: 0 0 1.25rem; display: grid; gap: 0.55rem; }
    li { display: flex; gap: 0.65rem; align-items: center; color: var(--cc-slate-soft); font-weight: 650; }
    li span {
      width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center;
      border: 1px solid var(--cc-border); font-size: 0.8rem;
    }
    li.active { color: var(--cc-navy); }
    li.active span, li.done span { background: var(--cc-teal); color: white; border-color: var(--cc-teal); }
    .steps a { color: var(--cc-teal); font-weight: 650; text-decoration: none; }
    h2 { margin: 0 0 1rem; color: var(--cc-navy); }
    form, .review { display: grid; gap: 0.8rem; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; font-weight: 650; color: var(--cc-slate-soft); }
    input, select {
      border: 1px solid var(--cc-border); border-radius: 10px; padding: 0.7rem 0.8rem; font: inherit; color: var(--cc-navy);
    }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .error { color: var(--cc-danger); margin: 0; }
    .hint { margin: 1rem 0 0; color: var(--cc-slate); }
    .review p { margin: 0; color: var(--cc-slate); }
    @media (max-width: 860px) {
      .wrap { grid-template-columns: 1fr; }
      .grid2 { grid-template-columns: 1fr; }
    }
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  step = 1;
  loading = false;
  error = '';

  readonly personalForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    gender: [''],
    date_of_birth: [''],
  });

  readonly accountForm = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, Validators.minLength(10)]],
    email: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  next(): void {
    if (this.step === 1 && this.personalForm.valid) this.step = 2;
    else if (this.step === 2 && this.accountForm.valid) this.step = 3;
  }

  submit(): void {
    if (this.personalForm.invalid || this.accountForm.invalid) return;
    this.loading = true;
    this.error = '';
    const personal = this.personalForm.getRawValue();
    const account = this.accountForm.getRawValue();
    const payload: Record<string, unknown> = {
      full_name: personal.full_name,
      mobile: account.mobile,
      password: account.password,
    };
    if (account.email) payload['email'] = account.email;
    if (personal.gender) payload['gender'] = personal.gender;
    if (personal.date_of_birth) payload['date_of_birth'] = personal.date_of_birth;
    this.auth.registerPatient(payload).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/patient']);
      },
      error: (err) => {
        this.loading = false;
        this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Registration failed';
      },
    });
  }
}
