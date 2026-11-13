'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleCheck,
  Clock3,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Sprout,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { FarmDetailsForm } from '@/components/profile/farm-details-form';
import { CardHead } from '@/components/settings/card-head';
import { PersonalInfoForm } from '@/components/profile/personal-info-form';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { CropIcon, cropFromName } from '@/components/ui/crop-icon';
import { compressImage, imageValidationError } from '@/lib/image/compress';
import { cropNames, formatFarmSize, locationLabel, profileCompleteness } from '@/lib/profile';
import { safeProfilePhoto } from '@/lib/profile-photo';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { Profile } from '@/types';

type CheckState = 'verified' | 'review' | 'todo';

/** Each check's state, as the Verification page shows it (an admin reviews pins and cards). */
function checkStates(profile: Profile | null, locationPending: boolean) {
  const card = profile?.ghanaCard.status;
  return {
    phone: (profile?.verification.phone ? 'verified' : 'todo') as CheckState,
    location: (profile?.verification.location
      ? 'verified'
      : profile?.gps && locationPending
        ? 'review'
        : 'todo') as CheckState,
    ghanaCard: (card === 'verified'
      ? 'verified'
      : card === 'pending'
        ? 'review'
        : 'todo') as CheckState,
  };
}

/** The most useful next step, and where it is done. */
function nextStep(profile: Profile | null, states: ReturnType<typeof checkStates>) {
  if (!profile || !profile.name.trim() || !profile.phone || !profile.email) return 'personal';
  if (!profile.farmName.trim() || profile.acres <= 0 || profile.primaryCrops.length === 0)
    return 'farm';
  if (states.phone === 'todo' || states.location === 'todo' || states.ghanaCard === 'todo')
    return 'verification';
  return null;
}

/**
 * The Profile page: the farmer's banner, how complete the profile is, the three identity
 * checks, and their personal and farm details. Everything is the saved profile
 * (GET /me/profile) and verification requests; editing uses the same forms and rules as before.
 */
