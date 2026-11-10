import { Component } from '@angular/core';
import { DashboardShellComponent, DashNavGroup } from '../shared/dashboard-shell.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `
    <app-dashboard-shell
      panelTitle="Admin Panel"
      pageTitle="Dashboard"
      pageSubtitle="Welcome back — platform operations at a glance."
      searchPlaceholder="Search users, doctors, hospitals…"
      searchRoute="/admin/users"
      homeLink="/admin"
      [notificationsLink]="'/admin/notifications'"
      [notificationCount]="3"
      [nav]="nav"
    />
  `,
})
export class AdminLayoutComponent {
  readonly nav: DashNavGroup[] = [
    {
      title: 'Main',
      icon: '🏠',
      defaultOpen: true,
      items: [
        { label: 'Dashboard', link: '/admin', exact: true, icon: '▣' },
        { label: 'Reports & analytics', link: '/admin/analytics', icon: '📈' },
        { label: 'Notifications', link: '/admin/notifications', icon: '🔔' },
        { label: 'Audit logs', link: '/admin/audit-logs', icon: '🧾' },
      ],
    },
    {
      title: 'Providers',
      icon: '🏥',
      items: [
        { label: 'Verifications', link: '/admin/verifications', icon: '✔' },
        { label: 'Doctors', link: '/admin/doctors', icon: '🩺' },
        { label: 'Hospitals', link: '/admin/hospitals', icon: '🏨' },
        { label: 'Clinics', link: '/admin/clinics', icon: '🏢' },
        { label: 'Nursing homes', link: '/admin/nursing-homes', icon: '🛏️' },
        { label: 'Home care agencies', link: '/admin/home-care', icon: '🚑' },
        { label: 'Labs & diagnostics', link: '/admin/labs', icon: '🧪' },
      ],
    },
    {
      title: 'Operations',
      icon: '⚙️',
      items: [
        { label: 'Patients', link: '/admin/patients', icon: '👤' },
        { label: 'Appointments', link: '/admin/appointments', icon: '📅' },
        { label: 'Lab bookings', link: '/admin/lab-bookings', icon: '🧬' },
        { label: 'Video consultations', link: '/admin/video', icon: '🎥' },
        { label: 'Reviews & complaints', link: '/admin/reviews', icon: '⭐' },
      ],
    },
    {
      title: 'Commerce',
      icon: '💳',
      items: [
        { label: 'Payments', link: '/admin/payments', icon: '₹' },
        { label: 'Commissions', link: '/admin/commissions', icon: '%' },
        { label: 'Subscriptions', link: '/admin/subscriptions', icon: '📦' },
      ],
    },
    {
      title: 'Catalog & CMS',
      icon: '🗂️',
      items: [
        { label: 'Categories & services', link: '/admin/categories', icon: '🏷️' },
        { label: 'Cities & locations', link: '/admin/locations', icon: '📍' },
        { label: 'Homepage banners', link: '/admin/banners', icon: '🖼️' },
      ],
    },
    {
      title: 'System',
      icon: '🔐',
      items: [
        { label: 'Users', link: '/admin/users', icon: '👥' },
        { label: 'Roles & permissions', link: '/admin/roles', icon: '🔑' },
        { label: 'Platform settings', link: '/admin/settings', icon: '⚙️' },
      ],
    },
  ];
}
