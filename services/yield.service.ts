import { api } from '@/services/api';
import type { YieldInput, YieldResult } from '@/types';

export interface HarvestEstimate extends YieldResult {
  insight: string;
  tips: string[];
}

interface YieldResponse extends Omit<HarvestEstimate, 'priceSource'> {
  priceMarket: string | null;
  priceObservedAt: string | null;
}

export const yieldService = {
  async predict(input: YieldInput): Promise<HarvestEstimate> {
    const result = await api<YieldResponse>('/me/yield', { method: 'POST', body: input });
    return {
      low: result.low,
      expected: result.expected,
      high: result.high,
      perAcre: result.perAcre,
      revenue: result.revenue ?? null,
      pricePerTonne: result.pricePerTonne ?? null,
      priceSource:
        result.pricePerTonne != null && result.priceMarket
          ? { where: result.priceMarket, observedAt: result.priceObservedAt ?? null }
          : null,
      insight: result.insight,
      tips: result.tips,
    };
  },
};
