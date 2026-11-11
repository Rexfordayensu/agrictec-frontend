'use client';

import Link from 'next/link';
import { ArrowRight, CreditCard, LogOut, UserPlus } from 'lucide-react';
import { useSignOut } from '@/components/layout/use-sign-out';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/hooks/use-subscription';

/** Who is signed in, the plan in one line (managed on its own page) and sign-out. */
export function AccountSettings() {
  const session = useAuthStore((state) => state.session);
  const { signOut, signingOut } = useSignOut();
  const { plan } = useSubscription();
  return (
    <Card className="flex h-full flex-col rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} aria-hidden="true" className="text-ink-green" />
            Account
          </CardTitle>
          <CardSub>Your sign-in details</CardSub>
        </div>
      </CardHeader>
      <div className="border-border border-b pb-4">
        <p className="text-text-mute text-xs">Signed in as</p>
        <p className="text-text mt-1 text-sm font-semibold break-all">
          {session?.isGuest ? 'Guest' : session?.email}
        </p>
        {session?.isGuest && (
          <>
            <p className="text-text-mute mt-2 text-xs leading-relaxed">
              Create an account to keep your data safe
            </p>
            <Link
              href="/signup"
              className="text-ink-green mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold hover:underline"
            >
              <UserPlus size={14} aria-hidden="true" />
              Create an account
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div>
          <p className="text-text-mute text-xs">Plan</p>
          <Badge className="mt-2">{plan.name}</Badge>
        </div>
        <Link
          href="/settings/plans"
          className="text-ink-green inline-flex min-h-9 items-center gap-1 text-xs font-semibold hover:underline"
        >
          Manage plan
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      <Button
        variant="danger"
        icon={LogOut}
        loading={signingOut}
        onClick={() => void signOut()}
        className="mt-auto w-full"
      >
        Sign Out
      </Button>
    </Card>
  );
}
