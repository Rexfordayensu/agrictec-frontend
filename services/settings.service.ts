import { api } from '@/services/api';
import type { AppSettings } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  notifications: { aiInsights: true, weatherAlerts: true, priceAlerts: true, smsAlerts: true },
};

/** Fills anything an older server leaves out with the defaults. */
function normalize(saved: AppSettings): AppSettings {
  return {
    language: saved.language ?? DEFAULT_SETTINGS.language,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
    smsAvailable: saved.smsAvailable === true,
    tourSeenAt: saved.tourSeenAt ?? null,
  };
}

export const settingsService = {
  async get(_userId: string): Promise<AppSettings> {
    const saved = await api<AppSettings>('/me/settings');
    return normalize(saved);
  },

  async save(_userId: string, settings: AppSettings): Promise<AppSettings> {
    const body = { language: settings.language, notifications: settings.notifications };
    return normalize(await api<AppSettings>('/me/settings', { method: 'PUT', body }));
  },
};
