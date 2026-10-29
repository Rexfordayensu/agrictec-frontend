// Team & roles helpers (phase A14). Pure: role descriptions, permission groups for the matrix,
// and what a role change gains or loses.

import {
  ALL_PERMISSIONS,
  ADMIN_ROLES,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
} from '@/lib/admin/permissions';
import type { AdminRole, AdminUser, Permission } from '@/types/admin';

/** What each role is for, in one line (invite form and role change). */
export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'Everything, including the team, system settings and platform data.',
  admin: 'Runs the platform: farmers, loans, lenders, content, risk and the audit log.',
  support: 'Helps farmers: verifications, risk review and profile fixes.',
  analyst: 'Read-only: the overview, farmers, loans and reports.',
};

/** Highest first, for pickers. */
export const ROLES_HIGH_FIRST: AdminRole[] = [...ADMIN_ROLES].reverse();

/** "view farmers" → "View farmers". */
export const permissionLabel = (permission: Permission) => {
  const text = PERMISSION_LABELS[permission];
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The permission matrix rows, grouped like the console's sections. */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Farmers',
    permissions: ALL_PERMISSIONS.filter(
      (p) =>
        p.startsWith('overview.') ||
        p.startsWith('farmers.') ||
        p === 'verifications.review' ||
        p === 'risk.review',
    ),
  },
  {
    label: 'Lending',
    permissions: ALL_PERMISSIONS.filter(
      (p) => p.startsWith('loans.') || p === 'lenders.manage' || p === 'credit.configure',
    ),
  },
  {
    label: 'Content',
    permissions: ALL_PERMISSIONS.filter(
      (p) => p === 'content.manage' || p === 'announcements.send',
    ),
  },
  {
    label: 'System',
    permissions: ALL_PERMISSIONS.filter((p) =>
      ['reports.export', 'admins.manage', 'audit.view', 'settings.manage', 'data.manage'].includes(
        p,
      ),
    ),
  },
];

/** What moving from one role to another adds and removes. */
export function roleChangeDiff(
  from: AdminRole,
  to: AdminRole,
): { gained: Permission[]; lost: Permission[] } {
  const before = new Set(ROLE_PERMISSIONS[from]);
  const after = new Set(ROLE_PERMISSIONS[to]);
  return {
    gained: ALL_PERMISSIONS.filter((p) => after.has(p) && !before.has(p)),
    lost: ALL_PERMISSIONS.filter((p) => before.has(p) && !after.has(p)),
  };
}

export const activeSuperAdminCount = (team: AdminUser[]) =>
  team.filter((a) => a.role === 'super_admin' && a.status === 'active').length;

/** Why this member's access can't be changed by the current admin (null when it can). */
export function lockReason(
  member: AdminUser,
  currentAdminId: string | undefined,
  team: AdminUser[],
  change: 'role' | 'disable',
): string | null {
  if (member.id === currentAdminId)
    return 'You can’t change your own access. Ask another Super Admin.';
  if (
    member.role === 'super_admin' &&
    member.status === 'active' &&
    activeSuperAdminCount(team) <= 1
  )
    return change === 'role'
      ? `${member.name} is the last active Super Admin and can’t be demoted.`
      : `${member.name} is the last active Super Admin and can’t be disabled.`;
  return null;
}
