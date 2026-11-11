// The console's home, computed by the API (GET /admin/overview) from every farmer, application,
// verification and risk flag on the server: the browser only receives the totals and charts,
// never the farmers' own details.

import type { ScoreBucket } from '@/lib/admin/analytics';
import type { AttentionItem, DateRange, FunnelStage, OverviewKpis } from '@/lib/admin/overview';
import { api } from '@/services/api';

export interface OverviewData {
  range: DateRange;
  kpis: OverviewKpis;
  signups: { labels: string[]; counts: number[]; unit: 'day' | 'week' | 'month' };
  loanStages: { stages: FunnelStage[]; rejected: number; defaulted: number; total: number };
  farmersByRegion: { region: string; count: number }[];
  cropPopularity: { crop: string; count: number }[];
  scoreDistribution: (ScoreBucket & { count: number })[];
  /** Registered farmers with at least one entry verified by an AgriCtec reviewer. */
  evidenceCoverage?: { farmers: number; total: number; share: string };
  needsAttention: AttentionItem[];
  /** Farmers with at least one primary crop. */
  cropGrowers: number;
}

export const overviewService = {
  async get(range: DateRange, signal?: AbortSignal): Promise<OverviewData> {
    return api<OverviewData>('/admin/overview', { query: { range }, signal });
  },
};
