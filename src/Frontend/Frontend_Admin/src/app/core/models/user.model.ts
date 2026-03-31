export type UserRole = 'ADMIN' | 'ORG' | 'TOURIST';

export interface User {
  userId: number;
  roleId: number;
  organizationId: number | null;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role?: Role;
  organization?: Organization;
}

export interface Role {
  roleId: number;
  roleName: UserRole;
  description: string;
}

export interface Organization {
  organizationId: number;
  name: string;
  description: string;
  contactEmail: string;
  phone: string;
  website: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  roleId: number;
  organizationId?: number;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  roleId?: number;
  organizationId?: number;
  isActive?: boolean;
}
