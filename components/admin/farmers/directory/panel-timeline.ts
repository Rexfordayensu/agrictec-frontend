// The farmer panel's activity, built only from what is stored: the account's creation date, the
// farmer's verification requests (submitted, reviewed) and the audit log's entries about them.
// Nothing is invented; logins are not recorded, so none are shown.

import { KIND_LABEL } from '@/lib/admin/verification-queue';
import type { AuditEntry, FarmerAccount, VerificationRequest } from '@/types/admin';

export interface TimelineItem {
  id: string;
  title: string;
  detail: string;
  at: string;
  /** Purple for admin actions, green for an approval, red for suspensions and rejections. */
  tone: 'purple' | 'green' | 'red' | 'grey';
}

const AUDIT_TITLES: Record<string, { title: string; tone?: TimelineItem['tone'] }> = {
  'farmer.suspend': { title: 'Account suspended', tone: 'red' },
  'farmer.reactivate': { title: 'Account reactivated', tone: 'green' },
  'farmer.note': { title: 'Note added' },
  'farmer.tags': { title: 'Tags changed' },
  'farmer.reset_password': { title: 'Password reset' },
  'farmer.impersonate': { title: 'Viewed as the farmer' },
  'farmer.impersonate_end': { title: 'Stopped viewing as the farmer' },
  'farmer.financial_summary': { title: 'Financial summary viewed' },
  'farmer.report_download': { title: 'Report downloaded' },
  'farmer.export': { title: 'Exported' },
  'application.view': { title: 'Loan application viewed' },
  'application.document': { title: 'Application document opened' },
  'identity.review_closed': { title: 'Identity check closed' },
};

/** "risk.confirm" → "Risk confirm" for anything without a friendlier name. */
const humanize = (action: string) => {
  const text = action.replace(/[._]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function buildTimeline(
  farmer: FarmerAccount,
  requests: VerificationRequest[] | null,
  audit: AuditEntry[] | null,
): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: 'created',
      title: 'Account created',
      detail: 'Farmer account registered',
      at: farmer.createdAt,
      tone: 'grey',
    },
  ];
  for (const r of requests ?? []) {
    const name = KIND_LABEL[r.kind];
    items.push({
      id: `submitted-${r.id}`,
      title: `${name} submitted`,
      detail:
        r.kind === 'ghanaCard'
          ? 'Sent for review by AgriCtec staff'
          : `${name} check sent for review`,
      at: r.submittedAt,
      tone: 'grey',
    });
    if (r.status !== 'pending' && r.reviewedAt) {
      items.push({
        id: `reviewed-${r.id}`,
        title: `${name} ${r.status === 'approved' ? 'approved' : 'rejected'}`,
        detail: [r.reviewedBy && `Reviewed by ${r.reviewedBy}`, r.status === 'rejected' && r.reason]
          .filter(Boolean)
          .join(' · '),
        at: r.reviewedAt,
        tone: r.status === 'approved' ? 'green' : 'red',
      });
    }
  }
  for (const entry of audit ?? []) {
    // Verification reviews already come from the requests above.
    if (entry.action.startsWith('verification.')) continue;
    const known = AUDIT_TITLES[entry.action];
    items.push({
      id: entry.id,
      title: known?.title ?? humanize(entry.action),
      detail: `${entry.summary} · by ${entry.actorName}`,
      at: entry.createdAt,
      tone: known?.tone ?? 'purple',
    });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
