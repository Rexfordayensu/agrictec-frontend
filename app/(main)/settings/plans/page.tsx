import type { Metadata } from 'next';
import { SettingsSection } from '@/components/settings/settings-section';
import { PlanManager } from '@/components/subscription/plan-manager';

export const metadata: Metadata = { title: 'Plans & billing' };

export default function PlansPage() {
  return (
    <SettingsSection href="/settings/plans">
      <PlanManager />
    </SettingsSection>
  );
}
