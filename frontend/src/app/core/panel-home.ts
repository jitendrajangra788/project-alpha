import { ADMIN_ROLES, PROVIDER_ROLES } from './models';

export const ORG_OWNER_ROLES = [
  'HOSPITAL_OWNER',
  'CLINIC_OWNER',
  'NURSING_HOME_OWNER',
  'HOME_CARE_OWNER',
  'ORGANIZATION_MANAGER',
] as const;

export const LAB_ROLES = ['LAB_OWNER', 'LAB_ADMIN', 'DIAGNOSTIC_CENTRE_OWNER', 'LAB'] as const;

/** Default landing panel for a signed-in user (never public homepage). */
export function panelHomeForRoles(roles: string[]): string {
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return '/admin';
  if (roles.includes('DOCTOR')) return '/doctor';
  if (roles.some((r) => (LAB_ROLES as readonly string[]).includes(r))) return '/lab';
  if (roles.some((r) => (ORG_OWNER_ROLES as readonly string[]).includes(r))) return '/provider';
  if (roles.some((r) => PROVIDER_ROLES.includes(r))) return '/provider';
  if (roles.includes('PATIENT')) return '/patient';
  return '/login';
}
