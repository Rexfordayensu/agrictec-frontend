'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, KeyRound, LogOut, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { ChangePasswordForm } from '@/components/admin/auth/change-password-form';
import { hasDefaultName } from '@/components/admin/layout/admin-name';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { useAdminUiStore } from '@/store/admin/admin-ui-store';

const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:bg-glass-strong hover:bg-glass-strong';

/**
 * Name, email and role, with "Your name", "Change password" and "Sign out" (same keyboard model
 * as the farmer menu).
 */
export function AdminUserMenu() {
  const router = useRouter();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const admin = useAdminAuthStore((s) => s.admin);
  const signOut = useAdminAuthStore((s) => s.signOut);
  const openChangePassword = useAdminUiStore((s) => s.setChangePasswordOpen);
  const openName = useAdminUiStore((s) => s.setNameOpen);

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

  if (!admin) return null;

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
      case 'Escape':
        event.preventDefault();
        event.stopPropagation(); // don't also close the sidebar drawer
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut('manual');
      router.replace('/admin-login?reason=signed-out');
    } catch {
      toast.error('Could not sign out. Please try again.');
      setSigningOut(false);
    }
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
          <div className="border-border mb-1 space-y-1.5 border-b px-3 pt-1 pb-3">
            <p className="text-text truncate text-sm font-semibold">{admin.name}</p>
            <p className="text-text-mute truncate text-xs">{admin.email}</p>
            <RoleBadge role={admin.role} />
          </div>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close(false);
              openName(true);
            }}
            className={cn(itemClass, 'text-text-dim hover:text-text')}
          >
            <UserPen size={16} aria-hidden="true" />
            {hasDefaultName(admin) ? 'Add your name' : 'Edit your name'}
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close(false);
              openChangePassword(true);
            }}
            className={cn(itemClass, 'text-text-dim hover:text-text')}
          >
            <KeyRound size={16} aria-hidden="true" />
            Change password
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => void handleSignOut()}
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
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#f5c451] to-[#a855f7] text-sm font-bold text-[#1e1033]"
        >
          {(admin.name.trim()[0] ?? 'A').toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-text block truncate text-sm font-semibold">{admin.name}</span>
          <span className="text-text-mute block truncate text-xs">{admin.email}</span>
        </span>
        <ChevronsUpDown size={16} aria-hidden="true" className="text-text-mute shrink-0" />
      </button>
    </div>
  );
}

/** Mounted once in the console layout; opened from the user menu. */
export function ChangePasswordDialog() {
  const open = useAdminUiStore((s) => s.changePasswordOpen);
  const setOpen = useAdminUiStore((s) => s.setChangePasswordOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Change password">
      <ChangePasswordForm
        hideHeading
        onDone={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </Modal>
  );
}
