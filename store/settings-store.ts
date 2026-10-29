import { create } from 'zustand';
import { isReadOnly, READ_ONLY_MESSAGE } from '@/lib/read-only';
import { DEFAULT_SETTINGS, settingsService } from '@/services/settings.service';
import type { Language, LoadOptions, NotificationSettings, StoreStatus } from '@/types';

let saves: Promise<unknown> = Promise.resolve();
export async function waitForSettingsSaves(): Promise<void> {
  await saves.catch(() => {});
}

interface SettingsState {
  userId: string | null;
  language: Language;
  notifications: NotificationSettings;
  status: StoreStatus;
  load: (userId: string, options?: LoadOptions) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  toggleNotification: (key: keyof NotificationSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => {
  const requireUser = (): string => {
    const { userId } = get();
    if (!userId) throw new Error('You need to sign in first');
    return userId;
  };

  function update(
    change: (
      current: Pick<SettingsState, 'language' | 'notifications'>,
    ) => Pick<SettingsState, 'language' | 'notifications'>,
  ): Promise<void> {
    if (isReadOnly()) return Promise.reject(new Error(READ_ONLY_MESSAGE));
    const userId = requireUser();
    const task = saves
      .catch(() => {})
      .then(async () => {
        if (get().userId !== userId) return;
        const saved = await settingsService.save(userId, change(get()));
        if (get().userId === userId) set(saved);
      });
    saves = task;
    return task;
  }

  return {
    userId: null,
    language: DEFAULT_SETTINGS.language,
    notifications: DEFAULT_SETTINGS.notifications,
    status: 'idle',

    load: async (userId, { silent = false } = {}) => {
      set(silent ? { userId } : { userId, status: 'loading' });
      try {
        const settings = await settingsService.get(userId);
        if (get().userId !== userId) return;
        set({ ...settings, status: 'ready' });
      } catch (error) {
        set({ status: 'error' });
        throw error;
      }
    },

    setLanguage: (language) =>
      update((current) => ({ language, notifications: current.notifications })),
    toggleNotification: (key) =>
      update((current) => ({
        language: current.language,
        notifications: { ...current.notifications, [key]: !current.notifications[key] },
      })),
  };
});
