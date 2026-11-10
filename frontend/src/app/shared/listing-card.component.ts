import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ListingCard } from '../core/marketplace.service';
import { ProviderBadgeComponent } from './provider-badge.component';

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DecimalPipe, ProviderBadgeComponent],
  template: `
    <article class="card">
      <div class="media" [style.backgroundImage]="cover">
        <div class="badges">
          <app-provider-badge [verified]="item.is_verified" [featured]="item.is_featured" />
        </div>
      </div>
      <div class="body">
        <p class="type">{{ typeLabel }}</p>
        <h3>{{ item.name }}</h3>
        <p class="meta">
          {{ item.specialty || item.tagline || typeLabel }}
          · {{ item.city }}{{ item.area ? ', ' + item.area : '' }}
        </p>
        @if (item.years_of_experience != null) {
          <p class="meta">{{ item.years_of_experience }}+ years experience</p>
        }
        @if (item.rating_count > 0) {
          <p class="rating">★ {{ item.rating_avg | number: '1.1-1' }} ({{ item.rating_count }})</p>
        }
        @if (item.consultation_fee != null) {
          <p class="fee">From {{ item.consultation_fee | currency: 'INR':'symbol':'1.0-0' }}</p>
        }
        <p class="avail">{{ item.availability_summary || 'Check availability on booking' }}</p>
        <div class="actions">
          <a class="cc-btn cc-btn-ghost" [routerLink]="['/listings', item.slug]">View profile</a>
          <a class="cc-btn cc-btn-accent" [routerLink]="['/book', item.slug]">Book</a>
        </div>
      </div>
    </article>
  `,
  styles: `
    .card {
      height: 100%;
      display: flex; flex-direction: column;
      background: white;
      border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius);
      overflow: hidden;
      box-shadow: var(--cc-shadow-sm);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover { transform: translateY(-3px); box-shadow: var(--cc-shadow-hover); }
    .media {
      min-height: 140px;
      background:
        linear-gradient(180deg, rgba(11,31,58,0.15), rgba(11,31,58,0.55)),
        linear-gradient(135deg, #d7eef8, #c8ebe4);
      background-size: cover;
      background-position: center;
      position: relative;
    }
    .badges { position: absolute; top: 0.75rem; left: 0.75rem; }
    .body { padding: 1rem 1.05rem 1.15rem; display: grid; gap: 0.28rem; flex: 1; }
    .type {
      margin: 0; text-transform: uppercase; letter-spacing: 0.06em;
      font-size: 0.72rem; font-weight: 700; color: var(--cc-teal);
    }
    h3 { margin: 0; font-family: var(--cc-display); font-size: 1.15rem; line-height: 1.25; }
    .meta, .avail { margin: 0; color: var(--cc-slate); font-size: 0.9rem; }
    .fee { margin: 0.2rem 0 0; color: var(--cc-navy); font-weight: 700; }
    .rating { margin: 0; color: #b45309; font-weight: 650; font-size: 0.88rem; }
    .actions {
      display: flex; gap: 0.5rem; flex-wrap: wrap;
      margin-top: auto; padding-top: 0.85rem;
    }
    .actions .cc-btn { min-height: 40px; padding: 0.45rem 0.95rem; font-size: 0.86rem; }
  `,
})
export class ListingCardComponent {
  @Input({ required: true }) item!: ListingCard;

  get typeLabel(): string {
    return this.item.listing_type.replaceAll('_', ' ');
  }

  get cover(): string {
    if (this.item.image_url) {
      return `url('${this.item.image_url}')`;
    }
    return '';
  }
}
