import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ListingCard, MarketplaceService } from '../../core/marketplace.service';
import { ListingCardComponent } from '../../shared/listing-card.component';

const TYPE_LABEL: Record<string, string> = {
  DOCTOR: 'Doctors',
  HOSPITAL: 'Hospitals',
  CLINIC: 'Clinics',
  NURSING_HOME: 'Nursing Homes',
  HOME_CARE: 'Home Care',
  LAB: 'Labs & Tests',
};

@Component({
  selector: 'app-panel-find',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ListingCardComponent],
  template: `
    <div class="page cc-dash">
      <div class="head">
        <div>
          <h2>Find {{ title }}</h2>
          <p>Search stays inside your Patient Panel — results open booking without leaving CareConnect.</p>
        </div>
        <a class="cc-btn cc-btn-ghost" routerLink="/patient">Dashboard</a>
      </div>

      <form class="dash-card filters" [formGroup]="form" (ngSubmit)="search()">
        <input formControlName="q" placeholder="Name, specialty, city…" />
        <input formControlName="city" placeholder="City" />
        <button class="cc-btn cc-btn-accent" type="submit">Search</button>
      </form>

      @if (loading) {
        <p class="muted">Loading…</p>
      } @else if (error) {
        <p class="err">{{ error }}</p>
      } @else {
        <p class="muted">{{ total }} results</p>
        <div class="grid">
          @for (item of items; track item.id) {
            <app-listing-card [item]="item" />
          } @empty {
            <div class="dash-card empty">No providers found. Try another city or keyword.</div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .page { display: grid; gap: 0.7rem; }
    .head { display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; align-items: start; }
    h2 { margin: 0 0 0.2rem; font-size: 1.15rem; font-family: var(--cc-font); color: var(--dash-text); }
    .head p { margin: 0; color: var(--dash-muted); font-size: 0.88rem; }
    .filters {
      display: grid; grid-template-columns: 1.4fr 0.8fr auto; gap: 0.5rem; padding: 0.75rem; align-items: center;
    }
    input {
      border: 1px solid var(--dash-border); border-radius: 10px; padding: 0.7rem 0.8rem; font: inherit;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.7rem; }
    .muted { margin: 0; color: var(--dash-muted); font-size: 0.86rem; }
    .err { margin: 0; color: var(--cc-danger); }
    .empty { padding: 1rem; color: var(--dash-muted); }
    @media (max-width: 720px) { .filters { grid-template-columns: 1fr; } }
  `,
})
export class PanelFindComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MarketplaceService);
  private readonly fb = inject(FormBuilder);

  listingType = 'DOCTOR';
  title = 'Doctors';
  items: ListingCard[] = [];
  total = 0;
  loading = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    q: [''],
    city: [''],
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.form.patchValue({ q });
    this.route.data.subscribe((data) => {
      this.listingType = (data['listingType'] as string) || 'DOCTOR';
      this.title = TYPE_LABEL[this.listingType] || this.listingType;
      this.search();
    });
  }

  search(): void {
    this.loading = true;
    this.error = '';
    const { q, city } = this.form.getRawValue();
    this.api
      .search({
        q: q || undefined,
        city: city || undefined,
        listing_type: this.listingType,
        page: 1,
        page_size: 24,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items || [];
          this.total = res.total ?? this.items.length;
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load marketplace results.';
          this.loading = false;
        },
      });
  }
}
