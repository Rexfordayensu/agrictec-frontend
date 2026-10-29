'use client';

import { useEffect, useId, useState } from 'react';
import { Braces, Save } from 'lucide-react';
import { toast } from 'sonner';
import { MessageBubble } from '@/components/assistant/message-bubble';
import { ChipInput, ListEditor } from '@/components/admin/content/content-kit';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { isFallback } from '@/lib/admin/assistant-kb';
import {
  ASSISTANT_PLACEHOLDERS,
  renderAssistantReply,
  type AssistantContext,
} from '@/lib/ai/assistant-replies';
import { cn } from '@/lib/utils';
import type { AssistantReply } from '@/types';
import type { AssistantKnowledgeItem, CropContent } from '@/types/admin';

/** The placeholders the brief asks to list first; the rest follow. */
const FEATURED = ['{name}', '{score}', '{scoreLabel}', '{income}', '{expenses}', '{region}'];
const PLACEHOLDERS = [
  ...ASSISTANT_PLACEHOLDERS.filter((p) => FEATURED.includes(p.token)).sort(
    (a, b) => FEATURED.indexOf(a.token) - FEATURED.indexOf(b.token),
  ),
  ...ASSISTANT_PLACEHOLDERS.filter((p) => !FEATURED.includes(p.token)),
];

type TextField = 'title' | 'intro' | 'tip';

interface Draft {
  keywords: string[];
  title: string;
  intro: string;
  bullets: string[];
  tip: string;
  active: boolean;
}

const toDraft = (item: AssistantKnowledgeItem): Draft => ({
  keywords: item.keywords,
  title: item.reply.title,
  intro: item.reply.intro ?? '',
  bullets: item.reply.bullets ?? [],
  tip: item.reply.tip ?? '',
  active: item.active,
});

/** The reply as stored: trimmed, empty parts left out. */
function replyOf(draft: Draft): AssistantReply {
  const bullets = draft.bullets.map((b) => b.trim()).filter(Boolean);
  return {
    title: draft.title.trim(),
    ...(draft.intro.trim() && { intro: draft.intro.trim() }),
    ...(bullets.length > 0 && { bullets }),
    ...(draft.tip.trim() && { tip: draft.tip.trim() }),
  };
}

function draftError(draft: Draft, fallback: boolean): string | null {
  if (!fallback && draft.keywords.length === 0) return 'Add at least one keyword.';
  if (!draft.title.trim()) return 'Give the reply a title.';
  if (draft.title.trim().length > 120) return 'Keep the title under 120 characters.';
  if (draft.intro.trim().length > 600) return 'Keep the intro under 600 characters.';
  if (draft.bullets.some((b) => b.trim().length > 400))
    return 'Keep each bullet under 400 characters.';
  if (draft.tip.trim().length > 400) return 'Keep the tip under 400 characters.';
  return null;
}

/**
 * Add or edit an assistant reply: keywords, title, intro, bullets and tip, with the placeholders
 * listed and a live preview rendered exactly as farmers see it (for a sample farmer).
 */
