// Farm records and MoMo entries a guest tries out in the demo (lib/demo.ts). They are kept in
// this browser's localStorage for the demo's day only, tied to its token: nothing is sent to
// AgriCtec, receipts are never kept, and they are deleted with the token (after 24 hours, on
// sign-out, or when the guest signs in or creates an account).

import { toast } from 'sonner';
import { currentDemo, DEMO_ENTRIES_KEY, DEMO_USER_ID } from '@/lib/demo';
import { storage } from '@/services/storage';
import type { FarmRecord, MomoTransaction, NewMomoInput, NewRecordInput } from '@/types';

/** How many of each a demo keeps (localStorage is small, and it is only a look around). */
export const DEMO_ENTRY_LIMIT = 100;

interface SavedEntries {
  /** The demo they belong to: a new demo never sees an older one's entries. */
  token: string;
  records: FarmRecord[];
  momo: MomoTransaction[];
}

/** This demo's entries, if any were added today. */
export function loadDemoEntries(): { records: FarmRecord[]; momo: MomoTransaction[] } {
  const demo = currentDemo();
  const saved = storage.get<SavedEntries | null>(DEMO_ENTRIES_KEY, null);
  if (!demo || !saved || saved.token !== demo.token) return { records: [], momo: [] };
  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    records: list<FarmRecord>(saved.records).slice(0, DEMO_ENTRY_LIMIT),
    momo: list<MomoTransaction>(saved.momo).slice(0, DEMO_ENTRY_LIMIT),
  };
}

/** Keeps the demo's entries for the rest of its day (in this browser only). */
export function saveDemoEntries(records: FarmRecord[], momo: MomoTransaction[]): void {
  const demo = currentDemo();
  if (!demo) return;
  storage.set<SavedEntries>(DEMO_ENTRIES_KEY, { token: demo.token, records, momo });
}

/** Refuses an entry past the demo's limit. */
export function assertDemoRoom(count: number): void {
  if (count >= DEMO_ENTRY_LIMIT)
    throw new Error(
      `The demo keeps up to ${DEMO_ENTRY_LIMIT} entries of each kind. Create a free account to record more.`,
    );
}

/** True when the farm store holds the guest demo. */
export const isDemoUser = (userId: string | null): boolean => userId === DEMO_USER_ID;

function stamp() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId: DEMO_USER_ID,
    createdAt: now,
    updatedAt: now,
    currency: 'GHS',
    sourceType: 'farmer_entry' as const,
    // Nobody reviews a demo entry: it stays as the guest typed it.
    verificationStatus: 'self_reported' as const,
    evidenceCount: 0,
    history: [],
  };
}

export function demoRecord(input: NewRecordInput): FarmRecord {
  const { confirmDuplicate: _ignored, ...fields } = input;
  return { ...fields, ...stamp() };
}

export function demoMomo(input: NewMomoInput): MomoTransaction {
  const { confirmDuplicate: _ignored, ...fields } = input;
  return { ...fields, ...stamp() };
}

export function demoUpdate<T extends { updatedAt?: string }>(
  entry: T,
  patch: Partial<NoInfer<T>>,
): T {
  return { ...entry, ...patch, updatedAt: new Date().toISOString() };
}

/** Said after a guest adds or changes an entry: it stays on this phone, never sent. */
export function notifyDemoEntry(what: 'Record' | 'Transaction', updated = false): void {
  toast.success(`${what} ${updated ? 'updated' : 'added'} in the demo`, {
    description:
      'It stays on this phone until the demo ends and is never sent to AgriCtec. Create a free account to keep your records.',
    action: {
      label: 'Create account',
      // A full page load on purpose: leaving the demo starts the sign-up from a clean app.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      onClick: () => window.location.assign('/signup'),
    },
  });
}
