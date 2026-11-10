export interface PlatformSettings {
  brand_name: string;
  support_email?: string | null;
  support_phone?: string | null;
  tagline?: string | null;
}

export interface User {
  id: string;
  full_name: string;
  email?: string | null;
  mobile: string;
  is_active: boolean;
  roles: string[];
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface Organization {
  id: string;
  name: string;
  organization_type: string;
  contact_number: string;
  email?: string | null;
  address_line: string;
  city: string;
  state?: string | null;
  pin_code: string;
  license_number?: string | null;
  description?: string | null;
  verification_status: string;
  is_verified: boolean;
  is_active: boolean;
  documents: Array<{
    id: string;
    document_type: string;
    file_name: string;
    content_type: string;
  }>;
}

export interface AdminDashboard {
  total_patients: number;
  total_doctors: number;
  total_organizations: number;
  pending_verifications: number;
  total_users: number;
}

export const ORG_TYPES = [
  'HOSPITAL',
  'CLINIC',
  'NURSING_HOME',
  'HOME_CARE',
  'LAB',
  'DIAGNOSTIC_CENTRE',
] as const;

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
export const PROVIDER_ROLES = [
  'HOSPITAL_OWNER',
  'CLINIC_OWNER',
  'NURSING_HOME_OWNER',
  'HOME_CARE_OWNER',
  'LAB_OWNER',
  'DIAGNOSTIC_CENTRE_OWNER',
  'ORGANIZATION_MANAGER',
  'DOCTOR',
];
