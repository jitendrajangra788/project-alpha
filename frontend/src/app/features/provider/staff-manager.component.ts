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

const TITLE_MAP: Record<string, { title: string; description: string; defaultRole: string }> = {
  DOCTOR: {
    title: 'Doctor management',
    description: 'Add, update or remove doctors linked to your organization.',
    defaultRole: 'DOCTOR',
  },
  NURSE: {
    title: 'Nurse management',
    description: 'Maintain nursing staff accounts for wards and home care.',
    defaultRole: 'NURSE',
  },
  CAREGIVER: {
    title: 'Caregiver management',
    description: 'Add and manage caregivers / attendants.',
    defaultRole: 'CAREGIVER',
  },
  ALL: {
    title: 'Staff management',
    description: 'Create, edit and deactivate organization staff with roles.',
    defaultRole: 'STAFF',
  },
};

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
          + Add {{ roleFilter === 'ALL' ? 'staff' : meta.defaultRole.toLowerCase() }}
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
            <h3>{{ editing ? 'Update staff' : 'Add staff' }}</h3>
            <button class="cc-btn cc-btn-ghost" type="button" (click)="closeForm()">Cancel</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="grid">
              <label>Full name<input formControlName="full_name" /></label>
              <label>
                Mobile
                <input formControlName="mobile" [readonly]="editing" />
              </label>
              <label>Email<input formControlName="email" type="email" /></label>
              <label>
                Role
                <select formControlName="membership_role">
                  @for (r of roleOptions; track r.value) {
                    <option [value]="r.value">{{ r.label }}</option>
                  }
                </select>
              </label>
              <label>
                {{ editing ? 'New password (optional)' : 'Login password' }}
                <input formControlName="password" type="password" autocomplete="new-password" />
              </label>
              @if (editing) {
                <label class="check">
                  <input type="checkbox" formControlName="is_active" />
                  Active in organization
                </label>
              }
            </div>
            <div class="form-actions">
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid || saving">
                {{ saving ? 'Saving…' : editing ? 'Update' : 'Add staff' }}
              </button>
            </div>
          </form>
        </section>
      }

      <section class="dash-card table-card">
        <div class="card-head">
          <h3>Staff directory</h3>
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
                    <td colspan="6" class="empty">No staff yet. Click Add to create the first member.</td>
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
    input[readonly] { background: #f4f7fc; }
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
    .check { display: flex; align-items: center; gap: 0.45rem; margin-top: 1.4rem; }
    .check input { min-width: 0; width: auto; }
    .form-actions { margin-top: 0.85rem; }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { text-align: left; padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--dash-border); font-size: 0.86rem; }
    th { background: #f7fafc; color: var(--dash-muted); }
    .acts { display: flex; gap: 0.35rem; justify-content: flex-end; }
    .danger { color: #b42318 !important; }
    .empty, .muted { color: var(--dash-muted); padding: 1rem 0.9rem; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class StaffManagerComponent implements OnInit {
  private readonly api = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly roleOptions = ROLE_OPTIONS;
  roleFilter = 'ALL';
  meta = TITLE_MAP['ALL'];

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
    full_name: ['', Validators.required],
    mobile: ['', Validators.required],
    email: [''],
    membership_role: ['STAFF', Validators.required],
    password: [''],
    is_active: [true],
  });

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
        this.error = err?.error?.detail || 'Failed to load staff.';
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editing = null;
    this.showForm = true;
    this.message = '';
    this.form.reset({
      full_name: '',
      mobile: '',
      email: '',
      membership_role: this.meta.defaultRole,
      password: '',
      is_active: true,
    });
    this.form.controls.mobile.enable();
    this.form.controls.password.setValidators(Validators.required);
    this.form.controls.password.updateValueAndValidity();
  }

  openEdit(m: OrgMember): void {
    this.editing = m;
    this.showForm = true;
    this.message = '';
    this.form.reset({
      full_name: m.full_name,
      mobile: m.mobile,
      email: m.email || '',
      membership_role: m.membership_role === 'OWNER' ? 'MANAGER' : m.membership_role,
      password: '',
      is_active: m.is_active,
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
  }

  save(): void {
    if (this.form.invalid || !this.orgId) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      full_name: raw.full_name,
      membership_role: raw.membership_role,
      email: raw.email || null,
    };
    if (raw.password) payload['password'] = raw.password;

    if (this.editing) {
      payload['is_active'] = raw.is_active;
      this.api.updateMember(this.orgId, this.editing.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.message = 'Staff updated.';
          this.closeForm();
          this.reload();
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.detail || 'Update failed.';
        },
      });
      return;
    }

    payload['mobile'] = raw.mobile;
    this.api.addMember(this.orgId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Staff added.';
        this.closeForm();
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.detail || 'Add failed.';
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
      error: (err) => (this.error = err?.error?.detail || 'Remove failed.'),
    });
  }
}
