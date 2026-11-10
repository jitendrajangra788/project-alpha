import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicalService } from '../../core/clinical.service';

@Component({
  selector: 'app-patient-consents',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>Consent & Privacy</h2>
          <p>Control who can access your medical records on CareConnect.</p>
        </div>
      </div>

      <article class="card">
        <h3>Grant access</h3>
        <form [formGroup]="form" (ngSubmit)="grant()">
          <label>Doctor ID<input formControlName="grantee_doctor_id" placeholder="Optional doctor UUID" /></label>
          <label>Organization ID<input formControlName="grantee_organization_id" placeholder="Optional organization UUID" /></label>
          <label>Purpose<input formControlName="purpose" /></label>
          <button class="cc-btn cc-btn-accent" type="submit" [disabled]="form.invalid">Grant consent</button>
        </form>
      </article>

      <div class="list">
        @for (c of items; track c.id) {
          <article class="card">
            <div class="row">
              <div>
                <h3>{{ c.purpose }}</h3>
                <p>Doctor: {{ c.grantee_doctor_id || '—' }} · Org: {{ c.grantee_organization_id || '—' }}</p>
              </div>
              <span class="badge" [class.ok]="c.status === 'ACTIVE'">{{ c.status }}</span>
            </div>
            @if (c.status === 'ACTIVE') {
              <button class="cc-btn cc-btn-ghost" type="button" (click)="revoke(c.id)">Revoke</button>
            }
          </article>
        } @empty {
          <article class="card empty"><p>No consents recorded yet.</p></article>
        }
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 1rem; max-width: 760px; }
    .head h2 { margin: 0 0 0.3rem; font-size: 1.35rem; }
    .head p { margin: 0; color: var(--cc-slate); }
    .card {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1rem; box-shadow: var(--cc-shadow-sm);
    }
    h3 { margin: 0 0 0.75rem; color: var(--cc-navy); font-size: 1.05rem; }
    form { display: grid; gap: 0.7rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.82rem; color: var(--cc-slate-soft); font-weight: 650; }
    input {
      border: 1px solid var(--cc-border); border-radius: 10px; padding: 0.65rem 0.75rem;
      font: inherit; color: var(--cc-ink, var(--cc-navy));
    }
    .list { display: grid; gap: 0.75rem; }
    .row { display: flex; justify-content: space-between; gap: 0.75rem; align-items: start; margin-bottom: 0.65rem; }
    .row p { margin: 0.25rem 0 0; color: var(--cc-slate); font-size: 0.88rem; }
    .badge {
      background: #fef3c7; color: #92400e; border-radius: 999px;
      padding: 0.2rem 0.6rem; font-size: 0.72rem; font-weight: 700;
    }
    .badge.ok { background: var(--cc-green-soft); color: #065f46; }
    .empty p { margin: 0; color: var(--cc-slate); }
  `,
})
export class PatientConsentsComponent implements OnInit {
  private readonly api = inject(ClinicalService);
  private readonly fb = inject(FormBuilder);
  items: any[] = [];
  readonly form = this.fb.nonNullable.group({
    grantee_doctor_id: [''],
    grantee_organization_id: [''],
    purpose: ['consultation_followup', Validators.required],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.consents().subscribe({ next: (items) => (this.items = items) });
  }

  grant(): void {
    const raw = this.form.getRawValue();
    this.api
      .createConsent({
        grantee_doctor_id: raw.grantee_doctor_id || null,
        grantee_organization_id: raw.grantee_organization_id || null,
        purpose: raw.purpose,
      })
      .subscribe({ next: () => this.reload() });
  }

  revoke(id: string): void {
    this.api.revokeConsent(id).subscribe({ next: () => this.reload() });
  }
}
