'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LastUpdated } from '@/components/admin/content/content-kit';
import { DiagnosisForm } from '@/components/admin/content/diagnosis-form';
import { PageHeader } from '@/components/admin/layout/page-header';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CROP_TONES, CropIcon } from '@/components/ui/crop-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PLATFORM_KEYS } from '@/lib/admin/keys';
import { cn } from '@/lib/utils';
import { contentService } from '@/services/admin/content.service';
import type { Severity } from '@/types';
import type { ContentMeta, DiagnosisContent } from '@/types/admin';

const SEVERITY_COLOR: Record<Severity, BadgeColor> = {
  None: 'green',
  Moderate: 'gold',
  High: 'red',
};

/** "82–90%", or "88%" for a fixed confidence. */
export const confidenceLabel = (d: DiagnosisContent) =>
  d.confidenceMin !== undefined &&
  d.confidenceMax !== undefined &&
  d.confidenceMin !== d.confidenceMax
    ? `${d.confidenceMin}–${d.confidenceMax}%`
    : `${d.confidenceMin ?? d.confidence}%`;

let created = 0;
const newId = (taken: string[]) => {
  let id = '';
  while (!id || taken.includes(id)) id = `diagnosis-${Date.now().toString(36)}-${created++}`;
  return id;
};

/**
 * The crop doctor's disease library (phase A12): add, edit, switch off or delete results.
 * Each save is audited and reaches the farmer's crop doctor at once.
 */
export function DiagnosesLibrary() {
  const [items, setItems] = useState<DiagnosisContent[] | null>(null);
  const [meta, setMeta] = useState<ContentMeta | undefined>();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ item?: DiagnosisContent } | null>(null);
  const [deleting, setDeleting] = useState<DiagnosisContent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([contentService.getDiagnoses(), contentService.getContentMeta()]).then(
      ([list, metas]) => {
        if (!active) return;
        setItems(list);
        setMeta(metas[PLATFORM_KEYS.diagnoses]);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function persist(next: DiagnosisContent[], success: string): Promise<boolean> {
    setBusy(true);
    try {
      setItems(await contentService.saveDiagnoses(next));
      setMeta((await contentService.getContentMeta())[PLATFORM_KEYS.diagnoses]);
      toast.success(success);
      return true;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the library');
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const needle = query.trim().toLowerCase();
  const shown = items.filter(
    (d) => !needle || `${d.disease} ${d.crop ?? 'any'}`.toLowerCase().includes(needle),
  );
  const activeCount = items.filter((d) => d.active).length;

  async function save(values: Omit<DiagnosisContent, 'id'>) {
    if (!items) return false;
    const current = editing?.item;
    const ok = await persist(
      current
        ? items.map((d) => (d.id === current.id ? { ...values, id: current.id } : d))
        : [...items, { ...values, id: newId(items.map((d) => d.id)) }],
      current ? `${values.disease} saved` : `${values.disease} added`,
    );
    if (ok) setEditing(null);
    return ok;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Crop diagnoses"
        description="The disease library behind the crop doctor. Farmers see changes on their next scan."
        actions={
          <Button icon={Plus} onClick={() => setEditing({})} className={PRIMARY_CLASS}>
            Add disease
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LastUpdated meta={meta} />
        <div className="relative sm:w-72">
          <Search
            size={15}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search disease or crop"
            aria-label="Search disease or crop"
            className="border-border bg-bg-2 text-text focus:border-purple/70 placeholder:text-text-mute min-h-10 w-full rounded-xl border pr-3 pl-10 text-sm outline-none"
          />
        </div>
      </div>

      <div className="border-border bg-glass overflow-hidden rounded-2xl border">
        <div
          aria-hidden="true"
          className="text-text-mute border-border hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] gap-4 border-b px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase md:grid"
        >
          <span>Disease</span>
          <span>Crop</span>
          <span>Severity</span>
          <span>Confidence</span>
          <span className="w-40 text-right">Active · actions</span>
        </div>
        <ul aria-label="Disease library" className="divide-border divide-y">
          {shown.map((d) => (
            <li
              key={d.id}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]',
                !d.active && 'opacity-60',
              )}
            >
              <div className="min-w-0">
                <p className="text-text truncate text-sm font-semibold">{d.disease}</p>
                <p className="text-text-mute flex items-center gap-1 text-xs">
                  {d.prevention?.length ? (
                    <>
                      <ShieldCheck size={12} aria-hidden="true" />
                      {d.prevention.length} prevention tip{d.prevention.length === 1 ? '' : 's'}
                    </>
                  ) : (
                    'No prevention tips yet'
                  )}
                </p>
              </div>
              <span className="text-text-dim hidden items-center gap-2 text-sm md:flex">
                {d.crop ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded-md',
                        CROP_TONES[d.crop],
                      )}
                    >
                      <CropIcon crop={d.crop} size={13} />
                    </span>
                    {d.crop}
                  </>
                ) : (
                  'Any crop'
                )}
              </span>
              <span className="hidden md:block">
                <Badge color={SEVERITY_COLOR[d.severity]}>{d.severity}</Badge>
              </span>
              <span className="text-text hidden text-sm tabular-nums md:block">
                {confidenceLabel(d)}
              </span>
              <div className="row-span-2 flex items-center justify-end gap-0.5 md:row-span-1 md:w-40">
                <Switch
                  checked={d.active}
                  disabled={busy || (d.active && activeCount === 1)}
                  onChange={() =>
                    void persist(
                      items.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x)),
                      d.active ? `${d.disease} switched off` : `${d.disease} switched on`,
                    )
                  }
                  label={`${d.disease} active`}
                />
                <button
                  type="button"
                  onClick={() => setEditing({ item: d })}
                  aria-label={`Edit ${d.disease}`}
                  className="text-text-mute hover:text-text hover:bg-glass-strong inline-flex size-9 items-center justify-center rounded-lg transition-colors"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busy || (d.active && activeCount === 1)}
                  onClick={() => setDeleting(d)}
                  aria-label={`Delete ${d.disease}`}
                  className="text-text-mute hover:text-ink-red hover:bg-glass-strong inline-flex size-9 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              {/* Phones: the details under the name. */}
              <div className="text-text-dim flex flex-wrap items-center gap-2 text-xs md:hidden">
                <span>{d.crop ?? 'Any crop'}</span>
                <Badge color={SEVERITY_COLOR[d.severity]}>{d.severity}</Badge>
                <span className="tabular-nums">{confidenceLabel(d)}</span>
              </div>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="text-text-mute px-5 py-8 text-center text-sm">
              No disease matches “{query}”.
            </li>
          )}
        </ul>
      </div>

      <DiagnosisForm
        open={editing !== null}
        item={editing?.item}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.disease}?` : 'Delete'}
        message="Farmers' saved diagnoses keep their results; new scans won't show this disease."
        confirmLabel="Delete"
        danger
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting || !items) return;
          const ok = await persist(
            items.filter((d) => d.id !== deleting.id),
            `${deleting.disease} deleted`,
          );
          if (ok) setDeleting(null);
        }}
      />
    </div>
  );
}
