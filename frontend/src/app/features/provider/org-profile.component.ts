import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Organization } from '../../core/models';
import { OrganizationService } from '../../core/organization.service';

@Component({
  selector: 'app-org-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <h2>Organization profile</h2>
          <p>Update organization details and verification documents.</p>
        </div>
      </div>

      <div class="dash-card filters">
        <label>
          Organization
          <select [formControl]="orgControl" (change)="onOrgChange()">
            @for (o of organizations; track o.id) {
              <option [value]="o.id">{{ o.name }} ({{ o.verification_status }})</option>
            }
          </select>
        </label>
      </div>

      @if (error) { <div class="banner err">{{ error }}</div> }
      @if (message) { <div class="banner ok">{{ message }}</div> }

      @if (current) {
        <section class="dash-card form-card">
          <div class="card-head">
            <h3>{{ current.name }}</h3>
            <span class="dash-badge" [class.ok]="current.is_verified" [class.warn]="current.verification_status === 'PENDING'">
              {{ current.verification_status }}
            </span>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="grid">
              <label>Name<input formControlName="name" /></label>
              <label>Contact<input formControlName="contact_number" /></label>
              <label>Email<input formControlName="email" type="email" /></label>
              <label>License<input formControlName="license_number" /></label>
              <label>City<input formControlName="city" /></label>
              <label>State<input formControlName="state" /></label>
              <label>PIN code<input formControlName="pin_code" /></label>
              <label class="span-2">Address<input formControlName="address_line" /></label>
              <label class="span-2">Description<textarea formControlName="description" rows="3"></textarea></label>
            </div>
            <div class="form-actions">
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid || saving">
                {{ saving ? 'Saving…' : 'Update profile' }}
              </button>
              <button class="cc-btn cc-btn-ghost" type="button" (click)="submitVerification()" [disabled]="current.is_verified">
                Submit for verification
              </button>
            </div>
          </form>
        </section>

        <section class="dash-card">
          <div class="card-head">
            <h3>Documents</h3>
          </div>
          <div class="docs">
            @for (d of current.documents; track d.id) {
              <article>
                <strong>{{ d.document_type }}</strong>
                <span>{{ d.file_name }}</span>
              </article>
            } @empty {
              <p class="muted">No documents uploaded.</p>
            }
          </div>
          <div class="upload">
            <select [formControl]="docType">
              <option value="license">License</option>
              <option value="registration">Registration</option>
              <option value="gst">GST</option>
              <option value="other">Other</option>
            </select>
            <input type="file" (change)="onFile($event)" accept=".pdf,image/*" />
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .toolbar h2 { margin: 0; font-size: 1.15rem; font-family: var(--cc-font); }
    .toolbar p { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.88rem; }
    .filters { padding: 0.75rem; }
    label { display: grid; gap: 0.28rem; font-size: 0.78rem; font-weight: 700; color: var(--dash-muted); }
    input, select, textarea {
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.65rem 0.75rem;
      font: inherit; color: var(--dash-text); background: #fff;
    }
    .banner { border-radius: 10px; padding: 0.7rem 0.85rem; font-size: 0.88rem; }
    .banner.err { background: #ffe8e8; color: #b42318; }
    .banner.ok { background: #d9f5f2; color: #0b6b66; }
    .form-card { padding: 0; overflow: hidden; }
    .card-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 0.9rem; border-bottom: 1px solid var(--dash-border);
    }
    .card-head h3 { margin: 0; font-size: 0.95rem; }
    form { padding: 0.85rem 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    .span-2 { grid-column: 1 / -1; }
    .form-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.85rem; }
    .docs { display: grid; gap: 0.45rem; padding: 0 0.9rem 0.7rem; }
    .docs article {
      display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.65rem 0.75rem; background: #f8fbff;
    }
    .upload { display: flex; gap: 0.55rem; flex-wrap: wrap; padding: 0 0.9rem 0.9rem; align-items: center; }
    .muted { color: var(--dash-muted); padding: 0 0.9rem; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class OrgProfileComponent implements OnInit {
  private readonly api = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  organizations: Organization[] = [];
  current: Organization | null = null;
  orgId = '';
  saving = false;
  error = '';
  message = '';

  readonly orgControl = this.fb.nonNullable.control('');
  readonly docType = this.fb.nonNullable.control('license');
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    contact_number: ['', Validators.required],
    email: [''],
    license_number: [''],
    city: ['', Validators.required],
    state: [''],
    pin_code: ['', Validators.required],
    address_line: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.api.mine().subscribe({
      next: (orgs) => {
        this.organizations = orgs;
        if (orgs.length) {
          this.orgId = orgs[0].id;
          this.orgControl.setValue(this.orgId);
          this.load();
        } else {
          this.error = 'No organization found.';
        }
      },
      error: () => (this.error = 'Could not load organizations.'),
    });
  }

  onOrgChange(): void {
    this.orgId = this.orgControl.value;
    this.load();
  }

  load(): void {
    if (!this.orgId) return;
    this.api.get(this.orgId).subscribe({
      next: (org) => {
        this.current = org;
        this.form.reset({
          name: org.name,
          contact_number: org.contact_number,
          email: org.email || '',
          license_number: org.license_number || '',
          city: org.city,
          state: org.state || '',
          pin_code: org.pin_code,
          address_line: org.address_line,
          description: org.description || '',
        });
      },
      error: (err) => (this.error = err?.error?.detail || 'Failed to load profile.'),
    });
  }

  save(): void {
    if (this.form.invalid || !this.orgId) return;
    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    this.api
      .update(this.orgId, {
        name: raw.name,
        contact_number: raw.contact_number,
        email: raw.email || null,
        license_number: raw.license_number || null,
        city: raw.city,
        state: raw.state || null,
        pin_code: raw.pin_code,
        address_line: raw.address_line,
        description: raw.description || null,
      })
      .subscribe({
        next: (org) => {
          this.saving = false;
          this.current = org;
          this.message = 'Profile updated.';
          this.organizations = this.organizations.map((o) => (o.id === org.id ? org : o));
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.detail || 'Update failed.';
        },
      });
  }

  submitVerification(): void {
    if (!this.orgId) return;
    this.api.submitVerification(this.orgId).subscribe({
      next: (org) => {
        this.current = org;
        this.message = 'Submitted for verification.';
      },
      error: (err) => (this.error = err?.error?.detail || 'Submit failed.'),
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.orgId) return;
    this.api.uploadDocument(this.orgId, this.docType.value, file).subscribe({
      next: (org) => {
        this.current = org;
        this.message = 'Document uploaded.';
        input.value = '';
      },
      error: () => (this.error = 'Upload failed.'),
    });
  }
}
