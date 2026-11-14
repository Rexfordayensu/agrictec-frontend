// While a guest tries the demo (lib/demo.ts), a reminder every 10 minutes to create a free
// account, each time with something an account really adds. The time of the last reminder is
// kept with the demo (this browser only), so a page reload doesn't restart the 10 minutes, and
// it is deleted with the demo.

import { storage } from '@/services/storage';

export const DEMO_REMINDER_KEY = 'demo-reminder';
export const DEMO_REMINDER_EVERY_MS = 10 * 60 * 1000;

export interface DemoReminder {
  title: string;
  body: string;
}

/** What an account adds. Only true claims: AI tools come with a paid plan, so they say so. */
export const DEMO_REMINDERS: DemoReminder[] = [
  {
    title: 'Keep everything you record',
    body: 'A free account saves your records and MoMo entries, so they are there tomorrow and on any phone.',
  },
  {
    title: 'Get your records verified',
    body: 'With an account, AgriCtec checks your receipts, so lenders can trust your figures and your score.',
  },
  {
    title: 'Apply to lenders through AgriCtec',
    body: 'Create a free account to apply to the lenders on AgriCtec with your records and financial report.',
  },
  {
    title: 'Grow with AgriCtec tools',
    body: 'Plans add the AI assistant, the crop doctor for sick plants and the yield predictor for your farm.',
  },
];

interface ReminderState {
  /** When the last reminder showed (or the demo was first seen), ms since 1970. */
  lastAt: number;
  /** How many reminders have shown: the next one says something new. */
  shown: number;
}

function read(): ReminderState | null {
  const saved = storage.get<ReminderState | null>(DEMO_REMINDER_KEY, null);
  return saved && Number.isFinite(saved.lastAt) && Number.isFinite(saved.shown) ? saved : null;
}

/** Milliseconds until the next reminder is due (0 when it is due now). Starts the clock. */
export function msUntilDemoReminder(now = Date.now()): number {
  const saved = read();
  if (!saved) {
    storage.set<ReminderState>(DEMO_REMINDER_KEY, { lastAt: now, shown: 0 });
    return DEMO_REMINDER_EVERY_MS;
  }
  // A clock set back can't put the reminder off for long.
  const since = Math.max(0, Math.min(now - saved.lastAt, DEMO_REMINDER_EVERY_MS));
  return DEMO_REMINDER_EVERY_MS - since;
}

/** The reminder to show now; records it, so the next one is 10 minutes later. */
export function takeDemoReminder(now = Date.now()): DemoReminder {
  const shown = read()?.shown ?? 0;
  storage.set<ReminderState>(DEMO_REMINDER_KEY, { lastAt: now, shown: shown + 1 });
  return DEMO_REMINDERS[shown % DEMO_REMINDERS.length];
}
