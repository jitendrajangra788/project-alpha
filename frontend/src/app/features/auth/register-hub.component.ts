import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-hub',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <div class="card">
        <h1>List your healthcare business</h1>
        <p class="lead">Choose your CareConnect registration path. Existing accounts can continue after login.</p>
        <div class="grid">
          <a routerLink="/register/doctor"><strong>Doctor</strong><span>Profile, specialty & fees</span></a>
          <a routerLink="/register/hospital"><strong>Hospital</strong><span>Organization + documents</span></a>
          <a routerLink="/register/clinic"><strong>Clinic</strong><span>Organization + documents</span></a>
          <a routerLink="/register/nursing-home"><strong>Nursing Home</strong><span>Organization + documents</span></a>
          <a routerLink="/register/home-care"><strong>Home Care Agency</strong><span>Organization + documents</span></a>
          <a routerLink="/register/lab"><strong>Lab / Diagnostic</strong><span>Organization + documents</span></a>
          <a routerLink="/register"><strong>Patient</strong><span>Book care & records</span></a>
        </div>
        <p class="hint">
          <a routerLink="/login">Login</a> ·
          <a routerLink="/verification-status">Document verification status</a> ·
          <a routerLink="/otp-verify">OTP verification</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .wrap { min-height: calc(100vh - var(--cc-header-h)); display: grid; place-items: center; padding: 1.5rem; }
    .card {
      width: min(860px, 100%); background: white; border: 1px solid var(--cc-border);
      border-radius: var(--cc-radius-lg); padding: 1.75rem; box-shadow: var(--cc-shadow);
    }
    h1 { margin: 0; font-family: var(--cc-display); color: var(--cc-navy); }
    .lead { margin: 0.4rem 0 1.2rem; color: var(--cc-slate); }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;
    }
    a {
      text-decoration: none; color: var(--cc-navy); border: 1px solid var(--cc-border);
      border-radius: 14px; padding: 1rem; background: var(--cc-sky-soft);
    }
    a:hover { border-color: var(--cc-teal-bright); background: white; }
    strong { display: block; margin-bottom: 0.25rem; }
    span { color: var(--cc-slate-soft); font-size: 0.86rem; }
    .hint { margin: 1.15rem 0 0; color: var(--cc-slate); }
    .hint a { color: var(--cc-teal); font-weight: 650; text-decoration: none; margin-right: 0.35rem; }
  `,
})
export class RegisterHubComponent {}
