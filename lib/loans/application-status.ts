// How each application status looks and what it means for the farmer (and the console).

import type { BadgeColor } from '@/components/ui/badge';
import type { ApplicationStatus } from '@/types/applications';

export const APPLICATION_STATUS: Record<
  ApplicationStatus,
  { color: BadgeColor; farmerHint: string }
> = {
  draft: { color: 'blue', farmerHint: 'Finish it and submit when ready. Only you can see it.' },
  submitted: { color: 'gold', farmerHint: 'AgriCtec will check it before sending it to the lender.' },
  in_review: { color: 'gold', farmerHint: 'AgriCtec is checking it against your records.' },
  changes_requested: { color: 'gold', farmerHint: 'AgriCtec asked for changes. Update it and submit again.' },
  approved_for_sending: { color: 'gold', farmerHint: 'Checked by AgriCtec. It is being sent to the lender.' },
  sent_to_lender: { color: 'purple', farmerHint: 'Sent to the lender for further review.' },
  received_by_lender: { color: 'purple', farmerHint: 'The lender confirmed it received your application.' },
  under_lender_review: { color: 'purple', farmerHint: 'The lender is reviewing it.' },
  documents_requested: { color: 'gold', farmerHint: 'The lender asked for more documents. See the note.' },
  approved_by_lender: { color: 'green', farmerHint: 'Approved by the lender (confirmed by the lender).' },
  rejected_by_lender: { color: 'red', farmerHint: 'Not approved by the lender this time.' },
  withdrawn: { color: 'blue', farmerHint: 'You withdrew this application.' },
};

/** Statuses that come from the lender: shown only with its confirmation. */
export const LENDER_STATUSES: ApplicationStatus[] = [
  'received_by_lender',
  'under_lender_review',
  'documents_requested',
  'approved_by_lender',
  'rejected_by_lender',
];

/** Saves a downloaded file (a Blob from the API) under `filename`. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
