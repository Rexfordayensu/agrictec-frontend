'use client';

import { useId, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, Megaphone, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AnnouncementPreview } from '@/components/admin/announcements/announcement-preview';
import {
  AudiencePicker,
  reachLabel,
  toAudience,
  type AudienceDraft,
} from '@/components/admin/announcements/audience-picker';
import { ANNOUNCEMENT_TYPES, TYPE_META } from '@/components/admin/announcements/type-meta';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import {
  MESSAGE_MAX,
  TITLE_MAX,
  estimateReach,
  fromLocalInput,
  needsCriticalConfirm,
  toLocalInput,
} from '@/lib/admin/announcements';
import { cn } from '@/lib/utils';
import type { AnnouncementInput } from '@/services/admin/announcements.service';
import type { Crop } from '@/types';
import type { Announcement, FarmerAccount } from '@/types/admin';

/** What the form opens with: a new announcement (optionally pre-filled), an edit or a copy. */
export type AnnouncementFormMode =
  | { kind: 'create'; prefill?: { regions?: string[]; crops?: Crop[] } }
  | { kind: 'edit'; announcement: Announcement }
  | { kind: 'duplicate'; announcement: Announcement };

interface Draft {
  title: string;
  message: string;
  type: Announcement['type'];
  dismissible: boolean;
  audience: AudienceDraft;
  startMode: 'now' | 'later';
  startsAt: string;
  endMode: 'never' | 'at';
  endsAt: string;
}

function initialDraft(mode: AnnouncementFormMode, now: Date): Draft {
  const inAnHour = toLocalInput(new Date(now.getTime() + 60 * 60_000).toISOString());
  if (mode.kind === 'create') {
    const regions = mode.prefill?.regions ?? [];
    const crops = mode.prefill?.crops ?? [];
    return {
      title: '',
      message: '',
      type: 'info',
      dismissible: true,
      audience: {
        kind: regions.length > 0 ? 'region' : crops.length > 0 ? 'crop' : 'all',
        regions,
        crops,
      },
      startMode: 'now',
      startsAt: inAnHour,
      endMode: 'never',
      endsAt: '',
    };
  }
  const a = mode.announcement;
  const audience: AudienceDraft = {
    kind: a.audience.kind,
    regions: a.audience.kind === 'region' ? a.audience.regions : [],
    crops: a.audience.kind === 'crop' ? a.audience.crops : [],
  };
  const base = {
    title: a.title,
    message: a.message,
    type: a.type,
    dismissible: a.dismissible,
    audience,
  };
  // A copy starts now with no end; an edit (only before it starts) keeps its times.
  if (mode.kind === 'duplicate')
    return { ...base, startMode: 'now', startsAt: inAnHour, endMode: 'never', endsAt: '' };
  return {
    ...base,
    startMode: 'later',
    startsAt: toLocalInput(a.startsAt),
    endMode: a.endsAt ? 'at' : 'never',
    endsAt: a.endsAt ? toLocalInput(a.endsAt) : '',
  };
}

type Issues = Partial<Record<'title' | 'message' | 'audience' | 'startsAt' | 'endsAt', string>>;

function issuesOf(d: Draft, now: Date): Issues {
  const issues: Issues = {};
  if (!d.title.trim()) issues.title = 'Add a title.';
  else if (d.title.trim().length > TITLE_MAX)
    issues.title = `Keep the title to ${TITLE_MAX} characters.`;
  if (!d.message.trim()) issues.message = 'Write the message.';
  else if (d.message.trim().length > MESSAGE_MAX)
    issues.message = `Keep the message to ${MESSAGE_MAX} characters.`;
  if (d.audience.kind === 'region' && d.audience.regions.length === 0)
    issues.audience = 'Pick at least one region.';
  if (d.audience.kind === 'crop' && d.audience.crops.length === 0)
    issues.audience = 'Pick at least one crop.';
  const start = d.startMode === 'now' ? now.toISOString() : fromLocalInput(d.startsAt);
  if (d.startMode === 'later') {
    if (!start) issues.startsAt = 'Pick a start date and time.';
    else if (start <= now.toISOString()) issues.startsAt = 'Pick a start in the future.';
  }
  if (d.endMode === 'at') {
    const end = fromLocalInput(d.endsAt);
    if (!end) issues.endsAt = 'Pick an end date and time.';
    else if (start && end <= start) issues.endsAt = 'The end must be after the start.';
    else if (end <= now.toISOString()) issues.endsAt = 'Pick an end in the future.';
  }
  return issues;
}

function toInput(d: Draft, now: Date): AnnouncementInput {
  const endsAt = d.endMode === 'at' ? fromLocalInput(d.endsAt) : undefined;
  return {
    title: d.title.trim(),
    message: d.message.trim(),
    type: d.type,
    audience: toAudience(d.audience),
    startsAt:
      d.startMode === 'now' ? now.toISOString() : (fromLocalInput(d.startsAt) ?? now.toISOString()),
    ...(endsAt && { endsAt }),
    active: true,
    dismissible: d.dismissible,
  };
}

