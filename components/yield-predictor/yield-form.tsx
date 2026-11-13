'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { Check, Minus, Plus, SlidersHorizontal, Sparkles, Wheat } from 'lucide-react';
import { toast } from 'sonner';
import { YieldEstimatePanel } from '@/components/yield-predictor/yield-estimate-panel';
import { yieldService, type HarvestEstimate } from '@/services/yield.service';
import {
  ACRE_PRESETS,
  FERTILIZER_OPTIONS,
  IRRIGATION_OPTIONS,
  SEASON_OPTIONS,
  type YieldOption,
} from '@/components/yield-predictor/yield-options';
import {
  YIELD_CROPS,
  yieldSchema,
  type YieldFormInput,
  type YieldFormValues,
} from '@/components/yield-predictor/yield-schema';
import { YieldTips } from '@/components/yield-predictor/yield-tips';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { CROP_TONES, CropIcon } from '@/components/ui/crop-icon';
import { fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useProfileStore } from '@/store/profile-store';
import { useSubscriptionStore } from '@/store/subscription-store';

interface Estimate {
  input: YieldFormValues;
  result: HarvestEstimate;
}

const legendClass = 'yield-step-title text-text mb-2 text-sm font-semibold';

function StepLabel({ text }: { text: string }) {
  return (
    <>
      <span className="yield-step-number">{text.slice(0, 1)}</span>
      {text.slice(3)}
    </>
  );
}
const activeClass = 'border-accent/50 bg-accent/15 text-ink-green';
const idleClass = 'border-border bg-glass text-text-dim hover:text-text hover:border-accent/30';

