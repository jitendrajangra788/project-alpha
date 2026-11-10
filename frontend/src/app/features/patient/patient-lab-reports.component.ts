import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClinicalService } from '../../core/clinical.service';

@Component({
  selector: 'app-patient-lab-reports',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>My Lab Reports</h2>
          <p>Published diagnostic results shared with you.</p>
        </div>
        <a class="cc-btn cc-btn-ghost" routerLink="/patient/find/labs">Find labs</a>
      </div>
      <div class="list">
        @for (r of items; track r.id) {
          <article class="card">
            <div class="row">
              <div>
                <h3>{{ r.title }}</h3>
                <p>{{ r.status }} · {{ (r.published_at || r.created_at) | date: 'medium' }}</p>
              </div>
              <span class="badge" [class.ok]="r.status === 'PUBLISHED'">{{ r.status }}</span>
            </div>
            <ul>
              @for (res of r.results; track res.id) {
                <li [class.abnormal]="res.is_abnormal">
                  <strong>{{ res.parameter_name }}</strong>
                  <span>{{ res.value }} {{ res.unit }} <em>({{ res.reference_range }})</em></span>
                </li>
              }
            </ul>
          </article>
        } @empty {
          <article class="card empty">
            <h3>No lab reports yet</h3>
            <p>Reports appear after a lab publishes results for your bookings.</p>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 1rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: start; }
    h2 { margin: 0 0 0.3rem; font-size: 1.35rem; }
    .head p { margin: 0; color: var(--cc-slate); }
    .list { display: grid; gap: 0.85rem; }
    .card {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1rem; box-shadow: var(--cc-shadow-sm);
    }
    .row { display: flex; justify-content: space-between; gap: 0.75rem; align-items: start; }
    h3 { margin: 0; color: var(--cc-navy); }
    .row p { margin: 0.25rem 0 0; color: var(--cc-slate-soft); font-size: 0.88rem; }
    .badge {
      background: #fef3c7; color: #92400e; border-radius: 999px;
      padding: 0.2rem 0.6rem; font-size: 0.72rem; font-weight: 700;
    }
    .badge.ok { background: var(--cc-green-soft); color: #065f46; }
    ul { list-style: none; padding: 0; margin: 0.85rem 0 0; display: grid; gap: 0.45rem; }
    li {
      display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
      padding: 0.65rem 0.75rem; border-radius: 12px; background: var(--cc-sky-soft); border: 1px solid var(--cc-border);
    }
    li.abnormal { border-color: #fecaca; background: #fff7f7; color: var(--cc-danger); }
    li span { color: var(--cc-slate); }
    li em { font-style: normal; color: var(--cc-slate-soft); }
    .empty h3 { margin: 0 0 0.35rem; }
    .empty p { margin: 0; color: var(--cc-slate); }
  `,
})
export class PatientLabReportsComponent implements OnInit {
  private readonly api = inject(ClinicalService);
  items: any[] = [];
  ngOnInit(): void {
    this.api.myLabReports().subscribe({ next: (items) => (this.items = items) });
  }
}
