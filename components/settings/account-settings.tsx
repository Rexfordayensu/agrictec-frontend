'use client';

import Link from 'next/link';
import { ArrowRight, CreditCard, Crown, LogOut, UserPlus, UserRound } from 'lucide-react';
import { useSignOut } from '@/components/layout/use-sign-out';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/hooks/use-subscription';

/** The signed-in account and current plan; all actions keep their existing server flows. */
export function AccountSettings() {
  const session = useAuthStore((state) => state.session);
  const { signOut, signingOut } = useSignOut();
  const { plan, ready } = useSubscription();
  const PlanIcon = plan.id === 'free' ? CreditCard : Crown;
  return (
    <Card className="account-information" aria-labelledby="account-information-title">
      <header className="account-card-heading">
        <IconTile icon={UserRound} size="lg" />
        <div>
          <h3 id="account-information-title">Account information</h3>
          <p>Your sign-in and plan details.</p>
        </div>
      </header>
      <div className="account-information-sheet">
        <div className="account-information-details">
          <div className="account-signed-in">
            <p>Signed in as</p>
            <strong>
              {session?.isGuest ? 'Guest' : (session?.email ?? 'Loading your account…')}
            </strong>
            {session?.isGuest && (
              <div className="account-guest-note">
                <p>Create an account to keep your data safe.</p>
                <Link href="/signup">
                  <UserPlus size={15} aria-hidden="true" />
                  Create an account
                </Link>
              </div>
            )}
          </div>
          <div className="account-current-plan">
            <p>Current plan</p>
            {ready ? (
              <Badge className="account-plan-badge">
                <PlanIcon size={20} aria-hidden="true" />
                {plan.name}
              </Badge>
            ) : (
              <span role="status" className="account-plan-loading">
                Loading plan…
              </span>
            )}
          </div>
          <Link href="/settings/plans" className="account-manage-plan">
            Manage plan <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className="account-sign-out">
          <IconTile icon={LogOut} tone="red" size="lg" />
          <div>
            <h3>Sign out</h3>
            <p>Securely end your current session on this device.</p>
          </div>
          <Button variant="ghost" icon={LogOut} loading={signingOut} onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </Card>
  );
}
