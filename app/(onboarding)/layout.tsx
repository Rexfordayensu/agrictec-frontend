import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { OnboardingSignOut } from '@/components/onboarding/onboarding-wizard';
import { MaintenanceGate } from '@/components/shared/maintenance-gate';
import '@/components/onboarding/onboarding.css';

/**
 * A focused setup workspace with a step guide and one task at a time.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <MaintenanceGate>
      <div className="onboarding-screen" data-theme="dark">
        <a href="#farm-setup" className="onboarding-skip-link">
          Skip to farm setup
        </a>
        <header className="onboarding-topbar">
          <BrandLogo subtitle="Farm setup" />
          <OnboardingSignOut />
        </header>
        <main id="farm-setup" className="onboarding-main" tabIndex={-1}>
          <div className="onboarding-intro">
            <p className="onboarding-eyebrow">GETTING STARTED</p>
            <h1>Let&apos;s set up your farm.</h1>
            <p>A few details to make AgriCtec work for you. Review everything before you finish.</p>
          </div>
          {children}
        </main>
      </div>
    </MaintenanceGate>
  );
}
