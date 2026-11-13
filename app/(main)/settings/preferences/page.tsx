import type { Metadata } from 'next';
import { PreferencesView } from '@/components/settings/preferences-view';

export const metadata: Metadata = { title: 'Preferences' };

export default function PreferencesSettingsPage() {
  return <PreferencesView />;
}
