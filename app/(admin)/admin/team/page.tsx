import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { TeamManager } from '@/components/admin/team/team-manager';

export const metadata: Metadata = { title: 'Team & Roles' };

/** Guarded by admins.manage (Super Admin only; every change is checked again in the service). */
export default function TeamPage() {
  return (
    <RequirePermission permission="admins.manage">
      <TeamManager />
    </RequirePermission>
  );
}
