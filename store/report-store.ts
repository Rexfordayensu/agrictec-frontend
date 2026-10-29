import { create } from 'zustand';
import type { ReportType } from '@/types';

interface ReportPreviewState {
  type: ReportType | null;
  /** Fixed when the preview opens, so the preview and the PDF share one "generated" time. */
  openedAt: string | null;
  openPreview: (type: ReportType) => void;
  closePreview: () => void;
}

/** Which report preview is open. Opened from the reports banner and the report cards. */
export const useReportStore = create<ReportPreviewState>()((set) => ({
  type: null,
  openedAt: null,
  openPreview: (type) => set({ type, openedAt: new Date().toISOString() }),
  closePreview: () => set({ type: null, openedAt: null }),
}));
