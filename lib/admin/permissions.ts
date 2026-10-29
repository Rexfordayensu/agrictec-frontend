// Role-based access control for the admin console (admin spec Section 2).
// Every visibility check (nav, buttons) and every service action goes through can() / assertCan().
// Never copy permission logic into components.

import type { AdminRole, Permission, Role } from '@/types/admin';

export type { AdminRole, Permission, Role } from '@/types/admin';

/** Lowest to highest rank. */
export const ADMIN_ROLES: readonly AdminRole[] = ['analyst', 'support', 'admin', 'super_admin'];

/** In the same order as the spec table. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  'overview.view',
  'farmers.view',
  'farmers.edit',
  'farmers.suspend',
  'farmers.delete',
  'farmers.impersonate',
  'verifications.review',
  'loans.view',
  'loans.manage',
  'lenders.manage',
  'credit.configure',
  'content.manage',
  'announcements.send',
  'risk.review',
  'reports.export',
  'admins.manage',
  'audit.view',
  'settings.manage',
  'data.manage',
];

/** The matrix from admin spec Section 2. tests/admin-permissions.test.cjs checks it against the spec. */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  analyst: ['overview.view', 'farmers.view', 'loans.view', 'reports.export'],
  support: [
    'overview.view',
    'farmers.view',
    'farmers.edit',
    'farmers.impersonate',
    'verifications.review',
    'loans.view',
    'risk.review',
  ],
  admin: [
    'overview.view',
    'farmers.view',
    'farmers.edit',
    'farmers.suspend',
    'farmers.impersonate',
    'verifications.review',
    'loans.view',
    'loans.manage',
    'lenders.manage',
    'content.manage',
    'announcements.send',
    'risk.review',
    'reports.export',
    'audit.view',
  ],
  super_admin: [...ALL_PERMISSIONS],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  analyst: 'Analyst',
  support: 'Support',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ROLE_RANK: Record<AdminRole, number> = {
  analyst: 1,
  support: 2,
  admin: 3,
  super_admin: 4,
};

/** Completes "You do not have permission to …". */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'overview.view': 'view the overview',
  'farmers.view': 'view farmers',
  'farmers.edit': 'add farmer notes and tags or reset their passwords',
  'farmers.suspend': 'suspend farmers',
  'farmers.delete': 'permanently delete farmers',
  'farmers.impersonate': 'view the app as a farmer',
  'verifications.review': 'review verifications',
  'loans.view': 'view loan applications',
  'loans.manage': 'manage loan applications',
  'lenders.manage': 'manage lenders',
  'credit.configure': 'change the credit rules',
  'content.manage': 'manage content',
  'announcements.send': 'send announcements',
  'risk.review': 'review risk flags',
  'reports.export': 'export reports',
  'admins.manage': 'manage the admin team',
  'audit.view': 'view the audit log',
  'settings.manage': 'change system settings',
  'data.manage': 'manage platform data',
};

export function isAdminRole(role: Role | null | undefined): role is AdminRole {
  // hasOwn, not `in`: a role read from storage could be 'toString', which `in` would accept.
  return role != null && role !== 'farmer' && Object.hasOwn(ROLE_PERMISSIONS, role);
}

/** Deny by default: a farmer, a missing role or an unknown role never has any admin permission. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!isAdminRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** True only when the role has every permission. An empty list is never granted. */
export function canAll(role: Role | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.length > 0 && permissions.every((p) => can(role, p));
}

export function canAny(role: Role | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** A proposed change to another admin's role. `'disabled'` means disabling the account. */
export interface RoleChange {
  nextRole: AdminRole | 'disabled';
  /** How many active super admins exist right now, including the target. */
  activeSuperAdmins: number;
}

/**
 * Only a super admin may manage admin roles. With `change`, it also refuses to remove the
 * last active super admin (by demoting or disabling them), so the console can never be locked out.
 * Without `change`, it answers whether the actor may manage this target at all (for showing controls).
 */
export function canManageRole(actor: AdminRole, target: AdminRole, change?: RoleChange): boolean {
  if (actor !== 'super_admin') return false;
  if (
    change &&
    target === 'super_admin' &&
    change.nextRole !== 'super_admin' &&
    change.activeSuperAdmins <= 1
  ) {
    return false;
  }
  return true;
}

export class PermissionError extends Error {
  readonly permission: Permission;

  constructor(permission: Permission) {
    super(`You do not have permission to ${PERMISSION_LABELS[permission]}.`);
    this.name = 'PermissionError';
    this.permission = permission;
  }
}

/** Throws a PermissionError unless the role has the permission. Services call this before every action. */
export function assertCan(role: Role | null | undefined, permission: Permission): void {
  if (!can(role, permission)) throw new PermissionError(permission);
}
