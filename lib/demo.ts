// The guest demo. A guest has no account: nothing a guest enters is sent to AgriCtec or stored
// on the server (the API keeps no guest data). The app opens with empty farm data and the
// platform's public information (weather, market prices, lenders).
//
// A demo lasts one day. Its token lives in this browser's localStorage with the time it ends,
// 24 hours after it started; after that the token is deleted and the guest is back at sign-in.
// A cookie that ends at the same moment lets proxy.ts open the app pages; neither holds data.
// Both go on sign-out, and when the guest signs in or creates an account.

import { DEMO_REMINDER_KEY } from '@/lib/demo-reminder';
import { storage } from '@/services/storage';
import type { Session } from '@/types';

export const DEMO_COOKIE = 'agrictec_demo';
export const DEMO_USER_ID = 'guest-demo';
/** Said when a guest reaches something only an account can do. */
export const DEMO_MESSAGE =
  'This part needs an account: the guest demo only tries out farm records and MoMo, on this phone. Create a free account to use it.';
/** How long a guest demo lasts. */
export const DEMO_DAY_MS = 24 * 60 * 60 * 1000;

/** localStorage keys (stored as "agrictec:demo" and "agrictec:demo-entries"). */
const DEMO_KEY = 'demo';
export const DEMO_ENTRIES_KEY = 'demo-entries';
/** A clock a little ahead of this phone's still counts as "now". */
const CLOCK_SLACK_MS = 5 * 60 * 1000;

export interface DemoToken {
  /** A random token for this browser's demo: it identifies nothing on the server. */
  token: string;
  startedAt: string;
  /** 24 hours after startedAt: the token is deleted then. */
  expiresAt: string;
}

const isBrowser = () => typeof window !== 'undefined';

function readToken(): DemoToken | null {
  const saved = storage.get<DemoToken | null>(DEMO_KEY, null);
  if (
    !saved ||
    typeof saved.token !== 'string' ||
    typeof saved.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(saved.expiresAt))
  )
    return null;
  return saved;
}

function hasCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim() === `${DEMO_COOKIE}=1`);
}

function setCookie(maxAgeSeconds: number): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${DEMO_COOKIE}=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/**
 * A token is only good for the day it was made for: exactly 24 hours, started no later than
 * now. Moving its end later (or its start forward) ends the demo instead of extending it.
 */
function withinItsDay(demo: DemoToken, now: number): boolean {
  const start = Date.parse(demo.startedAt);
  const end = Date.parse(demo.expiresAt);
  return (
    Number.isFinite(start) &&
    start <= now + CLOCK_SLACK_MS &&
    Math.abs(end - start - DEMO_DAY_MS) < 1000 &&
    end > now
  );
}

/** The demo open in this browser and still within its day, or null. */
export function currentDemo(now = Date.now()): DemoToken | null {
  if (!isBrowser()) return null;
  const saved = readToken();
  return saved && withinItsDay(saved, now) ? saved : null;
}

/** True in a browser where an unexpired guest demo is open. */
export function isDemoBrowser(): boolean {
  return currentDemo() !== null;
}

/**
 * Deletes a demo token past its 24 hours, and says so (true) once: the app and the sign-in
 * page then tell the guest the demo ended. (A closed browser runs nothing, so a token left over
 * a closed night goes the next time AgriCtec opens.)
 */
export function demoJustEnded(now = Date.now()): boolean {
  if (!isBrowser()) return false;
  const saved = readToken();
  const expired = saved !== null && !withinItsDay(saved, now);
  // A cookie without a token: the token was removed by hand; end what is left.
  if (expired || (!saved && hasCookie())) endDemo();
  return expired;
}

/**
 * Opens the guest demo, or carries on the one already open: coming back the same day doesn't
 * restart the 24 hours.
 */
export function startDemo(now = Date.now()): DemoToken {
  const open = currentDemo(now);
  const demo: DemoToken = open ?? {
    token: crypto.randomUUID(),
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DEMO_DAY_MS).toISOString(),
  };
  storage.set(DEMO_KEY, demo);
  setCookie(Math.max(1, Math.floor((Date.parse(demo.expiresAt) - now) / 1000)));
  return demo;
}

/** Deletes the demo's token and cookie. */
export function endDemo(): void {
  if (!isBrowser()) return;
  try {
    storage.remove(DEMO_KEY);
    storage.remove(DEMO_ENTRIES_KEY);
    storage.remove(DEMO_REMINDER_KEY);
  } catch {
    // Read-only tab ("View as farmer"): it has no demo to end.
  }
  document.cookie = `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function demoSession(demo: DemoToken | null = currentDemo()): Session {
  return {
    userId: DEMO_USER_ID,
    email: '',
    isGuest: true,
    role: 'farmer',
    startedAt: demo?.startedAt ?? new Date().toISOString(),
  };
}

/** What the demo may still ask the API for: public data, and signing in or up. */
const PUBLIC_PATHS = [
  '/platform',
  '/geocoding',
  '/auth/login',
  '/auth/signup',
  '/auth/password-reset',
];
const PUBLIC_EXACT = ['/auth/replace-temporary-password'];

/** True when a request would read or write an account's data (refused in the demo). */
export function needsAccount(path: string): boolean {
  const clean = path.split('?')[0];
  if (PUBLIC_EXACT.includes(clean)) return false;
  return !PUBLIC_PATHS.some((p) => clean === p || clean.startsWith(`${p}/`));
}
