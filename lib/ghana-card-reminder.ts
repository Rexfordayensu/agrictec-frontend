// When the "Verify your Ghana Card" reminder shows (components/profile/ghana-card-reminder.tsx).
// Pure, so the timing rules are tested without a browser.

import type { GhanaCardStatus } from '@/types';

/** First reminder: one minute after the farmer opens AgriCtec. */
export const FIRST_REMINDER_MS = 60_000;
/** "Remind me later": again ten minutes after, while the farmer is in the app. */
export const REMIND_LATER_MS = 10 * 60_000;

export interface ReminderState {
  /** When the reminder is due (ms since epoch). */
  nextAt: number;
  /** "Not now": no more reminders until the farmer's next visit (this browser tab). */
  dismissed: boolean;
}

/**
 * Only a farmer who still has something to do: no card yet, or one that was rejected. Never while
 * a card is under review or verified, never for the shared guest (demo) account, and never in an
 * admin's read-only "View as farmer" tab.
 */
export function needsReminder(
  status: GhanaCardStatus,
  { isGuest, readOnly }: { isGuest: boolean; readOnly: boolean },
): boolean {
  return (status === 'not_provided' || status === 'rejected') && !isGuest && !readOnly;
}

/** The schedule on opening the app: kept if this tab already has one, else one minute from now. */
export function startReminder(saved: ReminderState | null, now: number): ReminderState {
  return saved ?? { nextAt: now + FIRST_REMINDER_MS, dismissed: false };
}

/** "Remind me later" (and closing the reminder or the card form without submitting). */
export function remindLater(now: number): ReminderState {
  return { nextAt: now + REMIND_LATER_MS, dismissed: false };
}

/** "Not now". */
export function dismissForVisit(state: ReminderState): ReminderState {
  return { ...state, dismissed: true };
}

/** Milliseconds until the reminder should show, or null when it never should this visit. */
export function msUntilDue(state: ReminderState, now: number): number | null {
  return state.dismissed ? null : Math.max(0, state.nextAt - now);
}
