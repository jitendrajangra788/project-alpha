import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Organization } from '../../core/models';
import { OrgMember, OrganizationService } from '../../core/organization.service';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'CAREGIVER', label: 'Caregiver' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'LAB_TECH', label: 'Lab technician' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'STAFF', label: 'General staff' },
];

const TITLE_MAP: Record<string, { title: string; description: string; defaultRole: string; entity: string }> = {
  DOCTOR: {
    title: 'Doctor management',
    description: 'Add doctors with login access and basic professional details.',
    defaultRole: 'DOCTOR',
    entity: 'doctor',
  },
  NURSE: {
    title: 'Nurse management',
    description: 'Maintain nursing staff accounts for wards and home care.',
    defaultRole: 'NURSE',
    entity: 'nurse',
  },
  CAREGIVER: {
    title: 'Caregiver management',
    description: 'Add and manage caregivers / attendants.',
    defaultRole: 'CAREGIVER',
    entity: 'caregiver',
  },
  ALL: {
    title: 'Staff management',
    description: 'Create, edit and deactivate organization staff with roles.',
    defaultRole: 'STAFF',
    entity: 'staff',
  },
};

function apiError(err: any, fallback: string): string {
  const detail = err?.error?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item: any) => {
        const field = Array.isArray(item?.loc) ? item.loc.filter((x: unknown) => x !== 'body').join('.') : '';
        const msg = item?.msg || item?.message || '';
        return field ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message;
  return fallback;
}

