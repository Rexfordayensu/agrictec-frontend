'use client';

import { useId, useState } from 'react';
import { format } from 'date-fns';
import {
  ArchiveRestore,
  DatabaseBackup,
  Download,
  FileUp,
  LockKeyhole,
  ShieldAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard, TypeToConfirm } from '@/components/admin/settings/settings-card';
import { PRIMARY_CLASS, REJECT_CLASS } from '@/components/admin/shared/action-styles';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { downloadFile } from '@/lib/export/csv';
import {
  IMPORT_CONFIRMATION,
  PASSPHRASE_MIN_LENGTH,
  backupService,
  isEncryptedBackup,
  type BackupSummary,
} from '@/services/admin/backup.service';

const backupName = () => `AgriCtec_Backup_${format(new Date(), 'yyyy-MM-dd')}.agrictec.json`;

/** Downloads a full backup encrypted with `passphrase` (audited). Also used before a restore. */
async function downloadBackup(passphrase: string): Promise<void> {
  const json = await backupService.exportAll(passphrase);
  downloadFile(json, backupName(), 'application/json');
}

function PassphraseField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-text-dim mb-1.5 block text-sm">{label}</span>
      <PasswordInput
        id={id}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * Backup & restore. A backup holds every farmer's personal data, so it is encrypted on the server
 * with a passphrase the admin chooses (never stored: without it the file can't be opened). A
 * restore opens the file with its passphrase, is checked and summarised by the API, needs RESTORE
 * and the admin's password, and first downloads a backup of the current state (encrypted with
 * the same passphrase).
 */
