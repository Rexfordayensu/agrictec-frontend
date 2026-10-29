'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertCircle, FilePenLine, Gauge, Info, Rocket, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminLoading from '@/app/(admin)/admin/loading';
import { BandsEditor } from '@/components/admin/credit-rules/bands-editor';
import { EligibilityEditor } from '@/components/admin/credit-rules/eligibility-editor';
import { ImpactPreview } from '@/components/admin/credit-rules/impact-preview';
import { PublishDialog } from '@/components/admin/credit-rules/publish-dialog';
import { ScoreSimulator } from '@/components/admin/credit-rules/score-simulator';
import { TargetsEditor } from '@/components/admin/credit-rules/targets-editor';
import { useImpact } from '@/components/admin/credit-rules/use-impact';
import { VersionHistory } from '@/components/admin/credit-rules/version-history';
import { WeightsEditor } from '@/components/admin/credit-rules/weights-editor';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { StatusTabs } from '@/components/admin/shared/status-tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  configChanges,
  configValues,
  draftIssues,
  type ScoringInput,
} from '@/lib/admin/credit-rules';
import { cn } from '@/lib/utils';
import { configService } from '@/services/admin/config.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { CreditConfig, CreditConfigInput } from '@/types/admin';

type Tab = 'rules' | 'simulator' | 'history';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      live: CreditConfig;
      history: CreditConfig[];
      inputs: ScoringInput[];
    };

async function fetchRules(): Promise<LoadState> {
  try {
    const [live, history, inputs] = await Promise.all([
      configService.getCreditConfig(),
      configService.getCreditHistory(),
      configService.getScoringInputs(),
    ]);
    return { status: 'ready', live, history, inputs };
  } catch (cause) {
    return {
      status: 'error',
      message: cause instanceof Error ? cause.message : 'Could not load the credit rules',
    };
  }
}

