import type { Metadata } from 'next';
import { AccountSettings } from '@/components/settings/account-settings';
import { DataSettings } from '@/components/settings/data-settings';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Account & data' };

export default function AccountSettingsPage() {
  return (
    <SettingsSection href="/settings/account">
      <div className="grid grid-cols-1 items-start gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <AccountSettings />
        <DataSettings />
      </div>
    </SettingsSection>
  );
}
