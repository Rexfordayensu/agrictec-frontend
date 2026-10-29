// Platform backup, restore and the danger zone through the API (data.manage; all audited).
// A backup holds every table except sign-ins, the team and the audit trail, and never a
// password hash. A restore is all or nothing, in one database transaction.

import { api } from '@/services/api';

/** Typed by the admin before a restore replaces everything. */
export const IMPORT_CONFIRMATION = 'RESTORE';
export const RESET_CONFIRMATION = 'RESET';
export const DELETE_FARMERS_CONFIRMATION = 'DELETE ALL FARMERS';

/** What a backup holds, shown before restoring ("60 farmers, 25 applications…"). */
export interface BackupSummary {
  exportedAt: string;
  tables: number;
  farmers: number;
  records: number;
  momo: number;
  applications: number;
  verifications: number;
  riskFlags: number;
  lenders: number;
  announcements: number;
}

function parseFile(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
}

export const backupService = {
  /** The whole platform as one JSON file (logged). */
  async exportAll(): Promise<string> {
    return JSON.stringify(await api('/admin/system/backup', { method: 'POST' }));
  },

  /** Checks a backup file on the server and says what it holds. Changes nothing. */
  async summarize(json: string): Promise<BackupSummary> {
    return api<BackupSummary>('/admin/system/backup/summary', { method: 'POST', body: parseFile(json) });
  },

  /**
   * Replaces all platform and farmer data with the backup ("RESTORE" typed by the admin).
   * Sign-ins, the team and the audit trail are never replaced; accounts keep their passwords.
   */
  async importAll(json: string, confirmation: string): Promise<{ keys: number }> {
    const { rows } = await api<{ rows: number }>('/admin/system/restore', {
      method: 'POST',
      body: { backup: parseFile(json), confirmation },
    });
    return { keys: rows };
  },

  /** Every farmer account and all farmer data. Needs "DELETE ALL FARMERS" and your password. */
  async deleteAllFarmers(confirmation: string, password: string): Promise<{ farmers: number }> {
    return api<{ farmers: number }>('/admin/system/delete-farmers', {
      method: 'POST',
      body: { confirmation, password },
    });
  },

  /** Rebuilds the seeded demo world. Real accounts, the team and the audit trail are kept. */
  async resetDemo(confirmation: string): Promise<{ farmers: number }> {
    return api<{ farmers: number }>('/admin/system/reset-demo', {
      method: 'POST',
      body: { confirmation },
    });
  },

  /** When the demo world was seeded (null if never). */
  async seededAt(): Promise<string | null> {
    return (await api<{ seededAt: string | null }>('/admin/system/status')).seededAt;
  },
};
