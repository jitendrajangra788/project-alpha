import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="cat" [routerLink]="link" [queryParams]="queryParams">
      <span class="icon" aria-hidden="true">{{ icon }}</span>
      <strong>{{ title }}</strong>
      <p>{{ description }}</p>
      <span class="explore">Explore →</span>
    </a>
  `,
  styles: `
    .cat {
      display: grid;
      gap: 0.45rem;
      padding: 1.25rem;
      min-height: 168px;
      border-radius: var(--cc-radius);
      background: white;
      border: 1px solid var(--cc-border);
      box-shadow: var(--cc-shadow-sm);
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .cat:hover {
      transform: translateY(-4px);
      box-shadow: var(--cc-shadow-hover);
      border-color: #b7e2dd;
    }
    .icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: grid; place-items: center;
      background: linear-gradient(145deg, var(--cc-sky), #dff7f3);
      color: var(--cc-teal);
      font-size: 1.25rem; font-weight: 700;
    }
    strong { color: var(--cc-navy); font-size: 1.02rem; }
    p { margin: 0; color: var(--cc-slate-soft); font-size: 0.88rem; line-height: 1.45; }
    .explore { margin-top: auto; color: var(--cc-teal); font-weight: 700; font-size: 0.86rem; }
  `,
})
export class CategoryCardComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() icon = '✚';
  @Input() link: string | any[] = '/search';
  @Input() queryParams: Record<string, string> = {};
}
