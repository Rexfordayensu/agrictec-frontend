import { validateResearch } from '@/lib/market/evidence';
import { api } from '@/services/api';
import type {
  IntegrationResult,
  MarketResearchProvider,
  MarketResearchQuery,
  MarketResearchResult,
} from '@/types/market';

export const marketResearchService = {
  async research(
    query: MarketResearchQuery,
    options: { provider?: MarketResearchProvider; signal?: AbortSignal } = {},
  ): Promise<IntegrationResult<MarketResearchResult>> {
    if (!query.crop.trim() || !Number.isFinite(query.quantity) || query.quantity <= 0)
      throw new Error('Add a crop and a positive unit quantity before researching.');
    if (!options.provider) {
      // The API researches the WFP market monitoring data; its result is checked below too.
      const answer = await api<IntegrationResult<MarketResearchResult>>(
        '/admin/content/market/research',
        { method: 'POST', body: query, signal: options.signal },
      );
      if (answer.status !== 'ready') return answer;
      return marketResearchService.research(query, {
        provider: { research: async () => answer.data },
        signal: options.signal,
      });
    }
    const result = await options.provider.research(query, options.signal);
    if (!result || !validateResearch(query, result))
      return {
        status: 'unavailable',
        message: 'Market price data unavailable',
        reason:
          'No complete, matching Ghanaian price evidence was returned. Nothing can be recommended.',
      };
    const priority = { official: 0, commodity: 1, 'market-report': 2 };
    return {
      status: 'ready',
      data: {
        ...result,
        evidence: [...result.evidence].sort(
          (a, b) => priority[a.source.kind] - priority[b.source.kind],
        ),
      },
    };
  },
};