const sinceLabel = (iso: string) =>
  new Date(iso).getFullYear() < 2000
    ? 'built-in defaults'
    : `published ${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;

/**
 * Credit rules (phase A11, super_admin). Everything is edited as a DRAFT: farmers keep the live
 * rules until the admin publishes. The impact on every farmer is recalculated as they type.
 */
export function CreditRulesPage() {
  const refreshConsole = useAdminDataStore((s) => s.refresh);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [draft, setDraft] = useState<CreditConfigInput | null>(null);
  const [tab, setTab] = useState<Tab>('rules');
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRules().then((next) => {
      if (!active) return;
      setState(next);
      // A fresh load (first visit, or after publishing) starts the draft from the live rules.
      if (next.status === 'ready') setDraft(configValues(next.live));
    });
    return () => {
      active = false;
    };
  }, [version]);

  const ready = state.status === 'ready' && draft !== null;
  const live = state.status === 'ready' ? state.live : null;
  // Re-scored a few farmers at a time after each edit, so typing stays smooth (phase A15).
  const { impact, calculating, progress } = useImpact(
    state.status === 'ready' ? state.inputs : null,
    live,
    draft,
  );
  const changes = ready && live ? configChanges(live, draft) : [];
  const dirty = changes.length > 0;

  // Leaving the page with an unpublished draft asks first (the draft lives only here).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (state.status === 'loading' || (state.status === 'ready' && !draft)) return <AdminLoading />;
  if (state.status === 'error' || !draft || !live) {
    return (
      <Card className="mx-auto mt-6 max-w-lg">
        <EmptyState
          icon={AlertCircle}
          title="Could not load the credit rules"
          description={state.status === 'error' ? state.message : undefined}
        />
      </Card>
    );
  }

  const { history, inputs } = state;
  const issues = draftIssues(draft);
  const issueCount = Object.keys(issues).length;
  const liveValues = configValues(live);
  const canPublish = dirty && issueCount === 0 && !calculating;
  const publishHint = !dirty
    ? 'Change a rule first'
    : issueCount
      ? 'Fix the highlighted rules first'
      : calculating
        ? 'Working out the impact…'
        : undefined;

  function afterPublish() {
    setPublishing(false);
    setVersion((v) => v + 1);
    void refreshConsole(); // every farmer's score in the console follows the new rules
  }

  const publishButton = (compact = false) => (
    <Button
      icon={Rocket}
      disabled={!canPublish}
      title={publishHint}
      onClick={() => setPublishing(true)}
      className={cn(PRIMARY_CLASS, compact && 'min-h-9 px-3.5 text-xs')}
    >
      Review & publish
      {dirty && (
        <span className="rounded-md bg-white/20 px-1.5 text-[11px] tabular-nums">
          {changes.length}
        </span>
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-text-mute text-xs font-semibold tracking-wider uppercase">
            Credit score engine
          </p>
          <h1 className="font-display text-text mt-1 text-2xl font-bold sm:text-3xl">
            Credit rules
          </h1>
          <p className="text-text-dim mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="bg-accent/12 text-ink-green inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold">
              <span aria-hidden="true" className="bg-accent size-1.5 rounded-full" />
              Live v{live.version}
            </span>
            {sinceLabel(live.updatedAt)} by {live.updatedBy}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            icon={Undo2}
            disabled={!dirty}
            onClick={() => setDiscarding(true)}
          >
            Discard draft
          </Button>
          {publishButton()}
        </div>
      </header>

      {/* Draft status */}
      <div
        role="status"
        className={cn(
          'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
          issueCount
            ? 'border-danger/40 bg-danger/8'
            : dirty
              ? 'border-gold/40 bg-gold/8'
              : 'border-border bg-glass',
        )}
      >
        {issueCount ? (
          <AlertCircle size={18} aria-hidden="true" className="text-ink-red mt-0.5 shrink-0" />
        ) : dirty ? (
          <FilePenLine size={18} aria-hidden="true" className="text-ink-gold mt-0.5 shrink-0" />
        ) : (
          <Info size={18} aria-hidden="true" className="text-text-mute mt-0.5 shrink-0" />
        )}
        <p className="text-text-dim min-w-0">
          {issueCount ? (
            <>
              <span className="text-ink-red font-semibold">
                {issueCount} rule{issueCount === 1 ? ' needs' : 's need'} fixing before publishing.
              </span>{' '}
              {Object.values(issues).join(' ')}
            </>
          ) : dirty ? (
            <>
              <span className="text-ink-gold font-semibold">
                Draft with {changes.length} unpublished change{changes.length === 1 ? '' : 's'}.
              </span>{' '}
              Farmers keep seeing v{live.version} until you publish.
            </>
          ) : (
            <>
              Edits here stay in a <span className="text-text font-semibold">draft</span>: farmers
              keep the live rules until you review and publish them.
            </>
          )}
        </p>
      </div>

      <StatusTabs
        label="Credit rules sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'rules', label: 'Rules & impact' },
          { value: 'simulator', label: 'Score simulator' },
          { value: 'history', label: 'Version history', count: history.length + 1 },
        ]}
      />

      <div>
        {tab === 'rules' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
            <div className="min-w-0 space-y-6">
              <WeightsEditor
                value={draft.weights}
                live={live.weights}
                error={issues.weights}
                onChange={(weights) => setDraft({ ...draft, weights })}
              />
              <TargetsEditor
                value={draft.targets}
                live={live.targets}
                error={issues.targets}
                onChange={(targets) => setDraft({ ...draft, targets })}
              />
              <BandsEditor
                value={draft.bands}
                live={live.bands}
                error={issues.bands}
                onChange={(bands) => setDraft({ ...draft, bands })}
              />
              <EligibilityEditor
                value={draft.eligibility}
                live={live.eligibility}
                error={issues.eligibility}
                onChange={(eligibility) => setDraft({ ...draft, eligibility })}
              />
            </div>

            {/* Pinned beside the editors, so every change shows its effect at once. */}
            <aside aria-labelledby="impact-title" className="min-w-0">
              <div className="border-border bg-glass rounded-2xl border p-5 xl:sticky xl:top-28">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="impact-title"
                      className="text-text flex items-center gap-2 text-sm font-semibold"
                    >
                      <Gauge size={16} aria-hidden="true" className="text-ink-purple" />
                      Impact preview
                    </h2>
                    <p className="text-text-mute mt-0.5 text-xs">
                      All {inputs.length} farmers, live v{live.version} vs your draft
                    </p>
                  </div>
                  {dirty && (
                    <span className="bg-gold/15 text-ink-gold rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      Draft
                    </span>
                  )}
                </div>
                <ImpactPreview
                  impact={impact}
                  calculating={calculating}
                  progress={progress}
                  liveVersion={live.version}
                  hasChanges={dirty}
                  error={issues.weights ?? issues.bands}
                />
              </div>
            </aside>
          </div>
        )}

        {tab === 'simulator' && (
          <ScoreSimulator
            farmers={inputs}
            live={liveValues}
            draft={draft}
            liveVersion={live.version}
          />
        )}

        {tab === 'history' && (
          <VersionHistory
            live={live}
            history={history}
            draftIsDirty={dirty}
            onRestored={() => {
              setVersion((v) => v + 1);
              void refreshConsole();
            }}
          />
        )}
      </div>

      {/* Floating bar while a draft is open, so publishing is always one click away. */}
      {dirty && (
        <div
          role="region"
          aria-label="Draft actions"
          className="animate-fade-in border-gold/40 bg-bg-2/95 shadow-glass sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-xl"
        >
          <p className="text-text px-1 text-sm">
            <span className="font-semibold">{changes.length}</span> unpublished change
            {changes.length === 1 ? '' : 's'}
            {impact && !calculating && (
              <span className="text-text-mute">
                {' '}
                · avg {impact.averageCurrent} → {impact.averageDraft}
              </span>
            )}
          </p>
          <Button size="sm" variant="ghost" icon={Undo2} onClick={() => setDiscarding(true)}>
            Discard
          </Button>
          {publishButton(true)}
        </div>
      )}

      <PublishDialog
        open={publishing}
        live={live}
        draft={draft}
        impact={calculating ? null : impact}
        onClose={() => setPublishing(false)}
        onPublished={afterPublish}
      />

      <ConfirmDialog
        open={discarding}
        title="Discard the draft?"
        message={`Your ${changes.length} unpublished change${changes.length === 1 ? '' : 's'} will be lost. The live rules (v${live.version}) stay as they are.`}
        confirmLabel="Discard draft"
        danger
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          setDraft(liveValues);
          setDiscarding(false);
          toast.info('Draft discarded');
        }}
      />
    </div>
  );
}
