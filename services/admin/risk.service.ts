// Risk and fraud review through the API (risk.review; every decision audited).

import type { RelatedKind } from '@/lib/admin/risk-rules';
import { api } from '@/services/api';
import type { FarmRecord, MomoTransaction } from '@/types';
import type { FarmerAccount, RiskFlag, RiskFlagFilter } from '@/types/admin';

/** Where a running scan is: reading the farmers, checking the rules, comparing with known flags. */
export interface ScanProgress {
  phase: 'reading' | 'checking' | 'comparing';
  done: number;
  total: number;
}

/** A flag's evidence for the review screen. `related` marks the items the flag is about. */
export interface RiskRelated {
  kind: RelatedKind;
  farmer: FarmerAccount;
  /** Shared phone or Ghana Card: the flagged farmer first, then the linked accounts. */
  accounts: FarmerAccount[];
  /** The farmer's transactions, plus the related ones on other accounts (with the owner). */
  momo: (MomoTransaction & { ownerName: string; related: boolean })[];
  /** The farmer's records. */
  records: (FarmRecord & { related: boolean })[];
}

const flag = (id: string) => `/admin/risk/flags/${encodeURIComponent(id)}`;

export const riskService = {
  /**
   * Runs every rule over every account on the server and stores only new findings (a dismissed
   * flag never returns). The scan is one request, so progress jumps from start to done.
   */
  async runScan(onProgress?: (progress: ScanProgress) => void): Promise<RiskFlag[]> {
    onProgress?.({ phase: 'reading', done: 0, total: 1 });
    const found = await api<RiskFlag[]>('/admin/risk/scan', { method: 'POST' });
    onProgress?.({ phase: 'comparing', done: 1, total: 1 });
    return found;
  },

  /** Open flags first, then by severity, then newest. */
  async list(filter: RiskFlagFilter = {}): Promise<RiskFlag[]> {
    return api<RiskFlag[]>('/admin/risk/flags', {
      query: {
        status: filter.status,
        severity: filter.severity,
        rule: filter.rule,
        userId: filter.userId,
      },
    });
  },

  async dismiss(id: string, note: string): Promise<RiskFlag> {
    return api<RiskFlag>(`${flag(id)}/dismiss`, { method: 'POST', body: { note } });
  },

  /** Confirms fraud. With `suspend`, the farmer is also suspended (needs farmers.suspend). */
  async confirm(
    id: string,
    note: string,
    { suspend = false }: { suspend?: boolean } = {},
  ): Promise<RiskFlag> {
    return api<RiskFlag>(`${flag(id)}/confirm`, { method: 'POST', body: { note, suspend } });
  },

  /** The flagged farmer, and the related transactions, records or linked accounts. */
  async getRelated(id: string): Promise<RiskRelated> {
    return api<RiskRelated>(`${flag(id)}/related`);
  },

  /** For the farmer's own app: whether the account has confirmed flags (no details). */
  async underReview(_userId: string): Promise<boolean> {
    return (await api<{ underReview: boolean }>('/me/credit')).underReview;
  },
};
