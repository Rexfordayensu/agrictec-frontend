// Read-only mode for the farmer app: while an admin views it as a farmer (phase A8), and in the
// guest demo (lib/demo.ts), where nothing reaches AgriCtec. The demo may still try farm records
// and MoMo entries, kept on the phone for its day (lib/demo-entries.ts, the "entries" checks
// below). Three layers keep it strictly read-only:
// buttons are disabled (readOnlyProps), store actions refuse (assertWritable), and requests are
// refused (the API answers 403 "read_only" to the admin's view; the demo never sends them).

import { toast } from 'sonner';
import { DEMO_MESSAGE } from '@/lib/demo';
import { useAuthStore } from '@/store/auth-store';

/** The admin's "View as farmer". */
export const READ_ONLY_MESSAGE = 'Read-only while viewing as farmer';

const isDemoSession = (state: ReturnType<typeof useAuthStore.getState>) =>
  state.impersonation === null && state.session?.isGuest === true;

export const isReadOnly = (): boolean => {
  const state = useAuthStore.getState();
  return state.impersonation !== null || isDemoSession(state);
};

/** Why nothing can be changed right now, in the words for who is looking. */
export function readOnlyMessage(): string {
  return isDemoSession(useAuthStore.getState()) ? DEMO_MESSAGE : READ_ONLY_MESSAGE;
}

/** The note shown when a change is refused; in the demo it offers to create an account. */
export function notifyReadOnly(): void {
  if (isDemoSession(useAuthStore.getState())) {
    toast.info(DEMO_MESSAGE, {
      action: {
        label: 'Create account',
        // A full page load on purpose: leaving the demo starts the sign-up from a clean app.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        onClick: () => window.location.assign('/signup'),
      },
    });
  } else toast.info(READ_ONLY_MESSAGE);
}

/**
 * Farm records and MoMo entries: the guest demo may try adding, changing and deleting them (kept
 * in the browser's memory only, never sent: store/farm-store.ts), so only the admin's "View as
 * farmer" makes them read-only.
 */
export const isEntriesReadOnly = (): boolean => useAuthStore.getState().impersonation !== null;

export function useEntriesReadOnly(): boolean {
  return useAuthStore((s) => s.impersonation !== null);
}

export function assertEntriesWritable(): void {
  if (isEntriesReadOnly()) throw new Error(READ_ONLY_MESSAGE);
}

/** Store actions call this first: it throws while read-only. */
export function assertWritable(): void {
  if (isReadOnly()) throw new Error(readOnlyMessage());
}

/** True while an admin views the app as a farmer, or in the guest demo. */
export function useReadOnly(): boolean {
  return useAuthStore((s) => s.impersonation !== null || s.session?.isGuest === true);
}

/** Looks disabled without blocking the tooltip (merge into a control's className). */
export const READ_ONLY_CLASS = 'cursor-not-allowed opacity-60';

/**
 * For a plain <button> or control that changes farmer data (the shared Button has `mutates`):
 * spread these, add READ_ONLY_CLASS and pass `readOnly ? notifyReadOnly : handler` (a tap then
 * says why, which a tooltip can't do on a phone). aria-disabled
 * (not disabled) keeps the tooltip working: disabled elements don't show one.
 */
export function readOnlyProps(readOnly: boolean): { 'aria-disabled'?: true; title?: string } {
  return readOnly ? { 'aria-disabled': true, title: readOnlyMessage() } : {};
}
