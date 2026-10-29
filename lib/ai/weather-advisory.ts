import {
  CloudRain,
  Droplets,
  Sprout,
  Sun,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { formatPriceChange, isPrimaryCrop } from '@/lib/market/data';
import type { MarketPrice, Weather } from '@/types';

export interface WeatherAdvice {
  icon: LucideIcon;
  text: string;
}

/** Optional rule-based guidance for supplied observations; no sample prices are filled in. */
export function getWeatherAdvice(
  weather: Weather,
  primaryCrops: string[],
  prices: MarketPrice[] = [],
): WeatherAdvice[] {
  const advice: WeatherAdvice[] = [];
  const crops = primaryCrops.map((crop) => crop.trim()).filter(Boolean);
  const fieldContext = crops.length
    ? ` Keep your ${crops.join(', ')} in mind when planning field work.`
    : '';

  if (weather.rainChance > 60) {
    advice.push({
      icon: CloudRain,
      text: `Heavy rain expected. Delay spraying and fertilizer; secure harvested crops.${fieldContext}`,
    });
  }
  if (weather.humidity > 75) {
    advice.push({
      icon: Droplets,
      text: `High humidity raises fungal disease risk. Inspect leaves (especially cocoa for black pod).${isPrimaryCrop('Cocoa', crops) ? ' Check your Cocoa crop closely.' : ''}`,
    });
  }
  if (weather.temp > 30) {
    advice.push({
      icon: Sun,
      text: `High heat. Irrigate early morning or late evening.${crops.length ? ` Prioritize your ${crops.join(', ')}.` : ''}`,
    });
  }
  if (weather.rainChance < 30 && weather.temp > 25) {
    advice.push({
      icon: Sprout,
      text: `Good conditions for land preparation and planting.${fieldContext}`,
    });
  }

  const riser = prices.reduce<MarketPrice | null>(
    (top, price) => (!top || price.change > top.change ? price : top),
    null,
  );
  const ownPrices = prices.filter((price) => isPrimaryCrop(price.crop, crops));
  const ownContext = ownPrices.length
    ? ` Your crops: ${ownPrices.map((price) => `${price.crop} ${formatPriceChange(price.change)}`).join('; ')}.`
    : crops.length
      ? ` Check local offers for your ${crops.join(', ')} before selling.`
      : '';

  const marketText = !riser
    ? 'Market prices are unavailable. Check local prices before selling.'
    : riser.change > 0
      ? `${riser.crop} prices up ${riser.change}%. Good time to sell if you have stock.`
      : riser.change < 0
        ? `${riser.crop} has the smallest price decline at ${Math.abs(riser.change)}%. Compare local offers before selling.`
        : `${riser.crop} prices are unchanged. Compare local offers before selling.`;
  advice.push({
    icon: riser && riser.change < 0 ? TrendingDown : TrendingUp,
    text: `${marketText}${ownContext}`,
  });
  return advice;
}
