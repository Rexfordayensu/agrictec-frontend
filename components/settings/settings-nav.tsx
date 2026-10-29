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
    <nav aria-label="Settings pages" className="@5xl:sticky @5xl:top-28">
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 @5xl:mx-0 @5xl:flex-col @5xl:gap-1 @5xl:overflow-visible @5xl:px-0">
        {SETTINGS_PAGES.map(({ href, label, description, icon: Icon }) => {
          const current = isNavActive(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                ref={current ? activeRef : undefined}
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-2.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors @5xl:rounded-xl @5xl:py-2.5',
                  current
                    ? 'border-accent/40 bg-accent/10 text-ink-green'
                    : 'border-border bg-glass text-text-dim hover:text-text @5xl:hover:bg-glass @5xl:border-transparent @5xl:bg-transparent',
                )}
              >
                <Icon size={16} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0">
                  <span className="block">{label}</span>
                  <span
                    className={cn(
                      'hidden text-[11px] font-normal @5xl:block',
                      current ? 'text-ink-green/80' : 'text-text-mute',
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