/** Labelled radio cards with a visible check on the selected option. */
function OptionCards<T extends string>({
  legend,
  options,
  selected,
  registration,
  columns,
  stacked = false,
}: {
  legend: string;
  options: YieldOption<T>[];
  selected: string | undefined;
  registration: UseFormRegisterReturn;
  columns: string;
  /** Icon and selection on top, text below: fits narrow three-column rows. */
  stacked?: boolean;
}) {
  return (
    <fieldset>
      <legend className={legendClass}>
        <StepLabel text={legend} />
      </legend>
      <div className={cn('grid gap-2', columns)}>
        {options.map(({ value, label, hint, icon: Icon }) => {
          const active = selected === value;
          const icon = (
            <span
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-xl',
                active ? 'bg-accent/20' : 'bg-glass-strong',
              )}
            >
              <Icon size={16} aria-hidden="true" />
            </span>
          );
          const selection = (
            <span className="inline-flex size-5 shrink-0 items-center justify-center">
              {active && <Check size={16} aria-hidden="true" className="text-ink-green" />}
            </span>
          );
          const text = (
            <span className="min-w-0 flex-1">
              <span className="text-text block text-sm font-semibold">{label}</span>
              <span className="text-text-mute block text-xs leading-snug">{hint}</span>
            </span>
          );
          return (
            <label key={value} className="relative">
              <input type="radio" value={value} className="peer sr-only" {...registration} />
              <span
                className={cn(
                  'peer-focus-visible:outline-accent flex h-full cursor-pointer gap-2.5 rounded-2xl border p-3 transition-colors peer-focus-visible:outline-2',
                  stacked ? 'flex-col' : 'items-start',
                  active ? activeClass : idleClass,
                )}
              >
                {stacked ? (
                  <>
                    <span className="flex items-start justify-between gap-2">
                      {icon}
                      {selection}
                    </span>
                    {text}
                  </>
                ) : (
                  <>
                    {icon}
                    {text}
                    {selection}
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function YieldForm() {
  const profile = useProfileStore((state) => state.profile);
  const [history, setHistory] = useState<Estimate[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!estimate) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [estimate]);
  const defaultCrop = YIELD_CROPS.find((crop) => crop === profile?.primaryCrops[0]) ?? 'Maize';
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<YieldFormInput, unknown, YieldFormValues>({
    resolver: zodResolver(yieldSchema),
    defaultValues: {
      crop: defaultCrop,
      acres: profile && profile.acres > 0 ? profile.acres : 1,
      season: 'major',
      fertilizer: 'both',
      irrigation: 'rainfed',
    },
  });
  const values = useWatch({ control });
  const crop = values.crop ?? defaultCrop;
  const parsed = yieldSchema.safeParse(values);
  const stale = Boolean(
    estimate && (!parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(estimate.input)),
  );
  const acres = Number(values.acres);
  const validAcres = Number.isFinite(acres) && acres > 0 ? acres : 0;

  function setAcres(next: number) {
    const clamped = Math.min(1000, Math.max(0.1, Math.round(next * 10) / 10));
    setValue('acres', clamped, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <>
      <div className="yield-workspace">
        <Card className="yield-plan rounded-3xl">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal size={17} aria-hidden="true" className="text-ink-green" />
                Plan your harvest
              </CardTitle>
              <CardSub>Provide a few details about your crop and farm to get an estimate.</CardSub>
            </div>
          </CardHeader>
          <form
            id="yield-form"
            noValidate
            onSubmit={handleSubmit(async (input) => {
              try {
                useSubscriptionStore.getState().assertFeature('yieldPredictor');
                const result = await yieldService.predict(input);
                setEstimate({ input, result });
                setHistory((items) => [{ input, result }, ...items].slice(0, 10));
              } catch {
                toast.error('Could not predict your yield. Please try again.');
              }
            })}
            className="@container scroll-mt-28 space-y-5"
          >
            <fieldset>
              <legend className={legendClass}>
                <StepLabel text="1. What crop are you growing?" />
              </legend>
              <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">
                {YIELD_CROPS.map((option) => {
                  const active = crop === option;
                  return (
                    <label key={option} className="relative">
                      <input
                        type="radio"
                        value={option}
                        className="peer sr-only"
                        {...register('crop')}
                      />
                      <span
                        className={cn(
                          'peer-focus-visible:outline-accent flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors peer-focus-visible:outline-2',
                          active ? activeClass : idleClass,
                        )}
                      >
                        <CropIcon
                          crop={option}
                          size={16}
                          className={active ? undefined : CROP_TONES[option].split(' ')[1]}
                        />
                        {option}
                        {active && (
                          <Check size={14} aria-hidden="true" className="ml-auto shrink-0" />
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="yield-acres" className={cn(legendClass, 'block')}>
                <StepLabel text="2. How many acres will you plant?" />
              </label>
              <div className="flex items-stretch gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  icon={Minus}
                  aria-label="Decrease acreage"
                  onClick={() => setAcres((validAcres || 1) - 1)}
                  disabled={validAcres <= 0.1}
                  className="shrink-0 px-3"
                />
                <Input
                  id="yield-acres"
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  max={1000}
                  step="any"
                  placeholder="e.g. 2"
                  error={Boolean(errors.acres)}
                  aria-describedby={cn(
                    'yield-acres-hint',
                    errors.acres && fieldErrorId('yield-acres'),
                  )}
                  className="text-center text-base font-bold tabular-nums"
                  {...register('acres')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon={Plus}
                  aria-label="Increase acreage"
                  onClick={() => setAcres(validAcres + 1)}
                  disabled={validAcres >= 1000}
                  className="shrink-0 px-3"
                />
              </div>
              <p id="yield-acres-hint" className="text-text-mute mt-2 text-xs">
                Enter the area for this crop. You can use decimals, such as 0.5 acres.
              </p>
              {errors.acres && (
                <p
                  id={fieldErrorId('yield-acres')}
                  role="alert"
                  className="text-ink-red mt-1.5 text-xs"
                >
                  {errors.acres.message}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick acreage">
                {ACRE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAcres(preset)}
                    aria-pressed={validAcres === preset}
                    className={cn(
                      'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
                      validAcres === preset ? activeClass : idleClass,
                    )}
                  >
                    {preset} {preset === 1 ? 'acre' : 'acres'}
                  </button>
                ))}
                {profile &&
                  profile.acres > 0 &&
                  !(ACRE_PRESETS as readonly number[]).includes(profile.acres) && (
                    <button
                      type="button"
                      onClick={() => setAcres(profile.acres)}
                      aria-pressed={validAcres === profile.acres}
                      className={cn(
                        'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
                        validAcres === profile.acres ? activeClass : idleClass,
                      )}
                    >
                      My farm ({profile.acres})
                    </button>
                  )}
              </div>
            </div>

            <OptionCards
              legend="3. Which growing season?"
              options={SEASON_OPTIONS}
              selected={values.season}
              registration={register('season')}
              columns="grid-cols-1 @xs:grid-cols-2"
            />
            <OptionCards
              legend="4. What fertilizer will you use?"
              options={FERTILIZER_OPTIONS}
              selected={values.fertilizer}
              registration={register('fertilizer')}
              columns="grid-cols-1 @xs:grid-cols-2"
            />
            <OptionCards
              legend="5. How will you water the crop?"
              options={IRRIGATION_OPTIONS}
              selected={values.irrigation}
              registration={register('irrigation')}
              columns="grid-cols-1 @sm:grid-cols-3"
            />

            <Button type="submit" icon={Sparkles} loading={isSubmitting} className="w-full">
              {estimate ? 'Update my estimate' : 'Estimate my harvest'}
            </Button>
          </form>
        </Card>

        <YieldEstimatePanel
          input={estimate?.input ?? null}
          result={estimate?.result ?? null}
          crop={crop}
          stale={stale}
          headingRef={resultRef}
        />
      </div>
      <YieldTips crop={crop} />
      <details
        className="yield-history"
        open={historyOpen}
        onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
      >
        <summary>
          <Wheat size={21} aria-hidden="true" />
          <span>Your recent estimates</span>
          <span className="yield-history-view">{historyOpen ? 'Hide' : 'View all'} ↗</span>
        </summary>
        <p>Estimates from this visit. These are not saved after leaving this page.</p>
        {history.length ? (
          <ul>
            {history.map((item, index) => (
              <li key={index}>
                <span>
                  {item.input.crop} · {item.input.acres} acres · {item.input.season} season
                </span>
                <strong>{item.result.expected} tonnes</strong>
                <button
                  type="button"
                  onClick={() => {
                    for (const key of [
                      'crop',
                      'acres',
                      'season',
                      'fertilizer',
                      'irrigation',
                    ] as const)
                      setValue(key, item.input[key]);
                    setEstimate(item);
                  }}
                >
                  View estimate
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No estimates yet. Plan your harvest above to get started.</p>
        )}
      </details>
    </>
  );
}
