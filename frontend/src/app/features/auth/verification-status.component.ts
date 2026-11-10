import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OrganizationService } from '../../core/organization.service';
import { Organization } from '../../core/models';

@Component({
  selector: 'app-verification-status',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <div class="card">
        <h1>Document verification status</h1>
        <p class="lead">Track organization verification and uploaded documents after provider registration.</p>

        @if (!auth.isAuthenticated()) {
          <p class="error">Please <a routerLink="/login">login</a> to view your verification status.</p>
        } @else if (loading) {
          <p>Loading…</p>
        } @else {
          <div class="list">
            @for (org of organizations; track org.id) {
              <article>
                <div class="row">
                  <div>
                    <h2>{{ org.name }}</h2>
                    <p>{{ org.organization_type }} · {{ org.city }}</p>
                  </div>
                  <span class="badge" [class.ok]="org.is_verified" [class.warn]="org.verification_status === 'PENDING'">
                    {{ org.verification_status }}
                  </span>
                </div>
                <p>Documents uploaded: {{ org.documents.length }}</p>
                <div class="actions">
                  <label class="file">
                    Upload document
                    <input type="file" accept=".pdf,image/*" (change)="onFile($event, org)" />
                  </label>
                  <button
                    class="cc-btn cc-btn-ghost"
                    type="button"
                    (click)="resubmit(org)"
                    [disabled]="org.verification_status === 'VERIFIED'"
                  >
                    Resubmit verification
                  </button>
                </div>
              </article>
            } @empty {
              <article>
                <p>No organizations found.</p>
                <a class="cc-btn cc-btn-accent" routerLink="/list-your-business">Register organization</a>
              </article>
            }
          </div>
          @if (message) { <p class="ok">{{ message }}</p> }
        }
      </div>
    </div>
  `,
  styles: `
    .wrap { min-height: calc(100vh - var(--cc-header-h)); display: grid; place-items: start center; padding: 1.5rem; }
    .card {
      width: min(820px, 100%); background: white; border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius); padding: 1.5rem; box-shadow: var(--cc-shadow-sm);
    }
    h1 { margin: 0; font-family: var(--cc-display); }
    .lead { margin: 0.35rem 0 1.1rem; color: var(--cc-slate); }
    .list { display: grid; gap: 0.85rem; }
    article {
      border: 1px solid var(--cc-border); border-radius: 14px; padding: 1rem; background: var(--cc-sky-soft);
    }
    .row { display: flex; justify-content: space-between; gap: 0.75rem; align-items: start; }
    h2 { margin: 0; font-size: 1.05rem; color: var(--cc-navy); }
    p { margin: 0.3rem 0 0; color: var(--cc-slate); }
    .badge {
      display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 999px;
      background: #e2e8f0; color: #334155; font-size: 0.72rem; font-weight: 750;
    }
    .badge.warn { background: #fef3c7; color: #92400e; }
    .badge.ok { background: var(--cc-green-soft); color: #065f46; }
    .actions { display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center; margin-top: 0.75rem; }
    .file { font-size: 0.82rem; font-weight: 650; color: var(--cc-slate-soft); display: grid; gap: 0.25rem; }
    .error { color: var(--cc-danger); }
    .ok { color: var(--cc-teal); margin-top: 0.85rem; }
  `,
})
export class VerificationStatusComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly orgsApi = inject(OrganizationService);

  organizations: Organization[] = [];
  loading = false;
  message = '';

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) return;
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.orgsApi.mine().subscribe({
      next: (items) => {
        this.organizations = items;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onFile(event: Event, org: Organization): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.orgsApi.uploadDocument(org.id, 'license', file).subscribe({
      next: () => {
        this.message = `Document uploaded for ${org.name}`;
        this.reload();
      },
      error: () => (this.message = 'Upload failed'),
    });
  }

  resubmit(org: Organization): void {
    this.orgsApi.submitVerification(org.id).subscribe({
      next: () => {
        this.message = 'Resubmitted for verification';
        this.reload();
      },
    });
  }
}
