import { Component } from '@angular/core';
import { DashboardShellComponent, DashNavGroup } from '../shared/dashboard-shell.component';

@Component({
  selector: 'app-provider-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `
    <app-dashboard-shell
      panelTitle="Hospital / Clinic Panel"
      pageTitle="Command center"
      pageSubtitle="OPD, OT, IPD, wards, staff and billing — organization workspace."
      searchPlaceholder="Search patients, OPD, OT…"
      searchRoute="/provider/opd"
      homeLink="/provider"
      [notificationsLink]="'/provider/settings'"
      [nav]="nav"
    />
  `,
})
export class ProviderLayoutComponent {
  readonly nav: DashNavGroup[] = [
    {
      title: 'Command Center',
      icon: '🏠',
      defaultOpen: true,
      items: [
        { label: 'Dashboard', link: '/provider', exact: true, icon: '▣' },
        { label: 'Organization profile', link: '/provider/profile', icon: '🪪' },
        { label: 'Branches', link: '/provider/branches', icon: '📍' },
        { label: 'Departments', link: '/provider/departments', icon: '🏬' },
      ],
    },
    {
      title: 'Clinical (OPD / OT / IPD)',
      icon: '🩺',
      defaultOpen: true,
      items: [
        { label: 'OPD Queue', link: '/provider/opd', icon: '🏥' },
        { label: 'Appointments', link: '/provider/bookings', icon: '📅' },
        { label: 'OT / Surgery Board', link: '/provider/ot', icon: '🔪' },
        { label: 'IPD Admissions', link: '/provider/admissions', icon: '🛏️' },
        { label: 'Wards & Beds', link: '/provider/beds', icon: '🏨' },
        { label: 'Emergency / Casualty', link: '/provider/emergency', icon: '🚨' },
        { label: 'Discharge', link: '/provider/discharge', icon: '🚪' },
        { label: 'Patient vitals', link: '/provider/vitals', icon: '💓' },
      ],
    },
    {
      title: 'Diagnostics & Pharmacy',
      icon: '🧪',
      items: [
        { label: 'Lab orders', link: '/provider/lab-orders', icon: '🧬' },
        { label: 'Radiology orders', link: '/provider/radiology', icon: '📷' },
        { label: 'Pharmacy', link: '/provider/pharmacy', icon: '💊' },
        { label: 'Services catalog', link: '/provider/services', icon: '🛠️' },
      ],
    },
    {
      title: 'Workforce',
      icon: '👥',
      items: [
        { label: 'Doctors', link: '/provider/doctors', icon: '🩺' },
        { label: 'Staff', link: '/provider/staff', icon: '🧑‍💼' },
        { label: 'Nurses', link: '/provider/nurses', icon: '👩‍⚕️' },
        { label: 'Caregivers', link: '/provider/caregivers', icon: '🤝' },
        { label: 'Duty roster / shifts', link: '/provider/shifts', icon: '⏰' },
        { label: 'Staff assignment', link: '/provider/assignments', icon: '📌' },
        { label: 'Attendance', link: '/provider/attendance', icon: '✓' },
        { label: 'Staff verification', link: '/provider/staff-verification', icon: '✔' },
      ],
    },
    {
      title: 'Patients & Reports',
      icon: '📁',
      items: [
        { label: 'Patients', link: '/provider/patients', icon: '👤' },
        { label: 'Visit reports', link: '/provider/visit-reports', icon: '📝' },
        { label: 'Nursing reports', link: '/provider/nursing-reports', icon: '📋' },
      ],
    },
    {
      title: 'Finance & Admin',
      icon: '💼',
      items: [
        { label: 'Billing & payments', link: '/provider/billing', icon: '₹' },
        { label: 'Reports & analytics', link: '/provider/analytics', icon: '📈' },
        { label: 'Reviews', link: '/provider/reviews', icon: '⭐' },
        { label: 'Settings', link: '/provider/settings', icon: '⚙️' },
        { label: 'Register another org', link: '/list-your-business', icon: '＋' },
      ],
    },
  ];
}
