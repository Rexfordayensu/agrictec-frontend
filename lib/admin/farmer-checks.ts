// A farmer's three checks (phone, farm location, Ghana Card) as the console shows them, from what
// is stored only. "Verified" needs the profile's flag; "waiting" needs a request waiting for review.
// The Ghana Card is reviewed by AgriCtec staff: never described as an NIA verification.

import type { FarmerAccount, VerificationKind } from '@/types/admin';

export type CheckState = 'verified' | 'pending' | 'rejected' | 'missing';

export interface CheckView {
  kind: VerificationKind;
  label: string;
  state: CheckState;
  /** Read out and shown on hover. */
  description: string;
}

const CHECK_NAMES: Record<VerificationKind, string> = {
  phone: 'Phone',
  location: 'Farm location',
  ghanaCard: 'Ghana Card',
};

/**
 * The three checks from what is stored: verified only when the profile says so; "pending" only
 * when a request waits for review. The Ghana Card check is a review by AgriCtec staff, never an
 * NIA verification (AgriCtec has no NIA connection).
 */
export function checksOf(farmer: FarmerAccount, pending: VerificationKind[] = []): CheckView[] {
  const v = farmer.profile.verification;
  const card = farmer.profile.ghanaCard.status;
  const state = (kind: VerificationKind, done: boolean): CheckState =>
    done
      ? 'verified'
      : pending.includes(kind) || (kind === 'ghanaCard' && card === 'pending')
        ? 'pending'
        : kind === 'ghanaCard' && card === 'rejected'
          ? 'rejected'
          : 'missing';
  const describe = (kind: VerificationKind, s: CheckState) => {
    const name = CHECK_NAMES[kind];
    if (kind === 'ghanaCard') {
      return {
        verified: 'Ghana Card reviewed and approved by AgriCtec (not an NIA check)',
        pending: 'Ghana Card waiting for AgriCtec review',
        rejected: 'Ghana Card rejected in AgriCtec review',
        missing: 'Ghana Card not provided',
      }[s];
    }
    return {
      verified: `${name} verified`,
      pending: `${name} waiting for review`,
      rejected: `${name} rejected`,
      missing: `${name} not verified`,
    }[s];
  };
  return (
    [
      ['phone', v.phone],
      ['location', v.location],
      ['ghanaCard', v.ghanaCard],
    ] as const
  ).map(([kind, done]) => {
    const s = state(kind, done);
    return { kind, label: CHECK_NAMES[kind], state: s, description: describe(kind, s) };
  });
}
