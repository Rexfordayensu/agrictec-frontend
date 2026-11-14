import { adminPath } from '@/lib/admin-path';
// The audit log's action groups (phase A14), for its filter and its labels. Pure.

import type { AuditEntry } from '@/types/admin';

export type AuditGroup = 'farmer' | 'loan' | 'config' | 'content' | 'team' | 'system' | 'auth';

const AUTH_ACTIONS = ['admin.login', 'admin.logout', 'admin.password_change'];

export const AUDIT_GROUPS: { id: AuditGroup; label: string; description: string }[] = [
  { id: 'farmer', label: 'Farmers', description: 'Profiles, suspensions, verifications, risk' },
  { id: 'loan', label: 'Loans', description: 'Application status, lenders, exports' },
  { id: 'config', label: 'Credit rules', description: 'Publishing and restoring rules' },
  { id: 'content', label: 'Content', description: 'Market, crops, assistant, announcements' },
  { id: 'team', label: 'Team', description: 'Invites, roles, access, password resets' },
  { id: 'system', label: 'System', description: 'Settings, backups, reports, audit exports' },
  { id: 'auth', label: 'Sign-ins', description: 'Sign-in, sign-out, password changes' },
];

/** Which group an action belongs to (e.g. "verification.approve" → farmer). */
export function auditGroupOf(action: string): AuditGroup {
  if (AUTH_ACTIONS.includes(action)) return 'auth';
  const prefix = action.split('.')[0];
  switch (prefix) {
    case 'farmer':
    case 'verification':
    case 'risk':
      return 'farmer';
    case 'loan':
    case 'lender':
      return 'loan';
    case 'credit':
      return 'config';
    case 'content':
    case 'announcement':
      return 'content';
    case 'admin':
      return 'team';
    default:
      return 'system';
  }
}

/** "farmer.reset_password" → "Farmer reset password". */
export const actionLabel = (action: string) => {
  const text = action.replace(/[._]/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The page a target links to in the console, when there is one. */
export function targetHref(entry: Pick<AuditEntry, 'targetType' | 'targetId'>): string | null {
  if (!entry.targetId) return null;
  switch (entry.targetType) {
    case 'farmer':
      return adminPath(`/admin/farmers/${entry.targetId}`);
    case 'loan':
      return adminPath(`/admin/loans?open=${encodeURIComponent(entry.targetId)}`);
    case 'lender':
    case 'loan_product':
      return adminPath('/admin/lenders');
    case 'transaction':
    case 'evidence':
      return adminPath('/admin/transactions');
    case 'settings':
      return adminPath('/admin/settings');
    case 'config':
      return adminPath('/admin/credit-rules');
    case 'announcement':
      return adminPath('/admin/announcements');
    case 'risk':
      return adminPath('/admin/risk');
    case 'admin':
      return adminPath('/admin/team');
    default:
      return null;
  }
}

export const TARGET_TYPES: AuditEntry['targetType'][] = [
  'farmer',
  'transaction',
  'evidence',
  'loan',
  'lender',
  'loan_product',
  'config',
  'settings',
  'content',
  'announcement',
  'risk',
  'admin',
  'system',
];
