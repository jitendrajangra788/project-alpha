import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Organization } from '../../core/models';
import { OrgLocation, OrganizationService } from '../../core/organization.service';

@Component({
  selector: 'app-branch-manager',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page cc-dash">
      <div class="toolbar">
        <div>
          <h2>Branch management</h2>
          <p>Add, update or delete organization branches / locations.</p>
        </div>
        <button class="cc-btn cc-btn-accent" type="button" (click)="openCreate()" [disabled]="!orgId">+ Add branch</button>
      </div>

      <div class="dash-card filters">
        <label>
          Organization
          <select [formControl]="orgControl" (change)="onOrgChange()">
            @for (o of organizations; track o.id) {
              <option [value]="o.id">{{ o.name }}</option>
            }
          </select>
        </label>
      </div>

      @if (error) { <div class="banner err">{{ error }}</div> }
      @if (message) { <div class="banner ok">{{ message }}</div> }

      @if (showForm) {
        <section class="dash-card form-card">
          <div class="card-head">
            <h3>{{ editing ? 'Update branch' : 'Add branch' }}</h3>
            <button class="cc-btn cc-btn-ghost" type="button" (click)="closeForm()">Cancel</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="grid">
              <label>Branch name<input formControlName="name" /></label>
              <label>Phone<input formControlName="phone" /></label>
              <label>City<input formControlName="city" /></label>
              <label>PIN code<input formControlName="pin_code" /></label>
              <label class="span-2">Address<input formControlName="address_line" /></label>
              <label class="check">
                <input type="checkbox" formControlName="is_primary" />
                Primary branch
              </label>
            </div>
            <div class="form-actions">
              <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid || saving">
                {{ saving ? 'Saving…' : editing ? 'Update' : 'Add branch' }}
              </button>
            </div>
          </form>
        </section>
      }

      <section class="dash-card table-card">
        <div class="card-head">
          <h3>Branches</h3>
          <span class="pill">{{ locations.length }}</span>
        </div>
        @if (loading) {
          <p class="muted">Loading…</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th>Primary</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (l of locations; track l.id) {
                  <tr>
                    <td><strong>{{ l.name }}</strong></td>
                    <td>{{ l.address_line }}</td>
                    <td>{{ l.city }} · {{ l.pin_code }}</td>
                    <td>{{ l.phone || '—' }}</td>
                    <td>
                      <span class="dash-badge" [class.ok]="l.is_primary">{{ l.is_primary ? 'Yes' : 'No' }}</span>
                    </td>
                    <td class="acts">
                      <button class="cc-btn cc-btn-ghost" type="button" (click)="openEdit(l)">Edit</button>
                      <button class="cc-btn cc-btn-ghost danger" type="button" (click)="remove(l)">Delete</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="empty">No branches yet.</td></tr>
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
    .filters { padding: 0.75rem; }
    label { display: grid; gap: 0.28rem; font-size: 0.78rem; font-weight: 700; color: var(--dash-muted); }
    input, select {
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.65rem 0.75rem;
      font: inherit; color: var(--dash-text); min-width: 180px; background: #fff;
    }
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
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    .span-2 { grid-column: 1 / -1; }
    .check { display: flex; align-items: center; gap: 0.45rem; margin-top: 1.35rem; }
    .check input { width: auto; min-width: 0; }
    .form-actions { margin-top: 0.85rem; }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 720px; }
    th, td { text-align: left; padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--dash-border); font-size: 0.86rem; }
    th { background: #f7fafc; color: var(--dash-muted); }
    .acts { display: flex; gap: 0.35rem; justify-content: flex-end; }
    .danger { color: #b42318 !important; }
    .empty, .muted { color: var(--dash-muted); padding: 1rem 0.9rem; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class BranchManagerComponent implements OnInit {
  private readonly api = inject(OrganizationService);
  private readonly fb = inject(FormBuilder);

  organizations: Organization[] = [];
  locations: OrgLocation[] = [];
  orgId = '';
  loading = false;
  saving = false;
  error = '';
  message = '';
  showForm = false;
  editing: OrgLocation | null = null;

  readonly orgControl = this.fb.nonNullable.control('');
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address_line: ['', Validators.required],
    city: ['', Validators.required],
    pin_code: ['', Validators.required],
    phone: [''],
    is_primary: [false],
  });

  ngOnInit(): void {
    this.api.mine().subscribe({
      next: (orgs) => {
        this.organizations = orgs;
        if (orgs.length) {
          this.orgId = orgs[0].id;
          this.orgControl.setValue(this.orgId);
          this.reload();
        } else {
          this.error = 'No organization found.';
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
    this.api.listLocations(this.orgId).subscribe({
      next: (items) => {
        this.locations = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Failed to load branches.';
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editing = null;
    this.showForm = true;
    this.form.reset({ name: '', address_line: '', city: '', pin_code: '', phone: '', is_primary: false });
  }

  openEdit(l: OrgLocation): void {
    this.editing = l;
    this.showForm = true;
    this.form.reset({
      name: l.name,
      address_line: l.address_line,
      city: l.city,
      pin_code: l.pin_code,
      phone: l.phone || '',
      is_primary: l.is_primary,
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
  }

  save(): void {
    if (this.form.invalid || !this.orgId) return;
    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      address_line: raw.address_line,
      city: raw.city,
      pin_code: raw.pin_code,
      phone: raw.phone || null,
      is_primary: raw.is_primary,
    };

    const req = this.editing
      ? this.api.updateLocation(this.orgId, this.editing.id, payload)
      : this.api.addLocation(this.orgId, payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.message = this.editing ? 'Branch updated.' : 'Branch added.';
        this.closeForm();
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.detail || 'Save failed.';
      },
    });
  }

  remove(l: OrgLocation): void {
    if (!this.orgId) return;
    if (!confirm(`Delete branch “${l.name}”?`)) return;
    this.api.deleteLocation(this.orgId, l.id).subscribe({
      next: () => {
        this.message = 'Branch deleted.';
        this.reload();
      },
      error: (err) => (this.error = err?.error?.detail || 'Delete failed.'),
    });
  }
}
