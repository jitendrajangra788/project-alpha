import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformService } from '../../core/platform.service';
import { HomeMarketplace, MarketplaceService } from '../../core/marketplace.service';
import { ListingCardComponent } from '../../shared/listing-card.component';
import { CategoryCardComponent } from '../../shared/category-card.component';
import { SearchPanelComponent } from '../../shared/search-panel.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';
import { FaqAccordionComponent, FaqItem } from '../../shared/faq-accordion.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    ListingCardComponent,
    CategoryCardComponent,
    SearchPanelComponent,
    SkeletonCardComponent,
    FaqAccordionComponent,
  ],
  template: `
    <section class="hero">
      <div class="cc-container hero-grid">
        <div class="copy">
          <p class="eyebrow">Your healthcare partner</p>
          <h1 class="display">Your Health Deserves Better Care.</h1>
          <p class="lead">
            Discover trusted doctors, hospitals, home healthcare and diagnostic laboratories — all in one place.
          </p>
          <div class="cta-row">
            <a class="cc-btn cc-btn-accent" routerLink="/search">Find Healthcare</a>
            <a class="cc-btn cc-btn-ghost" href="#services">Explore Services</a>
          </div>
          <div class="trust">
            <div><strong>Verified Providers</strong><span>Profiles marked only when verified</span></div>
            <div><strong>Easy Appointments</strong><span>Book online with real availability</span></div>
            <div><strong>Secure Records</strong><span>Consent-based medical access</span></div>
          </div>
        </div>
        <div class="visual" role="img" aria-label="Doctor consulting a patient in a modern clinic">
          <div class="photo"></div>
        </div>
      </div>
    </section>

    <section class="search-wrap cc-container">
      <app-search-panel
        [categories]="data?.categories || []"
        [suggestions]="data?.popular_searches || defaultSuggestions"
      />
    </section>

    <section class="cc-section" id="services">
      <div class="cc-container">
        <h2 class="cc-section-title">Explore Healthcare Services</h2>
        <p class="cc-section-sub">Everything you need for better health, conveniently accessible.</p>
        <div class="cat-grid">
          @for (c of categories; track c.title) {
            <app-category-card
              [title]="c.title"
              [description]="c.description"
              [icon]="c.icon"
              [link]="c.link"
              [queryParams]="c.queryParams"
            />
          }
        </div>
      </div>
    </section>

    <section class="cc-section tint">
      <div class="cc-container">
        <div class="head">
          <div>
            <h2 class="cc-section-title">Meet Our Healthcare Professionals</h2>
            <p class="cc-section-sub">Doctors listed from live CareConnect marketplace data.</p>
          </div>
          <a class="cc-btn cc-btn-ghost" routerLink="/search" [queryParams]="{ listing_type: 'DOCTOR' }">View all doctors</a>
        </div>
        <div class="cards">
          @if (!data) {
            @for (_ of skeletons; track $index) { <app-skeleton-card /> }
          } @else {
            @for (item of data.top_doctors; track item.id) {
              <app-listing-card [item]="item" />
            } @empty {
              <p class="empty">No doctor listings yet. Providers can register from List Your Business.</p>
            }
          }
        </div>
      </div>
    </section>

    <section class="cc-section">
      <div class="cc-container">
        <div class="head">
          <div>
            <h2 class="cc-section-title">Featured Hospitals & Clinics</h2>
            <p class="cc-section-sub">Browse facilities with transparent service information.</p>
          </div>
          <a class="cc-btn cc-btn-ghost" routerLink="/search" [queryParams]="{ listing_type: 'HOSPITAL' }">View all hospitals</a>
        </div>
        <div class="cards horizontal">
          @if (!data) {
            @for (_ of skeletons; track $index) { <app-skeleton-card /> }
          } @else {
            @for (item of data.popular_hospitals; track item.id) {
              <app-listing-card [item]="item" />
            } @empty {
              <p class="empty">Hospital listings will appear here when providers publish them.</p>
            }
          }
        </div>
      </div>
    </section>

    <section class="cc-section tint">
      <div class="cc-container">
        <div class="head">
          <div>
            <h2 class="cc-section-title">Diagnostic Tests Made Simple</h2>
            <p class="cc-section-sub">Lab providers and packages from the marketplace — prices shown only when published.</p>
          </div>
          <a class="cc-btn cc-btn-ghost" routerLink="/search" [queryParams]="{ listing_type: 'LAB' }">View labs</a>
        </div>
        <div class="test-grid">
          @for (t of testIdeas; track t.name) {
            <a class="test" routerLink="/search" [queryParams]="{ q: t.name, listing_type: 'LAB' }">
              <strong>{{ t.name }}</strong>
              <p>{{ t.desc }}</p>
              <span>Find labs →</span>
            </a>
          }
        </div>
        @if (data?.verified_labs?.length) {
          <div class="cards" style="margin-top: 1.5rem;">
            @for (item of data!.verified_labs; track item.id) {
              <app-listing-card [item]="item" />
            }
          </div>
        }
      </div>
    </section>

    <section class="cc-section">
      <div class="cc-container home-split">
        <div class="home-photo" role="img" aria-label="Nurse providing care at home"></div>
        <div>
          <h2 class="cc-section-title">Professional Healthcare, Right at Your Home.</h2>
          <p class="cc-section-sub">Find home nursing, attendants and recovery support from registered agencies.</p>
          <ul class="checklist">
            <li>Home Nursing</li>
            <li>Elderly Care</li>
            <li>Patient Attendant</li>
            <li>Post-Surgery Care</li>
            <li>Physiotherapy at Home</li>
            <li>Long-Term Care</li>
          </ul>
          <a class="cc-btn cc-btn-accent" routerLink="/search" [queryParams]="{ listing_type: 'HOME_CARE' }">Find Home Care</a>
        </div>
      </div>
    </section>

    <section class="cc-section tint">
      <div class="cc-container">
        <h2 class="cc-section-title">How it works</h2>
        <div class="steps">
          <article><span>1</span><h3>Search Healthcare</h3><p>Find doctors, hospitals, labs and home care near you.</p></article>
          <article><span>2</span><h3>Choose a Verified Provider</h3><p>Review services, fees and verification status.</p></article>
          <article><span>3</span><h3>Book Your Service</h3><p>Select a slot and confirm your appointment.</p></article>
          <article><span>4</span><h3>Receive Healthcare</h3><p>Visit, consult online, or get care at home.</p></article>
        </div>
      </div>
    </section>

    <section class="cc-section">
      <div class="cc-container">
        <h2 class="cc-section-title">Why choose {{ platform.settings().brand_name }}</h2>
        <div class="why-grid">
          @for (w of why; track w.title) {
            <article>
              <h3>{{ w.title }}</h3>
              <p>{{ w.body }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="cc-section provider-cta">
      <div class="cc-container">
        <h2 class="cc-section-title">Grow Your Healthcare Business With CareConnect</h2>
        <p class="cc-section-sub">Connect with patients and manage your healthcare services through one platform.</p>
        <div class="provider-grid">
          <a routerLink="/register/doctor">Register as Doctor</a>
          <a routerLink="/register/hospital">Register Hospital</a>
          <a routerLink="/register/clinic">Register Clinic</a>
          <a routerLink="/register/home-care">Register Home Care Agency</a>
          <a routerLink="/register/lab">Register Laboratory</a>
        </div>
        <a class="cc-btn cc-btn-primary" routerLink="/list-your-business">List Your Business</a>
      </div>
    </section>

    <section class="cc-section">
      <div class="cc-container faq-wrap">
        <div>
          <h2 class="cc-section-title">Frequently asked questions</h2>
          <p class="cc-section-sub">Clear answers about booking, labs, reports and provider registration.</p>
          <a class="cc-btn cc-btn-ghost" routerLink="/faq">View all FAQs</a>
        </div>
        <app-faq-accordion [items]="faqs" />
      </div>
    </section>
  `,
  styles: `
    .hero { padding: 2.5rem 0 1rem; }
    .hero-grid {
      display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 2rem; align-items: center;
      min-height: calc(100vh - var(--cc-header-h) - 120px);
    }
    .eyebrow {
      margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.12em;
      font-size: 0.78rem; font-weight: 750; color: var(--cc-teal);
    }
    h1 {
      margin: 0; font-size: clamp(2.3rem, 4.5vw, 3.6rem); line-height: 1.08;
      max-width: 12ch;
    }
    .lead {
      margin: 1rem 0 1.5rem; color: var(--cc-slate); font-size: 1.08rem;
      line-height: 1.65; max-width: 34rem;
    }
    .cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.75rem; }
    .trust {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
    }
    .trust div {
      background: rgba(255,255,255,0.85); border: 1px solid var(--cc-border);
      border-radius: 14px; padding: 0.85rem; box-shadow: var(--cc-shadow-sm);
    }
    .trust strong { display: block; font-size: 0.9rem; margin-bottom: 0.2rem; }
    .trust span { color: var(--cc-slate-soft); font-size: 0.8rem; line-height: 1.4; }
    .visual { position: relative; min-height: 420px; }
    .photo {
      height: 100%; min-height: 420px; border-radius: 28px;
      background:
        linear-gradient(160deg, rgba(11,31,58,0.18), rgba(15,118,110,0.28)),
        url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80') center/cover;
      box-shadow: var(--cc-shadow);
    }
    .search-wrap { margin-top: -1.5rem; position: relative; z-index: 2; }
    .tint { background: linear-gradient(180deg, rgba(232,243,251,0.7), rgba(255,255,255,0.2)); }
    .head {
      display: flex; justify-content: space-between; gap: 1rem; align-items: end;
      margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .cat-grid, .cards, .test-grid, .why-grid, .provider-grid, .steps {
      display: grid; gap: 1rem; margin-top: 1.5rem;
    }
    .cat-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    .cards { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .horizontal { grid-auto-flow: row; }
    .test-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    .test {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1rem; text-decoration: none; color: inherit; box-shadow: var(--cc-shadow-sm);
    }
    .test:hover { border-color: #9ad5cf; transform: translateY(-2px); }
    .test p { color: var(--cc-slate-soft); font-size: 0.86rem; margin: 0.4rem 0 0.7rem; }
    .test span { color: var(--cc-teal); font-weight: 700; font-size: 0.84rem; }
    .home-split { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; }
    .home-photo {
      min-height: 360px; border-radius: 28px;
      background:
        linear-gradient(160deg, rgba(11,31,58,0.2), rgba(15,118,110,0.25)),
        url('https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=1200&q=80') center/cover;
      box-shadow: var(--cc-shadow);
    }
    .checklist {
      list-style: none; padding: 0; margin: 1.25rem 0 1.5rem;
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem;
    }
    .checklist li {
      background: white; border: 1px solid var(--cc-border); border-radius: 12px;
      padding: 0.7rem 0.85rem; font-weight: 600; font-size: 0.92rem;
    }
    .steps { grid-template-columns: repeat(4, 1fr); }
    .steps article, .why-grid article {
      background: white; border: 1px solid var(--cc-border); border-radius: var(--cc-radius);
      padding: 1.2rem; box-shadow: var(--cc-shadow-sm);
    }
    .steps span {
      width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
      background: var(--cc-navy); color: white; font-weight: 700; margin-bottom: 0.8rem;
    }
    .steps h3, .why-grid h3 { margin: 0 0 0.4rem; font-size: 1.05rem; }
    .steps p, .why-grid p { margin: 0; color: var(--cc-slate); line-height: 1.5; font-size: 0.92rem; }
    .why-grid { grid-template-columns: repeat(3, 1fr); }
    .provider-cta {
      background: linear-gradient(135deg, #0b1f3a, #123a4f 55%, #0f766e);
      color: white;
    }
    .provider-cta .cc-section-title, .provider-cta .cc-section-sub { color: white; }
    .provider-cta .cc-section-sub { opacity: 0.85; }
    .provider-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); margin-bottom: 1.25rem; }
    .provider-grid a {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
      color: white; text-decoration: none; border-radius: 14px; padding: 1rem; font-weight: 650;
    }
    .provider-grid a:hover { background: rgba(255,255,255,0.16); }
    .faq-wrap { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 2rem; align-items: start; }
    .empty { color: var(--cc-slate); }
    @media (max-width: 980px) {
      .hero-grid, .home-split, .faq-wrap, .steps, .why-grid { grid-template-columns: 1fr; }
      .trust { grid-template-columns: 1fr; }
      .visual, .photo { min-height: 260px; }
      .checklist { grid-template-columns: 1fr; }
    }
  `,
})
export class HomeComponent implements OnInit {
  readonly platform = inject(PlatformService);
  private readonly api = inject(MarketplaceService);

