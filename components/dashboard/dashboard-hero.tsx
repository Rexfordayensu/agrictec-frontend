'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { profileCompleteness } from '@/lib/profile';
import { useProfileStore } from '@/store/profile-store';

/**
 * The welcome banner: the farmer's own name and how complete their saved profile is (the
 * same measure as Profile & Settings). The photo is decoration only.
 */
export function DashboardHero() {
  const profile = useProfileStore((state) => state.profile);
  const name = profile?.name.trim().split(/\s+/)[0] || 'Farmer';
  const complete = profileCompleteness(profile);
  return (
    <section aria-labelledby="dashboard-welcome" className="dash-hero">
      <div className="dash-hero-photo" aria-hidden="true">
        <Image
          src="/images/loans/farmer-banner.png"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
        />
      </div>
      <div className="dash-hero-copy">
        <p className="dash-hero-eyebrow">Welcome back,</p>
        <h2 id="dashboard-welcome">{name}.</h2>
        <p>
          Grow your records, strengthen your financial profile and get ready for agricultural
          financing.
        </p>
      </div>
      <Link href="/settings/profile" className="dash-hero-profile">
        <span className="dash-hero-profile-icon" aria-hidden="true">
          <Leaf size={20} />
        </span>
        <span className="min-w-0">
          <strong>Farmer Profile</strong>
          <small>{complete}% complete</small>
        </span>
        <span
          className="dash-hero-profile-bar"
          role="progressbar"
          aria-label="Profile completeness"
          aria-valuenow={complete}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${complete}%` }} />
        </span>
      </Link>
    </section>
  );
}
