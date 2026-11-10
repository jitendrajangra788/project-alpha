import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
  label: string;
  link?: string | any[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="crumbs" aria-label="Breadcrumb">
      @for (c of items; track c.label; let last = $last) {
        @if (!last && c.link) {
          <a [routerLink]="c.link" [queryParams]="c.queryParams || {}">{{ c.label }}</a>
          <span>/</span>
        } @else {
          <span class="current">{{ c.label }}</span>
        }
      }
    </nav>
  `,
  styles: `
    .crumbs {
      display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
      color: var(--cc-slate-soft); font-size: 0.88rem; margin-bottom: 1rem;
    }
    a { color: var(--cc-teal); text-decoration: none; font-weight: 600; }
    .current { color: var(--cc-navy); font-weight: 600; }
  `,
})
export class BreadcrumbsComponent {
  @Input({ required: true }) items: Crumb[] = [];
}
