'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bug,
  Check,
  Grid3x3,
  Leaf,
  Lightbulb,
  Scan,
  ShieldCheck,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnalyzingState } from '@/components/crop-doctor/analyzing-state';
import { CropDoctorHero, CropDoctorSteps } from '@/components/crop-doctor/crop-doctor-hero';
import { DiagnosisCard } from '@/components/crop-doctor/diagnosis-card';
import { DiagnosisHistory } from '@/components/crop-doctor/diagnosis-history';
import { ImagePreview } from '@/components/crop-doctor/image-preview';
import { UploadZone } from '@/components/crop-doctor/upload-zone';
import { Select } from '@/components/ui/select';
import { CROP_TONES, CropIcon } from '@/components/ui/crop-icon';
import { CROPS } from '@/constants/crops';
import { aiService } from '@/services/ai.service';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';
import type { Crop, DiagnosisResult } from '@/types';
import { useSubscriptionStore } from '@/store/subscription-store';
import { useSubscription } from '@/hooks/use-subscription';

const CHECKS: { icon: LucideIcon; tone: string; title: string; text: string }[] = [
  {
    icon: Leaf,
    tone: 'bg-icon-bg text-icon',
    title: 'Fungal spots & blight',
    text: 'Leaf spots, rot and black pod',
  },
  {
    icon: Bug,
    tone: 'bg-icon-bg text-icon',
    title: 'Pest damage',
    text: 'Fall armyworm and chewed leaves',
  },
  {
    icon: Grid3x3,
    tone: 'bg-icon-bg text-icon',
    title: 'Viral mosaic',
    text: 'Yellow patterns and curled leaves',
  },
  {
    icon: Leaf,
    tone: 'bg-icon-bg text-icon',
    title: 'Healthy tissue',
    text: 'Confirms when no issue is found',
  },
];

