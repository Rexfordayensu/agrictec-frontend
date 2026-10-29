import type { ReactNode } from 'react';
import { PageHeader } from '@/components/admin/layout/page-header';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { SystemSettingsNav } from '@/components/admin/settings/settings-nav';

/** All settings routes retain the same Super Admin permission boundary. */
export default function SystemSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <RequirePermission permission="settings.manage">
      <div className="space-y-6">
        <PageHeader
          title="System settings"
          description="Choose a settings page to manage the platform. Every change is recorded in the audit log."
        />
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <SystemSettingsNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </RequirePermission>
  );
}
