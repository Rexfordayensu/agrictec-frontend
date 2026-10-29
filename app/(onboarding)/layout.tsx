import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { OnboardingSignOut } from '@/components/onboarding/onboarding-wizard';
import { MaintenanceGate } from '@/components/shared/maintenance-gate';

/**
 * Onboarding: the shared page background (root layout), the brand on top and one centred card
 * (max 640px). No sidebar: the app opens only after the wizard is finished.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <MaintenanceGate>
      <div className="min-h-screen px-4 pt-4 pb-12 sm:pt-6">
        <header className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-3">
          <BrandLogo subtitle="Farm setup" />
          <OnboardingSignOut />
        </header>
        <main className="mx-auto mt-6 w-full max-w-[640px]">{children}</main>
      </div>
    </MaintenanceGate>
  );
}
