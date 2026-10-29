// The verifications queue (phase A9): reject reasons, ordering, duplicate detection and
// navigation. Pure, so the page, the review modal and the tests share exactly the same rules.

import { differenceInHours } from 'date-fns';
import type { FarmerAccount, VerificationKind, VerificationRequest } from '@/types/admin';

export type VerificationStatus = VerificationRequest['status'];

/** The reasons a reviewer can pick. The farmer sees "Rejected: <reason>. Please resubmit." */
export const REJECT_REASONS = [
  'Number format invalid',
  "Doesn't match name",
  'Duplicate',
  'Unclear',
  'Other',
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const isRejectReason = (value: string): value is RejectReason =>
  (REJECT_REASONS as readonly string[]).includes(value);

export const KIND_LABEL: Record<VerificationKind, string> = {
  ghanaCard: 'Ghana Card',
  phone: 'Phone',
  location: 'Location',
};

/** Tabs of the queue page (?status=); the page opens on pending. */
export const QUEUE_TABS = ['pending', 'approved', 'rejected', 'all'] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

export const parseQueueTab = (value: string | null): QueueTab =>
  (QUEUE_TABS as readonly string[]).includes(value ?? '') ? (value as QueueTab) : 'pending';

/** A pending request this old is shown in red: nothing should wait more than three days. */
export const OVERDUE_HOURS = 72;

export const isOverdue = (request: VerificationRequest, now = new Date()) =>
  request.status === 'pending' &&
  differenceInHours(now, new Date(request.submittedAt)) >= OVERDUE_HOURS;

/**
 * The default order: pending first, oldest first (so nothing waits forever), then the reviewed
 * ones, most recently reviewed first.
 */
export function queueSortValue(request: VerificationRequest): string {
  if (request.status === 'pending') return `0|${request.submittedAt}`;
  // Reviewed: invert the timestamp so a plain ascending sort puts the newest first.
  const reviewed = Date.parse(request.reviewedAt ?? request.submittedAt);
  return `1|${String(9e15 - reviewed).padStart(16, '0')}`;
}

/** Phone and location checks can be approved together; Ghana Cards are reviewed one by one. */
export const canBulkApprove = (request: VerificationRequest) =>
  request.status === 'pending' && request.kind !== 'ghanaCard';

/** Other accounts with the same Ghana Card (same hash, pending or approved). */
export function findDuplicates(
  request: VerificationRequest,
  all: VerificationRequest[],
  farmers: FarmerAccount[],
): { userId: string; name: string }[] {
  if (request.kind !== 'ghanaCard' || !request.valueHash) return [];
  const userIds = new Set(
    all
      .filter(
        (v) =>
          v.kind === 'ghanaCard' &&
          v.valueHash === request.valueHash &&
          v.userId !== request.userId &&
          v.status !== 'rejected',
      )
      .map((v) => v.userId),
  );
  return [...userIds].map((userId) => {
    const farmer = farmers.find((f) => f.userId === userId);
    return { userId, name: farmer ? farmer.profile.name || farmer.email : 'A deleted account' };
  });
}

/** "This Ghana Card is also linked to 1 other account (Yaw Asante)". */
export function duplicateWarning(duplicates: { name: string }[]): string | null {
  if (duplicates.length === 0) return null;
  const count = duplicates.length;
  return `This Ghana Card is also linked to ${count} other ${count === 1 ? 'account' : 'accounts'} (${duplicates.map((d) => d.name).join(', ')})`;
}

/** J/K: the request after (1) or before (-1) this one in the queue, if any. */
export function neighborId(
  queue: VerificationRequest[],
  id: string,
  direction: 1 | -1,
): string | null {
  const index = queue.findIndex((v) => v.id === id);
  if (index === -1) return queue[0]?.id ?? null;
  return queue[index + direction]?.id ?? null;
}

/**
 * Where the review goes after approving or rejecting `id`: the next pending request after it,
 * else the nearest pending one before it, else nothing (the queue is clear).
 */
export function nextAfterReview(queue: VerificationRequest[], id: string): string | null {
  const index = queue.findIndex((v) => v.id === id);
  const pendingOther = (v: VerificationRequest) => v.status === 'pending' && v.id !== id;
  const after = queue.slice(index + 1).find(pendingOther);
  if (after) return after.id;
  const before = queue.slice(0, Math.max(0, index)).reverse().find(pendingOther);
  return before?.id ?? null;
}

/** "6.7000, -1.6000" (how the farmer app logs a location) → coordinates. */
export function parseLocation(value: string): { lat: number; lng: number } | null {
  const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export const googleMapsUrl = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** Counts for the tabs. */
export function queueCounts(all: VerificationRequest[]): Record<QueueTab, number> {
  const count = (status: VerificationStatus) => all.filter((v) => v.status === status).length;
  return {
    pending: count('pending'),
    approved: count('approved'),
    rejected: count('rejected'),
    all: all.length,
  };
}
