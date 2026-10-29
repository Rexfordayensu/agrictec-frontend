import { create } from 'zustand';

interface AdminUiState {
  /** The sidebar drawer below 1024px. */
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  /** The Ctrl/⌘+K search palette. */
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** The change-password dialog from the user menu. */
  changePasswordOpen: boolean;
  setChangePasswordOpen: (open: boolean) => void;
  /** The "Your name" dialog (top bar and user menu). */
  nameOpen: boolean;
  setNameOpen: (open: boolean) => void;
}

/** UI-only state for the admin console (nothing here is platform data). */
export const useAdminUiStore = create<AdminUiState>()((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  changePasswordOpen: false,
  setChangePasswordOpen: (changePasswordOpen) => set({ changePasswordOpen }),

  nameOpen: false,
  setNameOpen: (nameOpen) => set({ nameOpen }),
}));
