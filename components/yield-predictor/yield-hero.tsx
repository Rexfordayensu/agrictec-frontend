'use client';

import { ChartNoAxesCombined } from 'lucide-react';
import { useProfileStore } from '@/store/profile-store';

export function YieldHero() {
  return (
    <header className="yield-hero">
      <span className="yield-hero-icon">
        <ChartNoAxesCombined aria-hidden="true" />
      </span>
      <div>
        <h1>AI Yield Predictor</h1>
        <p>
          Estimate your harvest and income using your crop, farm size and
          <br className="hidden lg:block" /> farming plan.
        </p>
      </div>
    </header>
  );
}

export function YieldFarmSummary() {
  const profile = useProfileStore((s) => s.profile);
  const stats = [
    {
      label: 'Farm size',
      value: profile && profile.acres > 0 ? `${profile.acres} acres` : 'Not set',
    },
    { label: 'Main crop', value: profile?.primaryCrops[0] ?? 'Not set' },
    { label: 'Region', value: profile?.region || 'Not set' },
  ];

  return (
    <details className="border-border bg-glass rounded-2xl border p-4">
      <summary className="text-text focus-visible:outline-accent cursor-pointer rounded text-sm font-semibold">
        Your saved farm details
      </summary>
      <p className="text-text-mute mt-3 text-xs">
        These are your profile details. Use the form above to estimate a different crop or area.
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-text-mute text-xs">{stat.label}</dt>
            <dd className="text-text mt-1 text-sm font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
