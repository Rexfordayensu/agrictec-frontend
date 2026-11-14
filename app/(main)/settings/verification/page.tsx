import '@/components/profile/verification-page.css';
import type { Metadata } from 'next';
import { VerificationChecks } from '@/components/profile/verification-checks';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Verification' };

export default function VerificationSettingsPage() {
  return (
    <div className="verification-reference">
      <SettingsSection href="/settings/verification">
        <VerificationChecks />
      </SettingsSection>
    </div>
  );
}
