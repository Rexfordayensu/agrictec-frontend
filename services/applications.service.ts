// The farmer's loan applications (/me/applications). Amounts are sent as exact text.

import { api, apiBlob } from '@/services/api';
import type {
  ApplicationSummary,
  ConsentNotice,
  LoanApplicationDetail,
} from '@/types/applications';

const base = '/me/applications';
const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

export interface ApplicationChanges {
  amount?: string;
  months?: number;
  purpose?: string;
  letter?: string;
  answers?: Record<string, string | null>;
}

export const applicationsService = {
  async list(): Promise<ApplicationSummary[]> {
    return api<ApplicationSummary[]>(base);
  },

  async get(id: string): Promise<LoanApplicationDetail> {
    return api<LoanApplicationDetail>(one(id));
  },

  async start(input: {
    productId: string;
    amount: string;
    months: number;
    purpose: string;
  }): Promise<LoanApplicationDetail> {
    return api<LoanApplicationDetail>(base, { method: 'POST', body: input });
  },

  async update(id: string, changes: ApplicationChanges): Promise<LoanApplicationDetail> {
    return api<LoanApplicationDetail>(one(id), { method: 'PATCH', body: changes });
  },

  async upload(id: string, requirementKey: string, file: File): Promise<LoanApplicationDetail> {
    const form = new FormData();
    form.append('requirementKey', requirementKey);
    form.append('file', file);
    return api<LoanApplicationDetail>(`${one(id)}/documents`, { method: 'POST', body: form });
  },

  async removeDocument(id: string, documentId: string): Promise<LoanApplicationDetail> {
    return api<LoanApplicationDetail>(`${one(id)}/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
    });
  },

  async document(id: string, documentId: string): Promise<Blob> {
    return apiBlob(`${one(id)}/documents/${encodeURIComponent(documentId)}/file`);
  },

  async pack(id: string): Promise<Blob> {
    return apiBlob(`${one(id)}/pack`);
  },

  async notice(): Promise<ConsentNotice> {
    return api<ConsentNotice>(`${base}/consent-notice`);
  },

  async submit(id: string, noticeVersion: string): Promise<LoanApplicationDetail> {
    return api<LoanApplicationDetail>(`${one(id)}/submit`, {
      method: 'POST',
      body: { consent: true, noticeVersion },
    });
  },

  async withdraw(id: string, note?: string): Promise<LoanApplicationDetail> {
    return api<LoanApplicationDetail>(`${one(id)}/withdraw`, {
      method: 'POST',
      body: { note: note ?? null },
    });
  },
};
