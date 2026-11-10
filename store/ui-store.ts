import { create } from 'zustand';

interface UiState {
  /** Bottom-sheet menu of the mobile navigation (below 900px). */
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

/** UI-only state: the mobile navigation menu. */
export const useUiStore = create<UiState>()((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
}));
