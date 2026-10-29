import type { Weather } from '@/types';

// `condition` picks the icon in components/ui/weather-icon.tsx.
export const WEATHER_CONDITIONS: Weather[] = [
  { condition: 'sunny', temp: 32, description: 'Sunny and hot', humidity: 55, rainChance: 10 },
  {
    condition: 'partly-cloudy',
    temp: 28,
    description: 'Partly cloudy',
    humidity: 72,
    rainChance: 40,
  },
  {
    condition: 'showers',
    temp: 26,
    description: 'Light rain expected',
    humidity: 80,
    rainChance: 70,
  },
  { condition: 'storm', temp: 24, description: 'Thunderstorms', humidity: 88, rainChance: 90 },
];
