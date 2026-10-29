import type { VerificationRequest } from '@/types/admin';

/**
 * What a farmer sees on their profile after a rejected check:
 * "Rejected: Unclear. Please resubmit." plus the reviewer's note, if there is one.
 */
export function rejectionMessage(request: Pick<VerificationRequest, 'reason' | 'note'>): string {
  const reason = request.reason?.trim().replace(/[.!]+$/, '');
  const note = request.note?.trim();
  const base = reason ? `Rejected: ${reason}. Please resubmit.` : 'Rejected. Please resubmit.';
  return note ? `${base} ${note}` : base;
}
