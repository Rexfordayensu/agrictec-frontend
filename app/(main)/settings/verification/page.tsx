import '@/components/profile/verification-page.css';
import type { Metadata } from 'next';
import { IdentityVerificationCard } from '@/components/profile/identity-verification-card';
import { VerificationGrid } from '@/components/profile/verification-grid';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Verification' };

export default function VerificationSettingsPage() {
  return (
    <div className="verification-reference">
      <SettingsSection href="/settings/verification">
        <IdentityVerificationCard />
        <VerificationGrid />
      </SettingsSection>
    </div>
  );
}
