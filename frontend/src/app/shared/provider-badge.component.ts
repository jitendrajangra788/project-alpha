import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-provider-badge',
  standalone: true,
  template: `
    @if (verified) {
      <span class="cc-chip cc-chip-verified">Verified</span>
    } @else {
      <span class="cc-chip cc-chip-warn">Listing</span>
    }
    @if (featured) {
      <span class="cc-chip">Featured</span>
    }
  `,
  styles: `
    :host { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; }
  `,
})
export class ProviderBadgeComponent {
  @Input() verified = false;
  @Input() featured = false;
}
