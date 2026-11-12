// The console's review of farmers' loan applications (/admin/applications). There is no call
// that approves a loan: "approve" means AgriCtec's review passed and it may be sent; lender
// progress is recorded only with the lender's own confirmation attached.

import { api, apiBlob } from '@/services/api';
import type {
  AdminActionResult,
  AdminApplicationDetail,
  ApplicationSummary,
  LenderConfirmedStatus,
} from '@/types/applications';

const base = '/admin/applications';
const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

export type ApplicationGroup = 'to_review' | 'ready_to_send' | 'with_lender' | 'returned' | 'closed';

export const adminApplicationsService = {
  async list(group?: ApplicationGroup): Promise<ApplicationSummary[]> {
    return api<ApplicationSummary[]>(base, { query: group ? { group } : undefined });
  },

  async counts(): Promise<{ total: number; drafts: number; needsAttention: number; withLender: number }> {
    return api(`${base}/counts`);
  },

  async get(id: string): Promise<AdminApplicationDetail> {
    return api<AdminApplicationDetail>(one(id));
  },

  async document(id: string, documentId: string): Promise<Blob> {
    return apiBlob(`${one(id)}/documents/${encodeURIComponent(documentId)}/file`);
  },

  async pack(id: string): Promise<Blob> {
    return apiBlob(`${one(id)}/pack`);
  },

  async statement(id: string): Promise<Blob> {
    return apiBlob(`${one(id)}/statement`);
  },

  async proof(id: string, eventId: number): Promise<Blob> {
    return apiBlob(`${one(id)}/events/${eventId}/proof`);
  },

  async startReview(id: string): Promise<AdminActionResult> {
    return api<AdminActionResult>(`${one(id)}/review`, { method: 'POST' });
  },

  async requestChanges(id: string, note: string): Promise<AdminActionResult> {
    return api<AdminActionResult>(`${one(id)}/request-changes`, { method: 'POST', body: { note } });
  },

  async approve(id: string, note?: string): Promise<AdminActionResult> {
    return api<AdminActionResult>(`${one(id)}/approve`, { method: 'POST', body: { note: note ?? null } });
  },

  async send(id: string): Promise<AdminActionResult> {
    return api<AdminActionResult>(`${one(id)}/send`, { method: 'POST' });
  },

  async recordSent(id: string, how: string): Promise<AdminActionResult> {
    return api<AdminActionResult>(`${one(id)}/record-sent`, { method: 'POST', body: { how } });
  },

  async lenderStatus(
    id: string,
    status: LenderConfirmedStatus,
    note: string,
    proof: File,
  ): Promise<AdminActionResult> {
    const form = new FormData();
    form.append('status', status);
    form.append('note', note);
    form.append('proof', proof);
    return api<AdminActionResult>(`${one(id)}/lender-status`, { method: 'POST', body: form });
  },
};
