import type { Metadata } from 'next';
import { AboutCard } from '@/components/settings/about-card';
import { SettingsSection } from '@/components/settings/settings-section';

export const metadata: Metadata = { title: 'About' };

export default function AboutSettingsPage() {
  return (
    <SettingsSection href="/settings/about">
      <AboutCard />
    </SettingsSection>
  );
}
