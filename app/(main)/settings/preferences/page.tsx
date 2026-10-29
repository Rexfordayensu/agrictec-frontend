import type { Metadata } from 'next';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'Preferences' };

export default function PreferencesSettingsPage() {
  return (
    <SettingsSection href="/settings/preferences">
      <div className="grid grid-cols-1 items-start gap-5 @3xl:grid-cols-2">
        <AppearanceSettings />
        <NotificationSettings />
      </div>
    </SettingsSection>
  );
}
