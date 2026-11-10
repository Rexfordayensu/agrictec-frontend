// The full Ghana Card number typed during onboarding, kept in this tab's memory only until the
// farm setup is sent: never saved in the draft, in storage or anywhere else in the browser. The
// API masks and fingerprints it (a fingerprint made in the browser could be made up to dodge the
// duplicate check, and a plain hash of ten billion possible numbers could be reversed).
// After a reload the farmer types the number again.

import { maskFullGhanaCard } from '@/lib/profile';

let held: { masked: string; number: string } | null = null;

export const heldGhanaCard = {
  hold(number: string): string {
    const masked = maskFullGhanaCard(number);
    held = { masked, number: number.trim().toUpperCase() };
    return masked;
  },
  /** The full number for this masked card, if it was typed in this tab. */
  numberFor(masked: string | undefined): string | null {
    return held && masked && held.masked === masked ? held.number : null;
  },
  clear(): void {
    held = null;
  },
};
