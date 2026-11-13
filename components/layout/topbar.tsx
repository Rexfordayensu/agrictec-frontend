'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { NotificationBell } from '@/components/layout/notification-bell';
import { GlobalSearch } from '@/components/layout/global-search';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { isItemActive, NAV_SECTIONS, PAGE_META } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import { navKey, useT } from '@/lib/i18n';
import { useProfileStore } from '@/store/profile-store';

const iconButtonClass =
  'relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-text-dim transition-colors hover:bg-glass-strong hover:text-text';

interface PageInfo {
  title: string;
  subtitle: string;
  section: string | null;
  icon: LucideIcon | null;
}

/** Title, subtitle, nav section and icon for the current route (works for nested routes too). */
function pageInfo(pathname: string): PageInfo {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => isItemActive(pathname, i));
    if (item) {
      const meta = PAGE_META[item.match ?? item.href];
      return {
        title: meta?.title ?? item.label,
        subtitle: meta?.subtitle ?? '',
        section: item.href === '/reports' ? 'Finance' : section.title,
        icon: item.icon,
      };
    }
  }
  return { title: 'AgriCtec', subtitle: '', section: null, icon: null };
}

/**
 * Top bar. Below 900px: a full-width, opaque bar stuck to the top of the page (no blur,
 * no scroll effects, so it cannot jitter). From 900px: the floating glass bar, which turns
 * more solid on scroll through a CSS scroll-driven animation (no scroll listener or re-renders).
 * The title block re-animates on every navigation.
 */
export function Topbar() {
  const pathname = usePathname();
  const t = useT();
  const { title, subtitle, section, icon: Icon } = pageInfo(pathname);
  const name = useProfileStore((s) => s.profile?.name.trim() || 'Farmer');
  const photoDataUrl = useProfileStore((s) => s.profile?.photoDataUrl);

  // Both breakpoints in px so Tailwind orders them (it cannot sort rem md: against px 900px):
  // full-bleed below 900px, inset from the edges from 900px. On desktop the bar rests at the
  // same 12px it sticks at (main has pt-3), so it never slides when scrolling starts, and it
  // lines up with the sidebar: same top (12px) and same height (h-header) as its logo row.
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-6 min-[768px]:-mx-8 min-[900px]:top-3 min-[900px]:mx-0">
      <div
        className={cn(
          'border-border bg-bg-2 flex items-center gap-2 border-b px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 sm:gap-3',
          'min-[900px]:topbar-glass min-[900px]:h-header min-[900px]:rounded-2xl min-[900px]:border min-[900px]:px-3 min-[900px]:py-0 min-[900px]:backdrop-blur-xl',
        )}
      >
        {/* key={pathname}: the whole block fades in again whenever the route changes */}
        <div key={pathname} className="animate-page-in flex min-w-0 flex-1 items-center gap-3">
          {Icon && (
            <span
              aria-hidden="true"
              className="from-accent/25 to-accent/5 text-ink-green hidden size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br min-[360px]:inline-flex"
            >
              <Icon size={20} />
            </span>
          )}
          <div className="min-w-0">
            {section && (
              <p className="text-text-mute text-xs font-semibold tracking-wider uppercase min-[900px]:text-xs">
                {t(`nav.section.${section}`)}
              </p>
            )}
            <h1 className="font-display text-text truncate text-sm leading-tight font-bold min-[900px]:text-xl">
              {t(navKey(pathname)) === navKey(pathname) ? title : t(navKey(pathname))}
            </h1>
            {subtitle && (
              <p className="text-text-dim hidden truncate text-xs lg:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <GlobalSearch />
          <NotificationBell buttonClassName={iconButtonClass} />
          <ThemeToggle />
          <Link
            href="/settings/profile"
            aria-label={`Open ${name}'s profile`}
            className="hover:bg-glass-strong focus-visible:outline-accent inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl p-1"
          >
            <ProfileAvatar
              name={name}
              photoDataUrl={photoDataUrl}
              className="ring-accent/30 size-9 text-xs ring-1"
            />
            <span className="text-text hidden max-w-24 truncate pr-1 text-xs font-semibold min-[1200px]:block">
              {name.split(/\s+/)[0]}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
