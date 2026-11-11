import { z } from 'zod';
import { api } from '@/services/api';
import { validWeatherLocation, weatherLocationKey } from '@/lib/market/weather-location';
import type {
  IntegrationResult,
  WeatherLocation,
  WeatherProvider,
  WeatherReport,
} from '@/types/market';

const percent = z.number().min(0).max(100);
// Some providers (MET Norway, for Ghana) publish no probability of rain: null, never a guess.
const chance = percent.nullable();
const temp = z.number().min(-100).max(65);
const description = z.string().min(1).max(200);
const reportSchema = z.object({
  provider: z.string().min(1),
  updatedAt: z.iso.datetime(),
  location: z.custom<WeatherLocation>(validWeatherLocation),
  current: z.object({
    temp,
    description,
    humidity: percent,
    rainMm: z.number().min(0).nullable(),
    rainChance: chance,
    windKph: z.number().min(0).nullable(),
  }),
  daily: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description,
        minTemp: temp,
        maxTemp: temp,
        rainMm: z.number().min(0).nullable(),
        rainChance: chance,
        windKph: z.number().min(0).nullable(),
        storm: z.boolean().optional(),
      }),
    )
    .max(16),
  upcoming: z
    .array(z.object({ time: z.iso.datetime(), description, temp, rainChance: chance }))
    .max(48),
});

/** The API's own answer when the provider didn't respond (passed through as it is). */
class Unavailable extends Error {
  constructor(readonly result: IntegrationResult<WeatherReport>) {
    super(result.status === 'unavailable' ? result.message : 'Weather data unavailable');
  }
}

/**
 * The live forecast providers the API uses (app/integrations/weather.py). A report naming any
 * other source is refused: the app never shows weather that didn't come from one of them.
 */
export const LIVE_WEATHER_PROVIDERS = ['Open-Meteo', 'OpenWeather', 'MET Norway'] as const;

/** Live weather from the API (Open-Meteo behind it, cached 15 minutes per place). */
const apiWeatherProvider: WeatherProvider = {
  async getForecast(location, signal) {
    const result = await api<IntegrationResult<WeatherReport>>('/platform/weather', {
      method: 'POST',
      body: location,
      signal,
    });
    if (result.status !== 'ready') throw new Unavailable(result);
    if (!(LIVE_WEATHER_PROVIDERS as readonly string[]).includes(result.data?.provider))
      throw new Unavailable({
        status: 'unavailable',
        message: 'Weather data unavailable',
        reason: 'The forecast did not come from a recognised live weather provider.',
      });
    return result.data;
  },
};

export const weatherService = {
  async getForecast(
    location: WeatherLocation,
    options: { provider?: WeatherProvider; signal?: AbortSignal } = {},
  ): Promise<IntegrationResult<WeatherReport>> {
    if (!validWeatherLocation(location))
      throw new Error('Select a valid location before requesting weather.');
    const provider = options.provider ?? apiWeatherProvider;
    let raw: WeatherReport | null;
    try {
      raw = await provider.getForecast(location, options.signal);
    } catch (error) {
      if (error instanceof Unavailable) return error.result;
      throw error;
    }
    const parsed = reportSchema.safeParse(raw);
    if (
      !parsed.success ||
      weatherLocationKey(parsed.data.location) !== weatherLocationKey(location) ||
      Date.parse(parsed.data.updatedAt) > Date.now() + 300000 ||
      parsed.data.daily.some((day) => day.minTemp > day.maxTemp)
    )
      return {
        status: 'unavailable',
        message: 'Weather data unavailable',
        reason: 'The provider did not return complete weather for the selected location.',
      };
    return { status: 'ready', data: parsed.data };
  },
};
