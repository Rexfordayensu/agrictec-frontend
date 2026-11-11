// What a forecast means for a farm: the same warnings the weather alerts send (the rules match
// the API's app/services/farm_alerts.py exactly, so the page and the inbox always agree), plain
// advice for today's farm work, and Ghana-time labels for days and hours.

import { GHANA_TIME_ZONE } from '@/lib/format';
import type { WeatherCondition } from '@/types';
import type { DailyWeather, WeatherReport } from '@/types/market';

/** Every time on the weather page uses Ghana's time zone. */
export { GHANA_TIME_ZONE };

// ---------- The alert rules (keep equal to app/services/farm_alerts.py) ----------

export const HEAVY_RAIN_MM = 20;
export const RAIN_CHANCE_MIN = 60;
export const ALERT_WINDOW_DAYS = 3;
export const DRY_DAYS = 7;
export const DRY_TOTAL_MM = 2;
export const DRY_CHANCE_MAX = 30;
const NORTHERN_REGIONS = new Set([
  'Northern',
  'Savannah',
  'North East',
  'Upper East',
  'Upper West',
]);
const GROWING_MONTHS = { north: [5, 6, 7, 8, 9, 10], south: [3, 4, 5, 6, 7, 9, 10, 11] };

export interface WeatherWarning {
  kind: 'rain' | 'storm' | 'dry';
  title: string;
  body: string;
}

/** "YYYY-MM-DD" for a moment, in Ghana time. */
export function ghanaDate(moment: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: GHANA_TIME_ZONE }).format(moment);
}

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** "Today", "Tomorrow", else "Thu 13 Nov" (forecast dates are already Ghana dates). */
export function dayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return 'Today';
  if (isoDate === addDays(today, 1)) return 'Tomorrow';
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** "today", "tomorrow" or "on Thursday", as the alert messages say it. */
function whenText(isoDate: string, today: string): string {
  if (isoDate === today) return 'today';
  if (isoDate === addDays(today, 1)) return 'tomorrow';
  return `on ${new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}`;
}

/** "14:00" in Ghana time. */
export function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: GHANA_TIME_ZONE,
  });
}

/** "10 Nov, 14:05" in Ghana time. */
export function updatedLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: GHANA_TIME_ZONE,
  });
}

export function inGrowingSeason(region: string | undefined, month: number): boolean {
  const zone = region && NORTHERN_REGIONS.has(region) ? 'north' : 'south';
  return GROWING_MONTHS[zone].includes(month);
}

/** The warnings for this forecast: at most one wet and one dry, nearest wet day first. */
export function weatherWarnings(
  report: Pick<WeatherReport, 'daily'>,
  region: string | undefined,
  today: string = ghanaDate(),
): WeatherWarning[] {
  const out: WeatherWarning[] = [];
  const last = addDays(today, ALERT_WINDOW_DAYS - 1);
  for (const day of report.daily) {
    if (day.date < today || day.date > last) continue;
    // An amount the provider didn't give is unknown: it never counts as heavy (or as dry).
    const heavy =
      day.rainMm !== null &&
      day.rainMm >= HEAVY_RAIN_MM &&
      (day.rainChance === null || day.rainChance >= RAIN_CHANCE_MIN);
    if (!heavy && !day.storm) continue;
    const likely = day.rainChance === null ? '' : ` (${day.rainChance}% chance)`;
    const amount =
      day.rainMm !== null && day.rainMm >= 1
        ? `about ${Math.round(day.rainMm)} mm of rain${likely}`
        : 'thunderstorms';
    const when = whenText(day.date, today);
    out.push({
      kind: day.storm ? 'storm' : 'rain',
      title: `${day.storm ? 'Thunderstorm expected' : 'Heavy rain expected'} ${when}`,
      body: `The forecast for your farm shows ${amount} ${when}. Cover or move harvested crops, clear drainage channels, and wait until it passes to spray or apply fertilizer.`,
    });
    break;
  }
  const week = report.daily.slice(0, DRY_DAYS);
  const month = Number(today.slice(5, 7));
  // A dry spell needs every day's amount: a missing one could be the rain.
  const known = week.every((d) => d.rainMm !== null);
  if (week.length === DRY_DAYS && known && inGrowingSeason(region, month)) {
    const total = week.reduce((sum, d) => sum + (d.rainMm ?? 0), 0);
    const chancesLow = week.every((d) => d.rainChance === null || d.rainChance < DRY_CHANCE_MAX);
    if (total < DRY_TOTAL_MM && chancesLow)
      out.push({
        kind: 'dry',
        title: 'Dry spell ahead',
        body: `Almost no rain is forecast at your farm for the next ${DRY_DAYS} days (${total.toFixed(1)} mm in total). Water young plants early or late in the day, mulch to keep moisture in, and hold off planting or fertilizer until rain returns.`,
      });
  }
  return out;
}

// ---------- Advice for today's farm work ----------

