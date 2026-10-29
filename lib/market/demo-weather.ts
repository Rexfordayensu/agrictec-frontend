import type { WeatherLocation, WeatherReport } from '@/types/market';

export const DEMO_WEATHER_LOCATION: WeatherLocation = {
  kind: 'place',
  region: 'Greater Accra',
  city: 'Accra',
  label: 'Accra, Ghana (demo default)',
};

/** Explicit frontend fixtures. Coordinates select a sample set, not real measured weather. */
export function createDemoWeather(location: WeatherLocation, now = new Date()): WeatherReport {
  const north =
    location.kind === 'coordinates'
      ? location.latitude! >= 8
      : ['Northern', 'Savannah', 'North East', 'Upper East', 'Upper West'].includes(
          location.region ?? '',
        );
  const coast =
    location.kind === 'coordinates'
      ? location.latitude! < 6.5
      : ['Greater Accra', 'Central', 'Western', 'Volta'].includes(location.region ?? '');
  const base = north
    ? { temp: 33, humidity: 48, rainMm: 0, rainChance: 15, windKph: 14 }
    : coast
      ? { temp: 29, humidity: 78, rainMm: 1.2, rainChance: 40, windKph: 18 }
      : { temp: 27, humidity: 82, rainMm: 3.5, rainChance: 65, windKph: 9 };
  const description = north
    ? 'Sunny intervals'
    : coast
      ? 'Partly cloudy'
      : 'Cloudy with light showers';
  const offset = (hours: number) => new Date(now.getTime() + hours * 3600000).toISOString();
  return {
    demo: true,
    location,
    provider: 'Frontend demo · sample measurements',
    updatedAt: now.toISOString(),
    current: { ...base, description },
    daily: [0, 1, 2].map((day) => ({
      date: offset(day * 24).slice(0, 10),
      description: day === 1 ? 'Sunny intervals' : description,
      minTemp: base.temp - 5,
      maxTemp: base.temp + (day === 1 ? 2 : 1),
      rainMm: day === 1 ? 0 : base.rainMm,
      rainChance: day === 1 ? 20 : base.rainChance,
      windKph: base.windKph,
    })),
    upcoming: [3, 6, 9].map((hour) => ({
      time: offset(hour),
      description,
      temp: base.temp - (hour === 9 ? 3 : 1),
      rainChance: base.rainChance,
    })),
  };
}
