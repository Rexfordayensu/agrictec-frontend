'use client';

import { useId, useState } from 'react';
import { format } from 'date-fns';
import { ArchiveRestore, DatabaseBackup, Download, FileUp, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard, TypeToConfirm } from '@/components/admin/settings/settings-card';
import { PRIMARY_CLASS, REJECT_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { downloadFile } from '@/lib/export/csv';
import {
  IMPORT_CONFIRMATION,
  backupService,
  type BackupSummary,
} from '@/services/admin/backup.service';

const backupName = () => `AgriCtec_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;

/** Downloads a full backup (audited). Used on its own and automatically before a restore. */
async function downloadBackup(): Promise<void> {
  const json = await backupService.exportAll();
  downloadFile(json, backupName(), 'application/json');
}

/**
 * Backup & restore: download the platform and farmer data as one JSON file, or restore one. A
 * restore is checked by the API first, summarised, needs RESTORE typed, and downloads a backup of
 * the current state before replacing anything.
 */
export function BackupRestoreCard({ onRestored }: { onRestored: () => void }) {
  const fileId = useId();
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [picked, setPicked] = useState<{
    name: string;
    json: string;
    summary: BackupSummary;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  async function backup() {
    setBusy('backup');
    try {
      await downloadBackup();
      toast.success('Backup downloaded', { description: backupName() });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not create the backup');
    } finally {
      setBusy(null);
    }
  }

  async function pick(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setFileError('This file is too large to be a backup.');
    try {
      const json = await file.text();
      // Checked by the API (format, tables, settings) before anything can change.
      setPicked({ name: file.name, json, summary: await backupService.summarize(json) });
      setTyped('');
    } catch (cause) {
      setFileError(cause instanceof Error ? cause.message : 'Could not read this file.');
    }
  }

  async function restore() {
    if (!picked) return;
    setBusy('restore');
    try {
      // Safety net first: the current state goes to a file before anything is replaced.
      await downloadBackup();
      const { keys } = await backupService.importAll(picked.json, typed);
      toast.success('Backup restored', {
        description: `${keys} items replaced. A backup of the previous state was downloaded first.`,
      });
      setPicked(null);
      onRestored();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not restore the backup');
    } finally {
      setBusy(null);
    }
  }

  const s = picked?.summary;
  const counts: [string, number][] = s
    ? [
        ['Farmers', s.farmers],
        ['Farm records', s.records],
        ['MoMo transactions', s.momo],
        ['Loan applications', s.applications],
        ['Verifications', s.verifications],
        ['Risk flags', s.riskFlags],
        ['Lenders', s.lenders],
        ['Announcements', s.announcements],
      ]
    : [];

  return (
    <SettingsCard
      id="backup"
      icon={DatabaseBackup}
      title="Backup & restore"
      description="Every platform setting and all farmer data in one JSON file. Passwords, admin sign-ins, the team and the audit log are never included or replaced: farmers keep their current passwords."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-border flex flex-col rounded-2xl border p-4">
          <p className="text-text text-sm font-semibold">Download a full backup</p>
          <p className="text-text-mute mt-1 flex-1 text-xs leading-relaxed">
            Saves {backupName()} to this device. Keep it somewhere safe: it contains farmers’
            personal data.
          </p>
          <Button
            icon={Download}
            loading={busy === 'backup'}
            disabled={busy !== null}
            onClick={() => void backup()}
            className={`${PRIMARY_CLASS} mt-4 self-start`}
          >
            Download backup
          </Button>
        </div>

        <div className="border-border flex flex-col rounded-2xl border border-dashed p-4">
          <p className="text-text text-sm font-semibold">Restore from a backup</p>
          <p className="text-text-mute mt-1 flex-1 text-xs leading-relaxed">
            The file is checked before anything changes, and you see what it contains first.
          </p>
          <label
            htmlFor={fileId}
            className="border-border hover:bg-glass-strong text-text mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-xl border px-4 text-sm font-semibold transition-colors focus-within:ring-2"
          >
            <FileUp size={16} aria-hidden="true" />
            Choose backup file
            <input
              id={fileId}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {fileError && (
            <p role="alert" className="text-ink-red mt-2 text-xs font-semibold">
              {fileError}
            </p>
          )}
        </div>
      </div>

      {picked && s && (
        <Modal
          open
          onClose={() => busy === null && setPicked(null)}
          size="lg"
          title="Restore this backup?"
          description={`${picked.name} · made ${format(new Date(s.exportedAt), "d MMM yyyy 'at' HH:mm")}`}
          footer={
            <>
              <Button
                variant="ghost"
                icon={X}
                disabled={busy !== null}
                onClick={() => setPicked(null)}
              >
                Cancel
              </Button>
              <Button
                icon={ArchiveRestore}
                loading={busy === 'restore'}
                disabled={typed !== IMPORT_CONFIRMATION || busy !== null}
                onClick={() => void restore()}
                className={REJECT_CLASS}
              >
                Restore backup
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <p className="text-text text-sm">
              This file holds{' '}
              <span className="font-semibold">
                {s.farmers} farmers, {s.applications} applications, {s.records} records
              </span>{' '}
              across {s.tables} tables.
            </p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {counts.map(([label, value]) => (
                <div key={label} className="border-border bg-glass rounded-xl border px-3 py-2.5">
                  <dt className="text-text-mute text-[11px]">{label}</dt>
                  <dd className="text-text font-display text-lg font-bold tabular-nums">
                    {value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="border-gold/40 bg-gold/10 text-ink-gold flex items-start gap-2.5 rounded-xl border p-3.5 text-sm">
              <ShieldAlert size={17} aria-hidden="true" className="mt-px shrink-0" />
              Everything now in the app (settings, content and farmer data) is replaced. A backup of
              the current state downloads first, so you can undo this.
            </p>
            <TypeToConfirm
              id={`${fileId}-confirm`}
              word={IMPORT_CONFIRMATION}
              value={typed}
              onChange={setTyped}
            />
          </div>
        </Modal>
      )}
    </SettingsCard>
  );
}
