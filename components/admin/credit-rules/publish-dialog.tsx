'use client';

import { useId, useState } from 'react';
import { ArrowRight, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { DeltaBadge } from '@/components/admin/credit-rules/impact-preview';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { configChanges, type Impact } from '@/lib/admin/credit-rules';
import { configService } from '@/services/admin/config.service';
import type { CreditConfig, CreditConfigInput } from '@/types/admin';

const NOTE_MIN = 10;

/**
 * The last step before farmers see new rules: what changed (from → to), what it does to
 * farmers, and a change note for the history. Publishing makes a new version (audited).
 */
export function PublishDialog({
  open,
  live,
  draft,
  impact,
  onClose,
  onPublished,
}: {
  open: boolean;
  live: CreditConfig;
  draft: CreditConfigInput;
  impact: Impact | null;
  onClose: () => void;
  onPublished: (published: CreditConfig) => void;
}) {
  if (!open) return null;
  return (
    <PublishForm
      live={live}
      draft={draft}
      impact={impact}
      onClose={onClose}
      onPublished={onPublished}
    />
  );
}

function PublishForm({
  live,
  draft,
  impact,
  onClose,
  onPublished,
}: {
  live: CreditConfig;
  draft: CreditConfigInput;
  impact: Impact | null;
  onClose: () => void;
  onPublished: (published: CreditConfig) => void;
}) {
  const id = useId();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changes = configChanges(live, draft);
  const length = note.trim().length;

  async function publish() {
    if (length < NOTE_MIN) {
      setError(`Write at least ${NOTE_MIN} characters (${length} so far).`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const published = await configService.publishCreditConfig(draft, note);
      toast.success(`Credit rules v${published.version} are live`, {
        description: 'Every farmer’s score now uses them.',
      });
      onPublished(published);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish');
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Publish credit rules v${live.version + 1}`}
      description={`Replaces v${live.version}, which stays in the history and can be restored.`}
      dirty={!busy && note.trim() !== ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep editing
          </Button>
          <Button type="submit" form={id} icon={Rocket} loading={busy} className={PRIMARY_CLASS}>
            Publish v{live.version + 1}
          </Button>
        </>
      }
    >
      <form
        id={id}
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void publish();
        }}
      >
        {impact && (
          <section aria-label="Impact" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Average score',
                value: (
                  <span className="flex items-center gap-1.5">
                    {impact.averageDraft}
                    <DeltaBadge delta={impact.averageDraft - impact.averageCurrent} />
                  </span>
                ),
              },
              {
                label: 'Scores changing',
                value: `${impact.changedScores} of ${impact.farmers.length}`,
              },
              {
                label: 'Become eligible',
                value: impact.gained.length ? `+${impact.gained.length}` : '0',
                tone: impact.gained.length ? 'text-ink-green' : 'text-text-mute',
              },
              {
                label: 'Lose eligibility',
                value: impact.lost.length ? `−${impact.lost.length}` : '0',
                tone: impact.lost.length ? 'text-ink-red' : 'text-text-mute',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-border bg-bg-2/60 rounded-xl border px-3 py-2.5"
              >
                <p className="text-text-mute text-[11px] font-semibold">{stat.label}</p>
                <div
                  className={`font-display mt-0.5 text-lg font-bold tabular-nums ${stat.tone ?? 'text-text'}`}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </section>
        )}

        <section aria-labelledby={`${id}-changes`}>
          <h3 id={`${id}-changes`} className="text-text mb-2 text-sm font-semibold">
            {changes.length} change{changes.length === 1 ? '' : 's'}
          </h3>
          <ul className="border-border divide-border divide-y rounded-xl border">
            {changes.map((c) => (
              <li
                key={`${c.section}-${c.label}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-sm"
              >
                <span className="text-text-mute w-20 shrink-0 text-[11px] font-semibold tracking-wider uppercase">
                  {c.section}
                </span>
                <span className="text-text min-w-0 flex-1">{c.label}</span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-text-mute line-through decoration-1">{c.from}</span>
                  <ArrowRight size={13} aria-hidden="true" className="text-text-mute" />
                  <span className="text-text font-semibold">{c.to}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <FormField
          label="Change note (required)"
          htmlFor={`${id}-note`}
          error={error ?? undefined}
          hint={`Why these rules? It’s kept with v${live.version + 1} in the history. ${length}/${NOTE_MIN}+ characters.`}
        >
          <Textarea
            id={`${id}-note`}
            rows={3}
            maxLength={500}
            value={note}
            error={Boolean(error)}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Reward consistent MoMo use more; lenders asked for a stronger cash-flow signal."
          />
        </FormField>
      </form>
    </Modal>
  );
}
