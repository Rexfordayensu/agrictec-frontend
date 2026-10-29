import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminDataLoader } from '@/components/admin/layout/admin-data-loader';
import { AdminSearch } from '@/components/admin/layout/admin-search';
import { AdminSidebar, AdminSidebarDrawer } from '@/components/admin/layout/admin-sidebar';
import { AdminTopbar } from '@/components/admin/layout/admin-topbar';
import { EditNameDialog } from '@/components/admin/layout/admin-name';
import { ChangePasswordDialog } from '@/components/admin/layout/admin-user-menu';
import { MaintenanceBanner } from '@/components/admin/layout/maintenance-banner';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = {
  title: { default: 'Admin Console', template: '%s | AgriCtec Admin' },
  robots: { index: false, follow: false },
};

/**
 * The admin console shell (on the shared page background): role-filtered sidebar (a drawer below 1024px),
 * top bar with breadcrumbs, search, bell, theme and role. Every page also checks its own
 * permission (RequirePermission), so a typed-in URL is never enough.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminDataLoader>
        <div className="flex min-h-screen">
          <AdminSidebar />
          <AdminSidebarDrawer />
          {/* 272px = 12px inset + 260px floating sidebar (from 1024px). */}
          <main className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:ml-[272px] lg:pt-3">
            <AdminTopbar />
            <MaintenanceBanner />
            <PageContainer>{children}</PageContainer>
          </main>
        </div>
        <AdminSearch />
        <ChangePasswordDialog />
        <EditNameDialog />
      </AdminDataLoader>
    </>
  );
}