  data: HomeMarketplace | null = null;
  readonly skeletons = [1, 2, 3, 4];
  readonly defaultSuggestions = [
    'Cardiologist',
    'Dentist',
    'General Physician',
    'Blood Test',
    'Full Body Checkup',
    'Home Nursing',
    'Hospital',
  ];

  readonly categories: Array<{
    title: string;
    description: string;
    icon: string;
    link: string;
    queryParams: Record<string, string>;
  }> = [
    { title: 'Find Doctors', description: 'Specialists and general physicians', icon: '🩺', link: '/search', queryParams: { listing_type: 'DOCTOR' } },
    { title: 'Hospitals', description: 'Multi-specialty facilities nearby', icon: '🏥', link: '/search', queryParams: { listing_type: 'HOSPITAL' } },
    { title: 'Clinics', description: 'Neighborhood clinics and OPDs', icon: '⌂', link: '/search', queryParams: { listing_type: 'CLINIC' } },
    { title: 'Nursing Homes', description: 'In-patient and recovery care', icon: '🛏', link: '/search', queryParams: { listing_type: 'NURSING_HOME' } },
    { title: 'Home Nursing', description: 'Professional nursing at home', icon: '❤', link: '/search', queryParams: { listing_type: 'HOME_CARE', q: 'Nursing' } },
    { title: 'Home Care', description: 'Attendants and long-term support', icon: '🏠', link: '/search', queryParams: { listing_type: 'HOME_CARE' } },
    { title: 'Diagnostic Labs', description: 'Pathology and diagnostics', icon: '🔬', link: '/search', queryParams: { listing_type: 'LAB' } },
    { title: 'Pathology Labs', description: 'Sample testing centres', icon: '🧪', link: '/search', queryParams: { listing_type: 'LAB', q: 'Pathology' } },
    { title: 'Blood Tests', description: 'CBC and routine blood work', icon: '🩸', link: '/search', queryParams: { q: 'Blood Test', listing_type: 'LAB' } },
    { title: 'Health Packages', description: 'Preventive checkup packages', icon: '📦', link: '/search', queryParams: { q: 'Health Package' } },
    { title: 'Physiotherapy', description: 'Recovery and mobility support', icon: '🏃', link: '/search', queryParams: { q: 'Physiotherapy' } },
    { title: 'Ambulance', description: 'Emergency transport providers', icon: '🚑', link: '/search', queryParams: { q: 'Ambulance' } },
  ];

