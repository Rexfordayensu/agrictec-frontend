'use client';

import type { ReactNode } from 'react';
import { NoAccess } from '@/components/admin/layout/no-access';
import { useCan } from '@/hooks/admin/use-can';
import type { Permission } from '@/types/admin';

/**
 * Page-level guard: every admin page renders through this, so a typed-in URL shows
 * <NoAccess /> instead of the page. (Hiding the nav item is not enough on its own, and the
 * services check the permission again for every action.)
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  return useCan(permission) ? <>{children}</> : <NoAccess />;
}
