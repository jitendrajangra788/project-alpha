import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { AuthService } from '../../core/auth.service';
import { OrganizationService } from '../../core/organization.service';
import { ORG_TYPES } from '../../core/models';

@Component({
  selector: 'app-list-business',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatStepperModule,
  ],
  template: `
    <div class="wrap">
      <mat-card>
        <h1>List your healthcare business</h1>
        <p>Register your hospital, clinic, nursing home, home-care agency or laboratory.</p>

        <mat-stepper [linear]="true" #stepper>
          <mat-step [stepControl]="accountForm" label="Account">
            <form [formGroup]="accountForm">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Owner full name</mat-label>
                <input matInput formControlName="full_name" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Mobile</mat-label>
                <input matInput formControlName="mobile" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Password</mat-label>
                <input matInput type="password" formControlName="password" />
              </mat-form-field>
              <button mat-button matStepperNext type="button" [disabled]="accountForm.invalid && !auth.isAuthenticated()">
                Continue
              </button>
              @if (auth.isAuthenticated()) {
                <p class="ok">Signed in as {{ auth.user()?.full_name }}. You can continue to organization details.</p>
              }
            </form>
          </mat-step>

          <mat-step [stepControl]="orgForm" label="Organization">
            <form [formGroup]="orgForm">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Organization name</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Type</mat-label>
                <mat-select formControlName="organization_type">
                  @for (t of orgTypes; track t) {
                    <mat-option [value]="t">{{ t.replace('_', ' ') }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Contact number</mat-label>
                <input matInput formControlName="contact_number" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Address</mat-label>
                <input matInput formControlName="address_line" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>City</mat-label>
                <input matInput formControlName="city" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>PIN code</mat-label>
                <input matInput formControlName="pin_code" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>License / registration number</mat-label>
                <input matInput formControlName="license_number" />
              </mat-form-field>
              <button mat-button matStepperPrevious type="button">Back</button>
              <button mat-flat-button color="primary" type="button" (click)="createOrg()" [disabled]="orgForm.invalid || loading">
                {{ loading ? 'Submitting...' : 'Submit for verification' }}
              </button>
            </form>
          </mat-step>
        </mat-stepper>

        @if (error) { <p class="error">{{ error }}</p> }
        @if (success) {
          <p class="ok">{{ success }} <a routerLink="/provider">Go to provider dashboard</a></p>
        }
      </mat-card>
    </div>
  `,
  styles: `
    .wrap { padding: 2rem 1rem; display: grid; place-items: center; }
    mat-card { width: min(760px, 100%); padding: 1.5rem; }
    .full { width: 100%; display: block; margin-bottom: 0.5rem; }
    .error { color: #b91c1c; }
    .ok { color: #0f766e; }
  `,
})
export class ListBusinessComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly orgs = inject(OrganizationService);
  private readonly router = inject(Router);

  readonly orgTypes = ORG_TYPES;
  loading = false;
  error = '';
  success = '';

  readonly accountForm = this.fb.nonNullable.group({
    full_name: ['', Validators.required],
    mobile: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly orgForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    organization_type: ['CLINIC', Validators.required],
    contact_number: ['', Validators.required],
    address_line: ['', Validators.required],
    city: ['', Validators.required],
    pin_code: ['', Validators.required],
    license_number: [''],
  });

  createOrg(): void {
    if (this.orgForm.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';

    const continueCreate = () => {
      const payload = {
        ...this.orgForm.getRawValue(),
        email: this.accountForm.value.email || this.auth.user()?.email || undefined,
        submit_for_verification: true,
      };
      this.orgs.create(payload).subscribe({
        next: () => {
          this.loading = false;
          this.success = 'Organization submitted. Verification is pending admin review.';
          void this.router.navigate(['/provider']);
        },
        error: (err) => {
          this.loading = false;
          this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Could not create organization';
        },
      });
    };

    if (this.auth.isAuthenticated()) {
      continueCreate();
      return;
    }

    this.auth.registerPatient(this.accountForm.getRawValue()).subscribe({
      next: () => continueCreate(),
      error: (err) => {
        // If already registered, try login
        const { email, password, mobile } = this.accountForm.getRawValue();
        this.auth.login(email || mobile, password).subscribe({
          next: () => continueCreate(),
          error: () => {
            this.loading = false;
            this.error = typeof err?.error?.detail === 'string' ? err.error.detail : 'Account step failed';
          },
        });
      },
    });
  }
}