export type AdviceTone = 'good' | 'caution' | 'avoid';

export interface FarmAdvice {
  key: 'spraying' | 'fertilizer' | 'drying' | 'heat';
  title: string;
  tone: AdviceTone;
  text: string;
}

const WINDY_KPH = 15;

/**
 * Plain, rule-based advice from the forecast (not AI): spraying, fertilizer, drying harvested
 * crops and heat. Each rule reads only what the provider published; a missing rain chance,
 * rain amount or wind speed counts as unknown, never as dry or calm.
 */
export function farmAdvice(report: WeatherReport, today: string = ghanaDate()): FarmAdvice[] {
  const next6 = report.upcoming.slice(0, 6);
  const next12 = report.upcoming.slice(0, 12);
  const known = (hours: typeof next6) => hours.filter((h) => h.rainChance !== null);
  const maxChance = (hours: typeof next6) =>
    known(hours).length ? Math.max(...known(hours).map((h) => h.rainChance as number)) : null;
  const rainSoon = maxChance(next6);
  const rainToday = maxChance(next12);
  const todayRow = report.daily.find((d) => d.date === today);
  const nextTwoDays = report.daily.filter((d) => d.date >= today).slice(0, 2);
  const heavySoon = nextTwoDays.some(
    (d) => (d.rainMm !== null && d.rainMm >= HEAVY_RAIN_MM) || d.storm,
  );
  const wind = report.current.windKph;
  const windy = wind !== null && wind >= WINDY_KPH;
  const out: FarmAdvice[] = [];

  out.push(
    windy || (rainSoon !== null && rainSoon >= 50)
      ? {
          key: 'spraying',
          title: 'Spraying',
          tone: 'avoid',
          text: windy
            ? `Wind is ${wind} km/h: spray would drift. Wait for a calmer time, usually early morning.`
            : `Rain is likely within 6 hours (${rainSoon}%) and would wash the spray off. Wait until it has passed.`,
        }
      : {
          key: 'spraying',
          title: 'Spraying',
          tone: rainSoon === null || wind === null ? 'caution' : 'good',
          text:
            wind === null
              ? 'This source gives no wind speed right now. Check that the air is calm before you spray.'
              : rainSoon === null
                ? 'Wind is low. This source gives no rain chance, so check the sky before you spray.'
                : 'Good conditions: low wind and little chance of rain in the next 6 hours.',
        },
  );

  out.push(
    heavySoon
      ? {
          key: 'fertilizer',
          title: 'Fertilizer',
          tone: 'avoid',
          text: 'Heavy rain or a storm is expected in the next 2 days and could wash fertilizer away. Apply it after.',
        }
      : nextTwoDays.some((d) => d.rainMm !== null && d.rainMm >= 2 && d.rainMm < HEAVY_RAIN_MM)
        ? {
            key: 'fertilizer',
            title: 'Fertilizer',
            tone: 'good',
            text: 'Light rain is expected soon: a good time to apply, so the rain carries it into the soil.',
          }
        : nextTwoDays.some((d) => d.rainMm === null)
          ? {
              key: 'fertilizer',
              title: 'Fertilizer',
              tone: 'caution',
              text: 'This source gives no rain amounts for the next 2 days. Check a second forecast before you apply.',
            }
          : {
              key: 'fertilizer',
              title: 'Fertilizer',
              tone: 'caution',
              text: 'No rain is expected in the next 2 days. If you apply now, water it in.',
            },
  );

  out.push(
    rainToday !== null && rainToday >= 40
      ? {
          key: 'drying',
          title: 'Drying harvested crops',
          tone: 'avoid',
          text: `Rain is possible in the next 12 hours (${rainToday}%). Keep harvested crops covered or indoors.`,
        }
      : {
          key: 'drying',
          title: 'Drying harvested crops',
          tone: rainToday === null ? 'caution' : 'good',
          text:
            rainToday === null
              ? 'This source gives no rain chance. Dry crops where you can cover them quickly.'
              : 'Good drying weather: little chance of rain in the next 12 hours.',
        },
  );

  if (todayRow && todayRow.maxTemp >= 35)
    out.push({
      key: 'heat',
      title: 'Heat',
      tone: 'caution',
      text: `Up to ${todayRow.maxTemp}°C today. Water crops early or late in the day and give animals shade and water.`,
    });
  return out;
}

// ---------- Icons ----------

/** The icon for a provider's description (their words differ; storms win, then rain, then cloud). */
export function conditionOf(description: string, storm = false): WeatherCondition {
  const text = description.toLowerCase();
  if (storm || text.includes('thunder')) return 'storm';
  if (/rain|shower|drizzle/.test(text)) return 'showers';
  if (/cloud|overcast|fog|mist|haze/.test(text)) return 'partly-cloudy';
  return 'sunny';
}

/** For tests and the dashboard: the day a warning is about is always in the window. */
export const isUpcoming = (day: DailyWeather, today: string) => day.date >= today;
