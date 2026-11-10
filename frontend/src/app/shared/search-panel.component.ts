import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Category } from '../core/marketplace.service';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <form class="panel" [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" class="grow">
        <mat-label>Search service, doctor, hospital or lab</mat-label>
        <input matInput formControlName="q" placeholder="Cardiologist, CBC, home nursing..." />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Location</mat-label>
        <input matInput formControlName="city" placeholder="City or area" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Category</mat-label>
        <mat-select formControlName="category">
          <mat-option value="">All categories</mat-option>
          @for (c of categories; track c.code) {
            <mat-option [value]="c.code">{{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button class="cc-btn cc-btn-accent search-btn" type="submit">Search</button>
    </form>
    @if (suggestions.length) {
      <div class="suggestions">
        <span>Suggestions:</span>
        @for (s of suggestions; track s) {
          <a [routerLink]="['/search']" [queryParams]="{ q: s }">{{ s }}</a>
        }
      </div>
    }
  `,
  styles: `
    .panel {
      display: grid;
      grid-template-columns: 1.5fr 0.9fr 0.9fr auto;
      gap: 0.75rem;
      align-items: start;
      padding: 1rem;
      background: rgba(255,255,255,0.96);
      border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius-lg);
      box-shadow: var(--cc-shadow);
    }
    .grow { min-width: 0; }
    .search-btn { min-width: 120px; margin-top: 0.35rem; }
    .suggestions {
      display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: center;
      margin-top: 0.9rem; color: var(--cc-slate-soft); font-size: 0.9rem;
    }
    .suggestions a {
      text-decoration: none;
      color: var(--cc-navy-soft);
      background: white;
      border: 1px solid var(--cc-border);
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      font-weight: 600;
    }
    .suggestions a:hover { border-color: var(--cc-teal); color: var(--cc-teal); }
    @media (max-width: 900px) {
      .panel { grid-template-columns: 1fr; }
      .search-btn { width: 100%; }
    }
  `,
})
export class SearchPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  @Input() categories: Category[] = [];
  @Input() suggestions: string[] = [
    'Cardiologist',
    'Dentist',
    'General Physician',
    'Blood Test',
    'Full Body Checkup',
    'Home Nursing',
    'Hospital',
  ];
  @Input() set initial(value: { q?: string; city?: string; category?: string } | null) {
    if (!value) return;
    this.form.patchValue({
      q: value.q || '',
      city: value.city || 'Lucknow',
      category: value.category || '',
    });
  }
  @Output() searched = new EventEmitter<Record<string, string>>();

  readonly form = this.fb.nonNullable.group({
    q: [''],
    city: ['Lucknow'],
    category: [''],
  });

  submit(): void {
    const raw = this.form.getRawValue();
    this.searched.emit(raw);
    void this.router.navigate(['/search'], { queryParams: raw });
  }
}
