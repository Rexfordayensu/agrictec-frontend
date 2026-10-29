'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, LogOut, Sparkles, UserPlus } from 'lucide-react';
import { useSignOut } from '@/components/layout/use-sign-out';
import { UpgradeModal } from '@/components/settings/upgrade-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { usePlatformStore } from '@/store/platform-store';
import { useSubscription } from '@/hooks/use-subscription';

export function AccountSettings() {
  const session = useAuthStore((state) => state.session);
  const { signOut, signingOut } = useSignOut();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const plans = usePlatformStore((state) => state.plans);
  const { plan: currentPlan } = useSubscription();
  const freeName = currentPlan.name;
  // The upgrade offer only shows while the admin has the Premium plan switched on.
  const premiumOffered = plans.some((plan) => plan.id !== 'free' && plan.active);
  return (
    <Card className="flex h-full flex-col rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} aria-hidden="true" className="text-ink-green" />
            Account
          </CardTitle>
          <CardSub>Your plan and sign-in details</CardSub>
        </div>
      </CardHeader>
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <p className="text-text-mute text-xs">Plan</p>
          <Badge className="mt-2">{freeName}</Badge>
        </div>
        {premiumOffered && (
          <Button size="sm" variant="ghost" icon={Sparkles} onClick={() => setUpgradeOpen(true)}>
            View plans
          </Button>
        )}
      </div>
      <div className="py-4">
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
      <Button
        variant="danger"
        icon={LogOut}
        loading={signingOut}
        onClick={() => void signOut()}
        className="mt-auto w-full"
      >
        Sign Out
      </Button>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Card>
  );
}
