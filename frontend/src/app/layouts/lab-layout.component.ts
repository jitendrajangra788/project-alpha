import { Component } from '@angular/core';
import { DashboardShellComponent, DashNavGroup } from '../shared/dashboard-shell.component';

@Component({
  selector: 'app-lab-layout',
  standalone: true,
  imports: [DashboardShellComponent],
  template: `
    <app-dashboard-shell
      panelTitle="Lab Panel"
      pageTitle="Dashboard"
      pageSubtitle="Manage tests, samples, reports and lab bookings."
      searchPlaceholder="Search bookings, reports…"
      searchRoute="/lab/bookings"
      homeLink="/lab"
      [notificationsLink]="'/lab/settings'"
      [nav]="nav"
    />
  `,
})
export class LabLayoutComponent {
  readonly nav: DashNavGroup[] = [
    {
      title: 'Operations',
      icon: '🧪',
      defaultOpen: true,
      items: [
        { label: 'Dashboard', link: '/lab', exact: true, icon: '▣' },
        { label: 'Lab bookings', link: '/lab/bookings', icon: '📅' },
        { label: 'Sample collection', link: '/lab/samples', icon: '🩸' },
        { label: 'Sample tracking', link: '/lab/tracking', icon: '📦' },
        { label: 'Test processing', link: '/lab/processing', icon: '⚗️' },
        { label: 'Reports', link: '/lab/reports', icon: '📄' },
        { label: 'Report approval', link: '/lab/approvals', icon: '✔' },
        { label: 'Published reports', link: '/lab/published', icon: '📣' },
      ],
    },
    {
      title: 'Catalog',
      icon: '🗂️',
      items: [
        { label: 'Lab profile', link: '/lab/profile', icon: '🪪' },
        { label: 'Branches', link: '/lab/branches', icon: '📍' },
        { label: 'Test management', link: '/lab/tests', icon: '🧬' },
        { label: 'Health packages', link: '/lab/packages', icon: '🎁' },
        { label: 'Pricing', link: '/lab/pricing', icon: '₹' },
        { label: 'Staff', link: '/lab/staff', icon: '👥' },
      ],
    },
    {
      title: 'Business',
      icon: '💼',
      items: [
        { label: 'Payments', link: '/lab/payments', icon: '💳' },
        { label: 'Analytics', link: '/lab/analytics', icon: '📈' },
        { label: 'Settings', link: '/lab/settings', icon: '⚙️' },
        { label: 'Organizations', link: '/provider', icon: '🏥' },
      ],
    },
  ];
}
