// The ONLY module that touches localStorage / sessionStorage. Farm and platform data live in the
// API's database now (services/api.ts); this keeps per-device UI state only: dismissed prompts,
// the chosen weather place, a tab's "View as farmer" token.
// Every read is SSR-safe and wrapped in try/catch, so corrupt data or a full quota never crashes the app.

const PREFIX = 'agrictec:';
const isBrowser = () => typeof window !== 'undefined';

/**
 * Set while an admin views the farmer app as a farmer (phase A8). Every write to localStorage
 * then throws, so the impersonated view can never change anyone's data. Per tab: other tabs
 * (and sessionStorage, used only for per-tab UI state) are unaffected.
 */
let readOnly = false;
export const READ_ONLY_MESSAGE = 'Read-only while viewing as farmer';

function assertWritable(): void {
  if (readOnly) throw new Error(READ_ONLY_MESSAGE);
}

function read<T>(area: Storage, key: string, fallback: T): T {
  try {
    const raw = area.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write<T>(area: Storage, key: string, value: T): void {
  try {
    area.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] Could not save "${key}" (storage may be full).`, error);
  }
}

export const storage = {
  /** Turns the read-only guard on or off for this tab (see READ_ONLY_MESSAGE). */
  setReadOnly(on: boolean): void {
    readOnly = on;
  },

  isReadOnly(): boolean {
    return readOnly;
  },

  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    return read(window.localStorage, key, fallback);
  },

  set<T>(key: string, value: T): void {
    assertWritable();
    if (!isBrowser()) return;
    write(window.localStorage, key, value);
  },

  remove(key: string): void {
    assertWritable();
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      // Storage unavailable (e.g. private mode): nothing to remove.
    }
  },

  /** Every app key, without the "agrictec:" prefix (used by the admin platform backup). */
  keys(): string[] {
    if (!isBrowser()) return [];
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length));
      }
      return keys;
    } catch {
      return [];
    }
  },

  /**
   * Calls `listener` when ANOTHER tab changes app data (the browser never fires `storage` in the
   * tab that wrote). `key` comes without the "agrictec:" prefix, or null when storage was cleared.
   * Returns the unsubscribe function.
   */
  onExternalChange(listener: (key: string | null) => void): () => void {
    if (!isBrowser()) return () => {};
    const handler = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === null) listener(null);
      else if (event.key.startsWith(PREFIX)) listener(event.key.slice(PREFIX.length));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },

  /**
   * Roughly how much of the browser's storage the app uses, in bytes: the characters of every
   * app key and value, counted as UTF-16 (two bytes each), which is how browsers measure the quota.
   */
  usageBytes(): number {
    if (!isBrowser()) return 0;
    let chars = 0;
    for (const key of this.keys())
      chars += PREFIX.length + key.length + (this.getRaw(key)?.length ?? 0);
    return chars * 2;
  },

  /** The stored JSON text of a key, unparsed, or null. */
  getRaw(key: string): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },

  /** Removes every key that belongs to one user: "agrictec:<userId>:*". */
  clearUser(userId: string): void {
    assertWritable();
    if (!isBrowser()) return;
    try {
      const userPrefix = PREFIX + userId + ':';
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(userPrefix)) keys.push(key);
      }
      keys.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      throw new Error(
        'Could not delete your data. Check your browser storage settings and try again.',
      );
    }
  },

  /**
   * Replaces every app key except those `keep` protects with `entries`, restoring the previous
   * values if a write fails (used by the admin platform import).
   */
  replaceKeys(entries: Record<string, unknown>, keep: (key: string) => boolean): void {
    assertWritable();
    if (!isBrowser()) throw new Error('Data import is only available in your browser.');
    const area = window.localStorage;
    const previous = new Map<string, string>();
    for (const key of this.keys()) {
      const raw = area.getItem(PREFIX + key);
      if (raw !== null) previous.set(key, raw);
    }
    const replaceable = [...previous.keys()].filter((key) => !keep(key));
    try {
      replaceable.forEach((key) => area.removeItem(PREFIX + key));
      for (const [key, value] of Object.entries(entries)) {
        if (!keep(key)) area.setItem(PREFIX + key, JSON.stringify(value));
      }
    } catch {
      try {
        this.keys()
          .filter((key) => !keep(key))
          .forEach((key) => area.removeItem(PREFIX + key));
        replaceable.forEach((key) => area.setItem(PREFIX + key, previous.get(key)!));
      } catch {
        throw new Error('Storage is unavailable. Your backup file is unchanged.');
      }
      throw new Error('Import failed. The previous data has been restored.');
    }
  },

  /** Replace one user's data, restoring the previous values if a write fails. */
  replaceUser(userId: string, data: Record<string, unknown>): void {
    assertWritable();
    if (!isBrowser()) throw new Error('Data import is only available in your browser.');
    const area = window.localStorage;
    const prefix = PREFIX + userId + ':';
    const previous = new Map<string, string>();
    const currentKeys = () => {
      const keys: string[] = [];
      for (let index = 0; index < area.length; index++) {
        const key = area.key(index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      return keys;
    };
    currentKeys().forEach((key) => {
      const raw = area.getItem(key);
      if (raw !== null) previous.set(key, raw);
    });
    try {
      currentKeys().forEach((key) => area.removeItem(key));
      for (const [name, value] of Object.entries(data))
        area.setItem(prefix + name, JSON.stringify(value));
    } catch {
      try {
        currentKeys().forEach((key) => area.removeItem(key));
        previous.forEach((raw, key) => area.setItem(key, raw));
      } catch {
        throw new Error(
          'Storage is unavailable. Your backup file is unchanged; restore it when browser storage is available.',
        );
      }
      throw new Error('Import failed. Your previous data has been restored.');
    }
  },
};

/** Per-tab storage: values last until the browser tab is closed. */
export const sessionStore = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    return read(window.sessionStorage, key, fallback);
  },

  set<T>(key: string, value: T): void {
    if (!isBrowser()) return;
    write(window.sessionStorage, key, value);
  },
};

/** e.g. userKey(id, 'records') → stored as "agrictec:<userId>:records", so every user's data is separate. */
export const userKey = (userId: string, name: string) => `${userId}:${name}`;

/** Simulated network latency, so loading states are visible and services behave like a real API. */
export const delay = (ms = 150) => new Promise<void>((resolve) => setTimeout(resolve, ms));