  readonly testIdeas = [
    { name: 'CBC', desc: 'Complete blood count screening' },
    { name: 'Thyroid Profile', desc: 'TSH and related markers' },
    { name: 'Diabetes Tests', desc: 'Glucose and HbA1c options' },
    { name: 'Liver Function Test', desc: 'Liver enzyme panel' },
    { name: 'Kidney Function Test', desc: 'Renal health markers' },
    { name: 'Lipid Profile', desc: 'Cholesterol assessment' },
    { name: 'Vitamin Tests', desc: 'Vitamin D and B12' },
    { name: 'Full Body Checkup', desc: 'Preventive health package' },
  ];

  readonly why = [
    { title: 'Verified Provider Profiles', body: 'Verification badges appear only after admin review — never invented.' },
    { title: 'Convenient Booking', body: 'Book appointments and services with live availability where enabled.' },
    { title: 'Healthcare in One Place', body: 'Doctors, hospitals, home care and labs in a single marketplace.' },
    { title: 'Secure Patient Records', body: 'Clinical access is consent-based and audited.' },
    { title: 'Transparent Information', body: 'Fees and services shown when providers publish them.' },
    { title: 'Easy Access to Reports', body: 'Patients can view published lab reports from their dashboard.' },
  ];

  readonly faqs: FaqItem[] = [
    { q: 'How do I book a doctor?', a: 'Search doctors, open a profile, and use Book Appointment. You need a patient login.' },
    { q: 'How do I find nearby hospitals?', a: 'Use Hospitals in the header or search with your city/location filter.' },
    { q: 'Can I book lab tests online?', a: 'Yes — open a laboratory listing and book available slots or enquire for tests.' },
    { q: 'How does home sample collection work?', a: 'Choose labs that offer sample collection, then book and share your address during booking.' },
    { q: 'How do I download my lab report?', a: 'Published reports appear in your Patient → Lab Reports area after the lab releases them.' },
    { q: 'Can doctors view my medical records?', a: 'Only after you grant consent. You can revoke access anytime.' },
    { q: 'How can I register my healthcare business?', a: 'Use List Your Business to register your organization and submit verification documents.' },
  ];

  ngOnInit(): void {
    this.api.home().subscribe({ next: (data) => (this.data = data) });
  }
}
