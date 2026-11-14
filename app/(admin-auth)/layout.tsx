import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Lock } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import '@/components/admin/auth/admin-login.css';

export const metadata: Metadata = {
  title: { default: 'AgriCtec Admin', template: '%s | AgriCtec Admin' },
  robots: { index: false, follow: false },
};

/** Two glowing arcs of light: from the left edge up to the top, and up from the bottom-right. */
function LightCurves() {
  return (
    <svg
      className="admin-login-curves"
      viewBox="0 0 1672 941"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="admin-curve-top" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2ee59d" stopOpacity="0" />
          <stop offset="0.35" stopColor="#2ee59d" stopOpacity="0.9" />
          <stop offset="0.8" stopColor="#2ee59d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2ee59d" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="admin-curve-bottom" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2ee59d" stopOpacity="0" />
          <stop offset="0.45" stopColor="#2ee59d" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2ee59d" stopOpacity="0.35" />
        </linearGradient>
        <filter id="admin-curve-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id="admin-curve-haze"
          filterUnits="userSpaceOnUse"
          x="-400"
          y="-400"
          width="2500"
          height="1750"
        >
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>
      {/* A soft green haze behind each arc. */}
      <path
        d="M -40 330 C 140 210 330 110 600 -40"
        stroke="#1fb87a"
        strokeOpacity="0.16"
        strokeWidth="120"
        fill="none"
        filter="url(#admin-curve-haze)"
      />
      <path
        d="M 1000 990 C 1240 800 1440 700 1712 620"
        stroke="#1fb87a"
        strokeOpacity="0.12"
        strokeWidth="110"
        fill="none"
        filter="url(#admin-curve-haze)"
      />
      {/* The arcs themselves, each with a fainter twin. */}
      <path
        d="M -20 340 C 150 220 330 120 590 -20"
        stroke="url(#admin-curve-top)"
        strokeWidth="2"
        fill="none"
        filter="url(#admin-curve-glow)"
      />
      <path
        d="M -20 300 C 170 190 360 100 640 -20"
        stroke="url(#admin-curve-top)"
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M 1020 961 C 1250 790 1450 690 1692 630"
        stroke="url(#admin-curve-bottom)"
        strokeWidth="2"
        fill="none"
        filter="url(#admin-curve-glow)"
      />
      <path
        d="M 1100 961 C 1310 815 1490 735 1692 690"
        stroke="url(#admin-curve-bottom)"
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

/**
 * The staff sign-in door: only reached through ADMIN_PATH (proxy.ts), separate from the farmer
 * login, always in the dark staff look.
 */
export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="admin-login-screen" data-theme="dark">
      <LightCurves />
      <div className="admin-login-content animate-fade-in">
        <header className="admin-login-brand">
          <BrandLogo className="admin-login-logo" />
        </header>
        <section className="admin-login-card" aria-label="Staff sign-in">
          {children}
        </section>
        <p className="admin-login-footnote">
          <Lock aria-hidden="true" />
          Authorized staff only.
        </p>
      </div>
    </main>
  );
}
