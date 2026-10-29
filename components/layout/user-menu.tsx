'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ChevronsUpDown, LogOut, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { cn } from '@/lib/utils';
import { useSignOut } from '@/components/layout/use-sign-out';
import { useAuthStore, useProfileStore } from '@/store';
import { useUiStore } from '@/store/ui-store';

const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:bg-glass-strong hover:bg-glass-strong';

export function UserMenu() {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { signOut, signingOut } = useSignOut();

  const session = useAuthStore((s) => s.session);
  const profile = useProfileStore((s) => s.profile);
  const closeMobileNav = useUiStore((s) => s.closeMobileNav);

  const name = profile?.name.trim() || 'New Farmer';
  // The farm's name first, then "<Farm type> • <Constituency>".
  const title = profile?.farmName.trim() || name;
  const subtitle = [profile?.farmType ?? 'Smallholder', profile?.constituency]
    .filter(Boolean)
    .join(' • ');

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  // Close on a click anywhere outside the menu.
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

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        list[(index + 1) % list.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        list[(index - 1 + list.length) % list.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        list[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        list[list.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation(); // don't also close the mobile menu
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  }

  function navigate() {
    setOpen(false);
    closeMobileNav();
  }

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={handleMenuKeyDown}
          className="animate-fade-in border-border bg-bg-2 shadow-glass absolute right-0 bottom-full left-0 z-50 mb-2 rounded-2xl border p-2"
        >
          <div className="border-border mb-1 border-b px-3 pt-1 pb-3">
            {session?.isGuest ? (
              <div className="flex items-center gap-2">
                <span className="text-text text-sm font-semibold">Guest user</span>
                <Badge color="gold">Demo</Badge>
              </div>
            ) : (
              <>
                <p className="text-text-mute text-xs">Signed in as</p>
                <p className="text-text truncate text-sm font-semibold">{session?.email}</p>
              </>
            )}
          </div>
          <Link
            href="/settings/profile"
            role="menuitem"
            tabIndex={-1}
            onClick={navigate}
            className={cn(itemClass, 'text-text-dim hover:text-text')}
          >
            <User size={16} aria-hidden="true" />
            Profile
          </Link>
          <Link
            href="/settings/preferences"
            role="menuitem"
            tabIndex={-1}
            onClick={navigate}
            className={cn(itemClass, 'text-text-dim hover:text-text')}
          >
            <Settings size={16} aria-hidden="true" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => void signOut()}
            disabled={signingOut}
            className={cn(itemClass, 'text-ink-red disabled:opacity-60')}
          >
            <LogOut size={16} aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="glass hover:bg-glass-strong flex min-h-11 w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors"
      >
        <ProfileAvatar name={name} photoDataUrl={profile?.photoDataUrl} />
        <span className="min-w-0 flex-1">
          <span className="text-text block truncate text-sm font-semibold">{title}</span>
          <span className="text-text-mute block truncate text-xs">{subtitle}</span>
        </span>
        <ChevronsUpDown size={16} aria-hidden="true" className="text-text-mute shrink-0" />
      </button>
    </div>
  );
}
