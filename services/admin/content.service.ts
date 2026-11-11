// Market, weather, crop, assistant and crop-doctor content through the API. Farmers read the
// published content in GET /platform; every save here needs content.manage and is audited.

import { api } from '@/services/api';
import type { MarketPrice } from '@/types';
import type {
  AssistantKnowledgeItem,
  ContentMeta,
  CropContent,
  DiagnosisContent,
} from '@/types/admin';

export const contentService = {
  /** Who last saved each content type (keyed like "platform:content:market"). */
  async getContentMeta(): Promise<Record<string, ContentMeta>> {
    return api<Record<string, ContentMeta>>('/admin/content/meta');
  },

  /** Every observation, drafts included (farmers see only reviewed, published ones). */
  async getMarketPrices(): Promise<MarketPrice[]> {
    return api<MarketPrice[]>('/admin/content/market');
  },

  async saveMarketPrices(prices: MarketPrice[]): Promise<MarketPrice[]> {
    return api<MarketPrice[]>('/admin/content/market', { method: 'PUT', body: prices });
  },

  async getCrops(): Promise<CropContent[]> {
    return api<CropContent[]>('/admin/content/crops');
  },

  async saveCrops(crops: CropContent[]): Promise<CropContent[]> {
    return api<CropContent[]>('/admin/content/crops', { method: 'PUT', body: crops });
  },

  /** Highest priority first; the fallback (no match) reply is always included. */
  async getAssistantKb(): Promise<AssistantKnowledgeItem[]> {
    return api<AssistantKnowledgeItem[]>('/admin/content/assistant');
  },

  /** The fallback reply ("kb-fallback") can be edited but never removed. */
  async saveAssistantKb(items: AssistantKnowledgeItem[]): Promise<AssistantKnowledgeItem[]> {
    return api<AssistantKnowledgeItem[]>('/admin/content/assistant', { method: 'PUT', body: items });
  },

  async getDiagnoses(): Promise<DiagnosisContent[]> {
    return api<DiagnosisContent[]>('/admin/content/diagnoses');
  },

  /** At least one must stay active, or the crop doctor has nothing to show. */
  async saveDiagnoses(items: DiagnosisContent[]): Promise<DiagnosisContent[]> {
    return api<DiagnosisContent[]>('/admin/content/diagnoses', { method: 'PUT', body: items });
  },
};
