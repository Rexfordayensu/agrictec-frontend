'use client';

import { useProfileStore } from '@/store/profile-store';
import type { GhanaCardStatus } from '@/types';

/** The farmer's Ghana Card status. Loans unlock only when it is 'verified'. */
export function useGhanaCardStatus(): GhanaCardStatus {
  return useProfileStore((s) => s.profile?.ghanaCard.status ?? 'not_provided');
}

/** Tooltip and helper text on every disabled Apply / Check eligibility button. */
export const VERIFY_CARD_FIRST = 'Verify your Ghana Card first';
