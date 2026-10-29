import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { AssistantChat } from '@/components/assistant/assistant-chat';
import { AssistantHero } from '@/components/assistant/assistant-hero';
import { CapabilitiesCard } from '@/components/assistant/capabilities-card';
import { FarmContextCard } from '@/components/assistant/farm-context-card';

export const metadata: Metadata = { title: 'AI Assistant' };

export default function AssistantPage() {
  return (
    <FeatureGate flag="aiAssistant">
      <div className="@container space-y-4">
        <AssistantHero />
        <AssistantChat />
        <details className="border-border bg-glass rounded-2xl border p-4">
          <summary className="text-text focus-visible:outline-accent cursor-pointer rounded text-sm font-semibold">
            About your assistant &amp; farm context
          </summary>
          <aside
            aria-label="Assistant information"
            className="mt-4 grid gap-5 @2xl:grid-cols-2"
          >
            <CapabilitiesCard />
            <FarmContextCard />
          </aside>
        </details>
      </div>
    </FeatureGate>
  );
}
