'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CircleAlert,
  ExternalLink,
  Fingerprint,
  Hourglass,
  Info,
  Circle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { VerificationArt, VerificationLandscape } from '@/components/profile/verification-art';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { LogoLoader } from '@/components/ui/logo-loader';
import { formatGhanaDate } from '@/lib/format';
import { useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { identityService } from '@/services/identity.service';
import type {
  IdentityAttempt,
  IdentityStarted,
  IdentityState,
  SimulatedOutcome,
} from '@/types/identity';

const LEVEL_LABEL = {
  none: 'Not verified',
  reviewed: 'Reviewed by AgriCtec',
  nia_verified: 'Verified with NIA',
} as const;

const STATUS_BADGE: Record<string, { label: string; color: BadgeColor; icon: LucideIcon }> = {
  verified: { label: 'Verified', color: 'green', icon: ShieldCheck },
  processing: { label: 'In progress', color: 'gold', icon: Hourglass },
  pending: { label: 'Starting', color: 'gold', icon: Hourglass },
  requires_review: { label: 'Under review', color: 'gold', icon: Hourglass },
  failed: { label: 'Not completed', color: 'red', icon: CircleAlert },
  expired: { label: 'Expired', color: 'red', icon: CircleAlert },
  not_started: { label: 'Not started', color: 'blue', icon: Circle },
};

/**
 * Ghana Card identity verification with NIA's approved platform. Every state comes from the
 * server; nothing here can mark a farmer verified. Until NIA onboarding is complete it says so
 * plainly, and the AgriCtec review of a typed-in card (below, in Verification) still applies.
 */
export function IdentityVerificationCard() {
  const readOnly = useReadOnly();
  const [state, setState] = useState<IdentityState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IdentityAttempt[] | null>(null);
  const [started, setStarted] = useState<IdentityStarted | null>(null);
  const [consented, setConsented] = useState(false);
  const [simulate, setSimulate] = useState<SimulatedOutcome>('verified');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await identityService.status());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your verification status.');
    }
  }, []);

  useEffect(() => {
    // Deferred so the first render isn't a synchronous state update inside the effect.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function begin(kind: 'start' | 'retry') {
    if (!state || !consented || busy || readOnly) return;
    setBusy(true);
    try {
      const outcome = state.provider.simulated ? simulate : undefined;
      const session =
        kind === 'start'
          ? await identityService.start(state.consentVersion, outcome)
          : await identityService.retry(state.consentVersion, outcome);
      setStarted(session);
      setConsented(false);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not start verification.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function showHistory() {
    try {
      setHistory(await identityService.history());
    } catch {
      toast.error('Could not load your verification history.');
    }
  }

  const status = state?.status ?? 'not_started';
  const badge = STATUS_BADGE[state?.level === 'nia_verified' ? 'verified' : status];
  const BadgeIcon = badge?.icon ?? Fingerprint;

  return (
    <>
      <Card className="identity-reference-card mb-5 rounded-3xl">
        <VerificationLandscape />
        <VerificationArt />
        <div className="identity-reference-content">
          <CardHeader>
            <div>
              <div className="identity-title-row">
                <CardTitle>Ghana Card verification</CardTitle>
                {state && badge && (
                  <Badge color={badge.color}>
                    <BadgeIcon size={12} aria-hidden="true" />
                    {badge.label}
                  </Badge>
                )}
              </div>
              <CardSub>
                Confirms you are the person on your Ghana Card, through the National Identification
                Authority&apos;s approved verification platform.
              </CardSub>
            </div>
          </CardHeader>

          {error && !state ? (
            <div role="alert" className="text-sm">
              <p className="text-ink-red">{error}</p>
              <Button
                size="sm"
                variant="ghost"
                icon={RefreshCw}
                className="mt-2"
                onClick={() => void load()}
              >
                Try again
              </Button>
            </div>
          ) : !state ? (
            <LogoLoader center label="Loading your verification status" className="min-h-40" />
          ) : (
            <div className="space-y-5">
              {state.attempt?.simulated && (
                <p className="border-gold/40 bg-gold/10 text-ink-gold rounded-xl border px-3 py-2 text-xs">
                  Simulated verification (development only). No Ghana Card, NIA record or face check
                  is involved, and this never counts on the live platform.
                </p>
              )}
              <Body
                state={state}
                started={started}
                consented={consented}
                setConsented={setConsented}
                simulate={simulate}
                setSimulate={setSimulate}
                busy={busy}
                readOnly={readOnly}
                onStart={() => void begin('start')}
                onRetry={() => void begin('retry')}
                onRefresh={() => void load()}
              />
              {state.attempt && (
                <div>
                  {history === null ? (
                    <button
                      type="button"
                      onClick={() => void showHistory()}
                      className="text-ink-green text-xs font-semibold hover:underline"
                    >
                      Show verification history
                    </button>
                  ) : (
                    <ol className="divide-border border-border divide-y rounded-xl border text-xs">
                      {history.map((a) => (
                        <li key={a.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                          <span className="text-text-dim">
                            Attempt {a.attemptCount} · {formatGhanaDate(a.initiatedAt)}
                            {a.simulated ? ' · simulated' : ''}
                          </span>
                          <span className="text-text font-semibold">
                            {STATUS_BADGE[a.status]?.label ?? a.status}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
      {state && <Requirements state={state} />}
    </>
  );
}

function Body({
  state,
  started,
  consented,
  setConsented,
  simulate,
  setSimulate,
  busy,
  readOnly,
  onStart,
  onRetry,
  onRefresh,
}: {
  state: IdentityState;
  started: IdentityStarted | null;
  consented: boolean;
  setConsented: (value: boolean) => void;
  simulate: SimulatedOutcome;
  setSimulate: (value: SimulatedOutcome) => void;
  busy: boolean;
  readOnly: boolean;
  onStart: () => void;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const { attempt } = state;

  if (state.level === 'nia_verified') {
    return (
      <div className="border-accent/30 bg-accent/5 rounded-2xl border p-4">
        <p className="text-text flex items-center gap-2 font-semibold">
          <ShieldCheck size={18} aria-hidden="true" className="text-icon" />
          Your identity is verified
        </p>
        <p className="text-text-dim mt-1 text-sm">
          {attempt?.verifiedAt
            ? `Verified on ${formatGhanaDate(attempt.verifiedAt)}`
            : 'Your Ghana Card identity check is complete.'}
          {attempt?.method ? ` (${attempt.method})` : ''}.
        </p>
        <Link
          href="/dashboard"
          className="text-ink-green mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          Back to your dashboard <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (state.status === 'processing' || state.status === 'pending') {
    return (
      <div className="border-gold/35 bg-gold/8 space-y-3 rounded-2xl border p-4">
        <p className="text-text flex items-center gap-2 font-semibold">
          <Hourglass size={18} aria-hidden="true" className="text-ink-gold" />
          Verification in progress
        </p>
        <div
          role="progressbar"
          aria-label="Verification in progress"
          className="bg-glass-strong h-1.5 overflow-hidden rounded-full"
        >
          <div className="bg-gold h-full w-1/3 animate-pulse rounded-full" />
        </div>
        <p className="text-text-dim text-sm">
          {started?.instructions ??
            'Complete the steps the verification service gave you, then check your status here.'}
        </p>
        {started?.redirectUrl && (
          <a
            href={started.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-green inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            Continue to the verification service <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
        {attempt?.expiresAt && (
          <p className="text-text-mute text-xs">
            This session ends at{' '}
            {new Date(attempt.expiresAt).toLocaleTimeString('en-GH', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'Africa/Accra',
            })}
            .
          </p>
        )}
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onRefresh}>
          Check status
        </Button>
      </div>
    );
  }

  if (state.status === 'requires_review') {
    return (
      <div className="border-gold/35 bg-gold/8 rounded-2xl border p-4">
        <p className="text-text flex items-center gap-2 font-semibold">
          <Hourglass size={18} aria-hidden="true" className="text-ink-gold" />
          Your check needs a closer look
        </p>
        <p className="text-text-dim mt-1 text-sm">
          Your verification has not completed yet. You are not verified until it does. We will let
          you know the result.
        </p>
      </div>
    );
  }

  if (!state.provider.available) {
    return (
      <div className="identity-unavailable rounded-2xl border p-4">
        <Info className="identity-notice-icon" size={25} aria-hidden="true" />
        <div>
          <p className="text-text font-semibold">NIA verification is not yet available</p>
          <p className="text-text-dim mt-1 text-sm">
            Ghana Card verification with NIA is not available yet. AgriCtec is completing onboarding
            with the National Identification Authority. Until then, add your Ghana Card below for an
            AgriCtec review. Your current level: <strong>{LEVEL_LABEL[state.level]}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const failed = state.status === 'failed' || state.status === 'expired';
  return (
    <div className="space-y-4">
      {failed && attempt && (
        <div role="alert" className="border-danger/40 bg-danger/10 rounded-2xl border p-4">
          <p className="text-ink-red flex items-center gap-2 font-semibold">
            <CircleAlert size={18} aria-hidden="true" />
            {state.status === 'expired' ? 'Your session expired' : 'Verification not completed'}
          </p>
          <p className="text-text-dim mt-1 text-sm">
            {attempt.failureMessage ?? 'The check did not complete.'}{' '}
            {state.canRetry
              ? `You can try again (${state.attemptsLeftToday} ${state.attemptsLeftToday === 1 ? 'attempt' : 'attempts'} left today).`
              : 'You have used today’s attempts. Try again tomorrow, or contact AgriCtec support if this keeps happening.'}
          </p>
        </div>
      )}
      {(state.canStart || state.canRetry) && (
        <>
          <PrivacyNotice version={state.consentVersion} />
          <label className="text-text-dim flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consented}
              disabled={busy || readOnly}
              onChange={(event) => setConsented(event.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              I have read the notice and agree that AgriCtec asks the verification service to
              confirm my identity against my Ghana Card record.
            </span>
          </label>
          {state.provider.simulated && (
            <label className="text-text-dim flex flex-wrap items-center gap-2 text-xs">
              Simulated outcome (development only):
              <select
                value={simulate}
                onChange={(event) => setSimulate(event.target.value as SimulatedOutcome)}
                className="border-border bg-bg-2 text-text rounded-lg border px-2 py-1"
              >
                <option value="verified">Verified</option>
                <option value="failed">Failed</option>
                <option value="requires_review">Needs review</option>
                <option value="processing">Stays in progress</option>
              </select>
            </label>
          )}
          <Button
            icon={Fingerprint}
            mutates
            loading={busy}
            disabled={!consented}
            onClick={state.canStart ? onStart : onRetry}
          >
            {state.canStart ? 'Start verification' : 'Try again'}
          </Button>
        </>
      )}
    </div>
  );
}

function PrivacyNotice({ version }: { version: string }) {
  return (
    <details className="border-border bg-bg-2/40 group rounded-2xl border p-4 text-sm" open>
      <summary className="text-text flex cursor-pointer items-center gap-2 font-semibold">
        <LockKeyhole size={16} aria-hidden="true" className="text-ink-green" />
        How your information is used
      </summary>
      <ul className="text-text-dim mt-3 list-disc space-y-1.5 pl-5">
        <li>Why: lenders need to know you are the person applying. Verification confirms that.</li>
        <li>
          How: you complete the Ghana Card and face check with the National Identification
          Authority&apos;s approved verification service, not inside AgriCtec.
        </li>
        <li>
          What AgriCtec keeps: only the result (verified or not), the method the service reports,
          the date and the service&apos;s reference. Never your card photo, your face or other
          biometric data.
        </li>
        <li>
          Your rights: verification is your choice, and everything else in AgriCtec works without
          it. You can ask AgriCtec to delete the result, and it is deleted with your account (Data
          Protection Act, 2012, Act 843).
        </li>
      </ul>
      <p className="text-text-mute mt-3 text-xs">Notice version {version}</p>
    </details>
  );
}

function Requirements({ state }: { state: IdentityState }) {
  if (state.requirements.length === 0) return null;
  return (
    <section
      className={cn(
        'verification-requirements',
        state.requirements.length > 1 && 'verification-requirements-multiple',
      )}
    >
      <h3>What needs verification</h3>
      <p>Apply for a loan through AgriCtec by completing your identity and farm verification.</p>
      <ul className="mt-2 space-y-1.5">
        {state.requirements.map((r) => (
          <li key={r.feature} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-text-dim">{r.label}</span>
            <span
              className={cn('text-xs font-semibold', r.met ? 'text-ink-green' : 'text-text-mute')}
            >
              {r.required === 'none'
                ? 'No verification needed'
                : `Needs: ${LEVEL_LABEL[r.required]}${r.met ? ' ✓' : ''}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
