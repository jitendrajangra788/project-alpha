import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { Category, ListingCard, MarketplaceService } from '../../core/marketplace.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatPaginatorModule,
    ListingCardComponent,
    SkeletonCardComponent,
    BreadcrumbsComponent,
  ],
  template: `
    <div class="page cc-container">
      <app-breadcrumbs [items]="crumbs" />
      <div class="intro">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageIntro }}</p>
        </div>
        <p class="count">{{ total }} providers found</p>
      </div>

      <div class="layout">
        <aside [class.open]="filtersOpen">
          <div class="aside-head">
            <h2>Filters</h2>
            <button type="button" class="mobile-toggle" (click)="filtersOpen = !filtersOpen">
              {{ filtersOpen ? 'Hide' : 'Show' }}
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="apply()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Search</mat-label>
              <input matInput formControlName="q" placeholder="Doctor, hospital, test..." />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Location / City</mat-label>
              <input matInput formControlName="city" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>PIN code</mat-label>
              <input matInput formControlName="pin_code" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Category</mat-label>
              <mat-select formControlName="category">
                <mat-option value="">All</mat-option>
                @for (c of categories; track c.code) {
                  <mat-option [value]="c.code">{{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Type</mat-label>
              <mat-select formControlName="listing_type">
                <mat-option value="">All</mat-option>
                <mat-option value="DOCTOR">Doctor</mat-option>
                <mat-option value="HOSPITAL">Hospital</mat-option>
                <mat-option value="CLINIC">Clinic</mat-option>
                <mat-option value="NURSING_HOME">Nursing Home</mat-option>
                <mat-option value="HOME_CARE">Home Care</mat-option>
                <mat-option value="LAB">Lab</mat-option>
                <mat-option value="DIAGNOSTIC_CENTRE">Diagnostic Centre</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Sort</mat-label>
              <mat-select formControlName="sort">
                <mat-option value="relevance">Relevance</mat-option>
                <mat-option value="fee_asc">Fee: Low to High</mat-option>
                <mat-option value="fee_desc">Fee: High to Low</mat-option>
                <mat-option value="experience">Experience</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-checkbox formControlName="verified_only">Verified only</mat-checkbox>
            <mat-checkbox formControlName="online_consultation">Online consultation</mat-checkbox>
            <mat-checkbox formControlName="home_visit">Home visit</mat-checkbox>
            <mat-checkbox formControlName="sample_collection">Sample collection</mat-checkbox>
            <button class="cc-btn cc-btn-accent full-btn" type="submit">Apply filters</button>
          </form>
        </aside>

        <section>
          <div class="grid">
            @if (loading) {
              @for (_ of [1,2,3,4,5,6]; track $index) { <app-skeleton-card /> }
            } @else {
              @for (item of sortedItems; track item.id) {
                <app-listing-card [item]="item" />
              } @empty {
                <div class="empty">
                  <h3>No providers match these filters</h3>
                  <p>Try another city, clear filters, or list your business on CareConnect.</p>
                  <a class="cc-btn cc-btn-ghost" routerLink="/list-your-business">List Your Business</a>
                </div>
              }
            }
          </div>
          <mat-paginator
            [length]="total"
            [pageIndex]="page - 1"
            [pageSize]="pageSize"
            [pageSizeOptions]="[12, 24, 48]"
            (page)="onPage($event)"
          />
        </section>
      </div>
    </div>
  `,
  styles: `
    .page { padding: 1.5rem 0 3rem; }
    .intro {
      display: flex; justify-content: space-between; gap: 1rem; align-items: end;
      margin-bottom: 1.25rem; flex-wrap: wrap;
    }
    h1 { margin: 0 0 0.35rem; font-size: clamp(1.7rem, 3vw, 2.3rem); }
    .intro p { margin: 0; color: var(--cc-slate); }
    .count {
      background: white; border: 1px solid var(--cc-border); border-radius: 999px;
      padding: 0.45rem 0.9rem; font-weight: 700; color: var(--cc-navy);
    }
    .layout { display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; }
    aside {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1rem; height: fit-content; position: sticky; top: calc(var(--cc-header-h) + 12px);
      box-shadow: var(--cc-shadow-sm);
    }
    .aside-head { display: flex; justify-content: space-between; align-items: center; }
    .mobile-toggle { display: none; border: 0; background: none; color: var(--cc-teal); font-weight: 700; cursor: pointer; }
    .full { width: 100%; display: block; margin-bottom: 0.35rem; }
    .full-btn { width: 100%; margin-top: 0.75rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .empty {
      grid-column: 1 / -1; background: white; border: 1px dashed var(--cc-border);
      border-radius: var(--cc-radius); padding: 2rem; text-align: center;
    }
    h2, h3 { color: var(--cc-navy); margin-top: 0; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      aside { position: static; }
      .mobile-toggle { display: inline; }
      aside:not(.open) form { display: none; }
    }
  `,
})
export class SearchComponent implements OnInit {
  private readonly api = inject(MarketplaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  categories: Category[] = [];
  items: ListingCard[] = [];
  total = 0;
  page = 1;
  pageSize = 12;
  loading = true;
  filtersOpen = true;
  pageTitle = 'Search results';
  pageIntro = 'Find doctors, hospitals, clinics, home care and laboratories.';
  crumbs = [
    { label: 'Home', link: '/' },
    { label: 'Search' },
  ];

  readonly form = this.fb.nonNullable.group({
    q: [''],
    city: [''],
    pin_code: [''],
    category: [''],
    listing_type: [''],
    sort: ['relevance'],
    verified_only: [false],
    online_consultation: [false],
    home_visit: [false],
    sample_collection: [false],
  });

  get sortedItems(): ListingCard[] {
    const sort = this.form.controls.sort.value;
    const list = [...this.items];
    if (sort === 'fee_asc') {
      return list.sort((a, b) => (a.consultation_fee ?? 1e9) - (b.consultation_fee ?? 1e9));
    }
    if (sort === 'fee_desc') {
      return list.sort((a, b) => (b.consultation_fee ?? -1) - (a.consultation_fee ?? -1));
    }
    if (sort === 'experience') {
      return list.sort((a, b) => (b.years_of_experience ?? 0) - (a.years_of_experience ?? 0));
    }
    return list;
  }

  ngOnInit(): void {
    this.api.categories().subscribe({ next: (c) => (this.categories = c) });
    this.route.queryParamMap.subscribe((params) => {
      this.form.patchValue({
        q: params.get('q') || '',
        city: params.get('city') || '',
        pin_code: params.get('pin_code') || '',
        category: params.get('category') || '',
        listing_type: params.get('listing_type') || '',
        sort: params.get('sort') || 'relevance',
        verified_only: params.get('verified_only') === 'true',
        online_consultation: params.get('online_consultation') === 'true',
        home_visit: params.get('home_visit') === 'true',
        sample_collection: params.get('sample_collection') === 'true',
      });
      this.page = Number(params.get('page') || 1);
      this.pageSize = Number(params.get('page_size') || 12);
      this.updateCopy();
      this.load();
    });
  }

  updateCopy(): void {
    const type = this.form.controls.listing_type.value;
    const map: Record<string, [string, string]> = {
      DOCTOR: ['Doctor directory', 'Browse physicians by specialty, fee and availability.'],
      HOSPITAL: ['Hospital directory', 'Compare hospitals and facilities in your city.'],
      CLINIC: ['Clinic directory', 'Find neighborhood clinics and OPD services.'],
      NURSING_HOME: ['Nursing home directory', 'Explore nursing homes and recovery care.'],
      HOME_CARE: ['Home care directory', 'Home nursing, attendants and recovery support.'],
      LAB: ['Laboratory directory', 'Diagnostic labs and sample collection options.'],
      DIAGNOSTIC_CENTRE: ['Diagnostic centres', 'Imaging and diagnostic service providers.'],
    };
    const pair = map[type] || ['Search results', 'Find doctors, hospitals, clinics, home care and laboratories.'];
    this.pageTitle = pair[0];
    this.pageIntro = pair[1];
    this.crumbs = [
      { label: 'Home', link: '/' },
      { label: this.pageTitle },
    ];
  }

  load(): void {
    this.loading = true;
    const raw = this.form.getRawValue();
    this.api
      .search({
        q: raw.q,
        city: raw.city,
        pin_code: raw.pin_code,
        category: raw.category,
        listing_type: raw.listing_type,
        verified_only: raw.verified_only || undefined,
        online_consultation: raw.online_consultation || undefined,
        home_visit: raw.home_visit || undefined,
        sample_collection: raw.sample_collection || undefined,
        page: this.page,
        page_size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.total = 0;
          this.loading = false;
        },
      });
  }

  apply(): void {
    const raw = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...raw, page: 1, page_size: this.pageSize },
    });
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    const raw = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...raw, page: this.page, page_size: this.pageSize },
    });
  }
}
