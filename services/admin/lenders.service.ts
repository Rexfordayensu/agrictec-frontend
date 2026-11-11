// The console's lender register (app/routers/admin_lending.py). A lender reaches farmers only
// after its licence check (with the official source), an authorised listing and publication;
// suspension hides it at once. Every step is in the audit log.

import { api } from '@/services/api';
import type { AdminLender, LenderInput, LenderVerificationInput } from '@/types/admin';

const lender = (id: string) => `/admin/lenders/${encodeURIComponent(id)}`;
const post = (id: string, step: string, body?: unknown) =>
  api<AdminLender>(`${lender(id)}/${step}`, { method: 'POST', body });

export const lendersService = {
  /** Every lender, listed or not, with why it isn't. */
  async list(): Promise<AdminLender[]> {
    return api<AdminLender[]>('/admin/lenders');
  },

  async get(id: string): Promise<AdminLender> {
    return api<AdminLender>(lender(id));
  },

  /** Starts as an unverified draft that farmers don't see. */
  async create(input: LenderInput): Promise<AdminLender> {
    return api<AdminLender>('/admin/lenders', { method: 'POST', body: input });
  },

  /** Changing who the institution is (name, type, licence, regulator) clears its verification. */
  async update(id: string, patch: Partial<LenderInput>): Promise<AdminLender> {
    return api<AdminLender>(lender(id), { method: 'PATCH', body: patch });
  },

  async verify(id: string, check: LenderVerificationInput): Promise<AdminLender> {
    return post(id, 'verification', check);
  },

  async setListing(id: string, authorised: boolean, note?: string): Promise<AdminLender> {
    return post(id, 'listing', { authorised, note });
  },

  async publish(id: string): Promise<AdminLender> {
    return post(id, 'publish');
  },

  async unpublish(id: string): Promise<AdminLender> {
    return post(id, 'unpublish');
  },

  async suspend(id: string, reason: string): Promise<AdminLender> {
    return post(id, 'suspend', { reason });
  },

  async reinstate(id: string): Promise<AdminLender> {
    return post(id, 'reinstate');
  },

  /** Only a lender with no applications at all: unpublish or suspend it instead. */
  async remove(id: string): Promise<void> {
    await api(lender(id), { method: 'DELETE' });
  },

  /** PNG, JPEG or WebP up to 2 MB; the server re-encodes it. Stored in PostgreSQL. */
  async uploadLogo(id: string, file: File): Promise<AdminLender> {
    const form = new FormData();
    form.append('file', file);
    return api<AdminLender>(`${lender(id)}/logo`, { method: 'PUT', body: form });
  },

  async removeLogo(id: string): Promise<AdminLender> {
    return api<AdminLender>(`${lender(id)}/logo`, { method: 'DELETE' });
  },
};
