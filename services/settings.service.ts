import { api } from '@/services/api';
import type { AppSettings } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  notifications: { aiInsights: true, weatherAlerts: true, priceAlerts: true },
};

export const settingsService = {
  async get(_userId: string): Promise<AppSettings> {
    const saved = await api<AppSettings>('/me/settings');
    return {
      language: saved.language ?? DEFAULT_SETTINGS.language,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
    };
  },

  async save(_userId: string, settings: AppSettings): Promise<AppSettings> {
    return api<AppSettings>('/me/settings', { method: 'PUT', body: settings });
  },
};
