import { Component } from '@angular/core';
import { DashboardShellComponent, DashNavGroup } from '../shared/dashboard-shell.component';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `
    <app-dashboard-shell
      panelTitle="Patient Panel"
      pageTitle="Dashboard"
      pageSubtitle="Your appointments, records, prescriptions and care in one place."
      searchPlaceholder="Search doctors, labs, hospitals…"
      searchRoute="/patient/find/doctors"
      homeLink="/patient"
      [notificationsLink]="'/patient/notifications'"
      [nav]="nav"
    />
  `,
})
export class PatientLayoutComponent {
  readonly nav: DashNavGroup[] = [
    {
      title: 'Overview',
      icon: '🏠',
      defaultOpen: true,
      items: [
        { label: 'Patient Dashboard', link: '/patient', exact: true, icon: '▣' },
        { label: 'Medical Timeline', link: '/patient/timeline', icon: '🕒' },
        { label: 'Notifications', link: '/patient/notifications', icon: '🔔' },
        { label: 'Settings', link: '/patient/settings', icon: '⚙️' },
      ],
    },
    {
      title: 'Account',
      icon: '👤',
      items: [
        { label: 'My Profile', link: '/patient/profile', icon: '🪪' },
        { label: 'Family Members', link: '/patient/family', icon: '👨‍👩‍👧' },
        { label: 'Consent & Privacy', link: '/patient/consents', icon: '🔐' },
      ],
    },
    {
      title: 'Find Care',
      icon: '🔍',
      defaultOpen: true,
      items: [
        { label: 'Find Doctors', link: '/patient/find/doctors', icon: '🩺' },
        { label: 'Find Hospitals', link: '/patient/find/hospitals', icon: '🏨' },
        { label: 'Find Clinics', link: '/patient/find/clinics', icon: '🏢' },
        { label: 'Find Nursing Homes', link: '/patient/find/nursing-homes', icon: '🛏️' },
        { label: 'Find Home Care', link: '/patient/find/home-care', icon: '🚑' },
        { label: 'Find Labs & Tests', link: '/patient/find/labs', icon: '🧪' },
      ],
    },
    {
      title: 'My Care',
      icon: '❤️',
      items: [
        { label: 'My Appointments', link: '/patient/appointments', icon: '📅' },
        { label: 'My Lab Bookings', link: '/patient/lab-bookings', icon: '🧬' },
        { label: 'My Video Consultations', link: '/patient/video', icon: '🎥' },
        { label: 'My Prescriptions', link: '/patient/prescriptions', icon: '💊' },
        { label: 'My Lab Reports', link: '/patient/lab-reports', icon: '📄' },
        { label: 'My Medical Records', link: '/patient/records', icon: '📁' },
        { label: 'My Vitals', link: '/patient/vitals', icon: '❤️' },
        { label: 'Nursing Visit Reports', link: '/patient/nursing-reports', icon: '📝' },
      ],
    },
    {
      title: 'Billing & Feedback',
      icon: '💳',
      items: [
        { label: 'Payments & Invoices', link: '/patient/payments', icon: '₹' },
        { label: 'Reviews', link: '/patient/reviews', icon: '⭐' },
      ],
    },
  ];
}
