import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { Organization } from '../../core/models';

@Component({
  selector: 'app-admin-verifications',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <h1>Provider verifications</h1>
    <div class="list">
      @for (org of items; track org.id) {
        <mat-card>
          <h2>{{ org.name }}</h2>
          <p>{{ org.organization_type }} · {{ org.city }} · {{ org.verification_status }}</p>
          <p>Documents: {{ org.documents.length }}</p>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Notes</mat-label>
            <input matInput [(ngModel)]="notes[org.id]" />
          </mat-form-field>
          <div class="actions">
            <button mat-flat-button color="primary" type="button" (click)="act(org, 'UNDER_REVIEW')">Under review</button>
            <button mat-flat-button color="accent" type="button" (click)="act(org, 'VERIFIED')">Verify</button>
            <button mat-stroked-button color="warn" type="button" (click)="act(org, 'REJECTED')">Reject</button>
            <button mat-button type="button" (click)="act(org, 'PENDING', true)">Request documents</button>
          </div>
        </mat-card>
      } @empty {
        <mat-card><p>No pending verifications.</p></mat-card>
      }
    </div>
    @if (message) { <p>{{ message }}</p> }
  `,
  styles: `
    .list { display: grid; gap: 1rem; }
    mat-card { padding: 1rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .full { width: 100%; }
  `,
})
export class AdminVerificationsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  items: Organization[] = [];
  notes: Record<string, string> = {};
  message = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.admin.verifications().subscribe({ next: (items) => (this.items = items) });
  }

  act(org: Organization, status: string, requestDocs = false): void {
    this.admin
      .setVerification(
        org.id,
        status,
        this.notes[org.id],
        requestDocs ? 'Please upload license and registration documents.' : undefined
      )
      .subscribe({
        next: () => {
          this.message = `${org.name} updated to ${status}`;
          this.reload();
        },
        error: (err) => {
          this.message = typeof err?.error?.detail === 'string' ? err.error.detail : 'Action failed';
        },
      });
  }
}
