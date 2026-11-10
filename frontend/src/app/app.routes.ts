import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';
import { LAB_ROLES, ORG_OWNER_ROLES } from './core/panel-home';
import { ADMIN_ROLES } from './core/models';

const clinical = () =>
  import('./features/provider/clinical-board.component').then((m) => m.ClinicalBoardComponent);

const panelFind = () =>
  import('./features/patient/panel-find.component').then((m) => m.PanelFindComponent);

const staffManager = () =>
  import('./features/provider/staff-manager.component').then((m) => m.StaffManagerComponent);

const branchManager = () =>
  import('./features/provider/branch-manager.component').then((m) => m.BranchManagerComponent);

const orgProfile = () =>
  import('./features/provider/org-profile.component').then((m) => m.OrgProfileComponent);

const panel = () =>
  import('./shared/panel-section.component').then((m) => m.PanelSectionComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/public/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/marketplace/search.component').then((m) => m.SearchComponent),
      },
      {
        path: 'listings/:slug',
        loadComponent: () =>
          import('./features/marketplace/listing-detail.component').then((m) => m.ListingDetailComponent),
      },
      {
        path: 'book/:slug',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/bookings/book.component').then((m) => m.BookComponent),
      },
      {
        path: 'my-bookings',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/bookings/my-bookings.component').then((m) => m.MyBookingsComponent),
      },
      {
        path: 'my-payments',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/payments/my-payments.component').then((m) => m.MyPaymentsComponent),
      },
      {
        path: 'video/:sessionId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/video/video-consult.component').then((m) => m.VideoConsultComponent),
      },
      { path: 'find-doctors', redirectTo: 'search', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'register/patient',
        redirectTo: 'register',
        pathMatch: 'full',
      },
      {
        path: 'register/doctor',
        loadComponent: () =>
          import('./features/auth/register-doctor.component').then((m) => m.RegisterDoctorComponent),
      },
      {
        path: 'register/hospital',
        loadComponent: () =>
          import('./features/auth/register-organization.component').then(
            (m) => m.RegisterOrganizationComponent
          ),
        data: { orgType: 'HOSPITAL' },
      },
      {
        path: 'register/clinic',
        loadComponent: () =>
          import('./features/auth/register-organization.component').then(
            (m) => m.RegisterOrganizationComponent
          ),
        data: { orgType: 'CLINIC' },
      },
      {
        path: 'register/nursing-home',
        loadComponent: () =>
          import('./features/auth/register-organization.component').then(
            (m) => m.RegisterOrganizationComponent
          ),
        data: { orgType: 'NURSING_HOME' },
      },
      {
        path: 'register/home-care',
        loadComponent: () =>
          import('./features/auth/register-organization.component').then(
            (m) => m.RegisterOrganizationComponent
          ),
        data: { orgType: 'HOME_CARE' },
      },
      {
        path: 'register/lab',
        loadComponent: () =>
          import('./features/auth/register-organization.component').then(
            (m) => m.RegisterOrganizationComponent
          ),
        data: { orgType: 'LAB' },
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'otp-verify',
        loadComponent: () =>
          import('./features/auth/otp-verify.component').then((m) => m.OtpVerifyComponent),
      },
      {
        path: 'verification-status',
        loadComponent: () =>
          import('./features/auth/verification-status.component').then(
            (m) => m.VerificationStatusComponent
          ),
      },
      {
        path: 'list-your-business',
        loadComponent: () =>
          import('./features/auth/register-hub.component').then((m) => m.RegisterHubComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./features/public/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/public/faq.component').then((m) => m.FaqComponent),
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./features/public/static-page.component').then((m) => m.StaticPageComponent),
        data: {
          title: 'Terms and Conditions',
          body: 'Placeholder terms for CareConnect. Replace with legal-reviewed content before production.',
        },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/public/static-page.component').then((m) => m.StaticPageComponent),
        data: {
          title: 'Privacy Policy',
          body: 'Patient data access is consent-based and audited. Replace this placeholder with legal-reviewed policy before production.',
        },
      },
      {
        path: 'refund',
        loadComponent: () =>
          import('./features/public/static-page.component').then((m) => m.StaticPageComponent),
        data: {
          title: 'Refund Policy',
          body: 'Refunds follow booking and payment status rules. Replace with legal-reviewed policy before production.',
        },
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/public/static-page.component').then((m) => m.StaticPageComponent),
        data: {
          title: 'Contact Us',
          body: 'Reach CareConnect support through the configured platform support email and phone in admin settings.',
        },
      },
    ],
  },

  // Patient panel
  {
    path: 'patient',
    canActivate: [roleGuard(['PATIENT'])],
    loadComponent: () =>
      import('./layouts/patient-layout.component').then((m) => m.PatientLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/patient/patient-dashboard.component').then((m) => m.PatientDashboardComponent),
      },
      {
        path: 'find/doctors',
        loadComponent: panelFind,
        data: { listingType: 'DOCTOR' },
      },
      {
        path: 'find/hospitals',
        loadComponent: panelFind,
        data: { listingType: 'HOSPITAL' },
      },
      {
        path: 'find/clinics',
        loadComponent: panelFind,
        data: { listingType: 'CLINIC' },
      },
      {
        path: 'find/nursing-homes',
        loadComponent: panelFind,
        data: { listingType: 'NURSING_HOME' },
      },
      {
        path: 'find/home-care',
        loadComponent: panelFind,
        data: { listingType: 'HOME_CARE' },
      },
      {
        path: 'find/labs',
        loadComponent: panelFind,
        data: { listingType: 'LAB' },
      },
      {
        path: 'timeline',
        loadComponent: panel,
        data: {
          title: 'Medical Timeline',
          description: 'Unified timeline of bookings, prescriptions, reports and visits.',
          source: 'patient-dashboard',
          links: [
            { label: 'My Prescriptions', link: '/patient/prescriptions' },
            { label: 'My Lab Reports', link: '/patient/lab-reports' },
            { label: 'My Medical Records', link: '/patient/records' },
          ],
        },
      },
      {
        path: 'appointments',
        loadComponent: panel,
        data: {
          title: 'My Appointments',
          description: 'Your CareConnect bookings across doctors and organizations.',
          source: 'patient-bookings',
          primaryLink: '/patient/find/doctors',
          primaryLabel: 'Book appointment',
        },
      },
      {
        path: 'lab-bookings',
        loadComponent: panel,
        data: {
          title: 'My Lab Bookings',
          description: 'Diagnostic bookings from your appointment history.',
          source: 'patient-bookings',
          primaryLink: '/patient/find/labs',
          primaryLabel: 'Find labs',
          links: [{ label: 'Browse labs', link: '/patient/find/labs' }],
        },
      },
      {
        path: 'video',
        loadComponent: panel,
        data: {
          title: 'My Video Consultations',
          description: 'Join online consults from confirmed video bookings.',
          emptyTitle: 'No video sessions listed here',
          emptyBody: 'Open My Appointments and use Join video on online appointments.',
          primaryLink: '/patient/appointments',
          primaryLabel: 'My Appointments',
          source: 'patient-bookings',
        },
      },
      {
        path: 'records',
        loadComponent: panel,
        data: {
          title: 'My Medical Records',
          description: 'Consent-protected clinical history aggregated for your patient account.',
          source: 'patient-dashboard',
          links: [
            { label: 'Prescriptions', link: '/patient/prescriptions' },
            { label: 'Lab reports', link: '/patient/lab-reports' },
            { label: 'Consents', link: '/patient/consents' },
          ],
          apiNote: 'Records are assembled from timeline, prescriptions and reports. Dedicated document vault API can be added next.',
        },
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./features/patient/patient-prescriptions.component').then(
            (m) => m.PatientPrescriptionsComponent
          ),
      },
      {
        path: 'lab-reports',
        loadComponent: () =>
          import('./features/patient/patient-lab-reports.component').then(
            (m) => m.PatientLabReportsComponent
          ),
      },
      {
        path: 'consents',
        loadComponent: () =>
          import('./features/patient/patient-consents.component').then((m) => m.PatientConsentsComponent),
      },
      {
        path: 'payments',
        loadComponent: panel,
        data: {
          title: 'Payments & Invoices',
          description: 'Payment history for bookings and services.',
          source: 'payments-me',
          primaryLink: '/patient/appointments',
          primaryLabel: 'My Appointments',
        },
      },
      {
        path: 'profile',
        loadComponent: panel,
        data: {
          title: 'My Profile',
          description: 'Manage your CareConnect patient profile details.',
          emptyTitle: 'Profile editing UI',
          emptyBody: 'Profile fields come from your registration account. Dedicated edit API can be extended next.',
          apiNote: 'Pending: dedicated patient profile update endpoint UI.',
          links: [
            { label: 'Consent & Privacy', link: '/patient/consents' },
            { label: 'Family Members', link: '/patient/family' },
          ],
        },
      },
      {
        path: 'family',
        loadComponent: panel,
        data: {
          title: 'Family Members',
          description: 'Add dependents for bookings and shared care.',
          emptyTitle: 'Family profiles coming next',
          emptyBody: 'Backend family-member APIs are not fully exposed yet.',
          apiNote: 'Pending API: family members CRUD.',
        },
      },
      {
        path: 'vitals',
        loadComponent: panel,
        data: {
          title: 'My Vitals',
          description: 'Recorded vitals from visits and home-care reports.',
          emptyTitle: 'No vitals listed',
          emptyBody: 'Vitals appear when providers publish visit records.',
          apiNote: 'Uses clinical timeline when vitals events exist.',
          source: 'patient-dashboard',
        },
      },
      {
        path: 'nursing-reports',
        loadComponent: panel,
        data: {
          title: 'Nursing Visit Reports',
          description: 'Home-care and nursing visit notes shared with you.',
          emptyTitle: 'No nursing reports yet',
          emptyBody: 'Reports appear after home-care visits are completed.',
          apiNote: 'Pending richer nursing-report list endpoint.',
        },
      },
      {
        path: 'reviews',
        loadComponent: panel,
        data: {
          title: 'Reviews',
          description: 'Share feedback only for completed services.',
          emptyTitle: 'Reviews not enabled yet',
          emptyBody: 'Review submission API is planned; no fake reviews are shown.',
          apiNote: 'Pending API: reviews create/list.',
        },
      },
      {
        path: 'notifications',
        loadComponent: panel,
        data: {
          title: 'Notifications',
          description: 'In-app alerts for bookings, reports and payments.',
          emptyTitle: 'Open bookings for latest updates',
          emptyBody: 'Notification inbox UI can be expanded from bookings notifications API.',
          primaryLink: '/patient/appointments',
          primaryLabel: 'My Appointments',
          apiNote: 'Partial: notifications exist on bookings API.',
        },
      },
      {
        path: 'settings',
        loadComponent: panel,
        data: {
          title: 'Settings',
          description: 'Account preferences and privacy controls.',
          links: [
            { label: 'Consent & Privacy', link: '/patient/consents' },
            { label: 'My Profile', link: '/patient/profile' },
          ],
        },
      },
    ],
  },

  // Doctor panel
  {
    path: 'doctor',
    canActivate: [roleGuard(['DOCTOR'])],
    loadComponent: () =>
      import('./layouts/doctor-layout.component').then((m) => m.DoctorLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/doctor/doctor-dashboard.component').then((m) => m.DoctorDashboardComponent),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/provider/provider-bookings.component').then(
            (m) => m.ProviderBookingsComponent
          ),
      },
      {
        path: 'calendar',
        loadComponent: panel,
        data: {
          title: 'Appointment calendar',
          description: 'Schedule view of your upcoming provider bookings.',
          source: 'doctor-bookings',
          primaryLink: '/doctor/bookings',
          primaryLabel: 'Manage appointments',
        },
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./features/doctor/doctor-prescription.component').then(
            (m) => m.DoctorPrescriptionComponent
          ),
      },
      {
        path: 'video',
        loadComponent: panel,
        data: {
          title: 'Video consultations',
          description: 'Start or join online consults from confirmed bookings.',
          primaryLink: '/doctor/bookings',
          primaryLabel: 'Open appointments',
          emptyTitle: 'Use appointment list to join video',
          emptyBody: 'Video rooms are created from online bookings.',
        },
      },
      {
        path: 'patients',
        loadComponent: panel,
        data: {
          title: 'Patient list',
          description: 'Patients from your bookings. Medical records require consent.',
          source: 'doctor-bookings',
          apiNote: 'Derived from booking participants until dedicated patient-list API exists.',
        },
      },
      {
        path: 'records',
        loadComponent: panel,
        data: {
          title: 'Authorized medical records',
          description: 'Access only with active patient consent.',
          emptyTitle: 'Consent-gated records',
          emptyBody: 'Open a consented patient context from clinical APIs before viewing records.',
          apiNote: 'Uses consent-protected clinical endpoints.',
        },
      },
      {
        path: 'profile',
        loadComponent: panel,
        data: {
          title: 'Doctor profile',
          description: 'Professional profile synced to marketplace listing.',
          primaryLink: '/doctor',
          primaryLabel: 'Doctor dashboard',
          apiNote: 'Pending dedicated doctor profile edit form wired to doctor APIs.',
        },
      },
      {
        path: 'qualifications',
        loadComponent: panel,
        data: {
          title: 'Qualifications & registration',
          description: 'Degrees, councils and registration numbers.',
          apiNote: 'Pending API fields UI for qualifications table.',
        },
      },
      {
        path: 'associations',
        loadComponent: panel,
        data: {
          title: 'Hospital & clinic associations',
          description: 'Organizations where you practice.',
          primaryLink: '/doctor',
          primaryLabel: 'Doctor dashboard',
        },
      },
      {
        path: 'availability',
        loadComponent: panel,
        data: {
          title: 'Availability management',
          description: 'Slot generation currently follows listing availability rules.',
          primaryLink: '/doctor/bookings',
          primaryLabel: 'Appointments',
          apiNote: 'Partial: slots auto-generated; dedicated doctor schedule editor pending.',
        },
      },
      {
        path: 'fees',
        loadComponent: panel,
        data: {
          title: 'Consultation fees',
          description: 'Fees shown on marketplace listings and bookings.',
          apiNote: 'Pending dedicated fee update form.',
        },
      },
      {
        path: 'earnings',
        loadComponent: panel,
        data: {
          title: 'Earnings & payments',
          description: 'Commission split and unsettled provider earnings.',
          source: 'earnings',
        },
      },
      {
        path: 'reviews',
        loadComponent: panel,
        data: {
          title: 'Reviews',
          description: 'Patient reviews appear only from real submissions.',
          apiNote: 'Pending reviews API.',
        },
      },
      {
        path: 'notifications',
        loadComponent: panel,
        data: {
          title: 'Notifications',
          description: 'Booking and consult alerts.',
          primaryLink: '/doctor/bookings',
          primaryLabel: 'Appointments',
        },
      },
      {
        path: 'settings',
        loadComponent: panel,
        data: {
          title: 'Settings',
          description: 'Doctor workspace preferences.',
        },
      },
    ],
  },

  // Lab panel
  {
    path: 'lab',
    canActivate: [roleGuard([...LAB_ROLES])],
    loadComponent: () => import('./layouts/lab-layout.component').then((m) => m.LabLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/lab/lab-dashboard.component').then((m) => m.LabDashboardComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/lab/lab-reports.component').then((m) => m.LabReportsComponent),
      },
      {
        path: 'bookings',
        loadComponent: panel,
        data: {
          title: 'Lab bookings',
          description: 'Incoming diagnostic bookings for your organizations.',
          source: 'provider-bookings',
          primaryLink: '/lab/reports',
          primaryLabel: 'Open reports',
        },
      },
      {
        path: 'samples',
        loadComponent: panel,
        data: {
          title: 'Sample collection',
          description: 'Home and centre sample collection workflow.',
          apiNote: 'Pending dedicated sample-collection queue UI/API expansion.',
          primaryLink: '/lab/reports',
          primaryLabel: 'Open reports',
        },
      },
      {
        path: 'tracking',
        loadComponent: panel,
        data: {
          title: 'Sample tracking',
          description: 'Track samples from collection to processing.',
          apiNote: 'Pending sample tracking endpoints UI.',
        },
      },
      {
        path: 'processing',
        loadComponent: panel,
        data: {
          title: 'Test processing',
          description: 'In-lab processing status board.',
          primaryLink: '/lab/reports',
          primaryLabel: 'Report workflow',
        },
      },
      {
        path: 'approvals',
        loadComponent: panel,
        data: {
          title: 'Report review & approval',
          description: 'Approve draft reports before publish.',
          primaryLink: '/lab/reports',
          primaryLabel: 'Manage reports',
        },
      },
      {
        path: 'published',
        loadComponent: panel,
        data: {
          title: 'Published reports',
          description: 'Reports already visible to patients.',
          primaryLink: '/lab/reports',
          primaryLabel: 'All reports',
        },
      },
      {
        path: 'profile',
        loadComponent: orgProfile,
      },
      {
        path: 'branches',
        loadComponent: branchManager,
      },
      {
        path: 'tests',
        loadComponent: panel,
        data: {
          title: 'Test management',
          description: 'Catalogue of lab tests offered by your org.',
          apiNote: 'Partial: lab tests exist in clinical module; full catalogue admin UI pending.',
          primaryLink: '/lab/reports',
          primaryLabel: 'Reports module',
        },
      },
      {
        path: 'packages',
        loadComponent: panel,
        data: {
          title: 'Health packages',
          description: 'Bundled diagnostic packages.',
          apiNote: 'Pending packages API UI.',
        },
      },
      {
        path: 'pricing',
        loadComponent: panel,
        data: {
          title: 'Pricing',
          description: 'Published prices appear on marketplace services.',
          primaryLink: '/lab',
          primaryLabel: 'Lab dashboard',
        },
      },
      {
        path: 'staff',
        loadComponent: staffManager,
        data: { roleFilter: 'ALL' },
      },
      {
        path: 'payments',
        loadComponent: panel,
        data: {
          title: 'Payments',
          description: 'Lab earnings and settlements.',
          source: 'earnings',
          primaryLink: '/lab',
          primaryLabel: 'Lab dashboard',
        },
      },
      {
        path: 'analytics',
        loadComponent: panel,
        data: {
          title: 'Analytics',
          description: 'Operational summary for lab bookings and reports.',
          source: 'provider-bookings',
        },
      },
      {
        path: 'settings',
        loadComponent: panel,
        data: {
          title: 'Settings',
          description: 'Lab workspace preferences.',
        },
      },
    ],
  },

  // Admin panel
  {
    path: 'admin',
    canActivate: [roleGuard(ADMIN_ROLES)],
    loadComponent: () =>
      import('./layouts/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'verifications',
        loadComponent: () =>
          import('./features/admin/admin-verifications.component').then(
            (m) => m.AdminVerificationsComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/admin-settings.component').then((m) => m.AdminSettingsComponent),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/admin/admin-payments.component').then((m) => m.AdminPaymentsComponent),
      },
      {
        path: 'analytics',
        loadComponent: panel,
        data: {
          title: 'Reports & analytics',
          description: 'Platform totals from admin dashboard metrics.',
          source: 'admin-dashboard',
        },
      },
      {
        path: 'doctors',
        loadComponent: panel,
        data: {
          title: 'Doctor management',
          description: 'Doctor users on the platform.',
          source: 'admin-users',
          apiNote: 'Filtered management UI can be refined once doctor-specific admin list exists.',
        },
      },
      {
        path: 'hospitals',
        loadComponent: panel,
        data: {
          title: 'Hospital management',
          description: 'Registered hospital organizations.',
          source: 'admin-verifications',
          primaryLink: '/admin/verifications',
          primaryLabel: 'Verification queue',
        },
      },
      {
        path: 'clinics',
        loadComponent: panel,
        data: {
          title: 'Clinic management',
          description: 'Registered clinics.',
          source: 'admin-verifications',
          primaryLink: '/admin/verifications',
          primaryLabel: 'Verification queue',
        },
      },
      {
        path: 'nursing-homes',
        loadComponent: panel,
        data: {
          title: 'Nursing home management',
          description: 'Nursing home organizations.',
          source: 'admin-verifications',
        },
      },
      {
        path: 'home-care',
        loadComponent: panel,
        data: {
          title: 'Home care agency management',
          description: 'Home-care provider organizations.',
          source: 'admin-verifications',
        },
      },
      {
        path: 'labs',
        loadComponent: panel,
        data: {
          title: 'Lab & diagnostic centre management',
          description: 'Laboratories and diagnostic centres.',
          source: 'admin-verifications',
        },
      },
      {
        path: 'patients',
        loadComponent: panel,
        data: {
          title: 'Patient management',
          description: 'Platform users including patients.',
          source: 'admin-users',
        },
      },
      {
        path: 'appointments',
        loadComponent: panel,
        data: {
          title: 'Appointment management',
          description: 'Cross-provider appointment oversight.',
          apiNote: 'Pending admin-wide bookings list endpoint. Provider bookings available in provider panel.',
          primaryLink: '/provider/bookings',
          primaryLabel: 'Provider bookings',
        },
      },
      {
        path: 'lab-bookings',
        loadComponent: panel,
        data: {
          title: 'Lab booking management',
          description: 'Diagnostic booking oversight.',
          apiNote: 'Pending admin lab-booking aggregate API.',
        },
      },
      {
        path: 'video',
        loadComponent: panel,
        data: {
          title: 'Video consultation management',
          description: 'Monitor telemedicine sessions.',
          apiNote: 'Pending admin video-session list endpoint.',
        },
      },
      {
        path: 'commissions',
        loadComponent: panel,
        data: {
          title: 'Commission management',
          description: 'Platform commissions from paid bookings.',
          primaryLink: '/admin/payments',
          primaryLabel: 'Open payments',
          apiNote: 'Commission settlement lives in Payments screen.',
        },
      },
      {
        path: 'subscriptions',
        loadComponent: panel,
        data: {
          title: 'Subscription management',
          description: 'Provider subscription plans.',
          source: 'subscription-plans',
        },
      },
      {
        path: 'reviews',
        loadComponent: panel,
        data: {
          title: 'Reviews & complaints',
          description: 'Moderation queue for feedback.',
          apiNote: 'Pending reviews/complaints APIs.',
        },
      },
      {
        path: 'categories',
        loadComponent: panel,
        data: {
          title: 'Categories & services',
          description: 'Marketplace categories currently seeded in backend.',
          source: 'categories',
        },
      },
      {
        path: 'locations',
        loadComponent: panel,
        data: {
          title: 'City & location management',
          description: 'Location taxonomy for search filters.',
          apiNote: 'Pending dedicated cities/locations admin CRUD.',
          emptyBody: 'Search currently uses free-text city/PIN filters.',
        },
      },
      {
        path: 'banners',
        loadComponent: panel,
        data: {
          title: 'Homepage banners & CMS',
          description: 'Marketing banners and CMS blocks.',
          apiNote: 'Pending CMS/banner APIs. Brand settings available in Platform settings.',
          primaryLink: '/admin/settings',
          primaryLabel: 'Platform settings',
        },
      },
      {
        path: 'notifications',
        loadComponent: panel,
        data: {
          title: 'Notifications',
          description: 'Platform notification operations.',
          apiNote: 'In-app notifications exist; admin broadcast UI pending.',
        },
      },
      {
        path: 'roles',
        loadComponent: panel,
        data: {
          title: 'Roles & permissions',
          description: 'RBAC roles seeded in CareConnect.',
          apiNote: 'Roles API available at /admin/roles — dedicated matrix UI can be expanded next.',
        },
      },
      {
        path: 'audit-logs',
        loadComponent: panel,
        data: {
          title: 'Audit logs',
          description: 'Security and clinical audit trail.',
          apiNote: 'Audit writes exist; admin list endpoint UI pending.',
        },
      },
    ],
  },

  // Provider / hospital / clinic / nursing / home-care panel
  {
    path: 'provider',
    canActivate: [roleGuard([...ORG_OWNER_ROLES])],
    loadComponent: () =>
      import('./layouts/provider-layout.component').then((m) => m.ProviderLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/provider/provider-dashboard.component').then(
            (m) => m.ProviderDashboardComponent
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/provider/provider-bookings.component').then(
            (m) => m.ProviderBookingsComponent
          ),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./features/provider/provider-billing.component').then(
            (m) => m.ProviderBillingComponent
          ),
      },
      {
        path: 'opd',
        loadComponent: clinical,
        data: { board: 'opd' },
      },
      {
        path: 'ot',
        loadComponent: clinical,
        data: { board: 'ot' },
      },
      {
        path: 'emergency',
        loadComponent: clinical,
        data: { board: 'emergency' },
      },
      {
        path: 'pharmacy',
        loadComponent: clinical,
        data: { board: 'pharmacy' },
      },
      {
        path: 'lab-orders',
        loadComponent: clinical,
        data: { board: 'lab-orders' },
      },
      {
        path: 'radiology',
        loadComponent: clinical,
        data: { board: 'radiology' },
      },
      {
        path: 'discharge',
        loadComponent: clinical,
        data: { board: 'discharge' },
      },
      {
        path: 'profile',
        loadComponent: orgProfile,
      },
      {
        path: 'branches',
        loadComponent: branchManager,
      },
      {
        path: 'departments',
        loadComponent: panel,
        data: {
          title: 'Departments',
          description: 'Clinical departments for hospitals and clinics.',
          apiNote: 'Pending departments API.',
        },
      },
      {
        path: 'services',
        loadComponent: panel,
        data: {
          title: 'Services catalog',
          description: 'Services published for your hospital / clinic listings.',
          primaryLink: '/provider',
          primaryLabel: 'Command center',
        },
      },
      {
        path: 'doctors',
        loadComponent: staffManager,
        data: { roleFilter: 'DOCTOR' },
      },
      {
        path: 'staff',
        loadComponent: staffManager,
        data: { roleFilter: 'ALL' },
      },
      {
        path: 'nurses',
        loadComponent: staffManager,
        data: { roleFilter: 'NURSE' },
      },
      {
        path: 'caregivers',
        loadComponent: staffManager,
        data: { roleFilter: 'CAREGIVER' },
      },
      {
        path: 'staff-verification',
        loadComponent: staffManager,
        data: { roleFilter: 'ALL' },
      },
      {
        path: 'patients',
        loadComponent: panel,
        data: {
          title: 'Patient management',
          description: 'Patients from your bookings (consent required for records).',
          source: 'provider-bookings',
        },
      },
      {
        path: 'admissions',
        loadComponent: clinical,
        data: { board: 'ipd' },
      },
      {
        path: 'beds',
        loadComponent: clinical,
        data: { board: 'wards' },
      },
      {
        path: 'shifts',
        loadComponent: panel,
        data: {
          title: 'Shift scheduling',
          description: 'Nurse and caregiver shifts.',
          apiNote: 'Pending shift scheduling API.',
        },
      },
      {
        path: 'assignments',
        loadComponent: panel,
        data: {
          title: 'Staff assignment',
          description: 'Assign staff to home-care bookings and visits.',
          source: 'provider-bookings',
          apiNote: 'Assignments can be layered onto bookings next.',
        },
      },
      {
        path: 'visit-reports',
        loadComponent: panel,
        data: {
          title: 'Patient visit reports',
          description: 'Home-care visit documentation.',
          apiNote: 'Pending visit report composer UI.',
        },
      },
      {
        path: 'nursing-reports',
        loadComponent: panel,
        data: {
          title: 'Nursing reports',
          description: 'Nursing notes for admitted or home patients.',
          apiNote: 'Pending nursing report APIs UI.',
        },
      },
      {
        path: 'vitals',
        loadComponent: panel,
        data: {
          title: 'Patient vitals',
          description: 'Capture vitals during visits.',
          apiNote: 'Clinical vitals model exists; capture UI pending.',
        },
      },
      {
        path: 'attendance',
        loadComponent: panel,
        data: {
          title: 'Attendance',
          description: 'Staff attendance for shifts.',
          apiNote: 'Pending attendance API.',
        },
      },
      {
        path: 'analytics',
        loadComponent: panel,
        data: {
          title: 'Reports & analytics',
          description: 'Booking volume and earnings snapshot.',
          source: 'earnings',
          links: [{ label: 'Bookings', link: '/provider/bookings' }],
        },
      },
      {
        path: 'reviews',
        loadComponent: panel,
        data: {
          title: 'Reviews',
          description: 'Patient feedback for your organization.',
          apiNote: 'Pending reviews API.',
        },
      },
      {
        path: 'settings',
        loadComponent: panel,
        data: {
          title: 'Settings',
          description: 'Organization workspace preferences.',
        },
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
