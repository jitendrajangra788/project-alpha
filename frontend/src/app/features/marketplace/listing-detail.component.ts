import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ListingDetail, MarketplaceService } from '../../core/marketplace.service';
import { ProviderBadgeComponent } from '../../shared/provider-badge.component';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    ProviderBadgeComponent,
    BreadcrumbsComponent,
    SkeletonCardComponent,
  ],
  template: `
    <div class="page cc-container">
      @if (item) {
        <app-breadcrumbs
          [items]="[
            { label: 'Home', link: '/' },
            { label: 'Search', link: '/search', queryParams: { listing_type: item.listing_type } },
            { label: item.name }
          ]"
        />

        <section class="hero">
          <div class="cover" [style.backgroundImage]="cover"></div>
          <div class="info">
            <p class="type">{{ item.listing_type.replaceAll('_', ' ') }}</p>
            <h1>{{ item.name }}</h1>
            <p class="tag">{{ item.tagline || item.specialty || 'Healthcare provider on CareConnect' }}</p>
            <div class="badges">
              <app-provider-badge [verified]="item.is_verified" [featured]="item.is_featured" />
              @if (item.online_consultation_available) { <span class="cc-chip">Online consult</span> }
              @if (item.home_visit_available) { <span class="cc-chip">Home visit</span> }
              @if (item.sample_collection_available) { <span class="cc-chip">Home sample</span> }
            </div>
            <p class="addr">{{ item.address_line }}, {{ item.city }} {{ item.pin_code }}</p>
            <div class="cta">
              @if (item.consultation_fee != null) {
                <p class="fee">{{ item.consultation_fee | currency: 'INR':'symbol':'1.0-0' }}</p>
              }
              @if (item.phone) {
                <a class="cc-btn cc-btn-ghost" [href]="'tel:' + item.phone">Call / Enquiry</a>
              }
              <a class="cc-btn cc-btn-accent" [routerLink]="['/book', item.slug]">Book appointment</a>
            </div>
          </div>
        </section>

        <div class="grid">
          <article class="panel">
            <h2>About</h2>
            <p>{{ item.description || 'No description provided yet by this provider.' }}</p>
            <h3>Availability</h3>
            <p>{{ item.availability_summary || 'Check booking calendar for open slots.' }}</p>
            @if (item.years_of_experience != null) {
              <h3>Experience</h3>
              <p>{{ item.years_of_experience }}+ years</p>
            }
          </article>
          <article class="panel">
            <h2>Services</h2>
            <ul>
              @for (s of item.services; track s) {
                <li>{{ s }}</li>
              } @empty {
                <li>Contact provider for the latest service list.</li>
              }
            </ul>
            @if (!item.is_verified) {
              <p class="note">This listing is not marked verified. Verification badges appear only after admin review.</p>
            }
          </article>
        </div>
      } @else if (error) {
        <p class="error">{{ error }}</p>
      } @else {
        <app-skeleton-card height="320px" />
      }
    </div>
  `,
  styles: `
    .page { padding: 1.5rem 0 3rem; display: grid; gap: 1.25rem; }
    .hero {
      display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.25rem;
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius-lg);
      overflow: hidden; box-shadow: var(--cc-shadow-sm);
    }
    .cover {
      min-height: 320px;
      background:
        linear-gradient(160deg, rgba(11,31,58,0.2), rgba(15,118,110,0.35)),
        linear-gradient(135deg, #d7eef8, #c8ebe4);
      background-size: cover;
      background-position: center;
    }
    .info { padding: 1.5rem; display: grid; gap: 0.55rem; align-content: start; }
    .type {
      margin: 0; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--cc-teal); font-size: 0.75rem; font-weight: 750;
    }
    h1 { margin: 0; font-size: clamp(1.7rem, 3vw, 2.4rem); }
    .tag, .addr { margin: 0; color: var(--cc-slate); }
    .badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .cta { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin-top: 0.5rem; }
    .fee { margin: 0; font-size: 1.5rem; font-weight: 750; color: var(--cc-navy); }
    .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 1rem; }
    .panel {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1.25rem; box-shadow: var(--cc-shadow-sm);
    }
    h2, h3 { margin: 0 0 0.5rem; }
    h3 { margin-top: 1rem; }
    p, li { color: var(--cc-slate); line-height: 1.55; }
    .note { margin-top: 1rem; font-size: 0.9rem; color: #9a3412; }
    .error { padding: 2rem; color: var(--cc-danger); }
    @media (max-width: 900px) {
      .hero, .grid { grid-template-columns: 1fr; }
      .cover { min-height: 200px; }
    }
  `,
})
export class ListingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MarketplaceService);
  item: ListingDetail | null = null;
  error = '';

  get cover(): string {
    return this.item?.image_url ? `url('${this.item.image_url}')` : '';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.item = null;
      this.error = '';
      this.api.listing(slug).subscribe({
        next: (item) => (this.item = item),
        error: () => (this.error = 'Listing not found'),
      });
    });
  }
}