export function BackupRestoreCard({ onRestored }: { onRestored: () => void }) {
  const fileId = useId();
  const [busy, setBusy] = useState<'backup' | 'open' | 'restore' | null>(null);

  // Download
  const [exporting, setExporting] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const passphraseError =
    newPassphrase.length > 0 && newPassphrase.length < PASSPHRASE_MIN_LENGTH
      ? `At least ${PASSPHRASE_MIN_LENGTH} characters.`
      : confirmPassphrase && confirmPassphrase !== newPassphrase
        ? 'The passphrases don’t match.'
        : null;
  const canExport =
    newPassphrase.length >= PASSPHRASE_MIN_LENGTH && confirmPassphrase === newPassphrase;

  // Restore
  const [picked, setPicked] = useState<{
    name: string;
    json: string;
    encrypted: boolean;
    summary: BackupSummary | null;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');

  function closeExport() {
    setExporting(false);
    setNewPassphrase('');
    setConfirmPassphrase('');
  }

  async function backup() {
    if (!canExport) return;
    setBusy('backup');
    try {
      await downloadBackup(newPassphrase);
      toast.success('Encrypted backup downloaded', {
        description: `${backupName()}. Keep the passphrase safe: it can’t be recovered.`,
      });
      closeExport();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not create the backup');
    } finally {
      setBusy(null);
    }
  }

  async function pick(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    if (file.size > 40 * 1024 * 1024) return setFileError('This file is too large to be a backup.');
    try {
      const json = await file.text();
      setPicked({ name: file.name, json, encrypted: isEncryptedBackup(json), summary: null });
      setPassphrase('');
      setTyped('');
      setPassword('');
    } catch (cause) {
      setFileError(cause instanceof Error ? cause.message : 'Could not read this file.');
    }
  }

  /** Opens the file with its passphrase; the API checks it and says what it holds. */
  async function open() {
    if (!picked) return;
    setBusy('open');
    try {
      const summary = await backupService.summarize(picked.json, passphrase);
      setPicked({ ...picked, summary });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not open this backup');
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!picked) return;
    setBusy('restore');
    try {
      // Safety net first: the current state goes to a file (same passphrase) before anything
      // is replaced.
      await downloadBackup(passphrase);
      const { keys } = await backupService.importAll(picked.json, typed, password, passphrase);
      toast.success('Backup restored', {
        description: `${keys} items replaced. A backup of the previous state was downloaded first, with the same passphrase.`,
      });
      setPicked(null);
      setPassword('');
      setPassphrase('');
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
  // The safety backup needs a passphrase too, so even an old unencrypted file asks for one.
  const passphraseReady = picked?.encrypted
    ? passphrase.length > 0
    : passphrase.length >= PASSPHRASE_MIN_LENGTH;

  return (
    <SettingsCard
      id="backup"
      icon={DatabaseBackup}
      title="Backup & restore"
      description="Every platform setting and all farmer data in one encrypted file. Passwords, admin sign-ins, the team and the audit log are never included or replaced: farmers keep their current passwords."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-border flex flex-col rounded-2xl border p-4">
          <p className="text-text text-sm font-semibold">Download a full backup</p>
          <p className="text-text-mute mt-1 flex-1 text-xs leading-relaxed">
            Encrypted with a passphrase you choose. Without the passphrase nobody can open it, not
            even AgriCtec, so store the passphrase separately from the file.
          </p>
          <Button
            icon={Download}
            disabled={busy !== null}
            onClick={() => setExporting(true)}
            className={`${PRIMARY_CLASS} mt-4 self-start`}
          >
            Download backup
          </Button>
        </div>

        <div className="border-border flex flex-col rounded-2xl border border-dashed p-4">
          <p className="text-text text-sm font-semibold">Restore from a backup</p>
          <p className="text-text-mute mt-1 flex-1 text-xs leading-relaxed">
            The file is opened with its passphrase and checked before anything changes, and you see
            what it contains first.
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

      {exporting && (
        <Modal
          open
          onClose={() => busy === null && closeExport()}
          title="Encrypt this backup"
          description="Choose a passphrase for the file. You’ll need it to restore this backup."
          footer={
            <>
              <Button variant="ghost" icon={X} disabled={busy !== null} onClick={closeExport}>
                Cancel
              </Button>
              <Button
                icon={Download}
                loading={busy === 'backup'}
                disabled={!canExport || busy !== null}
                onClick={() => void backup()}
                className={PRIMARY_CLASS}
              >
                Download encrypted backup
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <PassphraseField
              id={`${fileId}-new-passphrase`}
              label={`Passphrase (${PASSPHRASE_MIN_LENGTH}+ characters)`}
              value={newPassphrase}
              onChange={setNewPassphrase}
            />
            <PassphraseField
              id={`${fileId}-confirm-passphrase`}
              label="Type the passphrase again"
              value={confirmPassphrase}
              onChange={setConfirmPassphrase}
            />
            {passphraseError && (
              <p role="alert" className="text-ink-red text-xs font-semibold">
                {passphraseError}
              </p>
            )}
            <p className="border-gold/40 bg-gold/10 text-ink-gold flex items-start gap-2.5 rounded-xl border p-3.5 text-sm">
              <LockKeyhole size={17} aria-hidden="true" className="mt-px shrink-0" />
              The passphrase is never stored. If it is lost, this backup can’t be opened.
            </p>
          </div>
        </Modal>
      )}

      {picked && !s && (
        <Modal
          open
          onClose={() => busy === null && setPicked(null)}
          title="Open this backup"
          description={picked.name}
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
                icon={LockKeyhole}
                loading={busy === 'open'}
                disabled={!passphraseReady || busy !== null}
                onClick={() => void open()}
                className={PRIMARY_CLASS}
              >
                Open backup
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {picked.encrypted ? (
              <PassphraseField
                id={`${fileId}-passphrase`}
                label="The passphrase this backup was encrypted with"
                value={passphrase}
                onChange={setPassphrase}
                autoComplete="off"
              />
            ) : (
              <>
                <p className="border-gold/40 bg-gold/10 text-ink-gold flex items-start gap-2.5 rounded-xl border p-3.5 text-sm">
                  <ShieldAlert size={17} aria-hidden="true" className="mt-px shrink-0" />
                  This file was made before backups were encrypted: anyone who has it can read
                  farmers’ data. Delete every copy once it is restored.
                </p>
                <PassphraseField
                  id={`${fileId}-passphrase`}
                  label={`A passphrase for the safety backup made first (${PASSPHRASE_MIN_LENGTH}+ characters)`}
                  value={passphrase}
                  onChange={setPassphrase}
                />
              </>
            )}
          </div>
        </Modal>
      )}

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
                disabled={typed !== IMPORT_CONFIRMATION || !password || busy !== null}
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
                  <dt className="text-text-mute text-xs">{label}</dt>
                  <dd className="text-text font-display text-lg font-bold tabular-nums">
                    {value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="border-gold/40 bg-gold/10 text-ink-gold flex items-start gap-2.5 rounded-xl border p-3.5 text-sm">
              <ShieldAlert size={17} aria-hidden="true" className="mt-px shrink-0" />
              Everything now in the app (settings, content and farmer data) is replaced. A backup of
              the current state downloads first, encrypted with the same passphrase, so you can undo
              this.
            </p>
            <TypeToConfirm
              id={`${fileId}-confirm`}
              word={IMPORT_CONFIRMATION}
              value={typed}
              onChange={setTyped}
            />
            <PassphraseField
              id={`${fileId}-password`}
              label="Your password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </div>
        </Modal>
      )}
    </SettingsCard>
  );
}
