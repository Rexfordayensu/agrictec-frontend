// Read-only mode for the farmer app while an admin views it as a farmer (phase A8).
// Three layers keep it strictly read-only: buttons are disabled (readOnlyProps), store actions
// refuse (assertWritable), and the API refuses every write from the view (403 "read_only").

import { useAuthStore } from '@/store/auth-store';

export const READ_ONLY_MESSAGE = 'Read-only while viewing as farmer';

export const isReadOnly = (): boolean => useAuthStore.getState().impersonation !== null;

/** Store actions call this first: it throws while viewing as a farmer. */
export function assertWritable(): void {
  if (isReadOnly()) throw new Error(READ_ONLY_MESSAGE);
}

/** True while an admin views the app as a farmer. */
export function useReadOnly(): boolean {
  return useAuthStore((s) => s.impersonation !== null);
}

/** Looks disabled without blocking the tooltip (merge into a control's className). */
export const READ_ONLY_CLASS = 'cursor-not-allowed opacity-60';

/**
 * For a plain <button> or control that changes farmer data (the shared Button has `mutates`):
 * spread these, add READ_ONLY_CLASS and pass `readOnly ? undefined : handler`. aria-disabled
 * (not disabled) keeps the tooltip working: disabled elements don't show one.
 */
export function readOnlyProps(readOnly: boolean): { 'aria-disabled'?: true; title?: string } {
  return readOnly ? { 'aria-disabled': true, title: READ_ONLY_MESSAGE } : {};
}
