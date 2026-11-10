import { Component, Input } from '@angular/core';

export interface FaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  template: `
    <div class="faq">
      @for (item of items; track item.q; let i = $index) {
        <details [open]="i === 0">
          <summary>{{ item.q }}</summary>
          <p>{{ item.a }}</p>
        </details>
      }
    </div>
  `,
  styles: `
    .faq { display: grid; gap: 0.75rem; }
    details {
      background: white;
      border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius);
      padding: 0.9rem 1.1rem;
      box-shadow: var(--cc-shadow-sm);
    }
    summary {
      cursor: pointer;
      font-weight: 700;
      color: var(--cc-navy);
      list-style: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary::after {
      content: '+';
      float: right;
      color: var(--cc-teal);
      font-weight: 700;
    }
    details[open] summary::after { content: '–'; }
    p { margin: 0.75rem 0 0.25rem; color: var(--cc-slate); line-height: 1.6; }
  `,
})
export class FaqAccordionComponent {
  @Input({ required: true }) items: FaqItem[] = [];
}
