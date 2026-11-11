// A lender's loan products in the console (the loan-product routes of app/routers/admin_lending.py).
// Drafts save as typed; publishing freezes a numbered, read-only version that farmers see.

import { api } from '@/services/api';
import type { AdminProduct, ProductContent, ProductVersion } from '@/types/products';

const product = (id: string) => `/admin/loan-products/${encodeURIComponent(id)}`;

export const loanProductsService = {
  async listForLender(lenderId: string): Promise<AdminProduct[]> {
    return api<AdminProduct[]>(`/admin/lenders/${encodeURIComponent(lenderId)}/products`);
  },

  /** An empty draft: nothing is filled in. */
  async create(lenderId: string, name: string): Promise<AdminProduct> {
    return api<AdminProduct>(`/admin/lenders/${encodeURIComponent(lenderId)}/products`, {
      method: 'POST',
      body: { name },
    });
  },

  async get(id: string): Promise<AdminProduct> {
    return api<AdminProduct>(product(id));
  },

  async saveDraft(id: string, content: ProductContent): Promise<AdminProduct> {
    return api<AdminProduct>(`${product(id)}/draft`, { method: 'PUT', body: content });
  },

  async resetDraft(id: string): Promise<AdminProduct> {
    return api<AdminProduct>(`${product(id)}/draft/reset`, { method: 'POST' });
  },

  async publish(id: string, note: string): Promise<AdminProduct> {
    return api<AdminProduct>(`${product(id)}/publish`, { method: 'POST', body: { note } });
  },

  async unpublish(id: string): Promise<AdminProduct> {
    return api<AdminProduct>(`${product(id)}/unpublish`, { method: 'POST' });
  },

  /** Only a product that was never published. */
  async remove(id: string): Promise<void> {
    await api(product(id), { method: 'DELETE' });
  },

  async versions(id: string): Promise<ProductVersion[]> {
    return api<ProductVersion[]>(`${product(id)}/versions`);
  },
};
