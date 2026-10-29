'use client';

import { useId, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { ListEditor } from '@/components/admin/content/content-kit';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CROPS } from '@/constants/crops';
import { cn } from '@/lib/utils';
import type { Crop, Severity } from '@/types';
import type { DiagnosisContent } from '@/types/admin';

const SEVERITIES: Severity[] = ['None', 'Moderate', 'High'];

interface Draft {
  disease: string;
  crop: Crop | '';
  severity: Severity;
  confidenceMin: number;
  confidenceMax: number;
  treatment: string;
  prevention: string[];
  active: boolean;
}

const toDraft = (d?: DiagnosisContent): Draft => ({
  disease: d?.disease ?? '',
  crop: d?.crop ?? '',
  severity: d?.severity ?? 'Moderate',
  confidenceMin: d?.confidenceMin ?? d?.confidence ?? 80,
  confidenceMax: d?.confidenceMax ?? d?.confidence ?? 92,
  treatment: d?.treatment ?? '',
  prevention: d?.prevention?.length ? d.prevention : [''],
  active: d?.active ?? true,
});

function draftError(d: Draft): string | null {
  if (!d.disease.trim()) return 'Name the disease.';
  if (d.disease.trim().length > 80) return 'Keep the name under 80 characters.';
  const lo = d.confidenceMin;
  const hi = d.confidenceMax;
  if (![lo, hi].every((n) => Number.isInteger(n) && n >= 1 && n <= 100))
    return 'Confidence is a whole number from 1 to 100.';
  if (lo > hi) return 'The confidence range must run from low to high.';
  if (!d.treatment.trim()) return 'Describe the treatment.';
  if (d.treatment.trim().length > 1000) return 'Keep the treatment under 1,000 characters.';
  if (d.prevention.some((p) => p.trim().length > 240)) return 'Keep each tip under 240 characters.';
  return null;
}

/** Add or edit a disease in the crop doctor's library. */
export function DiagnosisForm({
  item,
  open,
  onClose,
  onSave,
}: {
  item?: DiagnosisContent;
  open: boolean;
  onClose: () => void;
  onSave: (values: Omit<DiagnosisContent, 'id'>) => Promise<boolean>;
}) {
  if (!open) return null;
  return <Form key={item?.id ?? 'new'} item={item} onClose={onClose} onSave={onSave} />;
}

function Form({
  item,
  onClose,
  onSave,
}: {
  item?: DiagnosisContent;
  onClose: () => void;
  onSave: (values: Omit<DiagnosisContent, 'id'>) => Promise<boolean>;
}) {
  const id = useId();
  const initial = toDraft(item);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const error = draftError(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft({ ...draft, [key]: value });

  async function save() {
    if (error) {
      setShowError(true);
      return;
    }
    setSaving(true);
    const prevention = draft.prevention.map((p) => p.trim()).filter(Boolean);
    try {
      const ok = await onSave({
        disease: draft.disease.trim(),
        severity: draft.severity,
        // The midpoint is what older readers of `confidence` see.
        confidence: Math.round((draft.confidenceMin + draft.confidenceMax) / 2),
        confidenceMin: draft.confidenceMin,
        confidenceMax: draft.confidenceMax,
        treatment: draft.treatment.trim(),
        ...(prevention.length > 0 && { prevention }),
        ...(draft.crop && { crop: draft.crop }),
        active: draft.active,
      });
      if (!ok) setSaving(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the diagnosis');
      setSaving(false);
    }
  }

  const inputClass =
    'border-border bg-bg-2 text-text focus:border-purple/70 placeholder:text-text-mute min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none';

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={item ? `Edit ${item.disease}` : 'Add a disease'}
      description="What the crop doctor shows when it picks this result."
      dirty={dirty && !saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={id} icon={Save} loading={saving} className={PRIMARY_CLASS}>
            {item ? 'Save' : 'Add disease'}
          </Button>
        </>
      }
    >
      <form
        id={id}
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-text-dim mb-1.5 block text-xs font-semibold">Disease name</span>
            <input
              value={draft.disease}
              maxLength={80}
              onChange={(e) => set('disease', e.target.value)}
              placeholder="e.g. Maize Streak Virus"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-text-dim mb-1.5 block text-xs font-semibold">Crop</span>
            <Select value={draft.crop} onChange={(e) => set('crop', e.target.value as Crop | '')}>
              <option value="">Any crop</option>
              {CROPS.filter((c) => c !== 'Other').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
          <fieldset>
            <legend className="text-text-dim mb-1.5 text-xs font-semibold">Severity</legend>
            <div className="border-border bg-bg-2 grid grid-cols-3 gap-1 rounded-xl border p-1">
              {SEVERITIES.map((s) => (
                <label
                  key={s}
                  className={cn(
                    'flex min-h-9 cursor-pointer items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                    draft.severity === s
                      ? s === 'High'
                        ? 'bg-danger/15 text-ink-red'
                        : s === 'Moderate'
                          ? 'bg-gold/15 text-ink-gold'
                          : 'bg-accent/15 text-ink-green'
                      : 'text-text-mute hover:text-text',
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-severity`}
                    checked={draft.severity === s}
                    onChange={() => set('severity', s)}
                    className="sr-only"
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset>
          <legend className="text-text-dim mb-1.5 text-xs font-semibold">
            Confidence range (%)
          </legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              aria-label="Lowest confidence"
              value={Number.isFinite(draft.confidenceMin) ? draft.confidenceMin : ''}
              onChange={(e) => set('confidenceMin', Number(e.target.value || NaN))}
              className={cn(inputClass, 'w-24 tabular-nums')}
            />
            <span className="text-text-mute text-xs">to</span>
            <input
              type="number"
              min={1}
              max={100}
              aria-label="Highest confidence"
              value={Number.isFinite(draft.confidenceMax) ? draft.confidenceMax : ''}
              onChange={(e) => set('confidenceMax', Number(e.target.value || NaN))}
              className={cn(inputClass, 'w-24 tabular-nums')}
            />
            <span className="text-text-mute text-xs">Each photo gets a value in this range.</span>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-text-dim mb-1.5 flex items-center justify-between text-xs font-semibold">
            Treatment
            <span className="text-text-mute font-normal tabular-nums">
              {draft.treatment.trim().length}/1000
            </span>
          </span>
          <textarea
            rows={4}
            maxLength={1000}
            value={draft.treatment}
            onChange={(e) => set('treatment', e.target.value)}
            placeholder="Each sentence becomes a numbered step."
            className={cn(inputClass, 'resize-y py-2.5')}
          />
        </label>

        <ListEditor
          label="Prevention tips"
          items={draft.prevention}
          onChange={(prevention) => set('prevention', prevention)}
          max={8}
          addLabel="Add tip"
          placeholder="How to stop it coming back"
        />

        <div className="border-border flex items-center justify-between gap-4 rounded-xl border px-4 py-2">
          <div>
            <p className="text-text text-sm font-semibold">Active</p>
            <p className="text-text-mute text-xs">Inactive diseases are never shown to farmers.</p>
          </div>
          <Switch
            checked={draft.active}
            onChange={(active) => set('active', active)}
            label="Disease active"
          />
        </div>

        {showError && error && (
          <p role="alert" className="text-ink-red text-sm font-semibold">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
