// The admin team through the API (admins.manage). Nobody changes their own access, and the last
// active Super Admin can never be demoted or disabled: the API refuses both.

import { api } from '@/services/api';
import type { AdminRole, AdminUser } from '@/types/admin';

export interface InviteResult {
  admin: AdminUser;
  /** Shown once to the inviter; never stored or logged in plain text. */
  temporaryPassword: string;
}

const member = (id: string) => `/admin/team/${encodeURIComponent(id)}`;

export const teamService = {
  /** Highest role first, then by name. */
  async list(): Promise<AdminUser[]> {
    return api<AdminUser[]>('/admin/team');
  },

  /** The new admin gets a temporary password they must change at first sign-in. */
  async invite(name: string, email: string, role: AdminRole): Promise<InviteResult> {
    return api<InviteResult>('/admin/team', { method: 'POST', body: { name, email, role } });
  },

  async changeRole(id: string, role: AdminRole): Promise<AdminUser> {
    return api<AdminUser>(`${member(id)}/role`, { method: 'POST', body: { role } });
  },

  async disable(id: string): Promise<AdminUser> {
    return api<AdminUser>(`${member(id)}/disable`, { method: 'POST' });
  },

  async enable(id: string): Promise<AdminUser> {
    return api<AdminUser>(`${member(id)}/enable`, { method: 'POST' });
  },

  /** A new temporary password; the admin must change it at next sign-in. */
  async resetPassword(id: string): Promise<string> {
    const { temporaryPassword } = await api<{ temporaryPassword: string }>(
      `${member(id)}/reset-password`,
      { method: 'POST' },
    );
    return temporaryPassword;
  },
};
