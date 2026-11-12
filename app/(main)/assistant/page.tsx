import type { Metadata } from 'next';
import '@/components/assistant/assistant-page.css';
import { FeatureGate } from '@/components/shared/feature-gate';
import { AssistantChat } from '@/components/assistant/assistant-chat';
import { AssistantHero } from '@/components/assistant/assistant-hero';
import { AssistantSidebar } from '@/components/assistant/assistant-sidebar';

export const metadata: Metadata = { title: 'AI Assistant' };

/**
 * The assistant: a greeting, the conversation (saved on the server) and, beside it, the farmer's
 * own figures, a personalised next step and popular topics.
 */
export default function AssistantPage() {
  return (
    <FeatureGate flag="aiAssistant">
      <div className="assistant-reference @container">
        <div className="assistant-layout grid grid-cols-1 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="assistant-main min-w-0 space-y-5">
            <AssistantHero />
            <AssistantChat />
          </div>
          <AssistantSidebar />
        </div>
      </div>
    </FeatureGate>
  );
}
