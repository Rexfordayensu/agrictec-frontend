// What the Weather page says about where the forecast is for: the village, the town or city,
// the district and the region, each labelled, e.g. Village: Krapa · District: Ejisu Municipal
// · Region: Ashanti. Only what OpenStreetMap named is shown; nothing is filled in.

import type { WeatherLocation } from '@/types/market';

export interface PlacePart {
  label: 'Village' | 'Area' | 'Town / city' | 'District' | 'Region';
  value: string;
}

/** "Ejisu Municipal District" -> "Ejisu Municipal"; "Kumasi Metropolitan District" -> "Kumasi Metropolitan". */
const shortDistrict = (name: string) => name.replace(/\s+District$/i, '').trim();

export function placeParts(location: WeatherLocation): PlacePart[] {
  const parts: PlacePart[] = [];
  if (location.village) parts.push({ label: 'Village', value: location.village });
  if (location.area) parts.push({ label: 'Area', value: location.area });
  if (location.city) parts.push({ label: 'Town / city', value: location.city });
  if (location.district) parts.push({ label: 'District', value: shortDistrict(location.district) });
  if (location.region) parts.push({ label: 'Region', value: location.region });
  return parts;
}

export function describePlace(
  location: WeatherLocation,
  isFarm: boolean,
): { title: string; detail: string; parts: PlacePart[] } {
  const parts = location.kind === 'coordinates' ? placeParts(location) : [];
  const settlement = location.village ?? location.city ?? location.area;
  if (location.kind === 'coordinates') {
    const where = [settlement, location.region].filter(Boolean).join(', ');
    if (isFarm)
      return {
        title: settlement ? `Your farm · ${settlement}` : location.label,
        detail: parts.length ? 'Your farm is in:' : 'The forecast at your farm’s map pin.',
        parts,
      };
    if (parts.length) return { title: where || location.label, detail: 'You are in:', parts };
    return {
      title: location.label,
      detail: /outside Ghana/.test(location.label)
        ? 'You are outside Ghana: the forecast is for where you are.'
        : 'Your town could not be named, but the forecast is for where you are.',
      parts,
    };
  }
  // A place the farmer chose: its town and region, as chosen.
  const chosen: PlacePart[] = [
    ...(location.city ? [{ label: 'Town / city' as const, value: location.city }] : []),
    ...(location.region ? [{ label: 'Region' as const, value: location.region }] : []),
  ];
  return { title: location.label, detail: 'Forecast for:', parts: chosen };
}