@Component({
  selector: 'app-staff-manager',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <h2>{{ meta.title }}</h2>
          <p>{{ meta.description }}</p>
        </div>
        <button class="cc-btn cc-btn-accent" type="button" (click)="openCreate()" [disabled]="!orgId">
          + Add {{ meta.entity }}
        </button>
      </div>

      <div class="dash-card filters">
        <label>
          Organization
          <select [formControl]="orgControl" (change)="onOrgChange()">
            @for (o of organizations; track o.id) {
              <option [value]="o.id">{{ o.name }} ({{ o.organization_type }})</option>
            }
          </select>
        </label>
        @if (roleFilter === 'ALL') {
          <label>
            Role filter
            <select [formControl]="roleFilterControl" (change)="reload()">
              <option value="">All roles</option>
              @for (r of roleOptions; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </label>
        }
      </div>

      @if (error) {
        <div class="banner err">{{ error }}</div>
      }
      @if (message) {
        <div class="banner ok">{{ message }}</div>
      }

      @if (showForm) {
        <section class="dash-card form-card">
          <div class="card-head">
            <h3>{{ editing ? 'Update' : 'Add' }} {{ meta.entity }}</h3>
            <button class="cc-btn cc-btn-ghost" type="button" (click)="closeForm()">Cancel</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="grid">
              <label>
                Full name *
                <input formControlName="full_name" placeholder="Dr. Anita Sharma" autocomplete="name" />
                @if (showInvalid('full_name')) {
                  <span class="field-err">Name is required (min 2 characters).</span>
                }
              </label>
              <label>
                Mobile *
                <input
                  formControlName="mobile"
                  [readonly]="!!editing"
                  inputmode="numeric"
                  placeholder="10-digit mobile"
                  autocomplete="tel"
                />
                @if (showInvalid('mobile')) {
                  <span class="field-err">Enter a valid 10-digit mobile number.</span>
                }
              </label>
              <label>
                Email (optional)
                <input formControlName="email" type="email" placeholder="doctor@example.com" autocomplete="email" />
                @if (showInvalid('email')) {
                  <span class="field-err">Enter a valid email or leave blank.</span>
                }
              </label>
              <label>
                Role *
                <select formControlName="membership_role">
                  @for (r of roleOptions; track r.value) {
                    <option [value]="r.value">{{ r.label }}</option>
                  }
                </select>
              </label>
              <label>
                {{ editing ? 'New password (optional)' : 'Login password *' }}
                <input
                  formControlName="password"
                  type="password"
                  autocomplete="new-password"
                  [placeholder]="editing ? 'Leave blank to keep current' : 'Min 8 characters'"
                />
                @if (showInvalid('password')) {
                  <span class="field-err">Password must be at least 8 characters.</span>
                }
              </label>
              @if (editing) {
                <label class="check">
                  <input type="checkbox" formControlName="is_active" />
                  Active in organization
                </label>
              }
            </div>

            @if (isDoctorForm) {
              <div class="doctor-block">
                <h4>Doctor profile</h4>
                <p class="hint">These details create the doctor profile used for booking and video consult.</p>
                <div class="grid">
                  <label>
                    Specialty
                    <input formControlName="specialty" placeholder="General Physician" />
                  </label>
                  <label>
                    Qualification
                    <input formControlName="qualification" placeholder="MBBS, MD" />
                  </label>
                  <label>
                    Registration no.
                    <input formControlName="registration_number" placeholder="MCI / state council no." />
                  </label>
                  <label>
                    Consultation fee (₹)
                    <input formControlName="consultation_fee" type="number" min="0" placeholder="500" />
                  </label>
                </div>
              </div>
            }

            <div class="form-actions">
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid || saving">
                {{ saving ? 'Saving…' : editing ? 'Update' : 'Add ' + meta.entity }}
              </button>
              <span class="hint">Required: name, mobile{{ editing ? '' : ', password (8+)' }}.</span>
            </div>
          </form>
        </section>
      }

      <section class="dash-card table-card">
        <div class="card-head">
          <h3>{{ roleFilter === 'DOCTOR' ? 'Doctors' : 'Staff directory' }}</h3>
          <span class="pill">{{ members.length }}</span>
        </div>
        @if (loading) {
          <p class="muted">Loading…</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (m of members; track m.id) {
                  <tr>
                    <td><strong>{{ m.full_name }}</strong></td>
                    <td>{{ m.mobile }}</td>
                    <td>{{ m.email || '—' }}</td>
                    <td><span class="dash-badge info">{{ m.membership_role }}</span></td>
                    <td>
                      <span class="dash-badge" [class.ok]="m.is_active" [class.danger]="!m.is_active">
                        {{ m.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="acts">
                      <button class="cc-btn cc-btn-ghost" type="button" (click)="openEdit(m)" [disabled]="m.membership_role === 'OWNER'">
                        Edit
                      </button>
                      <button
                        class="cc-btn cc-btn-ghost danger"
                        type="button"
                        (click)="remove(m)"
                        [disabled]="m.membership_role === 'OWNER' || !m.is_active"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="empty">No {{ meta.entity }} yet. Click Add to create the first one.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .toolbar { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: end; }
    h2 { margin: 0; font-size: 1.15rem; font-family: var(--cc-font); }
    .toolbar p { margin: 0.2rem 0 0; color: var(--dash-muted); font-size: 0.88rem; }
    .filters { display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem; }
    label { display: grid; gap: 0.28rem; font-size: 0.78rem; font-weight: 700; color: var(--dash-muted); }
    input, select {
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.65rem 0.75rem;
      font: inherit; color: var(--dash-text); min-width: 180px; background: #fff;
    }
    input[readonly], select:disabled { background: #f4f7fc; }
    .banner { border-radius: 10px; padding: 0.7rem 0.85rem; font-size: 0.88rem; }
    .banner.err { background: #ffe8e8; color: #b42318; }
    .banner.ok { background: #d9f5f2; color: #0b6b66; }
    .form-card, .table-card { padding: 0; overflow: hidden; }
    .card-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 0.9rem; border-bottom: 1px solid var(--dash-border);
    }
    .card-head h3 { margin: 0; font-size: 0.95rem; }
    .pill {
      background: #eef5ff; color: var(--dash-blue); border-radius: 999px;
      padding: 0.15rem 0.55rem; font-size: 0.75rem; font-weight: 700;
    }
    form { padding: 0.85rem 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.65rem; }
    .doctor-block {
      margin-top: 0.85rem; padding: 0.85rem; border-radius: 12px;
      background: #f7fbff; border: 1px solid var(--dash-border);
    }
    .doctor-block h4 { margin: 0 0 0.2rem; font-size: 0.9rem; color: var(--dash-text); }
    .hint { margin: 0; color: var(--dash-muted); font-size: 0.8rem; font-weight: 600; }
    .field-err { color: #b42318; font-size: 0.72rem; font-weight: 650; }
    .check { display: flex; align-items: center; gap: 0.45rem; margin-top: 1.4rem; }
    .check input { min-width: 0; width: auto; }
    .form-actions { margin-top: 0.85rem; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { text-align: left; padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--dash-border); font-size: 0.86rem; }
    th { background: #f7fafc; color: var(--dash-muted); }
    .acts { display: flex; gap: 0.35rem; justify-content: flex-end; }
    .danger { color: #b42318 !important; }
    .empty, .muted { color: var(--dash-muted); padding: 1rem 0.9rem; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .filters { flex-direction: column; }
      label, input, select { min-width: 0; width: 100%; }
    }
    @media (max-width: 560px) {
      .toolbar { align-items: stretch; }
      .toolbar .cc-btn { width: 100%; }
      .acts { flex-wrap: wrap; }
    }
  `,
})
export class StaffManagerComponent implements OnInit {
  private readonly api = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly roleOptions = ROLE_OPTIONS;
  roleFilter = 'ALL';
  meta = TITLE_MAP['ALL'];
  submitted = false;

  organizations: Organization[] = [];
  members: OrgMember[] = [];
  orgId = '';
  loading = false;
  saving = false;
  error = '';
  message = '';
  showForm = false;
  editing: OrgMember | null = null;

  readonly orgControl = this.fb.nonNullable.control('');
  readonly roleFilterControl = this.fb.nonNullable.control('');

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.email]],
    membership_role: ['STAFF', Validators.required],
    password: [''],
    is_active: [true],
    specialty: [''],
    qualification: [''],
    registration_number: [''],
    consultation_fee: ['' as string | number],
  });

  get isDoctorForm(): boolean {
    return this.form.controls.membership_role.value === 'DOCTOR' || this.roleFilter === 'DOCTOR';
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.roleFilter = (data['roleFilter'] as string) || 'ALL';
      this.meta = TITLE_MAP[this.roleFilter] || TITLE_MAP['ALL'];
      this.form.patchValue({ membership_role: this.meta.defaultRole });
      if (this.orgId) this.reload();
    });

    this.api.mine().subscribe({
      next: (orgs) => {
        this.organizations = orgs;
        if (orgs.length) {
          this.orgId = orgs[0].id;
          this.orgControl.setValue(this.orgId);
          this.reload();
        } else {
          this.error = 'No organization found. Register an organization first.';
        }
      },
      error: () => (this.error = 'Could not load organizations.'),
    });
  }

  showInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  onOrgChange(): void {
    this.orgId = this.orgControl.value;
    this.closeForm();
    this.reload();
  }

  reload(): void {
    if (!this.orgId) return;
    this.loading = true;
    this.error = '';
    const role =
      this.roleFilter !== 'ALL' ? this.roleFilter : this.roleFilterControl.value || undefined;
    this.api.listMembers(this.orgId, role).subscribe({
      next: (items) => {
        this.members = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = apiError(err, 'Failed to load staff.');
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editing = null;
    this.showForm = true;
    this.submitted = false;
    this.message = '';
    this.error = '';
    this.form.reset({
      full_name: '',
      mobile: '',
      email: '',
      membership_role: this.meta.defaultRole,
      password: '',
      is_active: true,
      specialty: '',
      qualification: '',
      registration_number: '',
      consultation_fee: '',
    });
    this.form.controls.mobile.enable();
    this.form.controls.membership_role.enable();
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    if (this.roleFilter !== 'ALL') {
      this.form.controls.membership_role.disable({ emitEvent: false });
    }
  }

  openEdit(m: OrgMember): void {
    this.editing = m;
    this.showForm = true;
    this.submitted = false;
    this.message = '';
    this.error = '';
    this.form.reset({
      full_name: m.full_name,
      mobile: m.mobile,
      email: m.email || '',
      membership_role: m.membership_role === 'OWNER' ? 'MANAGER' : m.membership_role,
      password: '',
      is_active: m.is_active,
      specialty: '',
      qualification: '',
      registration_number: '',
      consultation_fee: '',
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.membership_role.enable({ emitEvent: false });
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
    this.submitted = false;
    this.form.controls.membership_role.enable({ emitEvent: false });
  }

  save(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.orgId) {
      this.error = 'Please fix the highlighted fields.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.message = '';
    const raw = this.form.getRawValue();
    const mobile = String(raw.mobile || '').replace(/\D/g, '').slice(-10);
    const feeRaw = raw.consultation_fee;
    const fee =
      feeRaw === '' || feeRaw === null || feeRaw === undefined ? null : Number(feeRaw);

    const payload: Record<string, unknown> = {
      full_name: String(raw.full_name || '').trim(),
      membership_role: raw.membership_role,
      email: raw.email?.trim() ? raw.email.trim() : null,
    };
    if (raw.password) payload['password'] = raw.password;

    if (raw.membership_role === 'DOCTOR') {
      if (raw.specialty?.trim()) payload['specialty'] = raw.specialty.trim();
      if (raw.qualification?.trim()) payload['qualification'] = raw.qualification.trim();
      if (raw.registration_number?.trim()) payload['registration_number'] = raw.registration_number.trim();
      if (fee !== null && !Number.isNaN(fee)) payload['consultation_fee'] = fee;
    }

    if (this.editing) {
      payload['is_active'] = raw.is_active;
      this.api.updateMember(this.orgId, this.editing.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.message = `${this.meta.entity[0].toUpperCase()}${this.meta.entity.slice(1)} updated.`;
          this.closeForm();
          this.reload();
        },
        error: (err) => {
          this.saving = false;
          this.error = apiError(err, 'Update failed.');
        },
      });
      return;
    }

    payload['mobile'] = mobile;
    this.api.addMember(this.orgId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.message = `${this.meta.entity[0].toUpperCase()}${this.meta.entity.slice(1)} added successfully.`;
        this.closeForm();
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        this.error = apiError(err, 'Add failed. Check mobile/email is unique and password is 8+ characters.');
      },
    });
  }

  remove(m: OrgMember): void {
    if (!this.orgId) return;
    if (!confirm(`Remove ${m.full_name} from this organization?`)) return;
    this.api.removeMember(this.orgId, m.id).subscribe({
      next: () => {
        this.message = `${m.full_name} removed.`;
        this.reload();
      },
      error: (err) => (this.error = apiError(err, 'Remove failed.')),
    });
  }
}
