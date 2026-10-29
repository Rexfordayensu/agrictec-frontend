import type { Metadata } from 'next';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

export const metadata: Metadata = { title: 'Set up your farm' };

/** After sign-up (or a sign-in with setup unfinished): the six-step farm setup. */
export default function OnboardingPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="sr-only">Set up your farm</h1>
      <OnboardingWizard />
    </div>
  );
}
