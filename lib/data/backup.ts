import { backupSchema, type DataBackup } from '@/lib/data/backup-schema';
import { assertWritable } from '@/lib/read-only';
import { api } from '@/services/api';
import { loadAllStores, resetAllStores } from '@/store';
import { useAuthStore } from '@/store/auth-store';
import { waitForProfileSaves } from '@/store/profile-store';
import { waitForSettingsSaves } from '@/store/settings-store';

function currentUser(): string {
  const id = useAuthStore.getState().session?.userId;
  if (!id) throw new Error('Sign in before managing your data.');
  return id;
}

/**
 * The backup file is the server's own export (GET /me/export): it carries the server's signature,
 * so only this unchanged file can be restored into this account.
 */
export async function createDataBackup(): Promise<unknown> {
  currentUser();
  const exported = await api<unknown>('/me/export');
  backupSchema.parse(exported); // The file must be one we can restore.
  return exported;
}

/**
 * Restores a backup. The records and MoMo entries are sent exactly as they are in the file (the
 * signature covers them); `checked` is the same file, validated.
 */
export async function importDataBackup(
  checked: DataBackup,
  file: Record<string, unknown>,
): Promise<void> {
  assertWritable();
  const data = backupSchema.parse(checked); // Validate again immediately before sending.
  const userId = currentUser();
  await Promise.all([waitForProfileSaves(), waitForSettingsSaves()]);
  if (currentUser() !== userId) throw new Error('Your session changed. Please try again.');
  // All or nothing on the server. The Ghana Card, verifications, the admin's notes and loan
  // applications are never taken from a file.
  await api('/me/import', {
    method: 'POST',
    body: {
      version: data.version,
      profile: data.profile,
      records: file.records,
      momo: file.momo,
      diagnoses: data.diagnoses,
      chat: data.chat,
      settings: data.settings,
      signature: data.signature,
    },
  });
  resetAllStores();
  await loadAllStores(userId);
}

export async function deleteUserData(confirmation: string): Promise<void> {
  assertWritable();
  if (confirmation !== 'DELETE') throw new Error('Type DELETE to confirm.');
  const userId = currentUser();
  await Promise.all([waitForProfileSaves(), waitForSettingsSaves()]);
  if (currentUser() !== userId) throw new Error('Your session changed. Please try again.');
  await api('/me/delete-data', { method: 'POST', body: { confirmation } });
  resetAllStores();
  await loadAllStores(userId);
}
