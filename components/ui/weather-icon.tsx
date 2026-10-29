'use client';

import type { IconType } from 'react-icons';
import { WiDayCloudy, WiDayShowers, WiDaySunny, WiThunderstorm } from 'react-icons/wi';
import { cn } from '@/lib/utils';
import type { WeatherCondition } from '@/types';

const WEATHER_ICONS: Record<WeatherCondition, IconType> = {
  sunny: WiDaySunny,
  'partly-cloudy': WiDayCloudy,
  showers: WiDayShowers,
  storm: WiThunderstorm,
};

const WEATHER_TONES: Record<WeatherCondition, string> = {
  sunny: 'text-ink-gold',
  'partly-cloudy': 'text-ink-blue',
  showers: 'text-ink-blue',
  storm: 'text-ink-purple',
};

/** Weather condition icon (react-icons, Weather Icons set). */
export function WeatherIcon({
  condition,
  size = 48,
  className,
}: {
  condition: WeatherCondition;
  size?: number;
  className?: string;
}) {
  const Icon = WEATHER_ICONS[condition];
  return (
    <Icon size={size} aria-hidden="true" className={cn(WEATHER_TONES[condition], className)} />
  );
}
