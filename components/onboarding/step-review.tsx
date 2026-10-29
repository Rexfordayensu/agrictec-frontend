'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ClipboardCheck, Pencil } from 'lucide-react';
import { GhanaCardLaterWarning } from '@/components/onboarding/step-ghana-card';
import { StepHeader } from '@/components/onboarding/wizard-nav';
import { Badge } from '@/components/ui/badge';
import { CropIcon, cropFromName } from '@/components/ui/crop-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGPS } from '@/lib/format';
import { cropNames, formatFarmSize } from '@/lib/profile';
import type { Profile } from '@/types';

const FarmMap = dynamic(() => import('@/components/onboarding/farm-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <section className="border-border border-b py-4 first:pt-0 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title.toLowerCase()}`}
          className="text-ink-green -mt-2.5 -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold hover:underline"
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </button>
      </div>
      <div className="text-text text-sm">{children}</div>
    </section>
  );
}

/** The final screen: every answer with an Edit link, then the confirmation. */
export function StepReview({
  formId,
  data,
  onEdit,
  onSubmit,
}: {
  formId: string;
  data: Partial<Profile>;
  onEdit: (step: number) => void;
  onSubmit: () => Promise<void> | void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const crops = cropNames({ primaryCrops: data.primaryCrops ?? [], otherCrops: data.otherCrops });
  const card = data.ghanaCard;

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!confirmed) {
          setError('Confirm that the information above is correct.');
          document.getElementById('onb-confirm')?.focus();
          return;
        }
        void onSubmit();
      }}
    >
      <StepHeader
        icon={ClipboardCheck}
        title="Check your details"
        description="Make sure everything is right. You can change any of it later in your profile."
      />

      <div className="border-border bg-glass rounded-2xl border px-4 pt-4 sm:px-5">
        <Section title="Farm" step={0} onEdit={onEdit}>
          <p className="font-semibold">{data.farmName}</p>
          {data.useNameAsFarmName && <p className="text-text-mute text-xs">Uses your name</p>}
        </Section>

        <Section title="Location" step={1} onEdit={onEdit}>
          <p className="font-semibold">
            {[data.constituency, data.region].filter(Boolean).join(', ')}
          </p>
          {data.community && <p className="text-text-dim">{data.community}</p>}
          {data.gps ? (
            <div className="mt-3">
              <FarmMap
                value={data.gps}
                interactive={false}
                className="h-40 w-full overflow-hidden rounded-2xl"
              />
              <p className="text-text-mute mt-1.5 text-xs tabular-nums">
                {formatGPS(data.gps.lat, data.gps.lng)}
              </p>
            </div>
          ) : (
            <p className="text-text-mute text-xs">No map pin</p>
          )}
        </Section>

        <Section title="Size" step={2} onEdit={onEdit}>
          <p className="font-semibold">
            {data.acres ? formatFarmSize(data.acres, data.sizeUnit ?? 'acres') : 'Not set'}
          </p>
          {data.sizeUnit === 'hectares' && data.acres ? (
            <p className="text-text-mute text-xs">≈ {formatFarmSize(data.acres, 'acres')}</p>
          ) : null}
        </Section>

        <Section title="Crops" step={3} onEdit={onEdit}>
          <ul className="flex flex-wrap gap-1.5" aria-label="Crops">
            {crops.map((crop) => (
              <li
                key={crop}
                className="bg-accent/12 text-ink-green inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
              >
                <CropIcon crop={cropFromName(crop)} size={13} />
                {crop}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Farm type" step={4} onEdit={onEdit}>
          <p className="font-semibold">{data.farmType}</p>
          {data.cooperativeName && <p className="text-text-dim">{data.cooperativeName}</p>}
          {data.outgrowerCompany && (
            <p className="text-text-dim">Grows for {data.outgrowerCompany}</p>
          )}
        </Section>

        <Section title="Ghana Card" step={5} onEdit={onEdit}>
          {card?.status === 'pending' && card.masked ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">{card.masked}</span>
              <Badge color="gold">Pending review after you finish</Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold">Not provided</p>
              <GhanaCardLaterWarning />
            </div>
          )}
        </Section>
      </div>

      <div className="mt-5">
        <label className="border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm">
          <input
            id="onb-confirm"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              setConfirmed(event.target.checked);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'onb-confirm-error' : undefined}
            className="accent-accent mt-0.5 size-4.5 shrink-0"
          />
          <span className="text-text">I confirm the information above is correct.</span>
        </label>
        {error && (
          <p id="onb-confirm-error" role="alert" className="text-ink-red mt-1.5 text-xs">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
