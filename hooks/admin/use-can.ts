'use client';

import { can, canAny } from '@/lib/admin/permissions';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import type { AdminRole, Permission } from '@/types/admin';

/** The signed-in admin's role. A disabled account or no session has no role, so no permissions. */
export function useAdminRole(): AdminRole | undefined {
  return useAdminAuthStore((s) => (s.admin?.status === 'active' ? s.admin.role : undefined));
}

export function useCan(permission: Permission): boolean {
  return can(useAdminRole(), permission);
}

/** True when the admin has at least one of the permissions. */
export function useCanAny(permissions: readonly Permission[]): boolean {
  return canAny(useAdminRole(), permissions);
}
