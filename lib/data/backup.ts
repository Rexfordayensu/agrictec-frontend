import { backupSchema, type DataBackup } from '@/lib/data/backup-schema';
import { safeProfile } from '@/lib/profile';
import { defaultProfile } from '@/services/profile.service';
import { assertWritable } from '@/lib/read-only';
import { api } from '@/services/api';
import { loadAllStores, resetAllStores } from '@/store';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useFarmStore } from '@/store/farm-store';
import { useLoanStore } from '@/store/loan-store';
import { useProfileStore, waitForProfileSaves } from '@/store/profile-store';
import { useSettingsStore, waitForSettingsSaves } from '@/store/settings-store';

function currentUser(): string {
  const id = useAuthStore.getState().session?.userId;
  if (!id) throw new Error('Sign in before managing your data.');
  return id;
}

export function createDataBackup(): DataBackup {
  const userId = currentUser();
  const farm = useFarmStore.getState();
  const settings = useSettingsStore.getState();
  if (
    [
      farm.userId,
      settings.userId,
      useProfileStore.getState().userId,
      useChatStore.getState().userId,
    ].some((id) => id !== userId)
  )
    throw new Error('Your data is still loading. Please try again.');
  return backupSchema.parse({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: safeProfile(useProfileStore.getState().profile ?? defaultProfile(userId)),
    records: farm.records,
    momo: farm.momo,
    diagnoses: farm.diagnoses, // The schema strips imageThumb from the returned backup.
    chat: useChatStore.getState().messages,
    settings: { language: settings.language, notifications: settings.notifications },
    loanApplications:
      useLoanStore.getState().userId === userId ? useLoanStore.getState().applications : [],
  });
}

export async function importDataBackup(input: DataBackup): Promise<void> {
  assertWritable();
  const data = backupSchema.parse(input); // Validate again immediately before sending.
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
      records: data.records,
      momo: data.momo,
      diagnoses: data.diagnoses,
      chat: data.chat,
      settings: data.settings,
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
