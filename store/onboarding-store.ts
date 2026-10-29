import { create } from 'zustand';
import { REVIEW_STEP } from '@/components/onboarding/onboarding-schemas';
import { onboardingService } from '@/services/onboarding.service';
import { profileService } from '@/services/profile.service';
import type { Profile, StoreStatus } from '@/types';

interface OnboardingState {
  userId: string | null;
  /** The answers so far (a partial profile). */
  data: Partial<Profile>;
  /** 0–5: the six steps; 6: review. */
  step: number;
  /** The furthest step reached, so the progress dots can jump back (not ahead). */
  reached: number;
  /** Set while editing from the review screen: Continue returns there. */
  returnToReview: boolean;
  status: StoreStatus;
  load: (userId: string) => Promise<void>;
  /** Saves a step's answers to the draft and moves on (or back to the review). */
  submitStep: (patch: Partial<Profile>) => Promise<void>;
  goTo: (step: number, fromReview?: boolean) => void;
  back: () => void;
  /** Guests: fills every step with sample answers and opens the review. */
  fillDemo: (patch: Partial<Profile>) => Promise<void>;
  /**
   * Saves answers as they are given (e.g. the location and pin), staying on the same step, so
   * nothing is lost if the page closes before Continue.
   */
  saveProgress: (patch: Partial<Profile>) => Promise<void>;
  complete: () => Promise<Profile>;
}

/**
 * The onboarding wizard's state. Every Continue writes the draft (onboarding.service), so a
 * refresh resumes on the same step with the same answers.
 */
export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  userId: null,
  data: {},
  step: 0,
  reached: 0,
  returnToReview: false,
  status: 'idle',

  load: async (userId) => {
    set({ userId, status: 'loading' });
    const [draft, profile] = await Promise.all([
      onboardingService.getDraft(userId),
      profileService.get(userId),
    ]);
    if (get().userId !== userId) return;
    // No draft yet: start from what the profile already has (name and email from sign-up, or an
    // older profile's farm details).
    const data: Partial<Profile> = draft?.data ?? {
      name: profile.name,
      email: profile.email,
      ...(profile.farmName && { farmName: profile.farmName }),
      ...(profile.region && { region: profile.region }),
      ...(profile.acres > 0 && { acres: profile.acres, sizeUnit: profile.sizeUnit }),
      ...(profile.primaryCrops.length > 0 && { primaryCrops: profile.primaryCrops }),
      ...(profile.gps && { gps: profile.gps }),
    };
    const step = Math.min(Math.max(draft?.currentStep ?? 0, 0), REVIEW_STEP);
    set({
      data: { ...data, name: profile.name || data.name, email: profile.email || data.email },
      step,
      reached: step,
      status: 'ready',
    });
  },

  submitStep: async (patch) => {
    const { userId, data, step, returnToReview, reached } = get();
    if (!userId) throw new Error('You need to sign in first');
    const next = returnToReview ? REVIEW_STEP : Math.min(step + 1, REVIEW_STEP);
    const merged = { ...data, ...patch };
    await onboardingService.saveDraft(userId, next, merged);
    set({
      data: merged,
      step: next,
      reached: Math.max(reached, next),
      returnToReview: next === REVIEW_STEP ? false : returnToReview,
    });
  },

  goTo: (step, fromReview = false) => {
    if (step > get().reached) return;
    set({ step, returnToReview: fromReview });
  },

  back: () => set((s) => ({ step: Math.max(0, s.step - 1), returnToReview: false })),

  fillDemo: async (patch) => {
    const { userId, data } = get();
    if (!userId) throw new Error('You need to sign in first');
    const merged = { ...data, ...patch };
    await onboardingService.saveDraft(userId, REVIEW_STEP, merged);
    set({ data: merged, step: REVIEW_STEP, reached: REVIEW_STEP, returnToReview: false });
  },

  saveProgress: async (patch) => {
    const { userId, data, step } = get();
    if (!userId) return;
    const merged = { ...data, ...patch };
    set({ data: merged });
    await onboardingService.saveDraft(userId, step, merged);
  },

  complete: async () => {
    const { userId, data } = get();
    if (!userId) throw new Error('You need to sign in first');
    return onboardingService.complete(userId, data);
  },
}));
