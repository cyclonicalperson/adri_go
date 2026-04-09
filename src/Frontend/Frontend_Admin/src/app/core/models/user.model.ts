import { AdminRole } from '../auth/auth.service';


// ── Legacy Role interfejs ─────────────────────────────────────────────────
// Zadržano za kompatibilnost sa user-form i roles-permissions komponentama.
// U novom kodu koristiti AdminRole tip direktno iz auth.service.ts

export interface Role {
  roleId: number;
  roleName: 'superadmin' | 'admin';
  description: string;
}

// ── Admin User ────────────────────────────────────────────────────────────
// Maps to: admin_user JOIN organization (v_admin_users_full view)

export type AccountStatus = 'active' | 'suspended' | 'pending';

export interface User {
  userId: number;
  organizationId: number | null;
  fullName: string;
  email: string;
  emailVerifiedAt: string | null;
  role: AdminRole;   // 'superadmin' | 'admin'
  isIndividual: boolean;     // true = fizičko lice
  accountStatus: AccountStatus;
  profileImage: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  // Joined from organization
  organization?: Organization | null;
  // Computed
  isActive: boolean;     // accountStatus === 'active'
  permissionCount?: number;
}

// ── Organization ──────────────────────────────────────────────────────────
// Maps to: organization table

export type OrganizationType =
  | 'tourist_agency'
  | 'hotel_chain'
  | 'municipality'
  | 'ngo'
  | 'private';

export interface Organization {
  organizationId: number;   // DB: organization.id
  name: string;
  type: OrganizationType;
  contactEmail: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  isVerified: boolean;
  createdAt: string;
}

// ── Admin Permission ──────────────────────────────────────────────────────
// Maps to: admin_permission table
// Codes match DB seed exactly

export type PermissionCode =
  | 'create_accommodation'
  | 'create_restaurant'
  | 'create_club'
  | 'create_event'
  | 'create_route'
  | 'create_cultural_site'
  | 'create_monument'
  | 'create_sports'
  | 'create_shop'
  | 'manage_reviews'
  | 'view_analytics'
  | 'manage_own_posts'
  | 'manage_tags'
  | 'manage_translations'
  | 'view_tourists'
  | 'manage_tickets';

export type PermissionCategory = 'content' | 'analytics' | 'users';

export interface Permission {
  id: number;
  code: PermissionCode;
  label: string;
  category: PermissionCategory;
  description: string | null;
}

// ── User-Permission join ──────────────────────────────────────────────────
// Maps to: admin_user_permission table

export interface UserPermission {
  id: number;
  adminUserId: number;
  permission: Permission;
  regionId: number | null;  // null = global, value = scoped to region
  grantedBy: number;
  grantedAt: string;
}

// ── Registration Request ──────────────────────────────────────────────────
// Maps to: admin_registration_request table

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationRequest {
  id: number;
  fullName: string;
  email: string;
  isIndividual: boolean;
  organizationName: string | null;
  organizationEmail: string | null;
  emailVerifiedAt: string | null;
  status: RegistrationStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: number | null;
}

// ── Admin Notification ────────────────────────────────────────────────────
// Maps to: admin_notification table

export type AdminNotificationType =
  | 'pending_review'
  | 'new_registration'
  | 'post_approved'
  | 'post_rejected'
  | 'system';

export interface AdminNotification {
  id: number;
  adminUserId: number;
  type: AdminNotificationType;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  sentAt: string | null;
}

// ── Request payloads ──────────────────────────────────────────────────────

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: AdminRole;
  organizationId?: number;
  isIndividual: boolean;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  role?: AdminRole;
  organizationId?: number | null;
  isIndividual?: boolean;
  accountStatus?: AccountStatus;
}

export interface ApproveRegistrationRequest {
  rejectionReason?: string;
}
