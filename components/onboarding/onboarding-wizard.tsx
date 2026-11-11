'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCheck, LogOut, RefreshCw, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { REVIEW_STEP } from '@/components/onboarding/onboarding-schemas';
import { StepCrops } from '@/components/onboarding/step-crops';
import { StepFarmName } from '@/components/onboarding/step-farm-name';
import { StepFarmSize } from '@/components/onboarding/step-farm-size';
import { StepFarmType } from '@/components/onboarding/step-farm-type';
import { StepGhanaCard } from '@/components/onboarding/step-ghana-card';
import { StepLocation } from '@/components/onboarding/step-location';
import { StepProgress } from '@/components/onboarding/step-progress';
import { StepReview } from '@/components/onboarding/step-review';
import { WizardNav, type StepProps } from '@/components/onboarding/wizard-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoLoader } from '@/components/ui/logo-loader';
import { authService } from '@/services/auth.service';
import { onboardingService } from '@/services/onboarding.service';
import { signOutAndReset, useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboarding-store';
import type { Profile } from '@/types';

const FORM_ID = 'onboarding-step';

/** Sample answers for guests ("Fill with demo details"). */
const DEMO_DETAILS: Partial<Profile> = {
  farmName: 'Asante Family Farm',
  useNameAsFarmName: false,
  region: 'Ashanti',
  constituency: 'Ejura-Sekyedumase',
  community: 'Ejura',
  gps: { lat: 7.3856, lng: -1.3562 },
  acres: 5,
  sizeUnit: 'acres',
  primaryCrops: ['Maize', 'Cassava', 'Plantain'],
  otherCrops: undefined,
  farmType: 'Smallholder',
  cooperativeName: undefined,
  outgrowerCompany: undefined,
  ghanaCard: { status: 'not_provided' },
};

type Gate = 'checking' | 'ready' | 'error';

/**
 * The onboarding wizard (6 steps and a review). Checks the session itself: no session → login,
 * already onboarded → dashboard. Every Continue saves the draft, so a refresh resumes here.
 */
export function OnboardingWizard() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>('checking');
  const [isGuest, setIsGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef<number | null>(null);
  const { data, step, reached, status, returnToReview } = useOnboardingStore();
  const store = useOnboardingStore.getState;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await useAuthStore.getState().init();
      if (!session) return router.replace('/login?next=/onboarding');
      const account = await authService.checkAccount(session.userId);
      if (account === 'suspended' || account === 'deleted') {
        await signOutAndReset();
        return router.replace(`/login?reason=${account}`);
      }
      if (await onboardingService.isComplete(session.userId)) return router.replace('/dashboard');
      await useOnboardingStore.getState().load(session.userId);
      if (cancelled) return;
      setIsGuest(session.isGuest);
      setGate('ready');
    })().catch((error) => {
      if (!cancelled) {
        setLoadError(
          error instanceof Error ? error.message : 'Please check your connection and try again.',
        );
        setGate('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  useEffect(() => {
    if (gate !== 'ready') return;
    if (previousStep.current !== null && previousStep.current !== step) {
      contentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    previousStep.current = step;
  }, [step, gate]);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (patch: Partial<Profile>) => run(() => store().submitStep(patch));

  async function complete() {
    if (busy) return;
    setBusy(true);
    try {
      const profile = await store().complete();
      const name = (profile.name || profile.farmName).split(' ')[0];
      toast.success(`Welcome to AgriCtec, ${name}!`, {
        icon: <Sprout size={18} aria-hidden="true" />,
      });
      router.replace('/dashboard');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not finish setup. Try again.');
      setBusy(false);
    }
  }

  if (gate === 'error') {
    return (
      <Card padding="lg" className="onboarding-load-error">
        <AlertCircle size={28} aria-hidden="true" className="text-ink-gold" />
        <div role="alert">
          <h2>We couldn&apos;t load your farm setup</h2>
          <p>{loadError}</p>
        </div>
        <Button
          icon={RefreshCw}
          onClick={() => {
            setGate('checking');
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </Button>
      </Card>
    );
  }

  if (gate === 'checking' || status !== 'ready') {
    return (
      <Card padding="lg" className="onboarding-loading" aria-busy="true">
        <LogoLoader center label="Loading your farm setup" />
      </Card>
    );
  }

  const props: StepProps = { formId: FORM_ID, data, onSubmit };
  const review = step >= REVIEW_STEP;
  const content = [
    <StepFarmName
      key="0"
      {...props}
      onFillDemo={isGuest ? () => void run(() => store().fillDemo(DEMO_DETAILS)) : undefined}
    />,
    <StepLocation
      key="1"
      {...props}
      onDraft={(patch) =>
        void store()
          .saveProgress(patch)
          .catch(() => {})
      }
    />,
    <StepFarmSize key="2" {...props} />,
    <StepCrops key="3" {...props} />,
    <StepFarmType key="4" {...props} />,
    <StepGhanaCard key="5" {...props} />,
  ][step];

  return (
    <div className="onboarding-workspace">
      <StepProgress
        step={step}
        reached={reached}
        disabled={busy}
        onJump={(target) => store().goTo(target, reached >= REVIEW_STEP)}
      />
      <Card padding="none" className="onboarding-panel" aria-busy={busy}>
        <div key={step} ref={contentRef} className="onboarding-step-content animate-step-in">
          <fieldset disabled={busy} className="min-w-0">
            {review ? (
              <StepReview
                formId={FORM_ID}
                data={data}
                onEdit={(target) => store().goTo(target, true)}
                onSubmit={complete}
              />
            ) : (
              content
            )}
          </fieldset>
        </div>
        <WizardNav
          formId={FORM_ID}
          busy={busy}
          onBack={step > 0 ? () => store().back() : undefined}
          onSkip={
            step === 5
              ? () => void run(() => store().submitStep({ ghanaCard: { status: 'not_provided' } }))
              : undefined
          }
          continueLabel={
            review
              ? 'Complete setup'
              : returnToReview
                ? 'Save & return to review'
                : 'Save & continue'
          }
          continueIcon={review ? CheckCheck : undefined}
          finalStep={review}
        />
      </Card>
    </div>
  );
}

/** "Sign out" in the corner: ends the session; the draft stays for next time. */
export function OnboardingSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOutAndReset();
          router.replace('/login');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not sign out. Try again.');
          setBusy(false);
        }
      }}
      className="text-text-dim hover:text-text hover:bg-glass inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors disabled:opacity-60"
    >
      <LogOut size={16} aria-hidden="true" />
      Sign out
    </button>
  );
}
