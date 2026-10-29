'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ChangePasswordForm } from '@/components/admin/auth/change-password-form';
import { SessionTimeout } from '@/components/admin/auth/session-timeout';
import { AdminBrand } from '@/components/admin/layout/admin-brand';
import { Card } from '@/components/ui/card';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';

type GateState = 'checking' | 'ready' | 'redirecting';

/**
 * Lets the console render only for a signed-in admin. No session → /admin-login?next=…
 * (or ?reason=timeout when it just expired). A temporary password must be changed first.
 * The proxy's cookie check is only a fast redirect; this is the real (client-side) gate.
 */
export function AdminSessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const admin = useAdminAuthStore((s) => s.admin);
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    let cancelled = false;
    useAdminAuthStore
      .getState()
      .init()
      .then(({ admin: current, expired }) => {
        if (cancelled) return;
        if (current) {
          setState('ready');
          return;
        }
        setState('redirecting');
        router.replace(
          expired
            ? '/admin-login?reason=timeout'
            : `/admin-login?next=${encodeURIComponent(window.location.pathname)}`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setState('redirecting');
        router.replace('/admin-login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Signed out while here (another tab, or the session ended): leave the console.
  useEffect(() => {
    if (state === 'ready' && !admin)
      router.replace(`/admin-login?next=${encodeURIComponent(pathname)}`);
  }, [state, admin, pathname, router]);

  if (state !== 'ready' || !admin) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center">
        <Loader2 size={28} aria-hidden="true" className="text-ink-purple animate-spin" />
        <span className="sr-only">Opening the admin console…</span>
      </div>
    );
  }

  if (admin.mustChangePassword) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">
          <AdminBrand className="mb-6 justify-center" />
          <Card padding="lg">
            <ChangePasswordForm forced onDone={() => router.refresh()} />
          </Card>
        </div>
      </main>
    );
  }

  return (
    <>
      {children}
      <SessionTimeout />
    </>
  );
}
