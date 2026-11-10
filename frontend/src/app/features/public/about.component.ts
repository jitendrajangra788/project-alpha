import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformService } from '../../core/platform.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, BreadcrumbsComponent],
  template: `
    <div class="page cc-container">
      <app-breadcrumbs [items]="[{ label: 'Home', link: '/' }, { label: 'About' }]" />
      <h1>About {{ platform.settings().brand_name }}</h1>
      <p class="lead">
        {{ platform.settings().brand_name }} is a multi-vendor healthcare marketplace that helps patients
        discover doctors, hospitals, clinics, nursing homes, home-care agencies and laboratories.
      </p>
      <div class="grid">
        <article>
          <h2>For patients</h2>
          <p>Search providers, book services, manage consents and access published reports from one account.</p>
        </article>
        <article>
          <h2>For providers</h2>
          <p>Register your organization, publish services, receive bookings and grow with transparent listings.</p>
        </article>
        <article>
          <h2>Trust first</h2>
          <p>Verified badges are shown only after review. We do not invent ratings, reviews or medical claims.</p>
        </article>
      </div>
      <a class="cc-btn cc-btn-accent" routerLink="/search">Find healthcare</a>
    </div>
  `,
  styles: `
    .page { padding: 1.5rem 0 3rem; }
    h1 { margin: 0 0 0.75rem; }
    .lead { max-width: 46rem; color: var(--cc-slate); line-height: 1.65; font-size: 1.05rem; }
    .grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
      margin: 2rem 0;
    }
    article {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1.2rem; box-shadow: var(--cc-shadow-sm);
    }
    h2 { margin: 0 0 0.5rem; font-size: 1.15rem; }
    p { margin: 0; color: var(--cc-slate); line-height: 1.55; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class AboutComponent {
  readonly platform = inject(PlatformService);
}
