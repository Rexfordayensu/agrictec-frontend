'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { JsonDiff } from '@/components/admin/shared/json-diff';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { configChanges, configValues } from '@/lib/admin/credit-rules';
import { cn } from '@/lib/utils';
import { configService } from '@/services/admin/config.service';
import type { CreditConfig } from '@/types/admin';

const when = (iso: string) => {
  const date = new Date(iso);
  return date.getFullYear() < 2000 ? 'Built in' : format(date, 'd MMM yyyy, HH:mm');
};

/**
 * Every version, newest first (the live one on top). "View" compares a version with the one
 * before it; "Restore" publishes a copy as a NEW version, so the history is never rewritten.
 */
export function VersionHistory({
  live,
  history,
  draftIsDirty,
  onRestored,
}: {
  live: CreditConfig;
  /** Older versions, newest first. */
  history: CreditConfig[];
  draftIsDirty: boolean;
  onRestored: (published: CreditConfig) => void;
}) {
  const versions = [live, ...history];
  const [viewing, setViewing] = useState<CreditConfig | null>(null);
  const [restoring, setRestoring] = useState<CreditConfig | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const previousOf = (version: CreditConfig) =>
    versions.find((v) => v.version < version.version && v !== version);

  async function restore() {
    if (!restoring) return;
    setBusy(true);
    try {
      const published = await configService.restoreCreditVersion(restoring.version, note);
      toast.success(`v${restoring.version} restored as v${published.version}`);
      setRestoring(null);
      setNote('');
      onRestored(published);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not restore');
    } finally {
      setBusy(false);
    }
  }

  if (versions.length === 1 && history.length === 0) {
    return (
      <div className="border-border bg-glass rounded-2xl border p-6">
        <EmptyState
          icon={History}
          title={`Only v${live.version} so far`}
          description="Each time rules are published, the previous version is kept here."
        />
      </div>
    );
  }

  const prevOfViewing = viewing ? previousOf(viewing) : undefined;

  return (
    <div className="border-border bg-glass rounded-2xl border p-5">
      <ol aria-label="Credit rule versions" className="relative">
        <span aria-hidden="true" className="bg-border absolute top-3 bottom-3 left-[19px] w-px" />
        {versions.map((v) => {
          const isLive = v.version === live.version;
          const previous = previousOf(v);
          const changeCount = previous ? configChanges(previous, v).length : 0;
          return (
            <li key={v.version} className="relative flex gap-4 py-3">
              <span
                className={cn(
                  'relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums',
                  isLive
                    ? 'border-purple bg-purple/20 text-ink-purple'
                    : 'border-border bg-bg-2 text-text-dim',
                )}
              >
                v{v.version}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-text text-sm font-semibold">
                    {v.note ?? (v.version === 1 ? 'Default rules' : 'No note')}
                  </p>
                  {isLive && (
                    <span className="bg-accent/12 text-ink-green rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      Live
                    </span>
                  )}
                  {v.restoredFrom && (
                    <span className="bg-glass-strong text-text-dim rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
                      Copy of v{v.restoredFrom}
                    </span>
                  )}
                </div>
                <p className="text-text-mute mt-0.5 text-xs">
                  {when(v.updatedAt)} · {v.updatedBy}
                  {previous &&
                    ` · ${changeCount} change${changeCount === 1 ? '' : 's'} from v${previous.version}`}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1.5">
                <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(v)}>
                  View
                </Button>
                {!isLive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={() => setRestoring(v)}
                  >
                    Restore
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        size="xl"
        title={viewing ? `Credit rules v${viewing.version}` : ''}
        description={
          viewing
            ? prevOfViewing
              ? `Compared with v${prevOfViewing.version}. Read-only.`
              : 'The first version. Read-only.'
            : undefined
        }
        footer={
          <Button variant="ghost" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div className="space-y-4">
            {viewing.note && (
              <p className="border-border bg-bg-2/60 text-text rounded-xl border px-3.5 py-2.5 text-sm">
                “{viewing.note}”
                <span className="text-text-mute mt-1 block text-xs">
                  {viewing.updatedBy} · {when(viewing.updatedAt)}
                </span>
              </p>
            )}
            <JsonDiff
              before={prevOfViewing ? configValues(prevOfViewing) : {}}
              after={configValues(viewing)}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={restoring !== null}
        title={restoring ? `Restore v${restoring.version}?` : 'Restore'}
        message={
          restoring
            ? `Its rules become live as a new version (v${Math.max(...versions.map((v) => v.version)) + 1}). v${live.version} and every other version stay in the history.${draftIsDirty ? ' Your unpublished draft will be replaced.' : ''}`
            : ''
        }
        confirmLabel="Restore as new version"
        loading={busy}
        onCancel={() => {
          setRestoring(null);
          setNote('');
        }}
        onConfirm={() => void restore()}
      >
        <label className="block">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">Note (optional)</span>
          <Textarea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={restoring ? `Restored version ${restoring.version}.` : ''}
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
