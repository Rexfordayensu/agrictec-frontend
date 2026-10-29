import type { MarketPrice } from '@/types';

export type MarketUnit = 'kg' | 'bag' | 'crate' | 'tonne';
export interface MarketSource {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  kind: 'official' | 'commodity' | 'market-report';
  excerpt?: string;
}

export interface MarketResearchQuery {
  crop: string;
  region?: string;
  market?: string;
  unit: MarketUnit;
  quantity: number;
  packageWeightKg?: number;
}
export interface MarketEvidence extends MarketResearchQuery {
  country: 'GH';
  currency: 'GHS';
  id: string;
  price: number;
  priceMax?: number;
  observedAt: string;
  source: MarketSource;
}
export interface MarketResearchResult {
  evidence: MarketEvidence[];
  /** A recommendation must cite an exact supported observation, never an invented average. */
  recommendedEvidenceId: string;
  explanation: string;
}
export interface MarketResearchProvider {
  research(query: MarketResearchQuery, signal?: AbortSignal): Promise<MarketResearchResult | null>;
}
export type IntegrationResult<T> =
  { status: 'ready'; data: T } | { status: 'unavailable'; message: string; reason: string };

export interface WeatherLocation {
  kind: 'place' | 'coordinates';
  label: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  accuracyMetres?: number;
}
export interface DailyWeather {
  date: string;
  description: string;
  minTemp: number;
  maxTemp: number;
  rainMm: number;
  rainChance: number;
  windKph: number;
}
export interface WeatherReport {
  /** Local sample measurements, never an observation from a live provider. */
  demo?: boolean;
  location: WeatherLocation;
  provider: string;
  updatedAt: string;
  current: {
    temp: number;
    description: string;
    humidity: number;
    rainMm: number;
    rainChance: number;
    windKph: number;
  };
  daily: DailyWeather[];
  upcoming: { time: string; description: string; temp: number; rainChance: number }[];
}
export interface WeatherProvider {
  getForecast(location: WeatherLocation, signal?: AbortSignal): Promise<WeatherReport | null>;
}

export type PublishedMarketPrice = MarketPrice & {
  id: string;
  status: 'published';
  source: MarketSource;
  observedAt: string;
  scope: 'market' | 'region' | 'national';
};
