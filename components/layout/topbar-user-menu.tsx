'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  ChevronDown,
  Compass,
  CreditCard,
  Database,
  Info,
  LifeBuoy,
  LogOut,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { CONTACT_EMAIL } from '@/components/legal/legal-document';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { useSignOut } from '@/components/layout/use-sign-out';
import { useStartTour } from '@/components/tour/use-start-tour';
import { cn } from '@/lib/utils';
import { useAuthStore, usePlatformStore, useProfileStore } from '@/store';
import { useSubscriptionStore } from '@/store/subscription-store';

const itemClass =
  'text-text-dim hover:text-text hover:bg-glass-strong focus-visible:bg-glass-strong focus-visible:text-text flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus:outline-none';

interface LinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The account pages (the same as the Settings tabs). */
const ACCOUNT_LINKS: LinkItem[] = [
  { href: '/settings/profile', label: 'My profile', icon: UserRound },
  { href: '/settings/verification', label: 'Verification', icon: BadgeCheck },
  { href: '/settings/plans', label: 'Plans & billing', icon: CreditCard },
  { href: '/settings/preferences', label: 'Settings', icon: SlidersHorizontal },
  { href: '/settings/account', label: 'Account & data', icon: Database },
];

function Divider() {
  return <div role="separator" className="bg-border mx-2 my-1.5 h-px" />;
}

function MenuLink({ item, onSelect }: { item: LinkItem; onSelect: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} role="menuitem" tabIndex={-1} onClick={onSelect} className={itemClass}>
      <Icon size={17} aria-hidden="true" className="shrink-0" />
      {item.label}
    </Link>
  );
}

/** The plan and the month's AI credits, from the farmer's subscription (nothing made up). */
function PlanLine() {
  const snapshot = useSubscriptionStore((s) => s.snapshot);
  const plans = usePlatformStore((s) => s.plans);
  if (!snapshot) return null;
  const plan = plans.find((p) => p.id === snapshot.subscription.planId);
  const credits =
    snapshot.creditsLimit === null
      ? 'Unlimited AI credits'
      : snapshot.creditsLimit === 0
        ? 'No AI credits on this plan'
        : `${snapshot.creditsRemaining ?? 0} of ${snapshot.creditsLimit} AI credits left`;
  return (
    <p className="text-text-mute mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="bg-accent/12 text-ink-green inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold">
        <Sparkles size={12} aria-hidden="true" />
        {plan?.name ?? snapshot.subscription.planId} plan
      </span>
      <span>{credits}</span>
    </p>
  );
}

/**
 * The account menu behind the avatar in the top bar: who is signed in, their plan, the account
 * pages, the tour, help, and signing out. A guest is offered an account instead; an admin's
 * read-only view offers the way back to the console.
 */
export function TopbarUserMenu() {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { signOut, signingOut } = useSignOut();
  const startTour = useStartTour();

  const session = useAuthStore((s) => s.session);
  const viewing = useAuthStore((s) => s.impersonation);
  const profile = useProfileStore((s) => s.profile);
  const guest = Boolean(session?.isGuest) && !viewing;
  const name = viewing?.farmerName || profile?.name.trim() || (guest ? 'Guest' : 'Farmer');
  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const go = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    if (event.key === 'ArrowDown') go(index + 1);
    else if (event.key === 'ArrowUp') go(index - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(list.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') close(false);
  }

  const action = (
    label: string,
    icon: LucideIcon,
    onSelect: () => void,
    extra?: string,
  ): ReactNode => {
    const Icon = icon;
    return (
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={onSelect}
        className={cn(itemClass, extra)}
      >
        <Icon size={17} aria-hidden="true" className="shrink-0" />
        {label}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'hover:bg-glass-strong focus-visible:outline-accent inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl p-1 transition-colors',
          open && 'bg-glass-strong',
        )}
      >
        <ProfileAvatar
          name={name}
          photoDataUrl={profile?.photoDataUrl}
          className="ring-accent/30 size-9 text-xs ring-1"
        />
        <span className="text-text hidden max-w-24 truncate text-xs font-semibold min-[1200px]:block">
          {name.split(/\s+/)[0]}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            'text-text-mute hidden shrink-0 transition-transform sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="animate-fade-in border-border bg-bg-2 shadow-glass absolute top-full right-0 z-50 mt-2 w-[min(18.5rem,calc(100vw-1.5rem))] rounded-2xl border p-2"
        >
          {/* Who this is */}
          <div className="flex items-center gap-3 px-2 pt-1.5 pb-3">
            <ProfileAvatar
              name={name}
              photoDataUrl={profile?.photoDataUrl}
              className="ring-accent/30 size-11 text-sm ring-1"
            />
            <div className="min-w-0 flex-1">
              <p className="text-text truncate text-sm font-bold">{name}</p>
              {viewing ? (
                <p className="text-ink-gold text-xs font-semibold">Viewing as farmer (read-only)</p>
              ) : guest ? (
                <p className="text-ink-gold text-xs font-semibold">Guest demo: nothing is saved</p>
              ) : (
                <p className="text-text-mute truncate text-xs">{session?.email}</p>
              )}
              {!viewing && !guest && <PlanLine />}
            </div>
          </div>
          <Divider />

          {guest ? (
            <a
              href="/signup"
              role="menuitem"
              tabIndex={-1}
              className={cn(itemClass, 'text-ink-green hover:text-ink-green font-semibold')}
            >
              <UserPlus size={17} aria-hidden="true" className="shrink-0" />
              Create a free account
            </a>
          ) : (
            ACCOUNT_LINKS.map((item) => (
              <MenuLink key={item.href} item={item} onSelect={() => setOpen(false)} />
            ))
          )}
          <Divider />

          {!viewing &&
            action('Take the tour', Compass, () => {
              setOpen(false);
              startTour();
            })}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('AgriCtec help')}`}
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <LifeBuoy size={17} aria-hidden="true" className="shrink-0" />
            Help & support
          </a>
          <MenuLink
            item={{ href: '/settings/about', label: 'About AgriCtec', icon: Info }}
            onSelect={() => setOpen(false)}
          />
          <Divider />

          {action(
            viewing
              ? 'Exit farmer view'
              : guest
                ? 'End the demo'
                : signingOut
                  ? 'Signing out…'
                  : 'Sign out',
            LogOut,
            () => void signOut(),
            'text-ink-red hover:text-ink-red hover:bg-danger/10',
          )}
        </div>
      )}
    </div>
  );
}
