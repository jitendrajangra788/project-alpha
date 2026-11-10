import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { OrganizationService } from '../../core/organization.service';
import { ClinicalService } from '../../core/clinical.service';

@Component({
  selector: 'app-lab-reports',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  template: `
    <h1>Lab report workflow</h1>
    <p>Draft reports stay private until approved/published. Patients only see PUBLISHED reports.</p>
    <div class="list">
      @for (r of reports; track r.id) {
        <mat-card>
          <h2>{{ r.title }}</h2>
          <p>Status: {{ r.status }} · Patient: {{ r.patient_id }}</p>
          <div class="actions">
            @if (r.status === 'DRAFT' || r.status === 'REJECTED') {
              <button mat-stroked-button type="button" (click)="submit(r.id)">Submit for approval</button>
            }
            @if (r.status === 'PENDING_APPROVAL') {
              <button mat-flat-button color="primary" type="button" (click)="publish(r.id)">Approve & publish</button>
            }
          </div>
        </mat-card>
      } @empty {
        <mat-card><p>No reports for your lab organizations yet.</p></mat-card>
      }
    </div>
  `,
  styles: `
    .list { display: grid; gap: 1rem; }
    mat-card { padding: 1rem; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
  `,
})
export class LabReportsComponent implements OnInit {
  private readonly orgsApi = inject(OrganizationService);
  private readonly clinical = inject(ClinicalService);
  reports: any[] = [];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.orgsApi.mine().subscribe({
      next: (orgs) => {
        this.reports = [];
        orgs.forEach((o) => {
          this.clinical.orgLabReports(o.id).subscribe({
            next: (items) => (this.reports = [...this.reports, ...items]),
          });
        });
      },
    });
  }

  submit(id: string): void {
    this.clinical.submitLabReport(id).subscribe({ next: () => this.reload() });
  }

  publish(id: string): void {
    this.clinical.publishLabReport(id).subscribe({ next: () => this.reload() });
  }
}
