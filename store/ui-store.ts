import { create } from 'zustand';
import { sessionStore } from '@/services/storage';

const SAMPLE_PROMPT_KEY = 'samplePromptDismissed';

interface UiState {
  /** Bottom-sheet menu of the mobile navigation (below 900px). */
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  /** "Start fresh" on the dashboard's sample-data card; remembered for this browser tab. */
  samplePromptDismissed: boolean;
  dismissSamplePrompt: () => void;
}

/** UI-only state: the mobile navigation menu and dismissed hints. */
export const useUiStore = create<UiState>()((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),

  // sessionStore is SSR-safe (returns the fallback on the server).
  samplePromptDismissed: sessionStore.get(SAMPLE_PROMPT_KEY, false),
  dismissSamplePrompt: () => {
    sessionStore.set(SAMPLE_PROMPT_KEY, true);
    set({ samplePromptDismissed: true });
  },
}));
