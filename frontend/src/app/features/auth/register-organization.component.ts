import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OrganizationService } from '../../core/organization.service';

const LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  CLINIC: 'Clinic',
  NURSING_HOME: 'Nursing Home',
  HOME_CARE: 'Home Care Agency',
  LAB: 'Lab / Diagnostic Centre',
  DIAGNOSTIC_CENTRE: 'Diagnostic Centre',
};

@Component({
  selector: 'app-register-organization',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <aside>
        <p class="eyebrow">{{ label }} registration</p>
        <h1>List your {{ label.toLowerCase() }} on CareConnect</h1>
        <ol>
          <li [class.active]="step === 1" [class.done]="step > 1"><span>1</span> Owner account</li>
          <li [class.active]="step === 2" [class.done]="step > 2"><span>2</span> Organization details</li>
          <li [class.active]="step === 3"><span>3</span> Documents & submit</li>
        </ol>
        <a routerLink="/list-your-business">All provider types</a>
      </aside>

      <section class="card">
        @if (step === 1) {
          <h2>Owner account</h2>
          @if (auth.isAuthenticated()) {
            <p class="ok">Signed in as {{ auth.user()?.full_name }}. Continue with organization details.</p>
            <button class="cc-btn cc-btn-accent" type="button" (click)="step = 2">Continue</button>
          } @else {
            <form [formGroup]="accountForm" (ngSubmit)="step = 2">
              <label>Owner full name *<input formControlName="full_name" /></label>
              <div class="grid2">
                <label>Mobile *<input formControlName="mobile" /></label>
                <label>Email *<input type="email" formControlName="email" /></label>
              </div>
              <label>Password *<input type="password" formControlName="password" /></label>
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="accountForm.invalid">Continue</button>
            </form>
          }
        }

        @if (step === 2) {
          <h2>{{ label }} details</h2>
          <form [formGroup]="orgForm" (ngSubmit)="step = 3">
            <label>Organization name *<input formControlName="name" /></label>
            <div class="grid2">
              <label>Contact number *<input formControlName="contact_number" /></label>
              <label>License / registration no.<input formControlName="license_number" /></label>
            </div>
            <label>Address *<input formControlName="address_line" /></label>
            <div class="grid2">
              <label>City *<input formControlName="city" /></label>
              <label>PIN code *<input formControlName="pin_code" /></label>
            </div>
            <label>Description<textarea formControlName="description" rows="3"></textarea></label>
            <div class="actions">
              <button class="cc-btn cc-btn-ghost" type="button" (click)="step = 1">Back</button>
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="orgForm.invalid">Continue</button>
            </div>
          </form>
        }

        @if (step === 3) {
          <h2>Documents & submit</h2>
          <p class="lead">Upload a license or registration document, then submit for admin verification.</p>
          <label class="file">
            Document (PDF/image)
            <input type="file" accept=".pdf,image/*" (change)="onFile($event)" />
          </label>
          @if (fileName) { <p class="ok">Selected: {{ fileName }}</p> }
          @if (error) { <p class="error">{{ error }}</p> }
          @if (success) {
            <p class="ok">{{ success }}</p>
            <div class="actions">
              <a class="cc-btn cc-btn-accent" routerLink="/verification-status">View verification status</a>
              <a class="cc-btn cc-btn-ghost" routerLink="/provider">Provider dashboard</a>
            </div>
          } @else {
            <div class="actions">
              <button class="cc-btn cc-btn-ghost" type="button" (click)="step = 2">Back</button>
              <button class="cc-btn cc-btn-accent" type="button" (click)="submit()" [disabled]="loading">
                {{ loading ? 'Submitting…' : 'Submit for verification' }}
              </button>
            </div>
          }
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
    h1 { margin: 0.4rem 0 1rem; font-size: 1.3rem; font-family: var(--cc-display); }
    ol { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.55rem; }
    li { display: flex; gap: 0.65rem; align-items: center; color: var(--cc-slate-soft); font-weight: 650; }
    li span {
      width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; border: 1px solid var(--cc-border); font-size: 0.8rem;
    }
    li.active { color: var(--cc-navy); }
    li.active span, li.done span { background: var(--cc-teal); color: white; border-color: var(--cc-teal); }
    aside a { color: var(--cc-teal); font-weight: 650; text-decoration: none; }
    h2 { margin: 0 0 0.85rem; }
    .lead { margin: 0 0 0.85rem; color: var(--cc-slate); }
    form { display: grid; gap: 0.8rem; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; font-weight: 650; color: var(--cc-slate-soft); }
    input, textarea {
      border: 1px solid var(--cc-border); border-radius: 10px; padding: 0.7rem 0.8rem; font: inherit; color: var(--cc-navy);
    }
    .file input { padding: 0.45rem; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .error { color: var(--cc-danger); margin: 0; }
    .ok { color: var(--cc-teal); margin: 0 0 0.75rem; }
    @media (max-width: 860px) { .wrap, .grid2 { grid-template-columns: 1fr; } }
  `,
})
export class RegisterOrganizationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly orgs = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  orgType = 'CLINIC';
  label = 'Clinic';
  step = 1;
  loading = false;
  error = '';
  success = '';
  file: File | null = null;
  fileName = '';
  createdOrgId = '';

  readonly accountForm = this.fb.nonNullable.group({
    full_name: ['', Validators.required],
    mobile: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly orgForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    contact_number: ['', Validators.required],
    address_line: ['', Validators.required],
    city: ['', Validators.required],
    pin_code: ['', Validators.required],
    license_number: [''],
    description: [''],
  });

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.orgType = (data['orgType'] as string) || 'CLINIC';
      this.label = LABELS[this.orgType] || this.orgType;
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] || null;
    this.fileName = this.file?.name || '';
  }

  submit(): void {
    if (this.orgForm.invalid) {
      this.step = 2;
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';

    const create = () => {
      const payload = {
        ...this.orgForm.getRawValue(),
        organization_type: this.orgType,
        email: this.accountForm.value.email || this.auth.user()?.email || undefined,
        submit_for_verification: true,
      };
      this.orgs.create(payload).subscribe({
        next: (org) => {
          this.createdOrgId = org.id;
          if (this.file) {
            this.orgs.uploadDocument(org.id, 'license', this.file).subscribe({
              next: () => this.finish('Organization submitted with document. Admin verification pending.'),
              error: () => this.finish('Organization submitted. Document upload failed — upload again from provider dashboard.'),
            });
          } else {
            this.finish('Organization submitted for verification. Upload documents from verification status if needed.');
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Could not create organization';
        },
      });
    };

    if (this.auth.isAuthenticated()) {
      create();
      return;
    }

    this.auth.registerPatient(this.accountForm.getRawValue()).subscribe({
      next: () => create(),
      error: () => {
        const { email, password, mobile } = this.accountForm.getRawValue();
        this.auth.login(email || mobile, password).subscribe({
          next: () => create(),
          error: (err) => {
            this.loading = false;
            this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Account step failed';
          },
        });
      },
    });
  }

  private finish(message: string): void {
    this.loading = false;
    this.success = message;
  }
}
