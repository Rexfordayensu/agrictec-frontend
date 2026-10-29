import { isProfileComplete } from '@/lib/calculations/credit-score';
import type { FarmRecord, MomoTransaction, Profile, ReadinessItem } from '@/types';

/**
 * The loan-readiness checklist. Shared by the farmer dashboard (useFarmStats) and the admin's
 * farmer profile, so both always show the same items.
 */
export function buildReadiness({
  records,
  momo,
  profile,
  minRecords,
  cardUnderReview,
}: {
  records: FarmRecord[];
  momo: MomoTransaction[];
  profile: Profile | null;
  /** From the admin's credit rules (default 5). */
  minRecords: number;
  /** A Ghana Card check is waiting for an admin. */
  cardUnderReview: boolean;
}): ReadinessItem[] {
  const profileComplete = isProfileComplete(profile);
  return [
    {
      key: 'account',
      label: 'Account Created',
      description: 'Your AgriCtec account is active.',
      done: true,
    },
    {
      key: 'records',
      label: 'Financial Records',
      description: `${Math.min(records.length, minRecords)} of ${minRecords} farm records logged.`,
      done: records.length >= minRecords,
    },
    {
      key: 'momo',
      label: 'MoMo Integration',
      description:
        momo.length > 0
          ? `${momo.length} MoMo transaction${momo.length === 1 ? '' : 's'} recorded.`
          : 'Log at least one MoMo transaction.',
      done: momo.length >= 1,
    },
    {
      key: 'profile',
      label: 'Profile Complete',
      description: profileComplete
        ? 'Name, phone, farm name and acreage are filled in.'
        : 'Add your name, phone, farm name and acreage.',
      done: profileComplete,
    },
    {
      key: 'ghanaCard',
      label: 'Ghana Card',
      description: profile?.verification.ghanaCard
        ? 'Your Ghana Card is verified.'
        : cardUnderReview
          ? 'Your Ghana Card is under review.'
          : 'Verify your Ghana Card in your profile.',
      done: profile?.verification.ghanaCard ?? false,
    },
  ];
}
