import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dash-kpi',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="kpi" [class]="'tone-' + tone">
      <div class="top">
        <span class="icon">{{ icon }}</span>
        @if (link) {
          <a [routerLink]="link">View</a>
        }
      </div>
      <h3>{{ label }}</h3>
      <p class="value">{{ value }}</p>
      @if (hint) {
        <small>{{ hint }}</small>
      }
    </article>
  `,
  styles: `
    .kpi {
      background: var(--dash-card, #fff);
      border: 1px solid var(--dash-border, #e5ecf5);
      border-radius: var(--dash-radius, 14px);
      box-shadow: var(--dash-shadow-sm, 0 4px 14px rgba(8,43,85,0.05));
      padding: 0.75rem 0.85rem;
      display: grid;
      gap: 0.2rem;
      min-height: 0;
    }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .icon {
      width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
      font-size: 0.92rem; background: #eef4fb; color: var(--dash-navy, #082b55);
    }
    .tone-blue .icon { background: #e8f1ff; color: #1677e8; }
    .tone-teal .icon { background: #e7f8f6; color: #0e9f9a; }
    .tone-orange .icon { background: #fff4e5; color: #d97706; }
    .tone-purple .icon { background: #f3e8ff; color: #7c3aed; }
    .tone-red .icon { background: #ffe8e8; color: #dc2626; }
    a { font-size: 0.78rem; font-weight: 700; color: var(--dash-blue, #1677e8); text-decoration: none; }
    h3 { margin: 0; font-size: 0.8rem; color: var(--dash-muted, #718096); font-weight: 650; font-family: var(--cc-font); }
    .value { margin: 0; font-size: 1.35rem; font-weight: 780; color: var(--dash-text, #142b4a); line-height: 1.15; }
    small { color: var(--dash-muted, #718096); font-size: 0.74rem; }
  `,
})
export class DashKpiComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '—';
  @Input() hint = '';
  @Input() icon = '●';
  @Input() tone: 'blue' | 'teal' | 'orange' | 'purple' | 'red' | 'navy' = 'navy';
  @Input() link: string | null = null;
}