export function ProfileOverview() {
  const profile = useProfileStore((s) => s.profile);
  const locationPending = usePlatformStore((s) =>
    s.verifications.some((v) => v.kind === 'location' && v.status === 'pending'),
  );
  const [editingPersonal, setEditingPersonal] = useState(false);
  const states = checkStates(profile, locationPending);
  const step = nextStep(profile, states);

  function editPersonal() {
    setEditingPersonal(true);
    requestAnimationFrame(() =>
      document
        .getElementById('personal-info')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  return (
    <div className="space-y-5">
      <Banner profile={profile} onEdit={editPersonal} />
      <Completion percent={profileCompleteness(profile)} step={step} onPersonal={editPersonal} />
      <Identity states={states} />
      <div className="grid grid-cols-1 items-start gap-5 @3xl:grid-cols-2">
        {editingPersonal ? (
          <div className="space-y-2">
            <PersonalInfoForm onDone={() => setEditingPersonal(false)} />
          </div>
        ) : (
          <PersonalCard
            profile={profile}
            phoneVerified={states.phone === 'verified'}
            onEdit={editPersonal}
          />
        )}
        <FarmDetailsForm />
      </div>
    </div>
  );
}

function Banner({ profile, onEdit }: { profile: Profile | null; onEdit: () => void }) {
  const name = profile?.name.trim() || 'New Farmer';
  const place = profile ? locationLabel(profile) : '';
  const crops = profile ? cropNames(profile) : [];
  return (
    <section
      aria-labelledby="profile-name"
      className="rounded-card relative isolate overflow-hidden p-5 text-white sm:p-7"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover"
        style={{
          backgroundImage: "url('/images/weather/weather-banner.jpg')",
          backgroundPosition: '60% 60%',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,60,40,0.97) 0%, rgba(6,82,52,0.9) 42%, rgba(6,82,52,0.35) 70%, rgba(6,82,52,0.15) 100%)',
        }}
      />
      <div className="flex flex-col gap-5 @2xl:flex-row @2xl:items-center">
        <PhotoButton profile={profile} name={name} />
        <span aria-hidden="true" className="hidden h-24 w-px bg-white/30 @2xl:block" />
        <div className="min-w-0 flex-1">
          <h2
            id="profile-name"
            className="text-display truncate leading-tight font-extrabold tracking-tight"
          >
            {name}
          </h2>
          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
              <MapPin size={16} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{place}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff5e8] px-3 py-1 text-sm font-semibold text-[#0b6b40]">
              <Sprout size={14} aria-hidden="true" />
              {profile?.farmType ?? 'Smallholder'} farmer
            </span>
            {profile && profile.acres > 0 && (
              <span className="rounded-full bg-[#dbe7ff] px-3 py-1 text-sm font-semibold text-[#1d4ed8]">
                {formatFarmSize(profile.acres, profile.sizeUnit)}
              </span>
            )}
            {crops.slice(0, 3).map((crop) => (
              <span
                key={crop}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#0f2a1f]"
              >
                <CropIcon crop={cropFromName(crop)} size={14} className="text-[#0b6b40]" />
                {crop}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-white px-4 text-sm font-semibold text-[#0f2a1f] shadow-md hover:bg-white/90 @2xl:self-end"
        >
          <Pencil size={15} aria-hidden="true" /> Edit Profile
        </button>
      </div>
    </section>
  );
}

/** The avatar with a camera button: a new photo is compressed and saved to the profile. */
function PhotoButton({ profile, name }: { profile: Profile | null; name: string }) {
  const readOnly = useReadOnly();
  const status = useProfileStore((s) => s.status);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const disabled = readOnly || busy || status !== 'ready';

  async function choose(file?: File) {
    if (!file) return;
    const invalid = imageValidationError(file);
    if (invalid) return toast.error(invalid);
    setBusy(true);
    try {
      const photo = await compressImage(file, 320, 0.8);
      if (!safeProfilePhoto(photo))
        throw new Error('This photo is too large. Try another picture.');
      await useProfileStore.getState().save({ photoDataUrl: photo });
      toast.success('Profile photo saved');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save your photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-fit shrink-0">
      <ProfileAvatar
        name={name}
        photoDataUrl={profile?.photoDataUrl}
        className="size-28 rounded-full border-4 border-white/90 bg-[#e3f5ea] text-4xl text-[#0b6b40] shadow-lg"
      />
      <button
        type="button"
        aria-label={profile?.photoDataUrl ? 'Change profile photo' : 'Add a profile photo'}
        {...readOnlyProps(readOnly)}
        disabled={busy}
        onClick={disabled ? undefined : () => input.current?.click()}
        className={cn(
          'absolute -right-1 bottom-0 inline-flex size-10 items-center justify-center rounded-full border-4 border-white bg-[#0b6b40] text-white shadow-md hover:bg-[#095a36]',
          readOnly && READ_ONLY_CLASS,
        )}
      >
        {busy ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          <Camera size={16} aria-hidden="true" />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void choose(file);
        }}
      />
    </div>
  );
}

function Completion({
  percent,
  step,
  onPersonal,
}: {
  percent: number;
  step: ReturnType<typeof nextStep>;
  onPersonal: () => void;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const action =
    step === 'personal' ? (
      <button type="button" onClick={onPersonal} className={completeBtn}>
        Complete profile <ArrowRight size={18} aria-hidden="true" />
      </button>
    ) : step === 'farm' ? (
      <a href="#farm-details" className={completeBtn}>
        Complete profile <ArrowRight size={18} aria-hidden="true" />
      </a>
    ) : step === 'verification' ? (
      <Link href="/settings/verification" className={completeBtn}>
        Complete profile <ArrowRight size={18} aria-hidden="true" />
      </Link>
    ) : null;
  return (
    <section
      aria-labelledby="completion-title"
      className={cn(dashPanel, 'flex flex-col items-center gap-6 @2xl:flex-row')}
    >
      <div
        className="relative size-36 shrink-0"
        role="img"
        aria-label={`Profile ${percent}% complete`}
      >
        <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="11"
            stroke="currentColor"
            className="text-border"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            stroke="#0b8a55"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - percent / 100)}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-text text-3xl font-extrabold tabular-nums">{percent}%</span>
          <span className="text-text-dim text-xs">Profile complete</span>
        </span>
      </div>
      <span aria-hidden="true" className="bg-border hidden h-20 w-px @2xl:block" />
      <div className="min-w-0 flex-1 text-center @2xl:text-left">
        <h2 id="completion-title" className="text-text text-xl font-bold">
          {step ? 'Complete your profile' : 'Your profile is complete'}
        </h2>
        <p className="text-text-dim mt-1 max-w-md text-sm leading-relaxed">
          {step
            ? 'Add the remaining details to unlock more features, including loan eligibility.'
            : 'Keep your details up to date so lenders see an accurate picture of your farm.'}
        </p>
      </div>
      {action}
    </section>
  );
}

const completeBtn =
  'border-accent/50 text-ink-green hover:bg-accent/8 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border-2 px-5 text-sm font-semibold';

const STATE: Record<CheckState, { label: string; icon: LucideIcon; badge: string; tile: string }> =
  {
    verified: {
      label: 'Verified',
      icon: CheckCircle2,
      badge: 'bg-accent/15 text-ink-green',
      tile: 'border-accent/25 bg-accent/6',
    },
    review: {
      label: 'Under review',
      icon: Clock3,
      badge: 'bg-gold/20 text-ink-gold',
      tile: 'border-gold/25 bg-gold/6',
    },
    todo: {
      label: 'Not verified',
      icon: CircleCheck,
      badge: 'bg-glass-strong text-text-dim',
      tile: 'border-border bg-glass',
    },
  };

function Identity({ states }: { states: ReturnType<typeof checkStates> }) {
  const checks: { label: string; icon: LucideIcon; state: CheckState }[] = [
    { label: 'Phone number', icon: Phone, state: states.phone },
    { label: 'Farm location', icon: MapPin, state: states.location },
    { label: 'Ghana Card', icon: IdCard, state: states.ghanaCard },
  ];
  const complete = checks.every((c) => c.state === 'verified');
  return (
    <section aria-labelledby="identity-title" className={dashPanel}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="identity-title" className="text-text text-xl font-bold">
            Identity verification
          </h2>
          <p className="text-text-dim text-sm">
            Verify key details to build trust and access financial services.
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
            complete ? 'bg-accent/15 text-ink-green' : 'bg-gold/20 text-ink-gold',
          )}
        >
          {complete ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} aria-hidden="true" />
          )}
          {complete ? 'Complete' : 'Incomplete'}
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 @2xl:grid-cols-3">
        {checks.map((check) => {
          const style = STATE[check.state];
          return (
            <li key={check.label}>
              <Link
                href="/settings/verification"
                className={cn(
                  'flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:brightness-[0.98]',
                  style.tile,
                )}
              >
                <span className="bg-glass-strong text-text inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
                  <check.icon size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="text-text block font-bold">{check.label}</span>
                  <span
                    className={cn(
                      'mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold',
                      style.badge,
                    )}
                  >
                    <style.icon size={14} aria-hidden="true" /> {style.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PersonalCard({
  profile,
  phoneVerified,
  onEdit,
}: {
  profile: Profile | null;
  phoneVerified: boolean;
  onEdit: () => void;
}) {
  return (
    <section
      id="personal-info"
      aria-labelledby="personal-title"
      className={cn(dashPanel, 'scroll-mt-24')}
    >
      <CardHead
        id="personal-title"
        icon={UserRound}
        title="Personal information"
        sub="Your name and contact details."
        onEdit={onEdit}
      />
      <dl className="divide-border mt-3 divide-y">
        <Field icon={UserRound} label="Full name" value={profile?.name.trim() || 'Not set'} />
        <Field
          icon={Phone}
          label="Phone number"
          value={profile?.phone || 'Not set'}
          aside={
            profile?.phone ? (
              phoneVerified ? (
                <span className="bg-accent/15 text-ink-green inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold">
                  <CheckCircle2 size={15} aria-hidden="true" /> Verified
                </span>
              ) : (
                <Link
                  href="/settings/verification"
                  className="text-ink-gold text-sm font-semibold hover:underline"
                >
                  Verify
                </Link>
              )
            ) : null
          }
        />
        <Field icon={Mail} label="Email" value={profile?.email || 'Not set'} />
      </dl>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  aside,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <Icon size={22} aria-hidden="true" className="text-text-dim shrink-0" />
      <div className="min-w-0 flex-1">
        <dt className="text-text-dim text-sm">{label}</dt>
        <dd className="text-text truncate text-lg font-semibold">{value}</dd>
      </div>
      {aside}
    </div>
  );
}
