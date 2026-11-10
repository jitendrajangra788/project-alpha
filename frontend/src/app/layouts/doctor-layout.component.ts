import { Component } from '@angular/core';
import { DashboardShellComponent, DashNavGroup } from '../shared/dashboard-shell.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `
    <app-dashboard-shell
      panelTitle="Doctor Panel"
      pageTitle="Dashboard"
      pageSubtitle="Manage appointments, prescriptions, video consults and earnings."
      searchPlaceholder="Search patients, appointments…"
      searchRoute="/doctor/patients"
      homeLink="/doctor"
      [notificationsLink]="'/doctor/notifications'"
      [nav]="nav"
    />
  `,
})
export class DoctorLayoutComponent {
  readonly nav: DashNavGroup[] = [
    {
      title: 'Practice',
      icon: '🩺',
      defaultOpen: true,
      items: [
        { label: 'Dashboard', link: '/doctor', exact: true, icon: '▣' },
        { label: 'Appointments', link: '/doctor/bookings', icon: '📅' },
        { label: 'Appointment calendar', link: '/doctor/calendar', icon: '🗓️' },
        { label: 'Video consultations', link: '/doctor/video', icon: '🎥' },
        { label: 'Write prescription', link: '/doctor/prescriptions', icon: '💊' },
        { label: 'Patient list', link: '/doctor/patients', icon: '👥' },
        { label: 'Medical records', link: '/doctor/records', icon: '📁' },
      ],
    },
    {
      title: 'Profile',
      icon: '👤',
      items: [
        { label: 'Doctor profile', link: '/doctor/profile', icon: '🪪' },
        { label: 'Qualifications', link: '/doctor/qualifications', icon: '🎓' },
        { label: 'Hospital associations', link: '/doctor/associations', icon: '🏥' },
        { label: 'Availability', link: '/doctor/availability', icon: '⏰' },
        { label: 'Consultation fees', link: '/doctor/fees', icon: '₹' },
      ],
    },
    {
      title: 'Business',
      icon: '💼',
      items: [
        { label: 'Earnings & payments', link: '/doctor/earnings', icon: '💰' },
        { label: 'Reviews', link: '/doctor/reviews', icon: '⭐' },
        { label: 'Notifications', link: '/doctor/notifications', icon: '🔔' },
        { label: 'Settings', link: '/doctor/settings', icon: '⚙️' },
      ],
    },
  ];
}