export function AssistantKbForm({
  item,
  open,
  context,
  crops,
  onClose,
  onSave,
}: {
  /** Undefined adds a new reply. */
  item?: AssistantKnowledgeItem;
  open: boolean;
  context: AssistantContext;
  crops: CropContent[];
  onClose: () => void;
  onSave: (values: { keywords: string[]; reply: AssistantReply; active: boolean }) => Promise<void>;
}) {
  if (!open) return null;
  return (
    <KbForm
      key={item?.id ?? 'new'}
      item={item}
      context={context}
      crops={crops}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function KbForm({
  item,
  context,
  crops,
  onClose,
  onSave,
}: {
  item?: AssistantKnowledgeItem;
  context: AssistantContext;
  crops: CropContent[];
  onClose: () => void;
  onSave: (values: { keywords: string[]; reply: AssistantReply; active: boolean }) => Promise<void>;
}) {
  const id = useId();
  const fallback = item ? isFallback(item) : false;
  const initial: Draft = item
    ? toDraft(item)
    : { keywords: [], title: '', intro: '', bullets: [''], tip: '', active: true };
  const [draft, setDraft] = useState<Draft>(initial);
  const [focus, setFocus] = useState<TextField>('intro');
  const [preview, setPreview] = useState<AssistantReply | null>(null);
  const [saving, setSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const error = draftError(draft, fallback);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const reply = replyOf(draft);
  const replyKey = JSON.stringify(reply);

  // The preview fills placeholders with the sample farmer's values (async: weather, prices).
  useEffect(() => {
    let active = true;
    const template = JSON.parse(replyKey) as AssistantReply;
    renderAssistantReply(
      template.title ? template : { ...template, title: 'Reply title' },
      context,
      crops,
    )
      .then((rendered) => active && setPreview(rendered))
      .catch(() => active && setPreview(null));
    return () => {
      active = false;
    };
  }, [replyKey, context, crops]);

  /** Adds a placeholder to the end of the field last focused. */
  function insert(token: string) {
    setDraft((d) => ({
      ...d,
      [focus]: d[focus] ? `${d[focus].replace(/\s*$/, '')} ${token}` : token,
    }));
  }

  async function save() {
    if (error) {
      setShowError(true);
      return;
    }
    setSaving(true);
    try {
      await onSave({ keywords: draft.keywords, reply, active: fallback ? true : draft.active });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the reply');
      setSaving(false);
    }
  }

  const text = (
    field: TextField,
    label: string,
    rows: number,
    max: number,
    placeholder: string,
  ) => (
    <label className="block">
      <span className="text-text-dim mb-1.5 flex items-center justify-between text-xs font-semibold">
        {label}
        <span className="text-text-mute font-normal tabular-nums">
          {draft[field].trim().length}/{max}
        </span>
      </span>
      {rows === 1 ? (
        <input
          value={draft[field]}
          maxLength={max}
          onFocus={() => setFocus(field)}
          onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
          placeholder={placeholder}
          className="border-border bg-bg-2 text-text focus:border-purple/70 placeholder:text-text-mute min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none"
        />
      ) : (
        <textarea
          rows={rows}
          value={draft[field]}
          maxLength={max}
          onFocus={() => setFocus(field)}
          onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
          placeholder={placeholder}
          className="border-border bg-bg-2 text-text focus:border-purple/70 placeholder:text-text-mute w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm outline-none"
        />
      )}
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={fallback ? 'Fallback reply' : item ? 'Edit reply' : 'New reply'}
      description={
        fallback
          ? 'Sent when no keyword matches. It can be edited but never deleted.'
          : 'Farmers get this reply when their question matches one of the keywords.'
      }
      dirty={dirty && !saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={id} icon={Save} loading={saving} className={PRIMARY_CLASS}>
            {item ? 'Save reply' : 'Add reply'}
          </Button>
        </>
      }
    >
      <form
        id={id}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
      >
        <div className="min-w-0 space-y-4">
          {!fallback && (
            <ChipInput
              label="Keywords"
              values={draft.keywords}
              onChange={(keywords) => setDraft({ ...draft, keywords })}
              placeholder="e.g. irrigation, water pump"
              hint="Press Enter after each. All words of a keyword must appear; “plant*” matches planting."
              error={
                showError && draft.keywords.length === 0 ? 'Add at least one keyword.' : undefined
              }
            />
          )}
          {text('title', 'Title', 1, 120, 'e.g. Irrigation basics')}
          {text('intro', 'Intro', 3, 600, 'e.g. Hi {name}, here is how to plan irrigation…')}
          <ListEditor
            label="Bullets"
            items={draft.bullets}
            onChange={(bullets) => setDraft({ ...draft, bullets })}
            max={10}
            addLabel="Add bullet"
            placeholder="One point per bullet"
          />
          {text('tip', 'Tip', 2, 400, 'A closing tip (optional)')}
          {!fallback && (
            <div className="border-border flex items-center justify-between gap-4 rounded-xl border px-4 py-2">
              <div>
                <p className="text-text text-sm font-semibold">Active</p>
                <p className="text-text-mute text-xs">Inactive replies are never used.</p>
              </div>
              <Switch
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
                label="Reply active"
              />
            </div>
          )}
          {showError && error && (
            <p role="alert" className="text-ink-red text-sm font-semibold">
              {error}
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <section aria-labelledby={`${id}-placeholders`}>
            <h3
              id={`${id}-placeholders`}
              className="text-text-dim mb-2 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Braces size={14} aria-hidden="true" />
              Placeholders
              <span className="text-text-mute font-normal">· click to add to the {focus}</span>
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p, index) => (
                <li key={p.token}>
                  <button
                    type="button"
                    title={p.description}
                    onClick={() => insert(p.token)}
                    className={cn(
                      'rounded-lg border px-2 py-1 font-mono text-[11px] transition-colors',
                      index < FEATURED.length
                        ? 'border-purple/40 bg-purple/10 text-ink-purple hover:bg-purple/20'
                        : 'border-border text-text-dim hover:bg-glass-strong',
                    )}
                  >
                    {p.token}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby={`${id}-preview`}>
            <h3 id={`${id}-preview`} className="text-text-dim mb-2 text-xs font-semibold">
              Preview for {context.farmerName}
            </h3>
            <div className="border-border bg-bg-1/60 rounded-2xl border p-3">
              {preview ? (
                <MessageBubble
                  message={{
                    id: 'preview',
                    role: 'ai',
                    content: preview,
                    createdAt: '2026-01-01T09:00:00.000Z',
                  }}
                />
              ) : (
                <p className="text-text-mute p-3 text-xs">Rendering…</p>
              )}
            </div>
          </section>
        </div>
      </form>
    </Modal>
  );
}
