import { api } from '@/services/api';
import type { MarketPrice, PriceTrends, Weather } from '@/types';

/** Compatibility shape for integrations that still use the older current-weather model. */
export interface WeatherSnapshot extends Weather {
  updatedAt: string;
}

export const marketService = {
  /** No connected provider: never use old overrides, random conditions or session samples. */
  async getWeather(): Promise<WeatherSnapshot | null> {
    return null;
  },
  /** Published, reviewed, source-backed observations only. */
  async getPrices(): Promise<MarketPrice[]> {
    return api<MarketPrice[]>('/platform/market/prices');
  },
  /** Historical charts stay empty until source-backed observations are connected. */
  async getPriceTrends(_crops: string[], _months: number): Promise<PriceTrends> {
    return api<PriceTrends>('/platform/market/trends');
  },
};
