'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  CreditCard,
  Ban,
  Check,
  Circle,
  Hourglass,
  MapPin,
  Smartphone,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { GhanaCardModal } from '@/components/profile/ghana-card-modal';
import { GpsField } from '@/components/profile/gps-field';
import { PhoneVerifyModal } from '@/components/profile/phone-verify-modal';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { rejectionMessage } from '@/lib/verification';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';

type CheckState = 'verified' | 'review' | 'rejected' | 'todo';

const STATE_BADGE: Record<CheckState, { label: string; color: BadgeColor; icon: LucideIcon }> = {
  verified: { label: 'Verified', color: 'green', icon: Check },
  review: { label: 'Pending review', color: 'gold', icon: Hourglass },
  rejected: { label: 'Rejected', color: 'red', icon: Ban },
  todo: { label: 'Not verified', color: 'blue', icon: Circle },
};

interface CheckItem {
  title: string;
  icon: LucideIcon;
  state: CheckState;
  /** Overrides the badge text (the Ghana Card says "Not provided" rather than "Not verified"). */
  badgeLabel?: string;
  detail: string;
  action?: { label: string; run: () => void };
}

export function VerificationGrid() {
  const profile = useProfileStore((state) => state.profile);
  // The latest Ghana Card request: pending until an admin approves or rejects it.
  const cardRequest = usePlatformStore((state) =>
    state.verifications.find((v) => v.kind === 'ghanaCard'),
  );
  // The latest farm-pin request: pending until an admin checks it on the map.
  const locationRequest = usePlatformStore((state) =>
    state.verifications.find((v) => v.kind === 'location'),
  );
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  // The card's status lives on the profile (onboarding, this page, and the admin's review).
  const card = profile?.ghanaCard;
  const cardState: CheckState =
    card?.status === 'verified'
      ? 'verified'
      : card?.status === 'pending' || cardRequest?.status === 'pending'
        ? 'review'
        : card?.status === 'rejected'
          ? 'rejected'
          : 'todo';
  const cardDetail: Record<CheckState, string> = {
    // An AgriCtec review of the typed-in number: not an identity check against NIA.
    verified: `${card?.masked ? `${card.masked}. ` : ''}Reviewed by AgriCtec, not an NIA identity check.`,
    review: `${card?.masked ?? cardRequest?.submittedValue ?? 'Your card'} is waiting for review. This usually takes one working day.`,
    rejected: card?.rejectedReason ?? rejectionMessage(cardRequest ?? {}),
    todo: 'Not provided. Add your Ghana Card to unlock loans.',
  };

  const items: CheckItem[] = [
    {
      title: 'Account Created',
      icon: UserRoundCheck,
      state: 'verified',
      detail: 'Your AgriCtec account is active.',
    },
    {
      title: 'Phone',
      icon: Smartphone,
      state: profile?.verification.phone ? 'verified' : 'todo',
      detail: profile?.phone || 'Add your phone number.',
      action: { label: 'Verify', run: () => setPhoneOpen(true) },
    },
    {
      title: 'Farm Location',
      icon: MapPin,
      state: profile?.verification.location
        ? 'verified'
        : profile?.gps && locationRequest?.status === 'pending'
          ? 'review'
          : locationRequest?.status === 'rejected' && profile?.gps
            ? 'rejected'
            : 'todo',
      detail: profile?.verification.location
        ? 'Your farm location is verified.'
        : profile?.gps && locationRequest?.status === 'pending'
          ? 'Your farm pin is waiting for review.'
          : locationRequest?.status === 'rejected' && profile?.gps
            ? rejectionMessage(locationRequest)
            : 'Locate your farm on the map.',
      action: {
        label: 'Set location',
        run: () => {
          document
            .getElementById('farm-location')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document
            .getElementById('farm-location')
            ?.querySelector('button')
            ?.focus({ preventScroll: true });
        },
      },
    },
    {
      title: 'Ghana Card (AgriCtec review)',
      icon: CreditCard,
      state: cardState,
      ...(cardState === 'todo' && { badgeLabel: 'Not provided' }),
      ...(cardState === 'verified' && { badgeLabel: 'Reviewed' }),
      detail: cardDetail[cardState],
      action: {
        label: cardState === 'rejected' ? 'Submit again' : 'Submit for review',
        run: () => setCardOpen(true),
      },
    },
  ];

  return (
    <Card className="verification-checks-card rounded-3xl">
      <div className="verification-check-grid">
        {items.map(({ title, icon: Icon, state, badgeLabel, detail, action }) => {
          const badge = STATE_BADGE[state];
          const BadgeIcon = badge.icon;
          const verified = state === 'verified';
          return (
            <div
              key={title}
              className={cn('verification-check', verified && 'verification-check-verified')}
            >
              <IconTile
                icon={Icon}
                tone={
                  title === 'Ghana Card (AgriCtec review)'
                    ? 'gold'
                    : title === 'Account Created'
                      ? 'green'
                      : ('blue' as Tone)
                }
                size="lg"
              />
              <div className="verification-check-content">
                <header>
                  <h3>{title}</h3>
                  <Badge color={badgeLabel === 'Not provided' ? 'gold' : badge.color}>
                    <BadgeIcon size={12} aria-hidden="true" />
                    {badgeLabel ?? badge.label}
                  </Badge>
                </header>
                {title === 'Phone' && <p>Your phone is checked by SMS.</p>}
                <p className={title === 'Phone' ? 'verification-phone-number' : undefined}>
                  {detail}
                </p>
                {(state === 'todo' || state === 'rejected') && action && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={action.run}
                    icon={ArrowUpRight}
                    mutates
                    className={
                      title === 'Farm Location'
                        ? 'verification-map-action'
                        : 'verification-primary-action'
                    }
                  >
                    {action.label}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <GpsField />
      <PhoneVerifyModal open={phoneOpen} onClose={() => setPhoneOpen(false)} />
      <GhanaCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
    </Card>
  );
}
