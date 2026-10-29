'use client';

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Hourglass,
  MapPin,
  PencilLine,
  Smartphone,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { CropIcon, cropFromName } from '@/components/ui/crop-icon';
import { ScoreRing } from '@/components/ui/score-ring';
import { profileCompleteness } from '@/lib/profile';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore } from '@/store/profile-store';
import type { Profile } from '@/types';
import { useSubscription } from '@/hooks/use-subscription';

/** The single most useful thing to do next, with the section it lives in. */
function nextStep(profile: Profile | null): { text: string; href: string } | null {
  if (!profile) return { text: 'Add your name and phone number', href: '/settings/profile' };
  if (!profile.name.trim() || !profile.phone || !profile.email)
    return { text: 'Finish your personal details', href: '#personal-info' };
  if (!profile.farmName.trim() || profile.acres <= 0 || profile.primaryCrops.length === 0)
    return { text: 'Add your farm name, size and crops', href: '#farm-details' };
  if (!profile.verification.phone)
    return { text: 'Verify your phone number', href: '/settings/verification' };
  if (!profile.verification.location)
    return { text: 'Save your farm location', href: '/settings/verification' };
  if (!profile.verification.ghanaCard)
    return { text: 'Verify your Ghana Card', href: '/settings/verification' };
  return null;
}

export function AccountHero() {
  const { plan } = useSubscription();
  const profile = useProfileStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const complete = profileCompleteness(profile);
  const step = nextStep(profile);

  const name = profile?.name.trim() || 'New Farmer';
  const place = [profile?.farmName.trim(), profile?.region].filter(Boolean).join(' · ');
  const checks: { label: string; icon: LucideIcon; done: boolean }[] = [
    { label: 'Phone', icon: Smartphone, done: Boolean(profile?.verification.phone) },
    { label: 'Location', icon: MapPin, done: Boolean(profile?.verification.location) },
    { label: 'Ghana Card', icon: BadgeCheck, done: Boolean(profile?.verification.ghanaCard) },
  ];
  const fullyVerified = checks.every((c) => c.done);

  return (
    <section
      aria-labelledby="account-hero-name"
      className="border-border bg-glass shadow-glass @container relative overflow-hidden rounded-3xl border p-5 sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_70%)]"
      />
      <div className="relative grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:items-center">
        <div className="flex min-w-0 flex-col gap-4 @md:flex-row @md:items-center">
          <span aria-hidden="true" className="relative inline-flex shrink-0">
            <ProfileAvatar
              name={name}
              photoDataUrl={profile?.photoDataUrl}
              className="size-20 rounded-3xl text-3xl"
            />
            {fullyVerified && (
              <span className="ring-bg-2 absolute -right-1.5 -bottom-1.5 inline-flex size-7 items-center justify-center rounded-full bg-[#10b981] text-white ring-4">
                <Check size={15} strokeWidth={3} />
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="account-hero-name"
              className="font-display text-text truncate text-2xl leading-tight font-bold @lg:text-3xl"
            >
              {name}
            </h2>
            {place && (
              <p className="text-text-dim mt-1 flex items-center gap-1.5 text-sm">
                <MapPin size={14} aria-hidden="true" className="text-ink-green shrink-0" />
                <span className="truncate">{place}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge color="green">
                <Sprout size={11} aria-hidden="true" />
                {profile?.farmType ?? 'Smallholder'} farmer
              </Badge>
              {profile && profile.acres > 0 && <Badge color="blue">{profile.acres} acres</Badge>}
              {session?.isGuest ? (
                <Badge color="gold">Guest · Demo</Badge>
              ) : (
                <Badge>{plan.name}</Badge>
              )}
              {profile?.primaryCrops.slice(0, 3).map((crop) => (
                <span
                  key={crop}
                  className="border-border bg-glass text-text-dim inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                >
                  <CropIcon crop={cropFromName(crop)} size={12} className="text-ink-green" />
                  {crop}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-border bg-bg-2/50 flex items-center gap-4 rounded-2xl border p-4 @3xl:w-80">
          <ScoreRing value={complete} max={100} label="Profile" size={84} />
          <div className="min-w-0 flex-1">
            <p className="text-text text-sm font-bold">{complete}% complete</p>
            {step ? (
              <Link
                href={step.href}
                className="text-ink-green mt-1 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              >
                {step.text}
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-ink-green mt-1 text-xs font-semibold">Your profile is complete</p>
            )}
            <p className="text-text-mute mt-1 text-[11px] leading-snug">
              A complete profile can add up to 55 points to your credit score.
            </p>
          </div>
        </div>
      </div>

      <ul className="relative mt-5 flex flex-wrap gap-2" aria-label="Verification status">
        {checks.map(({ label, icon: Icon, done }) => (
          <li key={label}>
            <Link
              href="/settings/verification"
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
                done
                  ? 'border-accent/30 bg-accent/10 text-ink-green'
                  : 'border-gold/30 bg-gold/10 text-ink-gold hover:border-gold/60',
              )}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
              {done ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Hourglass size={12} aria-hidden="true" />
              )}
              <span className="sr-only">{done ? 'verified' : 'pending'}</span>
            </Link>
          </li>
        ))}
        <li className="ml-auto hidden @md:block">
          <Link
            href="#personal-info"
            className="border-border bg-glass text-text hover:bg-glass-strong inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors"
          >
            <PencilLine size={13} aria-hidden="true" />
            Edit profile
          </Link>
        </li>
      </ul>
    </section>
  );
}
