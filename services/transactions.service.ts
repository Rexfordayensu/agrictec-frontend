import { api, apiBlob, apiUpload } from '@/services/api';
import type {
  Evidence,
  ReviewPage,
  TransactionItem,
  TransactionPage,
  TransactionSummary,
} from '@/types/transactions';

export const transactionsService = {
  get: (kind: string, id: string, signal?: AbortSignal) =>
    api<TransactionItem>(`/me/transactions/${kind}/${id}`, { signal }),
  list: (filters: Record<string, string | number | undefined> = {}, signal?: AbortSignal) =>
    api<TransactionPage>('/me/transactions', { query: filters, signal }),
  summary: (months: number, signal?: AbortSignal) =>
    api<TransactionSummary>('/me/transactions/summary', { query: { months }, signal }),
  upload: (
    kind: string,
    id: string,
    file: File,
    evidenceKind: Evidence['kind'],
    progress: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('evidence_kind', evidenceKind);
    return apiUpload<TransactionItem>(`/me/transactions/${kind}/${id}/evidence`, form, progress);
  },
  requestReview: (kind: string, id: string) =>
    api<TransactionItem>(`/me/transactions/${kind}/${id}/request-review`, { method: 'POST' }),
  dispute: (kind: string, id: string, reason: string) =>
    api<TransactionItem>(`/me/transactions/${kind}/${id}/dispute`, {
      method: 'POST',
      body: { reason },
    }),
  removeEvidence: (id: string) => api<void>(`/me/evidence/${id}`, { method: 'DELETE' }),
  file: (id: string, admin = false) =>
    apiBlob(`${admin ? '/admin/transactions' : '/me'}/evidence/${id}/file`),
  queue: (page: number, signal?: AbortSignal) =>
    api<ReviewPage>('/admin/transactions/review', { query: { page }, signal }),
  queueCount: () => api<{ count: number }>('/admin/transactions/review/count'),
  decide: (kind: string, id: string, action: 'verify' | 'reject', reason: string) =>
    api(`/admin/transactions/${kind}/${id}/${action}`, { method: 'POST', body: { reason } }),
};
