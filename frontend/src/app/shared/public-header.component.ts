import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PlatformService } from '../core/platform.service';
import { ADMIN_ROLES, PROVIDER_ROLES } from '../core/models';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <header class="header" [class.scrolled]="scrolled">
      <div class="cc-container bar">
        <a routerLink="/" class="brand" (click)="closeMenus()">
          <span class="mark" aria-hidden="true">C</span>
          <span class="brand-text">
            <strong>{{ platform.settings().brand_name }}</strong>
            <small>Healthcare marketplace</small>
          </span>
        </a>

        <nav class="nav desktop" aria-label="Primary">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenus()">Home</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'DOCTOR' }" routerLinkActive="active" (click)="closeMenus()">Doctors</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'HOSPITAL' }" routerLinkActive="active" (click)="closeMenus()">Hospitals</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'CLINIC' }" routerLinkActive="active" (click)="closeMenus()">Clinics</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'LAB' }" routerLinkActive="active" (click)="closeMenus()">Labs</a>

          <div class="drop" [class.open]="servicesOpen">
            <button type="button" class="drop-btn" (click)="servicesOpen = !servicesOpen" [attr.aria-expanded]="servicesOpen">
              More
              <span class="chev" aria-hidden="true">▾</span>
            </button>
            @if (servicesOpen) {
              <div class="drop-menu" role="menu">
                <a routerLink="/search" [queryParams]="{ listing_type: 'NURSING_HOME' }" (click)="closeMenus()">Nursing Homes</a>
                <a routerLink="/search" [queryParams]="{ listing_type: 'HOME_CARE' }" (click)="closeMenus()">Home Care</a>
                <a routerLink="/search" [queryParams]="{ q: 'Health Package' }" (click)="closeMenus()">Health Packages</a>
                <a routerLink="/search" [queryParams]="{ q: 'Physiotherapy' }" (click)="closeMenus()">Physiotherapy</a>
                <a routerLink="/about" (click)="closeMenus()">About CareConnect</a>
              </div>
            }
          </div>
        </nav>

        <div class="actions desktop">
          <label class="loc">
            <span class="pin" aria-hidden="true">📍</span>
            <span class="sr">Location</span>
            <input [(ngModel)]="city" name="city" placeholder="City" (keyup.enter)="goLocation()" />
          </label>

          @if (auth.isAuthenticated()) {
            <a class="text-link" routerLink="/my-bookings" (click)="closeMenus()">Bookings</a>
            @if (auth.hasAnyRole(['PATIENT'])) {
              <a class="text-link" routerLink="/patient" (click)="closeMenus()">Patient</a>
            }
            @if (auth.hasAnyRole(['DOCTOR'])) {
              <a class="text-link" routerLink="/doctor" (click)="closeMenus()">Doctor</a>
            }
            @if (auth.hasAnyRole(adminRoles)) {
              <a class="text-link" routerLink="/admin" (click)="closeMenus()">Admin</a>
            }
            @if (auth.hasAnyRole(providerRoles)) {
              <a class="text-link" routerLink="/provider" (click)="closeMenus()">Provider</a>
            }
            <button class="btn ghost" type="button" (click)="auth.logout(); closeMenus()">Logout</button>
          } @else {
            <a class="text-link" routerLink="/login" (click)="closeMenus()">Login</a>
            <a class="btn ghost" routerLink="/register" (click)="closeMenus()">Register</a>
          }
          <a class="btn solid" routerLink="/list-your-business" (click)="closeMenus()">List business</a>
        </div>

        <div class="mobile-tools">
          <button class="icon-btn" type="button" (click)="goSearch()" aria-label="Search">⌕</button>
          <button
            class="icon-btn"
            type="button"
            (click)="menuOpen = !menuOpen; servicesOpen = false"
            [attr.aria-expanded]="menuOpen"
            aria-label="Menu"
          >
            {{ menuOpen ? '✕' : '☰' }}
          </button>
        </div>
      </div>

      @if (menuOpen) {
        <div class="drawer">
          <div class="drawer-loc">
            <span>📍</span>
            <input [(ngModel)]="city" name="mobileCity" placeholder="Your city" (keyup.enter)="goLocation()" />
            <button type="button" (click)="goLocation()">Go</button>
          </div>
          <a routerLink="/" (click)="closeMenus()">Home</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'DOCTOR' }" (click)="closeMenus()">Doctors</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'HOSPITAL' }" (click)="closeMenus()">Hospitals</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'CLINIC' }" (click)="closeMenus()">Clinics</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'LAB' }" (click)="closeMenus()">Labs & Tests</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'NURSING_HOME' }" (click)="closeMenus()">Nursing Homes</a>
          <a routerLink="/search" [queryParams]="{ listing_type: 'HOME_CARE' }" (click)="closeMenus()">Home Care</a>
          <a routerLink="/search" [queryParams]="{ q: 'Health Package' }" (click)="closeMenus()">Health Packages</a>
          <a routerLink="/list-your-business" (click)="closeMenus()">List Your Business</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/my-bookings" (click)="closeMenus()">My Bookings</a>
            <button type="button" (click)="auth.logout(); closeMenus()">Logout</button>
          } @else {
            <a routerLink="/login" (click)="closeMenus()">Login</a>
            <a routerLink="/register" (click)="closeMenus()">Register</a>
          }
        </div>
      }
    </header>
  `,
  styles: `
    .header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(219, 231, 240, 0.9);
    }
    .header.scrolled {
      box-shadow: 0 8px 24px rgba(11, 31, 58, 0.08);
    }
    .bar {
      height: 72px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 1.25rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
      flex-shrink: 0;
    }
    .mark {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #0b1f3a, #0f766e);
      color: #fff;
      font-weight: 800;
      font-size: 1.05rem;
      box-shadow: 0 6px 16px rgba(11, 31, 58, 0.18);
    }
    .brand-text strong {
      display: block;
      font-size: 1.12rem;
      line-height: 1.1;
      color: #0b1f3a;
      letter-spacing: -0.02em;
    }
    .brand-text small {
      display: block;
      margin-top: 0.15rem;
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.15rem;
      flex-wrap: nowrap;
      min-width: 0;
    }
    .nav > a,
    .drop-btn,
    .text-link {
      text-decoration: none;
      color: #475569;
      font-weight: 650;
      font-size: 0.92rem;
      padding: 0.45rem 0.7rem;
      border-radius: 999px;
      border: 0;
      background: transparent;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .nav > a:hover,
    .drop-btn:hover,
    .text-link:hover,
    .nav > a.active {
      color: #0b1f3a;
      background: #eef6fb;
    }
    .drop {
      position: relative;
    }
    .drop-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .chev {
      font-size: 0.7rem;
      opacity: 0.7;
    }
    .drop-menu {
      position: absolute;
      top: calc(100% + 0.45rem);
      left: 50%;
      transform: translateX(-50%);
      min-width: 210px;
      padding: 0.45rem;
      background: #fff;
      border: 1px solid #dbe7f0;
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(11, 31, 58, 0.12);
      display: grid;
      gap: 0.15rem;
      z-index: 60;
    }
    .drop-menu a {
      text-decoration: none;
      color: #0b1f3a;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.7rem 0.8rem;
      border-radius: 10px;
    }
    .drop-menu a:hover {
      background: #f4f9fc;
      color: #0f766e;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
    }
    .loc {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      height: 40px;
      padding: 0 0.75rem 0 0.65rem;
      border: 1px solid #dbe7f0;
      border-radius: 999px;
      background: #f7fbfd;
    }
    .pin {
      font-size: 0.85rem;
      line-height: 1;
    }
    .loc input {
      width: 88px;
      border: 0;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 650;
      color: #0b1f3a;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 40px;
      padding: 0 1rem;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.86rem;
      white-space: nowrap;
      border: 1px solid transparent;
      cursor: pointer;
      font-family: inherit;
    }
    .btn.ghost {
      background: #fff;
      border-color: #dbe7f0;
      color: #0b1f3a;
    }
    .btn.ghost:hover {
      border-color: #9ec9c4;
      background: #f4fbfa;
    }
    .btn.solid {
      background: linear-gradient(135deg, #0b1f3a, #16365c);
      color: #fff;
      box-shadow: 0 8px 18px rgba(11, 31, 58, 0.18);
    }
    .btn.solid:hover {
      filter: brightness(1.05);
      color: #fff;
    }
    .mobile-tools {
      display: none;
      gap: 0.4rem;
      margin-left: auto;
    }
    .icon-btn {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      border: 1px solid #dbe7f0;
      background: #fff;
      font-size: 1.05rem;
      cursor: pointer;
    }
    .drawer {
      display: grid;
      gap: 0.2rem;
      padding: 0.85rem 1rem 1.2rem;
      border-top: 1px solid #dbe7f0;
      background: #fff;
    }
    .drawer-loc {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid #dbe7f0;
      border-radius: 12px;
      background: #f7fbfd;
    }
    .drawer-loc input {
      border: 0;
      outline: none;
      background: transparent;
      font: inherit;
      font-weight: 650;
    }
    .drawer-loc button {
      border: 0;
      background: #0b1f3a;
      color: #fff;
      border-radius: 8px;
      padding: 0.35rem 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }
    .drawer a,
    .drawer > button {
      text-align: left;
      padding: 0.85rem 0.35rem;
      border: 0;
      background: none;
      font: inherit;
      font-weight: 650;
      color: #0b1f3a;
      text-decoration: none;
      cursor: pointer;
      border-bottom: 1px solid #eef3f8;
    }
    @media (max-width: 1180px) {
      .bar {
        grid-template-columns: auto auto;
      }
      .nav,
      .actions {
        display: none;
      }
      .mobile-tools {
        display: flex;
      }
    }
  `,
})
export class PublicHeaderComponent {
  readonly auth = inject(AuthService);
  readonly platform = inject(PlatformService);
  private readonly router = inject(Router);
  readonly adminRoles = ADMIN_ROLES;
  readonly providerRoles = PROVIDER_ROLES;

  city = 'Lucknow';
  menuOpen = false;
  servicesOpen = false;
  scrolled = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 8;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.drop') && this.servicesOpen) {
      this.servicesOpen = false;
    }
  }

  closeMenus(): void {
    this.menuOpen = false;
    this.servicesOpen = false;
  }

  goLocation(): void {
    void this.router.navigate(['/search'], { queryParams: { city: this.city } });
    this.closeMenus();
  }

  goSearch(): void {
    void this.router.navigate(['/search'], { queryParams: { city: this.city } });
    this.closeMenus();
  }
}
