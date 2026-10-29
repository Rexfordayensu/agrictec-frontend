import { api } from '@/services/api';
import type { Profile } from '@/types';
import { defaultProfile, normalizeProfile } from '@/lib/profile';

export { defaultProfile };

export const profileService = {
  /** The saved profile, or a blank one for a new farmer. */
  async get(userId: string): Promise<Profile> {
    return normalizeProfile(userId, await api<Profile>('/me/profile'));
  },

  /**
   * Saves the fields a farmer may edit. The Ghana Card and the verification flags are the
   * API's to set (verifications and the admin's review), whatever is sent here; a changed phone
   * number loses its verification.
   */
  async save(userId: string, profile: Profile): Promise<Profile> {
    const {
      userId: _id,
      ghanaCard: _card,
      verification: _verification,
      onboardingCompletedAt: _done,
      ...fields
    } = profile;
    void [_id, _card, _verification, _done];
    return normalizeProfile(userId, await api<Profile>('/me/profile', { method: 'PUT', body: fields }));
  },
};
