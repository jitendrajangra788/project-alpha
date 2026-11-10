import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { PlatformService } from '../core/platform.service';

export interface DashNavItem {
  label: string;
  link: string | any[];
  exact?: boolean;
  queryParams?: Record<string, string>;
  icon?: string;
}

export interface DashNavGroup {
  title?: string;
  icon?: string;
  items: DashNavItem[];
  /** When true, category starts expanded */
  defaultOpen?: boolean;
}

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="shell cc-dash" [class.open]="menuOpen">
      @if (menuOpen) {
        <div class="scrim" (click)="menuOpen = false"></div>
      }

      <aside>
        <div class="brand">
          <span class="mark">C</span>
          <div>
            <strong>{{ platform.settings().brand_name }}</strong>
            <small>{{ panelTitle }}</small>
          </div>
        </div>

        <div class="profile-chip">
          <span class="avatar">{{ initials }}</span>
          <div>
            <strong>{{ auth.user()?.full_name || 'Account' }}</strong>
            <small>{{ panelTitle }}</small>
          </div>
        </div>

        <nav>
          @for (group of nav; track groupKey(group, $index); let gi = $index) {
            <div class="cat" [class.open]="isOpen(gi)">
              @if (group.title) {
                <button type="button" class="cat-btn" (click)="toggle(gi)" [attr.aria-expanded]="isOpen(gi)">
                  <span class="cat-ico">{{ group.icon || '▦' }}</span>
                  <span class="cat-label">{{ group.title }}</span>
                  <span class="chev" aria-hidden="true">{{ isOpen(gi) ? '▾' : '▸' }}</span>
                </button>
              }

              <div class="sub" [class.show]="!group.title || isOpen(gi)">
                @for (item of group.items; track item.label) {
                  <a
                    [routerLink]="item.link"
                    [queryParams]="item.queryParams || {}"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: !!item.exact }"
                    (click)="menuOpen = false"
                  >
                    <span class="sub-ico">{{ item.icon || '•' }}</span>
                    <span>{{ item.label }}</span>
                  </a>
                }
              </div>
            </div>
          }
        </nav>

        <div class="aside-foot">
          @if (homeLink) {
            <a [routerLink]="homeLink" (click)="menuOpen = false">⌂ Panel home</a>
          }
          <a routerLink="/" (click)="menuOpen = false">Public website</a>
          <button type="button" (click)="auth.logout()">Logout</button>
        </div>
      </aside>

      <div class="main">
        <header class="top">
          <button class="menu-btn" type="button" (click)="menuOpen = !menuOpen" aria-label="Toggle menu">☰</button>
          <div class="titles">
            <h1>{{ pageTitle || panelTitle }}</h1>
            @if (pageSubtitle) {
              <p>{{ pageSubtitle }}</p>
            }
          </div>

          <form class="search" (ngSubmit)="runSearch()">
            <span aria-hidden="true">⌕</span>
            <input
              [(ngModel)]="searchQ"
              name="dashSearch"
              [placeholder]="searchPlaceholder"
              autocomplete="off"
            />
          </form>

          <button class="bell" type="button" [routerLink]="notificationsLink" title="Notifications">
            🔔
            @if (notificationCount > 0) {
              <em>{{ notificationCount }}</em>
            }
          </button>

          <div class="user">
            <span class="avatar">{{ initials }}</span>
            <div>
              <strong>{{ auth.user()?.full_name || 'Account' }}</strong>
              <small>{{ panelTitle }}</small>
            </div>
          </div>
        </header>

        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 258px 1fr;
      background: var(--dash-bg);
      color: var(--dash-text);
    }
    .scrim { position: fixed; inset: 0; background: rgba(8,43,85,0.35); z-index: 25; }
    aside {
      background: linear-gradient(180deg, #082b55 0%, #071f3f 55%, #0a3348 100%);
      color: #e8f1f8;
      padding: 0.75rem 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      z-index: 30;
    }
    .brand {
      display: flex; gap: 0.7rem; align-items: center;
      padding: 0.2rem 0.45rem 0.65rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .mark {
      width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
      background: linear-gradient(145deg, #1677e8, #0e9f9a);
      color: white; font-weight: 800;
    }
    .brand strong { display: block; font-size: 0.98rem; }
    .brand small { display: block; opacity: 0.68; font-size: 0.74rem; margin-top: 0.12rem; }
    .profile-chip {
      display: flex; gap: 0.65rem; align-items: center;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 0.5rem 0.6rem;
    }
    .profile-chip strong { display: block; font-size: 0.86rem; }
    .profile-chip small { display: block; opacity: 0.65; font-size: 0.72rem; margin-top: 0.1rem; }
    .avatar {
      width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center;
      background: rgba(22,119,232,0.25); color: #fff; font-size: 0.75rem; font-weight: 750; flex: 0 0 auto;
    }

    nav { display: grid; gap: 0.2rem; flex: 1; padding-bottom: 0.25rem; align-content: start; }
    .cat {
      border: 1px solid transparent;
      border-radius: 14px;
      overflow: hidden;
    }
    .cat.open {
      background: rgba(255,255,255,0.04);
      border-color: rgba(255,255,255,0.06);
    }
    .cat-btn {
      width: 100%;
      display: grid;
      grid-template-columns: 28px 1fr auto;
      align-items: center;
      gap: 0.45rem;
      border: 0;
      background: transparent;
      color: #d7e6f4;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 750;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      padding: 0.55rem 0.55rem;
      cursor: pointer;
      border-radius: 10px;
    }
    .cat-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .cat.open > .cat-btn {
      background: rgba(22, 119, 232, 0.16);
      color: #fff;
    }
    .cat-ico {
      width: 28px; height: 28px; border-radius: 9px;
      display: grid; place-items: center;
      background: rgba(255,255,255,0.08);
      font-size: 0.85rem;
    }
    .cat-label { text-align: left; }
    .chev { opacity: 0.7; font-size: 0.75rem; }

    .sub {
      display: none;
      padding: 0.05rem 0.3rem 0.3rem 0.4rem;
      gap: 0.05rem;
    }
    .sub.show { display: grid; }
    .sub a {
      color: #b7c9db;
      text-decoration: none;
      padding: 0.42rem 0.55rem 0.42rem 0.45rem;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 0.45rem;
      align-items: center;
      margin-left: 0.35rem;
      border-left: 2px solid transparent;
    }
    .sub-ico {
      font-size: 0.7rem;
      opacity: 0.75;
      text-align: center;
    }
    .sub a:hover {
      background: rgba(255,255,255,0.06);
      color: #fff;
    }
    .sub a.active {
      background: rgba(22, 119, 232, 0.22);
      color: #fff;
      border-left-color: #5bbcff;
      box-shadow: inset 0 0 0 1px rgba(91, 188, 255, 0.12);
    }
    .sub a.active .sub-ico { opacity: 1; color: #5bbcff; }

    .aside-foot {
      display: grid; gap: 0.3rem; padding-top: 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .aside-foot a, .aside-foot button {
      text-align: left; border: 0; background: transparent; color: #c7d8e8;
      font: inherit; font-weight: 650; padding: 0.55rem 0.75rem; border-radius: 10px;
      cursor: pointer; text-decoration: none;
    }
    .aside-foot button { color: #fecaca; }

    .main { min-width: 0; display: flex; flex-direction: column; }
    .top {
      display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
      padding: 0.65rem 1rem; background: rgba(255,255,255,0.94);
      border-bottom: 1px solid var(--dash-border); position: sticky; top: 0; z-index: 5;
      backdrop-filter: blur(10px);
    }
    .titles { min-width: 140px; }
    .top h1 {
      margin: 0; font-size: 1.15rem; font-family: var(--cc-font); font-weight: 750; color: var(--dash-text);
    }
    .top p { margin: 0.12rem 0 0; color: var(--dash-muted); font-size: 0.82rem; }
    .search {
      margin-left: auto; display: flex; align-items: center; gap: 0.45rem;
      background: #f4f7fc; border: 1px solid var(--dash-border); border-radius: 999px;
      padding: 0.35rem 0.85rem; min-width: min(340px, 100%);
    }
    .search span { color: var(--dash-muted); }
    .search input {
      border: 0; background: transparent; outline: none; width: 100%;
      font: inherit; color: var(--dash-text); padding: 0.35rem 0;
    }
    .bell {
      position: relative; width: 40px; height: 40px; border-radius: 12px;
      border: 1px solid var(--dash-border); background: white; cursor: pointer;
      text-decoration: none; display: grid; place-items: center;
    }
    .bell em {
      position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px;
      border-radius: 999px; background: #ef4444; color: white; font-style: normal;
      font-size: 0.68rem; font-weight: 750; display: grid; place-items: center; padding: 0 4px;
    }
    .user {
      display: flex; align-items: center; gap: 0.55rem;
      background: #f4f7fc; border: 1px solid var(--dash-border);
      border-radius: 999px; padding: 0.28rem 0.75rem 0.28rem 0.28rem;
    }
    .user .avatar { background: #1677e8; }
    .user strong { display: block; font-size: 0.82rem; color: var(--dash-text); }
    .user small { display: block; font-size: 0.7rem; color: var(--dash-muted); }
    .menu-btn {
      display: none; width: 40px; height: 40px; border-radius: 10px;
      border: 1px solid var(--dash-border); background: white; cursor: pointer;
    }
    .content { padding: 0.85rem 1rem 1.15rem; max-width: 1480px; }

    @media (max-width: 1100px) {
      .search { min-width: 200px; order: 5; flex: 1 1 100%; margin-left: 0; }
      .titles { flex: 1; }
    }
    @media (max-width: 980px) {
      .shell { grid-template-columns: 1fr; }
      aside {
        position: fixed; inset: 0 auto 0 0; width: min(300px, 90vw);
        transform: translateX(-105%); transition: transform 0.2s ease;
      }
      .shell.open aside { transform: translateX(0); }
      .menu-btn { display: inline-grid; place-items: center; }
      .user small { display: none; }
    }
  `,
})
export class DashboardShellComponent implements OnChanges {
  readonly auth = inject(AuthService);
  readonly platform = inject(PlatformService);
  private readonly router = inject(Router);

  @Input({ required: true }) panelTitle = 'Dashboard';
  @Input() pageTitle = '';
  @Input() pageSubtitle = '';
  @Input({ required: true }) nav: DashNavGroup[] = [];
  @Input() searchPlaceholder = 'Search…';
  @Input() searchRoute = '/search';
  /** Keeps "Panel home" inside the signed-in workspace (never required to leave to public). */
  @Input() homeLink = '';
  @Input() notificationsLink: string | any[] = '/';
  @Input() notificationCount = 0;

  menuOpen = false;
  searchQ = '';
  openGroups = new Set<number>();

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.syncOpenFromRoute();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nav']) {
      this.openGroups.clear();
      this.nav.forEach((g, i) => {
        if (g.defaultOpen || !g.title) this.openGroups.add(i);
      });
      this.syncOpenFromRoute();
    }
  }

  groupKey(group: DashNavGroup, index: number): string {
    return `${group.title || 'root'}-${index}`;
  }

  isOpen(index: number): boolean {
    return this.openGroups.has(index);
  }

  toggle(index: number): void {
    if (this.openGroups.has(index)) this.openGroups.delete(index);
    else this.openGroups.add(index);
  }

  private syncOpenFromRoute(): void {
    const url = this.router.url.split('?')[0];
    this.nav.forEach((group, index) => {
      const hit = group.items.some((item) => {
        const link = Array.isArray(item.link) ? String(item.link[0] || '') : String(item.link || '');
        if (!link) return false;
        if (item.exact) return url === link;
        return url === link || url.startsWith(link + '/');
      });
      if (hit) this.openGroups.add(index);
    });
  }

  get initials(): string {
    const name = this.auth.user()?.full_name || 'CC';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }

  runSearch(): void {
    const q = this.searchQ.trim();
    if (!q) return;
    void this.router.navigate([this.searchRoute], { queryParams: { q } });
    this.menuOpen = false;
  }
}
