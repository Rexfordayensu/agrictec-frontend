'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Download, FileUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
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
  const [pending, setPending] = useState<DataBackup | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  async function readFile(file?: File) {
    if (!file || lock.current) return;
    if (!/\.json$/i.test(file.name)) return toast.error('Choose an AgriCtec .json export.');
    if (file.size > MAX_BACKUP_BYTES)
      return toast.error('This backup is too large. Maximum size is 20MB.');
    lock.current = true;
    setBusy(true);
    try {
      setPending(parseDataBackup(await file.text()));
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
      await importDataBackup(pending);
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
    <Card className="rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database size={18} aria-hidden="true" className="text-ink-green" />
            Your data, your control
          </CardTitle>
          <CardSub>Back up or restore your records on this device</CardSub>
        </div>
      </CardHeader>
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
      <div className="divide-border divide-y">
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-text text-sm font-semibold">Export my data</p>
            <p className="text-text-mute mt-1 max-w-xl text-xs leading-relaxed">
              Download your profile, farm records, MoMo, diagnoses, chat, settings and loan
              applications. Photo thumbnails are excluded.
            </p>
          </div>
          <Button
            variant="ghost"
            icon={Download}
            disabled={busy}
            onClick={() => {
              try {
                downloadFile(
                  JSON.stringify(createDataBackup(), null, 2),
                  `AgriCtec_Data_${todayISO()}.json`,
                  'application/json',
                );
                toast.success('Data exported');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Could not export your data');
              }
            }}
            className="shrink-0"
          >
            Export my data
          </Button>
        </div>
        <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-text text-sm font-semibold">Import data</p>
            <p className="text-text-mute mt-1 max-w-xl text-xs leading-relaxed">
              Restore an AgriCtec JSON export. The file is checked before you confirm replacing your
              current data.
            </p>
          </div>
          <Button
            variant="ghost"
            icon={FileUp}
            mutates
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="shrink-0"
          >
            Import data
          </Button>
        </div>
        <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-ink-red text-sm font-semibold">Delete all my data</p>
            <p className="text-text-mute mt-1 max-w-xl text-xs leading-relaxed">
              Clear your farm data and preferences on this device. Your sign-in stays active.
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
            className="shrink-0"
          >
            Delete all my data
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title="Replace your current data?"
        message={
          pending
            ? `Restore the backup from ${formatDate(pending.exportedAt)} with ${pending.records.length} records, ${pending.momo.length} MoMo transactions and ${pending.diagnoses.length} diagnoses? Your current data will be replaced.`
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
        message="This removes your profile, records, MoMo, diagnoses, chat, settings and loan applications from this device. Export a backup first if you want to restore them later."
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
    </Card>
  );
}
