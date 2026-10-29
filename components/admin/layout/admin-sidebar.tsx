'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { AdminBrand } from '@/components/admin/layout/admin-brand';
import { AdminUserMenu } from '@/components/admin/layout/admin-user-menu';
import {
  getAdminNavForRole,
  isAdminNavActive,
  type AdminBadgeKey,
} from '@/constants/admin-navigation';
import { useAdminRole } from '@/hooks/admin/use-can';
import { useDialog } from '@/hooks/use-dialog';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import { useAdminUiStore } from '@/store/admin/admin-ui-store';

/** Red for risk, gold for work waiting in a queue. */
const BADGE_TONE: Record<AdminBadgeKey, string> = {
  openRisk: 'bg-danger-strong text-white',
  pendingVerifications: 'bg-gold text-[#3a2a05]',
  newApplications: 'bg-gold text-[#3a2a05]',
};

const BADGE_LABEL: Record<AdminBadgeKey, string> = {
  openRisk: 'open',
  pendingVerifications: 'pending',
  newApplications: 'new',
};

/** Nav sections the role may use (empty sections are dropped), badges and the account menu. */
function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useAdminRole();
  const badges = useAdminDataStore((s) => s.badgeCounts);
  const sections = getAdminNavForRole(role);

  return (
    <>
      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p className="text-text-mute mb-2 px-3 text-[10px] font-semibold tracking-wider uppercase">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isAdminNavActive(pathname, item);
                const count = item.badgeKey ? badges[item.badgeKey] : 0;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors duration-200',
                        active
                          ? 'border-purple/30 from-purple/20 to-purple/5 text-ink-purple bg-linear-to-r'
                          : 'text-text-dim hover:bg-glass-strong hover:text-text border-transparent',
                      )}
                    >
                      <Icon size={18} aria-hidden="true" className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badgeKey && count > 0 && (
                        <span
                          className={cn(
                            'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] leading-5 font-bold tabular-nums',
                            BADGE_TONE[item.badgeKey],
                          )}
                        >
                          {count}
                          <span className="sr-only"> {BADGE_LABEL[item.badgeKey]}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-border space-y-2 border-t p-3">
        <Link
          href="/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-dim hover:bg-glass-strong hover:text-text flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Open Farmer App
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
        <AdminUserMenu />
      </div>
    </>
  );
}

/** The floating glass sidebar, from 1024px. Below that, AdminSidebarDrawer takes over. */
export function AdminSidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="glass shadow-glass fixed inset-y-3 left-3 z-40 hidden w-[260px] flex-col overflow-hidden rounded-3xl backdrop-blur-xl lg:flex"
    >
      <AdminBrand className="border-border h-[calc(var(--spacing-header)-1px)] shrink-0 border-b px-5" />
      <AdminSidebarContent />
    </aside>
  );
}

/** Below 1024px the sidebar is a slide-in drawer (focus trapped, Escape or backdrop closes). */
export function AdminSidebarDrawer() {
  const pathname = usePathname();
  const open = useAdminUiStore((s) => s.sidebarOpen);
  const close = useAdminUiStore((s) => s.closeSidebar);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog({ open, panelRef, onClose: close });

  // Close on navigation, and when the window grows to the desktop layout.
  useEffect(() => {
    close();
  }, [pathname, close]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onChange = () => desktop.matches && close();
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, [close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden="true"
        onClick={close}
        className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        tabIndex={-1}
        className="animate-slide-in-left border-border bg-bg-2 shadow-glass relative flex h-full w-[280px] max-w-[85vw] flex-col border-r focus:outline-none"
      >
        <div className="border-border flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <AdminBrand />
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-11 items-center justify-center rounded-xl transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <AdminSidebarContent onNavigate={close} />
      </div>
    </div>
  );
}
