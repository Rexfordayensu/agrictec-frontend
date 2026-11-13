'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SETTINGS_PAGES } from '@/components/settings/settings-sections';
import { isNavActive } from '@/constants/navigation';
import { cn } from '@/lib/utils';

/**
 * Menu of the settings pages: a horizontal, scrollable chip row on small screens and a
 * sticky vertical list beside the content on wide ones. The current page is highlighted.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // On the chip row, keep the current page's chip in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav
      aria-label="Settings pages"
      className="@5xl:rounded-card @5xl:border-border @5xl:bg-glass @5xl:shadow-glass @5xl:sticky @5xl:top-28 @5xl:border @5xl:p-3"
    >
      <div className="hidden px-2 pt-2 pb-4 @5xl:block">
        <h2 className="text-text text-lg font-bold">Settings</h2>
        <p className="text-text-dim text-small mt-0.5 leading-snug">
          Manage your account and farm details.
        </p>
      </div>
      <ul className="@5xl:border-border -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 @5xl:mx-0 @5xl:flex-col @5xl:gap-1 @5xl:overflow-visible @5xl:border-t @5xl:px-0 @5xl:pt-3">
        {SETTINGS_PAGES.map(({ href, label, description, icon: Icon }) => {
          const current = isNavActive(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                ref={current ? activeRef : undefined}
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-2.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors @5xl:min-h-16 @5xl:gap-3.5 @5xl:rounded-xl @5xl:py-3 @5xl:whitespace-normal',
                  current
                    ? 'border-accent/40 bg-accent/10 text-ink-green @5xl:bg-accent/15'
                    : 'border-border bg-glass text-text-dim hover:text-text @5xl:hover:bg-glass @5xl:border-transparent @5xl:bg-transparent',
                )}
              >
                <Icon size={16} aria-hidden="true" className="shrink-0 @5xl:size-6" />
                <span className="min-w-0">
                  <span className="@5xl:text-text block @5xl:text-sm @5xl:font-semibold">
                    {label}
                  </span>
                  <span
                    className={cn(
                      'hidden text-xs leading-snug font-normal @5xl:block',
                      current ? 'text-ink-green/80' : 'text-text-dim',
                    )}
                  >
                    {description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