export function CropDoctorView() {
  const { snapshot } = useSubscription();
  // Claude reads the photo; without a key on the server the crop doctor is unavailable.
  const aiOn = usePlatformStore((s) => s.ai.mode === 'claude');
  const noCredits = snapshot?.creditsRemaining !== null && (snapshot?.creditsRemaining ?? 0) < 5;
  const router = useRouter();
  const openRecordWithDefaults = useModalStore((s) => s.openRecordWithDefaults);
  const [crop, setCrop] = useState<Crop | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const request = useRef(0);
  const saveLock = useRef(false);

  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  function reset() {
    request.current++;
    setFile(null);
    setResult(null);
    setAnalyzing(false);
    setSaving(false);
    setSaved(false);
  }

  async function analyze(image: File, selectedCrop: Crop | '') {
    const version = ++request.current;
    setFile(image);
    setResult(null);
    setSaved(false);
    setAnalyzing(true);
    try {
      // The API checks the plan, scans, and spends the credits only when it succeeds.
      useSubscriptionStore.getState().assertFeature('cropDoctor');
      const {
        result: diagnosis,
        creditsRemaining,
        diagnosis: stored,
      } = await aiService.diagnose(image, selectedCrop || undefined);
      useSubscriptionStore.getState().applyCredits(creditsRemaining);
      // The API saved it to the history (with a thumbnail it made itself).
      if (stored) useFarmStore.getState().receiveDiagnosis(stored);
      if (request.current === version) {
        setResult(diagnosis);
        setSaved(Boolean(stored));
      }
    } catch (error) {
      if (request.current === version)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not analyze this image. Please try again.',
        );
    } finally {
      if (request.current === version) setAnalyzing(false);
    }
  }

  /** Scans are saved by the API as they are made; this only reloads the history if needed. */
  async function save() {
    if (!file || !result || saved || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    const version = request.current;
    const userId = useFarmStore.getState().userId;
    try {
      if (!userId) return;
      await useFarmStore.getState().load(userId, { silent: true });
      if (request.current === version) {
        setSaved(true);
        toast.success('Diagnosis saved');
      }
    } catch (error) {
      if (request.current === version)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not load your saved diagnoses. Please try again.',
        );
    } finally {
      saveLock.current = false;
      if (request.current === version) setSaving(false);
    }
  }

  function chooseCrop(next: Crop | '') {
    setCrop(next);
    if (file) void analyze(file, next);
  }

  function logTreatment(diagnosis: DiagnosisResult) {
    openRecordWithDefaults({
      type: 'expense',
      crop: diagnosis.crop ?? 'Other',
      description: `Treatment for ${diagnosis.disease}`,
    });
  }

  function askAssistant(diagnosis: DiagnosisResult) {
    const question = `How do I treat ${diagnosis.disease}${diagnosis.crop ? ` on my ${diagnosis.crop}` : ''}?`;
    router.push('/assistant');
    void useChatStore
      .getState()
      .sendMessage(question)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Could not send your question.'),
      );
  }

  const busy = analyzing || saving;
  const stage: 1 | 2 | 3 = analyzing ? 2 : result ? 3 : 1;
  const showResult = analyzing || result !== null;

  return (
    <div className="@container space-y-5">
      <CropDoctorHero />
      <CropDoctorSteps stage={stage} />

      <div className="grid grid-cols-1 items-start gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)]">
        {/* Scanner */}
        <section
          aria-labelledby="scan-title"
          className="rounded-card border-border bg-glass border p-4 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <Scan size={30} aria-hidden="true" className="text-ink-green mt-1 shrink-0" />
            <div>
              <h2 id="scan-title" className="text-text text-xl font-bold">
                Scan a crop
              </h2>
              <p className="text-text-dim text-sm">
                Choose your crop, then add a clear photo of the affected leaf
              </p>
            </div>
          </div>

          <label htmlFor="diagnosis-crop" className="text-text mt-5 mb-2 block text-sm font-bold">
            Crop
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute top-1/2 left-2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg',
                crop ? CROP_TONES[crop] : 'text-text-dim',
              )}
            >
              {crop ? <CropIcon crop={crop} size={15} /> : <Leaf size={17} />}
            </span>
            <Select
              id="diagnosis-crop"
              value={crop}
              disabled={busy}
              onChange={(event) => chooseCrop(event.target.value as Crop | '')}
              className="pl-11"
            >
              <option value="">Select crop (or let the AI tell)</option>
              {CROPS.filter((c) => c !== 'Other').map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <p className="text-text mt-5 mb-2 text-sm font-bold">Add a photo</p>
          {file ? (
            <ImagePreview
              file={file}
              analyzing={analyzing}
              disabled={saving}
              onRemove={reset}
              onError={() => {
                toast.error('This image could not be read. Please try another photo.');
                reset();
              }}
            />
          ) : (
            <UploadZone
              onFile={(image) => void analyze(image, crop)}
              disabled={saving || noCredits || !aiOn}
            />
          )}

          <div className="text-text-mute mt-4 space-y-1 text-xs">
            <p className="flex items-center gap-1.5">
              <ShieldCheck size={13} aria-hidden="true" className="text-ink-green shrink-0" />
              {!aiOn
                ? 'The crop doctor is not available right now. Please check back later.'
                : noCredits
                  ? 'A scan needs 5 AI credits. Your credits reset on the 1st, or change plan in Settings.'
                  : 'Your photo is sent securely for analysis and is not kept there.'}
            </p>
            <p>AI can be wrong. Confirm with your extension officer.</p>
          </div>
        </section>

        {showResult ? (
          /* Result */
          <section
            aria-labelledby="diagnosis-title"
            aria-busy={analyzing}
            className="rounded-card border-border bg-glass border p-4 sm:p-6 @3xl:sticky @3xl:top-28"
          >
            <div className="flex items-start gap-4">
              <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
                <Stethoscope size={24} aria-hidden="true" />
              </span>
              <div>
                <h2 id="diagnosis-title" className="text-text text-xl font-bold">
                  Diagnosis
                </h2>
                <p className="text-text-dim text-sm">
                  Likely issue, confidence and a treatment plan
                </p>
              </div>
            </div>
            <div aria-live="polite" className="mt-5">
              {analyzing ? (
                <AnalyzingState />
              ) : result ? (
                <DiagnosisCard
                  result={result}
                  saving={saving}
                  saved={saved}
                  onSave={() => void save()}
                  onScanAnother={reset}
                  onLogTreatment={() => logTreatment(result)}
                  onAskAssistant={() => askAssistant(result)}
                />
              ) : null}
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <section
              aria-labelledby="checks-title"
              className="rounded-card border-border bg-glass @container/checks border p-4 sm:p-6"
            >
              <div className="flex items-start gap-4">
                <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
                  <Stethoscope size={24} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="checks-title" className="text-text text-xl font-bold">
                    What we check for
                  </h2>
                  <p className="text-text-dim text-sm">
                    The AI can detect common crop diseases and issues.
                  </p>
                </div>
              </div>
              <ul className="mt-5 grid grid-cols-1 gap-3 @sm/checks:grid-cols-2">
                {CHECKS.map(({ icon: Icon, tone, title, text }) => (
                  <li key={title} className="border-border flex gap-3 rounded-2xl border p-3.5">
                    <span
                      className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                        tone,
                      )}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="text-text block text-sm font-bold">{title}</span>
                      <span className="text-text-dim block text-sm leading-snug">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <PhotoTips />
          </div>
        )}
      </div>

      <DiagnosisHistory />
    </div>
  );
}

