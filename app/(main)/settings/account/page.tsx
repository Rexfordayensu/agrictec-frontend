import '@/components/settings/account-data.css';
import type { Metadata } from 'next';
import { AccountSettings } from '@/components/settings/account-settings';
import { DataSettings } from '@/components/settings/data-settings';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Account & data' };

export default function AccountSettingsPage() {
  return (
    <div className="account-data-reference">
      <SettingsSection
        href="/settings/account"
        description="Manage your account, backups and personal data."
      >
        <div className="account-data-content">
          <AccountSettings />
          <DataSettings />
        </div>
      </SettingsSection>
    </div>
  );
}
