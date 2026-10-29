import { Sparkles } from 'lucide-react';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { InsightItem } from '@/components/ui/insight-item';
import { getWeatherAdvice } from '@/lib/ai/weather-advisory';
import type { MarketPrice, Weather } from '@/types';

export function WeatherAdvisory({
  weather,
  primaryCrops,
  prices,
}: {
  weather: Weather;
  primaryCrops: string[];
  prices: MarketPrice[];
}) {
  const advice = getWeatherAdvice(weather, primaryCrops, prices);
  return (
    <Card className="h-full rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={17} aria-hidden="true" className="text-ink-purple" />
            AI Weather Advisory
          </CardTitle>
          <CardSub>Smart recommendations for today</CardSub>
        </div>
      </CardHeader>
      <ul className="space-y-2.5">
        {advice.map(({ icon, text }) => (
          <li key={text}>
            <InsightItem icon={icon} className="bg-bg-2/40 text-xs leading-relaxed">
              {text}
            </InsightItem>
          </li>
        ))}
      </ul>
    </Card>
  );
}
