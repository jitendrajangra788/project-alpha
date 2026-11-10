import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { FaqAccordionComponent, FaqItem } from '../../shared/faq-accordion.component';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [RouterLink, BreadcrumbsComponent, FaqAccordionComponent],
  template: `
    <div class="page cc-container">
      <app-breadcrumbs [items]="[{ label: 'Home', link: '/' }, { label: 'FAQ' }]" />
      <h1>Frequently asked questions</h1>
      <p class="lead">Answers about booking, labs, reports, consent and provider registration.</p>
      <app-faq-accordion [items]="items" />
      <p class="more">Still need help? <a routerLink="/contact">Contact support</a></p>
    </div>
  `,
  styles: `
    .page { padding: 1.5rem 0 3rem; max-width: 860px; }
    h1 { margin: 0 0 0.5rem; }
    .lead { color: var(--cc-slate); margin-bottom: 1.5rem; }
    .more { margin-top: 1.5rem; color: var(--cc-slate); }
  `,
})
export class FaqComponent {
  readonly items: FaqItem[] = [
    { q: 'How do I book a doctor?', a: 'Search doctors, open a profile, and choose Book Appointment with an available slot.' },
    { q: 'How do I find nearby hospitals?', a: 'Open Hospitals from the header and set your city or PIN in filters.' },
    { q: 'Can I book lab tests online?', a: 'Yes. Open a lab listing and book where slots are published, or enquire with the lab.' },
    { q: 'How does home sample collection work?', a: 'Filter labs with sample collection, book a slot, and share your address during booking.' },
    { q: 'How do I download my lab report?', a: 'When a lab publishes a report, it appears under Patient → Lab Reports.' },
    { q: 'Can doctors view my medical records?', a: 'Only after you grant consent. Access can be revoked from your patient consents page.' },
    { q: 'How can I register my healthcare business?', a: 'Use List Your Business, submit documents, and wait for admin verification.' },
  ];
}
