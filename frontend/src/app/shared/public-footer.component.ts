import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformService } from '../core/platform.service';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="cc-container grid">
        <div>
          <h3>{{ platform.settings().brand_name }}</h3>
          <p>{{ platform.settings().tagline || 'Your healthcare partner for trusted care.' }}</p>
          <p class="contact">
            {{ platform.settings().support_email || 'support@careconnect.local' }}
            <br />
            {{ platform.settings().support_phone || '+91 8000000000' }}
          </p>
        </div>
        <div>
          <h4>Healthcare Services</h4>
          <a routerLink="/search" [queryParams]="{ listing_type: 'DOCTOR' }">Doctors</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'HOSPITAL' }">Hospitals</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'HOME_CARE' }">Home Care</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'LAB' }">Laboratories</a>
          <a routerLink="/search" [queryParams]="{ q: 'Health Package' }">Health Packages</a>
        </div>
        <div>
          <h4>For Providers</h4>
          <a routerLink="/list-your-business">Register as Provider</a>
          <a routerLink="/register">Create Account</a>
          <a routerLink="/login">Provider Login</a>
          <a routerLink="/provider">Provider Dashboard</a>
        </div>
        <div>
          <h4>Patient Support</h4>
          <a routerLink="/about">About Us</a>
          <a routerLink="/contact">Contact</a>
          <a routerLink="/faq">FAQ</a>
          <a routerLink="/my-bookings">My Bookings</a>
        </div>
        <div>
          <h4>Legal</h4>
          <a routerLink="/privacy">Privacy Policy</a>
          <a routerLink="/terms">Terms and Conditions</a>
          <a routerLink="/refund">Refund Policy</a>
        </div>
      </div>
      <div class="cc-container bottom">
        <p>© {{ year }} {{ platform.settings().brand_name }}. Built for trusted healthcare discovery.</p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      margin-top: 2rem;
      background: linear-gradient(180deg, #0b1f3a, #071627);
      color: #dbe7f3;
      padding: 3.5rem 0 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.4fr repeat(4, 1fr);
      gap: 1.5rem;
    }
    h3, h4 { margin: 0 0 0.8rem; color: white; font-family: var(--cc-display); }
    p { margin: 0 0 0.8rem; line-height: 1.55; color: #b7c7d9; }
    .contact { font-size: 0.92rem; }
    a {
      display: block; color: #c9d8e8; text-decoration: none;
      margin-bottom: 0.45rem; font-size: 0.92rem;
    }
    a:hover { color: white; }
    .bottom {
      margin-top: 2rem; padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 0.85rem; color: #8fa3bb;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 560px) {
      .grid { grid-template-columns: 1fr; }
    }
  `,
})
export class PublicFooterComponent {
  readonly platform = inject(PlatformService);
  readonly year = new Date().getFullYear();
}