const inputClass =
  'border-border bg-bg-2 text-text focus:border-purple/70 placeholder:text-text-mute w-full rounded-xl border px-3.5 text-sm outline-none';

/** A two-way switch ("Now | Schedule") above an optional date-time field. */
function TimingField<M extends string>({
  label,
  modes,
  mode,
  onMode,
  value,
  onValue,
  showInputFor,
  error,
}: {
  label: string;
  modes: { value: M; label: string }[];
  mode: M;
  onMode: (mode: M) => void;
  value: string;
  onValue: (value: string) => void;
  showInputFor: M;
  error?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-text-dim mb-1.5 text-xs font-semibold">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="border-border bg-bg-2 grid grid-cols-2 gap-1 rounded-xl border p-1"
      >
        {modes.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            onClick={() => onMode(m.value)}
            className={cn(
              'min-h-9 rounded-lg text-xs font-semibold transition-colors',
              mode === m.value
                ? 'bg-purple/15 text-ink-purple'
                : 'text-text-mute hover:text-text hover:bg-glass',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === showInputFor && (
        <input
          type="datetime-local"
          aria-label={`${label} date and time`}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, 'mt-2 min-h-11 tabular-nums', error && 'border-danger/60')}
        />
      )}
      {error && (
        <p role="alert" className="text-ink-red mt-1.5 text-xs font-semibold">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Create, edit (scheduled only) or duplicate an announcement, with a live preview in both
 * themes and the audience's reach. A critical announcement to everyone asks once more.
 */
export function AnnouncementForm({
  mode,
  farmers,
  onClose,
  onSubmit,
}: {
  mode: AnnouncementFormMode | null;
  farmers: FarmerAccount[];
  onClose: () => void;
  /** Resolves true when saved (the form then closes). */
  onSubmit: (input: AnnouncementInput, confirmedCritical: boolean) => Promise<boolean>;
}) {
  if (!mode) return null;
  const key = mode.kind === 'create' ? 'create' : `${mode.kind}:${mode.announcement.id}`;
  return <Form key={key} mode={mode} farmers={farmers} onClose={onClose} onSubmit={onSubmit} />;
}

function Form({
  mode,
  farmers,
  onClose,
  onSubmit,
}: {
  mode: AnnouncementFormMode;
  farmers: FarmerAccount[];
  onClose: () => void;
  onSubmit: (input: AnnouncementInput, confirmedCritical: boolean) => Promise<boolean>;
}) {
  const id = useId();
  const [now] = useState(() => new Date());
  const [initial] = useState(() => initialDraft(mode, now));
  const [draft, setDraft] = useState<Draft>(initial);
  const [showIssues, setShowIssues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft({ ...draft, [key]: value });

  const issues = issuesOf(draft, new Date());
  const shown = showIssues ? issues : {};
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const reach = estimateReach(toAudience(draft.audience), farmers);
  const wasCriticalToAll = mode.kind === 'edit' && needsCriticalConfirm(mode.announcement);

  async function submit(confirmedCritical: boolean) {
    setSaving(true);
    try {
      const ok = await onSubmit(toInput(draft, new Date()), confirmedCritical);
      if (!ok) setSaving(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the announcement');
      setSaving(false);
    }
  }

  function trySubmit() {
    if (Object.keys(issuesOf(draft, new Date())).length > 0) {
      setShowIssues(true);
      return;
    }
    const input = toInput(draft, new Date());
    if (needsCriticalConfirm(input) && !wasCriticalToAll) {
      setConfirming(true);
      return;
    }
    void submit(false);
  }

  const startLabel =
    draft.startMode === 'now'
      ? 'as soon as you publish'
      : fromLocalInput(draft.startsAt)
        ? format(new Date(draft.startsAt), "d MMM yyyy 'at' HH:mm")
        : 'at the time you pick';
  const title =
    mode.kind === 'edit'
      ? 'Edit announcement'
      : mode.kind === 'duplicate'
        ? 'Duplicate announcement'
        : 'New announcement';
  const submitLabel =
    mode.kind === 'edit' ? 'Save changes' : draft.startMode === 'now' ? 'Publish now' : 'Schedule';

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={title}
        description="A banner at the top of the farmer dashboard."
        dirty={dirty && !saving}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={id}
              icon={draft.startMode === 'now' && mode.kind !== 'edit' ? Megaphone : Save}
              loading={saving}
              className={PRIMARY_CLASS}
            >
              {submitLabel}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            id={id}
            noValidate
            className="min-w-0 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              trySubmit();
            }}
          >
            <label className="block">
              <span className="text-text-dim mb-1.5 flex items-center justify-between text-xs font-semibold">
                Title
                <span className="text-text-mute font-normal tabular-nums">
                  {draft.title.length}/{TITLE_MAX}
                </span>
              </span>
              <input
                value={draft.title}
                maxLength={TITLE_MAX}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Dry spell expected this week"
                aria-invalid={shown.title ? true : undefined}
                className={cn(inputClass, 'min-h-11', shown.title && 'border-danger/60')}
              />
              {shown.title && (
                <span role="alert" className="text-ink-red mt-1.5 block text-xs font-semibold">
                  {shown.title}
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-text-dim mb-1.5 flex items-center justify-between text-xs font-semibold">
                Message
                <span
                  className={cn(
                    'font-normal tabular-nums',
                    draft.message.length > MESSAGE_MAX - 30 ? 'text-ink-gold' : 'text-text-mute',
                  )}
                >
                  {draft.message.length}/{MESSAGE_MAX}
                </span>
              </span>
              <textarea
                rows={4}
                value={draft.message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => set('message', e.target.value)}
                placeholder="What should farmers know or do?"
                aria-invalid={shown.message ? true : undefined}
                className={cn(inputClass, 'resize-y py-2.5', shown.message && 'border-danger/60')}
              />
              {shown.message && (
                <span role="alert" className="text-ink-red mt-1.5 block text-xs font-semibold">
                  {shown.message}
                </span>
              )}
            </label>

            <fieldset>
              <legend className="text-text-dim mb-1.5 text-xs font-semibold">Type</legend>
              <div
                role="radiogroup"
                aria-label="Type"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {ANNOUNCEMENT_TYPES.map((type) => {
                  const meta = TYPE_META[type];
                  const Icon = meta.icon;
                  const selected = draft.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set('type', type)}
                      className={cn(
                        'flex min-h-11 flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-colors',
                        selected ? 'border-purple/50 bg-purple/10' : 'border-border hover:bg-glass',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex size-6 items-center justify-center rounded-md',
                            meta.tone,
                          )}
                        >
                          <Icon size={14} aria-hidden="true" />
                        </span>
                        <span className="text-text text-sm font-semibold">{meta.label}</span>
                      </span>
                      <span className="text-text-mute text-[11px] leading-tight">{meta.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <AudiencePicker
              value={draft.audience}
              onChange={(audience) => set('audience', audience)}
              farmers={farmers}
              error={shown.audience}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TimingField
                label="Starts"
                modes={[
                  { value: 'now', label: 'Now' },
                  { value: 'later', label: 'Schedule' },
                ]}
                mode={draft.startMode}
                onMode={(startMode) => set('startMode', startMode)}
                value={draft.startsAt}
                onValue={(startsAt) => set('startsAt', startsAt)}
                showInputFor="later"
                error={shown.startsAt}
              />
              <TimingField
                label="Ends"
                modes={[
                  { value: 'never', label: 'No end' },
                  { value: 'at', label: 'On a date' },
                ]}
                mode={draft.endMode}
                onMode={(endMode) => set('endMode', endMode)}
                value={draft.endsAt}
                onValue={(endsAt) => set('endsAt', endsAt)}
                showInputFor="at"
                error={shown.endsAt}
              />
            </div>

            <div className="border-border flex items-center justify-between gap-4 rounded-xl border px-4 py-2">
              <div>
                <p className="text-text text-sm font-semibold">Dismissible</p>
                <p className="text-text-mute text-xs">
                  Farmers can close it. Otherwise it stays until it ends.
                </p>
              </div>
              <Switch
                checked={draft.dismissible}
                onChange={(dismissible) => set('dismissible', dismissible)}
                label="Farmers can dismiss it"
              />
            </div>
          </form>

          <aside
            aria-label="Preview"
            className="min-w-0 space-y-4 lg:sticky lg:top-0 lg:self-start"
          >
            <div>
              <h3 className="text-text mb-2 text-sm font-semibold">Preview</h3>
              <AnnouncementPreview announcement={draft} />
            </div>
            <div className="border-border bg-glass rounded-xl border p-3 text-xs">
              <p className="text-text-dim flex items-start gap-2">
                <CalendarClock size={14} aria-hidden="true" className="mt-px shrink-0" />
                <span>
                  Shows to <span className="text-text font-semibold">{reachLabel(reach)}</span>{' '}
                  {startLabel}
                  {draft.endMode === 'at' && fromLocalInput(draft.endsAt)
                    ? `, until ${format(new Date(draft.endsAt), "d MMM 'at' HH:mm")}.`
                    : ', until you end it.'}
                </span>
              </p>
            </div>
          </aside>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Send a critical alert to every farmer?"
        message={`Every farmer (${reachLabel(reach)}) sees a red alert at the top of their dashboard${draft.dismissible ? '' : ' that they cannot close'}. Use this only for urgent, safety or money matters.`}
        confirmLabel="Yes, send to everyone"
        danger
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          void submit(true).then(() => setConfirming(false));
        }}
      />
    </>
  );
}