const GOOD = ['Good lighting', 'Close-up (leaf fills frame)', 'Clear and in focus'];
const BAD = ['Blurry photo', 'Too far away', 'Poor lighting'];

/** A sharp close-up and a blurred, dark one (cut from the page's own field photo). */
function PhotoTips() {
  return (
    <section
      aria-labelledby="tips-title"
      className="rounded-card border-border bg-glass @container/tips overflow-hidden border"
    >
      <h2
        id="tips-title"
        className="bg-accent/10 text-text flex items-center gap-3 px-5 py-4 text-lg font-bold"
      >
        <Lightbulb size={22} aria-hidden="true" className="text-icon" />
        Tips for a clear leaf photo
      </h2>
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 @md/tips:grid-cols-2">
        <TipExample good items={GOOD} />
        <TipExample good={false} items={BAD} />
      </div>
    </section>
  );
}

function TipExample({ good, items }: { good: boolean; items: string[] }) {
  return (
    <div className="flex items-center gap-4">
      <span className="relative shrink-0">
        <span
          role="img"
          aria-label={
            good ? 'A good leaf photo: sharp and close' : 'A poor leaf photo: blurry and dark'
          }
          className="block size-24 rounded-xl bg-no-repeat"
          style={{
            backgroundImage: "url('/images/crop-doctor/crop-doctor-banner.jpg')",
            backgroundSize: good ? '620%' : '330%',
            backgroundPosition: good ? '71% 62%' : '74% 70%',
            filter: good ? undefined : 'blur(2.5px) brightness(0.7)',
          }}
        />
        <span
          aria-hidden="true"
          className={cn(
            'absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full text-white ring-2 ring-white',
            good ? 'bg-[#16a34a]' : 'bg-[#dc2626]',
          )}
        >
          {good ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
        </span>
      </span>
      <ul className="space-y-2 text-sm" aria-label={good ? 'Do' : 'Avoid'}>
        {items.map((item) => (
          <li key={item} className="text-text flex items-center gap-2">
            {good ? (
              <Check size={15} aria-hidden="true" className="text-ink-green shrink-0" />
            ) : (
              <X size={15} aria-hidden="true" className="text-ink-red shrink-0" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
