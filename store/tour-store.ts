import { create } from 'zustand';

interface TourState {
  open: boolean;
  step: number;
  /** Replay asked from another page: opens once the dashboard (with the score card) shows. */
  pending: boolean;
  start: () => void;
  /** Replay from anywhere: the tour runs on the dashboard. */
  request: () => void;
  go: (step: number) => void;
  close: () => void;
}

/** The app tour's place (components/tour/app-tour.tsx). */
export const useTourStore = create<TourState>()((set) => ({
  open: false,
  step: 0,
  pending: false,
  start: () => set({ open: true, step: 0, pending: false }),
  request: () => set({ pending: true }),
  go: (step) => set({ step }),
  close: () => set({ open: false, step: 0, pending: false }),
}));
