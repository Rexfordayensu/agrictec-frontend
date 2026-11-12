'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bug,
  CircleDot,
  Focus,
  Grid3x3,
  Hand,
  HelpCircle,
  Leaf,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnalyzingState } from '@/components/crop-doctor/analyzing-state';
import { CropScanStats } from '@/components/crop-doctor/crop-doctor-hero';
import { DiagnosisCard } from '@/components/crop-doctor/diagnosis-card';
import { DiagnosisHistory } from '@/components/crop-doctor/diagnosis-history';
import { ImagePreview } from '@/components/crop-doctor/image-preview';
import { UploadZone } from '@/components/crop-doctor/upload-zone';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
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

const PHOTO_TIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Sun, text: 'Natural daylight, no flash' },
  { icon: Focus, text: 'Get close to the damaged area' },
  { icon: Leaf, text: 'One leaf filling the frame' },
  { icon: Hand, text: 'Hold steady for a sharp photo' },
];

const CHECKS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CircleDot, title: 'Fungal spots & blight', text: 'Leaf spots, rot and black pod' },
  { icon: Bug, title: 'Pest damage', text: 'Fall armyworm and chewed leaves' },
  { icon: Grid3x3, title: 'Viral mosaic', text: 'Yellow patterns and curled leaves' },
  { icon: Leaf, title: 'Healthy tissue', text: 'Confirms when no issue is found' },
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

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-2">
        {/* Scanner */}
        <Card className="rounded-3xl">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScanLine size={17} aria-hidden="true" className="text-ink-green" />
                Scan a crop
              </CardTitle>
              <CardSub>Pick the crop, then add a clear photo of the affected leaf</CardSub>
            </div>
          </CardHeader>

          <div className="mb-5">
            <label
              htmlFor="diagnosis-crop"
              className="text-text-dim mb-2 block text-xs font-semibold tracking-wide uppercase"
            >
              1. Which crop is this?
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute top-1/2 left-2 z-10 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg',
                  crop ? CROP_TONES[crop] : 'bg-glass-strong text-text-mute',
                )}
              >
                {crop ? <CropIcon crop={crop} size={15} /> : <HelpCircle size={15} />}
              </span>
              <Select
                id="diagnosis-crop"
                value={crop}
                disabled={busy}
                onChange={(event) => chooseCrop(event.target.value as Crop | '')}
                className="pl-11"
              >
                <option value="">Not sure (detect from photo)</option>
                {CROPS.filter((c) => c !== 'Other').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-text-dim mb-2 text-xs font-semibold tracking-wide uppercase">
            2. Add a photo
          </p>
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

          <div className="text-text-mute mt-4 space-y-1 text-[11px]">
            <p className="flex items-center gap-1.5">
              <ShieldCheck size={13} aria-hidden="true" className="text-ink-green shrink-0" />
              {aiOn
                ? 'Your photo is sent securely for analysis and is not kept there.'
                : 'The crop doctor is not available right now. Please check back later.'}
            </p>
            <p>
              AI can be wrong. Confirm with your extension officer.
            </p>
          </div>
        </Card>

        {/* Result */}
        <Card className="rounded-3xl @4xl:sticky @4xl:top-28" aria-busy={analyzing}>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope size={17} aria-hidden="true" className="text-ink-purple" />
                Diagnosis
              </CardTitle>
              <CardSub>Likely issue, confidence and a treatment plan</CardSub>
            </div>
          </CardHeader>
          <div aria-live="polite">
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
            ) : (
              <div className="py-2">
                <div className="flex flex-col items-center px-4 py-6 text-center">
                  <span className="border-purple/20 bg-purple/10 text-ink-purple mb-4 inline-flex size-16 items-center justify-center rounded-2xl border">
                    <ScanLine size={30} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <p className="font-display text-text text-xl font-bold">
                    Your diagnosis appears here
                  </p>
                  <p className="text-text-dim mt-1 max-w-sm text-sm">
                    Add a photo to see the likely problem, how confident the AI is, and what to do
                    next.
                  </p>
                </div>
                <p className="text-text-mute mb-3 text-[11px] font-semibold tracking-wider uppercase">
                  What the Crop Doctor checks
                </p>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHECKS.map(({ icon: Icon, title, text }) => (
                    <li
                      key={title}
                      className="border-border bg-glass flex gap-3 rounded-2xl border p-3.5"
                    >
                      <span className="bg-purple/10 text-ink-purple inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-text block text-sm font-semibold">{title}</span>
                        <span className="text-text-mute block text-xs">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
      <details className="border-border bg-glass rounded-2xl border p-4">
        <summary className="text-text focus-visible:outline-accent cursor-pointer rounded text-sm font-semibold">
          Tips for a clear leaf photo
        </summary>
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PHOTO_TIPS.map(({ icon: Icon, text }) => (
            <li key={text} className="text-text-dim flex items-center gap-2 text-xs">
              <span className="bg-accent/10 text-ink-green inline-flex size-7 shrink-0 items-center justify-center rounded-lg">
                <Icon size={14} aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </details>
      <CropScanStats />
      <DiagnosisHistory />
    </>
  );
}
