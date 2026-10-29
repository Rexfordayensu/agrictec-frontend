'use client';

import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Grid2x2, LogOut, X } from 'lucide-react';
import { useSignOut } from '@/components/layout/use-sign-out';
import { isNavActive, mobileNavFor, type NavItem } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import { useUiStore } from '@/store/ui-store';

/** Menu grid cell: icon above a small centred label, no card. At least 64px tall to tap. */
const gridItemClass =
  'flex min-h-16 w-full flex-col items-center justify-start gap-1 rounded-xl px-0.5 py-1.5 text-center transition-colors hover:text-text active:bg-glass-strong focus-visible:outline-2 focus-visible:outline-accent';
const gridLabelClass =
  'text-[10px] leading-tight font-medium [overflow-wrap:break-word] min-[360px]:text-[11px]';

/**
 * Every bar control has the same layout: a fixed 32×48px icon pill with a small label
 * stacked underneath (flex column, no absolute positioning), so icons and labels can
 * never overlap and all five line up exactly.
 */
const barItemClass =
  'flex h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-accent';
const barPillClass =
  'relative inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-200';
const barLabelClass =
  'max-w-full truncate text-[10px] leading-3 font-semibold max-[359px]:tracking-tight';

/** One direct destination in the bottom bar: icon pill with its label underneath. */
function BarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(barItemClass, active ? 'text-ink-green' : 'text-text-mute hover:text-text')}
    >
      <span aria-hidden="true" className={cn(barPillClass, active && 'bg-accent/15')}>
        <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
      </span>
      <span className={barLabelClass}>{item.label}</span>
    </Link>
  );
}

/**
 * Mobile navigation (below 900px): a floating bottom bar (icon + small label) with four destinations
 * and a centre Menu button that opens the remaining pages in a bottom sheet above the bar.
 * The backdrop, Escape key and close-on-navigation live in MobileNavOverlay.
 */
export function MobileNav() {
  const pathname = usePathname();
  const open = useUiStore((s) => s.mobileNavOpen);
  const toggle = useUiStore((s) => s.toggleMobileNav);
  const close = useUiStore((s) => s.closeMobileNav);
  const { signOut, signingOut } = useSignOut();
  // Pages the admin has switched off are left out of the bar and the menu.
  const { primary: primaryNav, menu: menuItems } = mobileNavFor(usePlatformStore((s) => s.flags));

  const sheetId = useId();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const activeMenuItem = menuItems.find((item) => isNavActive(pathname, item.href));

  // Move focus into the sheet when it opens, and back to the Menu button when it closes.
  useEffect(() => {
    if (open) {
      sheetRef.current?.querySelector<HTMLElement>('a[href], button')?.focus();
    } else if (wasOpen.current) {
      const focused = document.activeElement;
      if (!focused || focused === document.body || sheetRef.current?.contains(focused)) {
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    }
    wasOpen.current = open;
  }, [open]);

  /** Keeps Tab and Shift+Tab inside the open sheet. */
  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !sheetRef.current) return;
    const focusable = Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="min-[900px]:hidden">
      {/* Bottom sheet with the pages that are not in the bar */}
      <div
        ref={sheetRef}
        id={sheetId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        onKeyDown={trapFocus}
        className={cn(
          'border-border bg-bg-2/95 shadow-glass fixed inset-x-3 z-40 mx-auto max-w-md origin-bottom overflow-y-auto overscroll-contain rounded-3xl border px-3 pt-1 pb-3 backdrop-blur-xl',
          'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] max-h-[70dvh]',
          'duration-300 ease-out motion-reduce:transition-none',
          // Visible at once on open (so focus can move in); hidden only after the closing slide.
          open
            ? 'visible translate-y-0 scale-100 opacity-100 transition-[transform,opacity]'
            : 'pointer-events-none invisible translate-y-6 scale-95 opacity-0 transition-[transform,opacity,visibility]',
        )}
      >
        {/* Header row: drag handle in the middle, close button on the right */}
        <div className="relative flex h-10 items-center justify-center">
          <h2 id={titleId} className="sr-only">
            More pages
          </h2>
          <span aria-hidden="true" className="bg-text-mute/30 block h-1 w-10 rounded-full" />
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="text-text-dim hover:text-text absolute top-1/2 right-0 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* 4 × 2 icon grid: icon on top, small label underneath, no cards */}
        <nav aria-label="More pages">
          <ul className="grid grid-cols-4 gap-x-1 gap-y-2">
            {menuItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? 'page' : undefined}
                    className={cn(gridItemClass, active ? 'text-ink-green' : 'text-text-dim')}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                        active && 'bg-accent/15',
                      )}
                    >
                      <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                    </span>
                    <span className={gridLabelClass}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className={cn(gridItemClass, 'text-ink-red disabled:opacity-60')}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-12 items-center justify-center"
                >
                  <LogOut size={22} strokeWidth={1.75} />
                </span>
                <span className={gridLabelClass}>{signingOut ? 'Signing out…' : 'Sign Out'}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Bottom bar */}
      <nav
        aria-label="Mobile navigation"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <ul className="border-border bg-bg-2/95 pointer-events-auto mx-auto grid h-16 max-w-md grid-cols-5 items-center rounded-3xl border px-0.5 shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.35)] backdrop-blur-xl *:flex *:justify-center">
          {primaryNav.slice(0, 2).map((item) => (
            <li key={item.href}>
              <BarLink item={item} active={isNavActive(pathname, item.href)} />
            </li>
          ))}
          <li>
            {/* Same layout as the links. The grid and close icons cross-fade inside the
                fixed-size pill, and the label sits below it in normal flow, so opening the
                menu never moves, resizes or overlaps anything. */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls={sheetId}
              aria-haspopup="dialog"
              className={cn(
                barItemClass,
                open || activeMenuItem ? 'text-ink-green' : 'text-text-mute',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  barPillClass,
                  'bg-linear-to-br from-[#34d399] to-[#10b981] text-[#022c22] shadow-[0_6px_16px_-6px_var(--accent-glow)]',
                )}
              >
                <Grid2x2
                  size={20}
                  strokeWidth={2.25}
                  className={cn(
                    'absolute transition-[opacity,transform] duration-200',
                    open ? 'scale-75 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
                  )}
                />
                <X
                  size={20}
                  strokeWidth={2.5}
                  className={cn(
                    'absolute transition-[opacity,transform] duration-200',
                    open ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-90 opacity-0',
                  )}
                />
                {activeMenuItem && !open && (
                  <span className="ring-bg-2 absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#f5c451] ring-2" />
                )}
              </span>
              <span className={barLabelClass}>
                {open ? 'Close' : 'Menu'}
                {!open && activeMenuItem && (
                  <span className="sr-only">, current page: {activeMenuItem.label}</span>
                )}
              </span>
            </button>
          </li>
          {primaryNav.slice(2).map((item) => (
            <li key={item.href}>
              <BarLink item={item} active={isNavActive(pathname, item.href)} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
