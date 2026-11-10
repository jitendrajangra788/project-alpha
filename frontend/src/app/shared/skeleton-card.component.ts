import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `
    <div class="sk" [style.minHeight]="height">
      <div class="bar media"></div>
      <div class="bar w70"></div>
      <div class="bar w50"></div>
      <div class="bar w40"></div>
    </div>
  `,
  styles: `
    .sk {
      background: white;
      border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius);
      padding: 1rem;
      box-shadow: var(--cc-shadow-sm);
    }
    .bar {
      height: 12px;
      border-radius: 8px;
      margin-bottom: 0.7rem;
      background: linear-gradient(90deg, #e8eef5, #f7fafc, #e8eef5);
      background-size: 200% 100%;
      animation: shimmer 1.2s ease-in-out infinite;
    }
    .media { height: 120px; }
    .w70 { width: 70%; }
    .w50 { width: 50%; }
    .w40 { width: 40%; }
    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
  `,
})
export class SkeletonCardComponent {
  @Input() height = '220px';
}
