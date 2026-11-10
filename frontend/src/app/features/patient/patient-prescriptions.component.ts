import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClinicalService } from '../../core/clinical.service';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>My Prescriptions</h2>
          <p>Medicines and instructions from your CareConnect doctors.</p>
        </div>
        <a class="cc-btn cc-btn-ghost" routerLink="/patient">Back to dashboard</a>
      </div>
      <div class="list">
        @for (rx of items; track rx.id) {
          <article class="card">
            <div class="row">
              <div>
                <h3>Diagnosis: {{ rx.diagnosis || 'N/A' }}</h3>
                <p>Version {{ rx.version }} · {{ rx.created_at | date: 'medium' }}</p>
              </div>
              <span class="badge">Prescription</span>
            </div>
            @if (rx.instructions) {
              <p class="note">{{ rx.instructions }}</p>
            }
            <ul>
              @for (m of rx.medicines; track m.id) {
                <li>
                  <strong>{{ m.medicine_name }}</strong>
                  <span>{{ m.dosage }} · {{ m.frequency }} · {{ m.duration }}</span>
                </li>
              }
            </ul>
          </article>
        } @empty {
          <article class="card empty">
            <h3>No prescriptions yet</h3>
            <p>They appear after a doctor publishes a prescription for you.</p>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: start; }
    h2 { margin: 0 0 0.3rem; font-size: 1.35rem; }
    .head p, .note { margin: 0; color: var(--cc-slate); }
    .list { display: grid; gap: 0.85rem; }
    .card {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1rem; box-shadow: var(--cc-shadow-sm);
    }
    .row { display: flex; justify-content: space-between; gap: 0.75rem; align-items: start; }
    h3 { margin: 0; color: var(--cc-navy); font-size: 1.05rem; }
    .row p { margin: 0.25rem 0 0; color: var(--cc-slate-soft); font-size: 0.88rem; }
    .badge {
      background: var(--cc-sky); color: var(--cc-navy); border-radius: 999px;
      padding: 0.2rem 0.6rem; font-size: 0.72rem; font-weight: 700;
    }
    .note { margin-top: 0.75rem !important; }
    ul { list-style: none; padding: 0; margin: 0.85rem 0 0; display: grid; gap: 0.45rem; }
    li {
      display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
      padding: 0.65rem 0.75rem; border-radius: 12px; background: var(--cc-sky-soft); border: 1px solid var(--cc-border);
    }
    li span { color: var(--cc-slate); font-size: 0.88rem; }
    .empty h3 { margin: 0 0 0.35rem; }
    .empty p { margin: 0; }
  `,
})
export class PatientPrescriptionsComponent implements OnInit {
  private readonly api = inject(ClinicalService);
  items: any[] = [];
  ngOnInit(): void {
    this.api.prescriptions().subscribe({ next: (items) => (this.items = items) });
  }
}
