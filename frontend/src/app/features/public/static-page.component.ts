import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [AsyncPipe, BreadcrumbsComponent],
  template: `
    <div class="wrap cc-container">
      <app-breadcrumbs
        [items]="[{ label: 'Home', link: '/' }, { label: (page$ | async)?.title || 'Page' }]"
      />
      <article class="panel">
        <h1>{{ (page$ | async)?.title }}</h1>
        <p>{{ (page$ | async)?.body }}</p>
      </article>
    </div>
  `,
  styles: `
    .wrap { padding: 1.5rem 0 3rem; }
    .panel {
      max-width: 760px;
      background: white;
      border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius);
      padding: 1.75rem;
      box-shadow: var(--cc-shadow-sm);
    }
    h1 { margin: 0 0 0.85rem; }
    p { margin: 0; color: var(--cc-slate); line-height: 1.7; }
  `,
})
export class StaticPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly page$ = this.route.data.pipe(
    map((d) => ({ title: (d['title'] as string) || '', body: (d['body'] as string) || '' }))
  );
}
