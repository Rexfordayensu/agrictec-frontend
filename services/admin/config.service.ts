// Credit rules, feature flags and plans through the API. Reads are open (the farmer app uses
// them); every save needs the permission, is validated and audited by the API.

import type { Impact, ScoringInput } from '@/lib/admin/credit-rules';
import { normalizePlans } from '@/lib/subscriptions/plans';
import { api } from '@/services/api';
import type { CreditConfig, CreditConfigInput, FeatureFlags, Plan } from '@/types/admin';

export const configService = {
  /** The live credit rules (the farmer app's score and loan checks use them). */
  async getCreditConfig(): Promise<CreditConfig> {
    return api<CreditConfig>('/platform/credit-config');
  },

  /** Saves the rules as the next version; the previous one stays in history. */
  async saveCreditConfig(input: CreditConfigInput): Promise<CreditConfig> {
    return api<CreditConfig>('/admin/credit-config', { method: 'PUT', body: input });
  },

  /**
   * Publishes a draft as a new version with a change note (10+ characters). Farmers' scores
   * follow at once. Weights that don't add up to 100 (or any invalid value) are refused.
   */
  async publishCreditConfig(input: CreditConfigInput, note: string): Promise<CreditConfig> {
    return api<CreditConfig>('/admin/credit-config/publish', {
      method: 'POST',
      body: { config: input, note },
    });
  },

  /** Previous versions, newest first. */
  async getCreditHistory(): Promise<CreditConfig[]> {
    return api<CreditConfig[]>('/admin/credit-config/history');
  },

  /** Copies an old version into a NEW version: nothing in the history is rewritten. */
  async restoreCreditVersion(version: number, note?: string): Promise<CreditConfig> {
    return api<CreditConfig>('/admin/credit-config/restore', {
      method: 'POST',
      body: { version, note },
    });
  },

  /** What the score needs for ONE farmer (the simulator tries the draft on them). */
  async getScoringInput(userId: string, signal?: AbortSignal): Promise<ScoringInput> {
    return api<ScoringInput>(`/admin/credit-config/scoring-inputs/${encodeURIComponent(userId)}`, {
      signal,
    });
  },

  /** Every farmer re-scored by the API under the live rules and the draft. Nothing is saved. */
  async getImpact(draft: CreditConfigInput, signal?: AbortSignal): Promise<Impact> {
    return api<Impact>('/admin/credit-config/impact', { method: 'POST', body: { draft }, signal });
  },

  async getFlags(): Promise<FeatureFlags> {
    return api<FeatureFlags>('/platform/flags');
  },

  async saveFlags(flags: FeatureFlags): Promise<FeatureFlags> {
    return api<FeatureFlags>('/admin/settings/flags', { method: 'PUT', body: flags });
  },

  async getPlans(): Promise<Plan[]> {
    return normalizePlans(await api<Plan[]>('/platform/plans'));
  },

  async savePlans(plans: Plan[]): Promise<Plan[]> {
    return normalizePlans(await api<Plan[]>('/admin/settings/plans', { method: 'PUT', body: plans }));
  },
};
