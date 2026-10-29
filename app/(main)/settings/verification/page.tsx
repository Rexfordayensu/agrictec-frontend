import type { Metadata } from 'next';
import { VerificationGrid } from '@/components/profile/verification-grid';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Verification' };

export default function VerificationSettingsPage() {
  return (
    <SettingsSection href="/settings/verification">
      <VerificationGrid />
    </SettingsSection>
  );
}
