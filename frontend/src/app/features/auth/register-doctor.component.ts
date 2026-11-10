import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register-doctor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <aside>
        <p class="eyebrow">Doctor registration</p>
        <h1>Personal & professional information</h1>
        <ol>
          <li [class.active]="step === 1" [class.done]="step > 1"><span>1</span> Create account</li>
          <li [class.active]="step === 2" [class.done]="step > 2"><span>2</span> Professional details</li>
          <li [class.active]="step === 3"><span>3</span> Practice location</li>
        </ol>
        <a routerLink="/login">Already have an account?</a>
      </aside>

      <section class="card">
        @if (step === 1) {
          <h2>Create your account</h2>
          <form [formGroup]="accountForm" (ngSubmit)="step = 2">
            <label>Full name *<input formControlName="full_name" /></label>
            <div class="grid2">
              <label>Mobile *<input formControlName="mobile" /></label>
              <label>Email<input type="email" formControlName="email" /></label>
            </div>
            <label>Password *<input type="password" formControlName="password" /></label>
            <button class="cc-btn cc-btn-accent" type="submit" [disabled]="accountForm.invalid">Continue</button>
          </form>
        }
        @if (step === 2) {
          <h2>Professional details</h2>
          <form [formGroup]="proForm" (ngSubmit)="step = 3">
            <div class="grid2">
              <label>Specialty<input formControlName="specialty" placeholder="Cardiology" /></label>
              <label>Qualification<input formControlName="qualification" placeholder="MBBS, MD" /></label>
            </div>
            <div class="grid2">
              <label>Registration number<input formControlName="registration_number" /></label>
              <label>Registration council<input formControlName="registration_council" /></label>
            </div>
            <div class="grid2">
              <label>Years of experience<input type="number" formControlName="years_of_experience" /></label>
              <label>Consultation fee (₹)<input type="number" formControlName="consultation_fee" /></label>
            </div>
            <label>About<textarea formControlName="about" rows="3"></textarea></label>
            <div class="actions">
              <button class="cc-btn cc-btn-ghost" type="button" (click)="step = 1">Back</button>
              <button class="cc-btn cc-btn-accent" type="submit">Continue</button>
            </div>
          </form>
        }
        @if (step === 3) {
          <h2>Practice location</h2>
          <form [formGroup]="locForm" (ngSubmit)="submit()">
            <div class="grid2">
              <label>City<input formControlName="city" /></label>
              <label>PIN code<input formControlName="pin_code" /></label>
            </div>
            @if (error) { <p class="error">{{ error }}</p> }
            <div class="actions">
              <button class="cc-btn cc-btn-ghost" type="button" (click)="step = 2">Back</button>
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="loading">
                {{ loading ? 'Submitting…' : 'Complete doctor registration' }}
              </button>
            </div>
          </form>
        }
      </section>
    </div>
  `,
  styles: `
    .wrap {
      min-height: calc(100vh - var(--cc-header-h)); display: grid; grid-template-columns: 280px 1fr;
      gap: 1rem; padding: 1.5rem; max-width: 1100px; margin: 0 auto;
    }
    aside, .card {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      box-shadow: var(--cc-shadow-sm); padding: 1.35rem;
    }
    .eyebrow { margin: 0; color: var(--cc-teal); font-size: 0.75rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.06em; }
    h1 { margin: 0.4rem 0 1rem; font-size: 1.35rem; font-family: var(--cc-display); }
    ol { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.55rem; }
    li { display: flex; gap: 0.65rem; align-items: center; color: var(--cc-slate-soft); font-weight: 650; }
    li span {
      width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; border: 1px solid var(--cc-border); font-size: 0.8rem;
    }
    li.active { color: var(--cc-navy); }
    li.active span, li.done span { background: var(--cc-teal); color: white; border-color: var(--cc-teal); }
    aside a { color: var(--cc-teal); font-weight: 650; text-decoration: none; }
    h2 { margin: 0 0 1rem; }
    form { display: grid; gap: 0.8rem; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; font-weight: 650; color: var(--cc-slate-soft); }
    input, textarea {
      border: 1px solid var(--cc-border); border-radius: 10px; padding: 0.7rem 0.8rem; font: inherit; color: var(--cc-navy);
    }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .error { color: var(--cc-danger); margin: 0; }
    @media (max-width: 860px) { .wrap, .grid2 { grid-template-columns: 1fr; } }
  `,
})
export class RegisterDoctorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  step = 1;
  loading = false;
  error = '';

  readonly accountForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.minLength(10)]],
    email: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly proForm = this.fb.nonNullable.group({
    specialty: [''],
    qualification: [''],
    registration_number: [''],
    registration_council: [''],
    years_of_experience: [null as number | null],
    consultation_fee: [null as number | null],
    about: [''],
  });

  readonly locForm = this.fb.nonNullable.group({
    city: [''],
    pin_code: [''],
  });

  submit(): void {
    if (this.accountForm.invalid) {
      this.step = 1;
      return;
    }
    this.loading = true;
    this.error = '';
    const account = this.accountForm.getRawValue();
    const pro = this.proForm.getRawValue();
    const loc = this.locForm.getRawValue();
    const payload: Record<string, unknown> = {
      full_name: account.full_name,
      mobile: account.mobile,
      password: account.password,
    };
    if (account.email) payload['email'] = account.email;
    Object.entries({ ...pro, ...loc }).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') payload[k] = v;
    });
    this.auth.registerDoctor(payload).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/doctor']);
      },
      error: (err) => {
        this.loading = false;
        this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Doctor registration failed';
      },
    });
  }
}
