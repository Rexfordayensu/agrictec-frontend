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

/** The shortest backup passphrase the API accepts (app/core/backup_crypto.py). */
export const PASSPHRASE_MIN_LENGTH = 12;

function parseFile(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
}

/** True for a file encrypted with a passphrase (every backup made since encryption). */
export function isEncryptedBackup(json: string): boolean {
  try {
    const file = JSON.parse(json) as { app?: unknown; kind?: unknown };
    return file.app === 'agrictec' && file.kind === 'platform-backup-encrypted';
  } catch {
    return false;
  }
}

export const backupService = {
  /**
   * The whole platform as one file, encrypted on the server with `passphrase` (AES-256-GCM; the
   * passphrase is never stored). Logged.
   */
  async exportAll(passphrase: string): Promise<string> {
    return JSON.stringify(
      await api('/admin/system/backup', { method: 'POST', body: { passphrase } }),
    );
  },

  /** Opens a backup file with its passphrase on the server and says what it holds. */
  async summarize(json: string, passphrase: string): Promise<BackupSummary> {
    return api<BackupSummary>('/admin/system/backup/summary', {
      method: 'POST',
      body: { backup: parseFile(json), passphrase },
    });
  },

  /**
   * Replaces all platform and farmer data with the backup ("RESTORE" and the admin's password).
   * Sign-ins, the team and the audit trail are never replaced; accounts keep their passwords.
   */
  async importAll(
    json: string,
    confirmation: string,
    password: string,
    passphrase: string,
  ): Promise<{ keys: number }> {
    const { rows } = await api<{ rows: number }>('/admin/system/restore', {
      method: 'POST',
      body: { backup: parseFile(json), confirmation, password, passphrase },
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

  /**
   * Rebuilds the seeded demo world ("RESET" and the admin's password). Real accounts, the team
   * and the audit trail are kept. Refused on the live platform.
   */
  async resetDemo(confirmation: string, password: string): Promise<{ farmers: number }> {
    return api<{ farmers: number }>('/admin/system/reset-demo', {
      method: 'POST',
      body: { confirmation, password },
    });
  },

  /**
   * When the demo world was seeded (null if never), and whether it exists at all: only in local
   * development. On the live platform `demoData` is false and the console shows nothing of it.
   */
  async systemStatus(): Promise<{ seededAt: string | null; demoData: boolean }> {
    const status = await api<{ seededAt: string | null; demoData?: boolean }>(
      '/admin/system/status',
    );
    return { seededAt: status.seededAt, demoData: status.demoData === true };
  },
};
