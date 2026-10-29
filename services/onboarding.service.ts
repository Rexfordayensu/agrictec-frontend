// The onboarding wizard: a draft saved on every Continue (so a farmer resumes where they stopped)
// and the final save that opens the app. The API checks the whole profile again.

import { api } from '@/services/api';
import { profileService } from '@/services/profile.service';
import type { OnboardingDraft, Profile } from '@/types';

const ONBOARDED_COOKIE = 'agrictec_onboarded';

/**
 * A redirect hint for proxy.ts only (the API sets it too): the DataLoader checks the profile
 * itself before showing the app.
 */
export function setOnboardedCookie(onboarded: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = onboarded
    ? `${ONBOARDED_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`
    : `${ONBOARDED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Fields a draft may hold: never a raw Ghana Card number (only its mask and fingerprint). */
function cleanDraftData(data: Partial<Profile>): Partial<Profile> {
  const { ghanaCard, ...rest } = data;
  return {
    ...rest,
    ...(ghanaCard && {
      ghanaCard: {
        status: ghanaCard.status,
        ...(ghanaCard.masked && { masked: ghanaCard.masked }),
        ...(ghanaCard.hash && { hash: ghanaCard.hash }),
      },
    }),
  };
}

export const onboardingService = {
  async getDraft(_userId: string): Promise<OnboardingDraft | null> {
    return (await api<OnboardingDraft | null>('/me/onboarding/draft')) ?? null;
  },

  async saveDraft(_userId: string, currentStep: number, data: Partial<Profile>) {
    return api<OnboardingDraft>('/me/onboarding/draft', {
      method: 'PUT',
      body: { currentStep, data: cleanDraftData(data) },
    });
  },

  async clearDraft(_userId: string): Promise<void> {
    await api('/me/onboarding/draft', { method: 'DELETE' });
  },

  /** Whether this farmer has finished onboarding (also refreshes the proxy hint). */
  async isComplete(userId: string): Promise<boolean> {
    const profile = await profileService.get(userId);
    const done = Boolean(profile.onboardingCompletedAt);
    setOnboardedCookie(done);
    return done;
  },

  /** Where to go after signing in: the requested page when onboarded, otherwise onboarding. */
  async destinationAfterSignIn(userId: string, next: string): Promise<string> {
    return (await onboardingService.isComplete(userId)) ? next : '/onboarding';
  },

  /**
   * Saves the whole profile and opens the app. The API marks the location verified when a pin
   * is set, queues a Ghana Card for an admin's review (only its mask and fingerprint are sent)
   * and clears the draft.
   */
  async complete(userId: string, data: Partial<Profile>): Promise<Profile> {
    const current = await profileService.get(userId);
    const merged: Profile = {
      ...current,
      ...data,
      userId,
      name: current.name || data.name || '',
      email: current.email || data.email || '',
    };
    const {
      userId: _id,
      ghanaCard,
      verification: _verification,
      onboardingCompletedAt: _done,
      ...profile
    } = merged;
    void [_id, _verification, _done];
    const sendCard = ghanaCard.status === 'pending' && ghanaCard.masked && ghanaCard.hash;
    await api<Profile>('/me/onboarding/complete', {
      method: 'POST',
      body: {
        profile,
        ...(sendCard && { ghanaCard: { masked: ghanaCard.masked, hash: ghanaCard.hash } }),
      },
    });
    setOnboardedCookie(true);
    return profileService.get(userId);
  },
};
