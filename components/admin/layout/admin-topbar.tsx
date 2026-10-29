'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, Search } from 'lucide-react';
import { adminBreadcrumbs } from '@/components/admin/layout/admin-breadcrumbs';
import { AdminNameChip } from '@/components/admin/layout/admin-name';
import { AdminNotifications } from '@/components/admin/layout/admin-notifications';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import { useAdminUiStore } from '@/store/admin/admin-ui-store';

export function AdminTopbar() {
  const pathname = usePathname();
  const farmers = useAdminDataStore((s) => s.farmers);
  const applications = useAdminDataStore((s) => s.applications);
  const openSidebar = useAdminUiStore((s) => s.openSidebar);
  const openSearch = useAdminUiStore((s) => s.setSearchOpen);
  const crumbs = adminBreadcrumbs(pathname, { farmers, applications });

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-6 sm:-mx-6 lg:top-3 lg:mx-0">
      <div className="border-border bg-bg-2 lg:topbar-glass lg:h-header flex items-center gap-2 border-b px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:gap-3 lg:rounded-2xl lg:border lg:py-0 lg:backdrop-blur-xl">
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open menu"
          className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" key={pathname} className="animate-page-in min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-1 text-sm">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {index > 0 && (
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="text-text-mute shrink-0"
                    />
                  )}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="text-text-dim hover:text-ink-purple truncate"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={
                        last
                          ? 'text-text truncate font-semibold'
                          : 'text-text-mute hidden truncate sm:inline'
                      }
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => openSearch(true)}
            aria-label="Search the console (Ctrl+K)"
            className="glass text-text-dim hover:bg-glass-strong hover:text-text inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm transition-colors"
          >
            <Search size={16} aria-hidden="true" />
            <span className="hidden md:inline">Search…</span>
            <kbd className="border-border text-text-mute hidden rounded-md border px-1.5 text-[10px] font-semibold md:inline">
              Ctrl K
            </kbd>
          </button>
          <AdminNotifications />
          <ThemeToggle />
          <AdminNameChip />
        </div>
      </div>
    </header>
  );
}
