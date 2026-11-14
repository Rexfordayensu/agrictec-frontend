'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { createDataBackup, deleteUserData, importDataBackup } from '@/lib/data/backup';
import { MAX_BACKUP_BYTES, parseDataBackup, type DataBackup } from '@/lib/data/backup-schema';
import { downloadFile } from '@/lib/export/csv';
import { formatDate, todayISO } from '@/lib/format';

export function DataSettings() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  // The validated backup, and the file as read (its records and MoMo go back unchanged).
  const [pending, setPending] = useState<{
    checked: DataBackup;
    file: Record<string, unknown>;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  async function exportData() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setExporting(true);
    try {
      downloadFile(
        JSON.stringify(await createDataBackup(), null, 2),
        `AgriCtec_Data_${todayISO()}.json`,
        'application/json',
      );
      toast.success('Data exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export your data');
    } finally {
      lock.current = false;
      setBusy(false);
      setExporting(false);
    }
  }
  async function readFile(file?: File) {
    if (!file || lock.current) return;
    if (!/\.json$/i.test(file.name)) return toast.error('Choose an AgriCtec .json export.');
    if (file.size > MAX_BACKUP_BYTES)
      return toast.error('This backup is too large. Maximum size is 20MB.');
    lock.current = true;
    setBusy(true);
    try {
      const text = await file.text();
      setPending({ checked: parseDataBackup(text), file: JSON.parse(text) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read this backup');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function restore() {
    if (!pending || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await importDataBackup(pending.checked, pending.file);
      setPending(null);
      toast.success('Data imported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import your data');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (confirmation !== 'DELETE' || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await deleteUserData(confirmation);
      setDeleteOpen(false);
      setConfirmation('');
      toast.success('Your data has been deleted');
      router.replace('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete your data');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Import AgriCtec data"
        disabled={busy}
        onChange={(event) => {
          void readFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <div className="account-transfer-grid">
        <Card className="account-transfer-card" aria-labelledby="account-export-title">
          <header className="account-card-heading">
            <IconTile icon={Download} size="lg" />
            <div>
              <h3 id="account-export-title">Export my data</h3>
              <p>
                Download a copy of your profile, farm records, MoMo transactions, crop diagnoses,
                chat, settings and loan applications.
              </p>
            </div>
          </header>
          <Button
            icon={Download}
            disabled={busy}
            loading={exporting}
            onClick={() => void exportData()}
            className="account-export-button"
          >
            Export my data
          </Button>
        </Card>
        <Card className="account-transfer-card" aria-labelledby="account-import-title">
          <header className="account-card-heading">
            <IconTile icon={Upload} size="lg" />
            <div>
              <h3 id="account-import-title">Import data</h3>
              <p>
                Restore an AgriCtec export file (e.g. your profile, farm records and settings). You
                can review the file before it is applied.
              </p>
            </div>
          </header>
          <Button
            variant="ghost"
            icon={Upload}
            mutates
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="account-import-button"
          >
            Import data
          </Button>
        </Card>
      </div>
      <Card className="account-danger-zone" aria-labelledby="account-danger-title">
        <header className="account-card-heading">
          <IconTile icon={ShieldAlert} tone="red" size="lg" />
          <div>
            <h3 id="account-danger-title">Danger Zone</h3>
            <p>Actions that permanently affect your saved information.</p>
          </div>
        </header>
        <div className="account-delete-row">
          <IconTile icon={Trash2} tone="red" size="lg" />
          <div>
            <h3>Delete all my data</h3>
            <p>
              Remove your farm data, transactions and preferences from your account.
              <br />
              Your account will remain active.
            </p>
          </div>
          <Button
            variant="danger"
            icon={Trash2}
            mutates
            disabled={busy}
            onClick={() => {
              setConfirmation('');
              setDeleteOpen(true);
            }}
          >
            Delete all my data
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={pending !== null}
        title="Replace your current data?"
        message={
          pending
            ? `Restore the backup from ${formatDate(pending.checked.exportedAt)} with ${pending.checked.records.length} farm records and ${pending.checked.momo.length} MoMo transactions? Your current profile, records, MoMo and settings will be replaced. Imported transactions become self-reported; receipts and transaction reviews are not restored. Crop diagnoses, assistant chat, identity verifications and loan applications stay as they are.`
            : ''
        }
        confirmLabel="Replace and import"
        danger
        loading={busy}
        onConfirm={() => void restore()}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete all your farm data?"
        message="This removes your profile, records, MoMo, diagnoses, chat, settings and saved financial reports, including their PDF files, from your account. Your Ghana Card status and loan applications stay on record. Download any reports you want to keep and export a backup first."
        confirmLabel="Delete all data"
        danger
        loading={busy}
        confirmDisabled={confirmation !== 'DELETE'}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!busy) setDeleteOpen(false);
        }}
      >
        <label htmlFor="delete-confirmation" className="text-text-dim text-xs font-semibold">
          Type DELETE to confirm
        </label>
        <Input
          id="delete-confirmation"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={busy}
          className="mt-2"
        />
      </ConfirmDialog>
    </>
  );
}
