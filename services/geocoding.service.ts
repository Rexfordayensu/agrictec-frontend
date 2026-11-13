// Finds towns and villages in Ghana by name, through the API (GET /geocoding/search), which asks
// OpenStreetMap's Nominatim at most once a second for everyone and caches the answers. The map
// still searches on submit, never on every keystroke, and keeps results for the session.

import { api } from '@/services/api';

export interface PlaceResult {
  id: string;
  /** "Ejura" */
  name: string;
  /** "Ejura-Sekyedumase, Ashanti Region" */
  detail: string;
  lat: number;
  lng: number;
  /** A sensible zoom for this kind of place (a village needs a closer view than a district). */
  zoom: number;
}

/** GET /geocoding/reverse: what a position is called. Any field can be missing (null). */
export interface PlaceName {
  /** Village or hamlet, e.g. "Krapa" (rural places). */
  village?: string | null;
  /** Neighbourhood inside a town or city, e.g. "Adum". */
  area: string | null;
  /** Town or city, only when OpenStreetMap names one, e.g. "Kumasi". */
  town: string | null;
  district: string | null;
  /** One of Ghana's 16 regions, e.g. "Ashanti"; null outside Ghana or when unknown. */
  region: string | null;
  inGhana: boolean;
  /** "Kumasi, Ashanti, Ghana" */
  label: string;
}

const cache = new Map<string, PlaceResult[]>();

export const geocodingService = {
  /** Up to 6 places in Ghana matching the name. Throws when offline or the service fails. */
  async searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const key = q.toLowerCase();
    const cached = cache.get(key);
    if (cached) return cached;

    const places = await api<PlaceResult[]>('/geocoding/search', { query: { q }, signal });
    cache.set(key, places);
    return places;
  },

  /** The town and region at a position (the server rounds it to about 100 m first). */
  async reverse(lat: number, lng: number, signal?: AbortSignal): Promise<PlaceName> {
    return api<PlaceName>('/geocoding/reverse', { query: { lat, lng }, signal });
  },

  /**
   * Where a constituency is, to move the map there. Constituencies are usually named after
   * their main town ("Ejisu", "Tamale North", "Ejura-Sekyedumase"), so this looks up the full
   * name, then the town part. Null when neither is found (the map stays on the region).
   */
  async locateConstituency(
    constituency: string,
    region: string,
    signal?: AbortSignal,
  ): Promise<PlaceResult | null> {
    const town = constituency
      .replace(/\b(North|South|East|West|Central|Municipal)\b/g, '')
      .split(/[-/]/)[0]
      .trim();
    const queries = [constituency, ...(town && town !== constituency ? [town] : [])];
    for (const [index, name] of queries.entries()) {
      // Nominatim allows about one request a second: wait before a second try.
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
      if (signal?.aborted) return null;
      const [first] = await geocodingService.searchPlaces(`${name}, ${region} Region`, signal);
      if (first) return { ...first, name: constituency, zoom: Math.min(first.zoom, 12) };
    }
    return null;
  },
};
