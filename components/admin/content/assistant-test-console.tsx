'use client';

import { useId, useState } from 'react';
import { CircleSlash, Play, Sparkles } from 'lucide-react';
import { MessageBubble } from '@/components/assistant/message-bubble';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { contextFor, matchedKeyword } from '@/lib/admin/assistant-kb';
import { resolveAssistantReply, type ResolvedReply } from '@/lib/ai/assistant-replies';
import type {
  AssistantKnowledgeItem,
  CreditConfig,
  CropContent,
  FarmerAccount,
} from '@/types/admin';

const SAMPLES = [
  'When should I plant maize?',
  'How do I improve my credit score?',
  'Tell me about irrigation',
];

/**
 * Ask a question as a sample farmer and see which reply answers (or that the fallback does),
 * rendered exactly as the farmer would get it. Uses the knowledge as it is on this page.
 */
export function AssistantTestConsole({
  knowledge,
  farmers,
  crops,
  bands,
}: {
  knowledge: AssistantKnowledgeItem[];
  farmers: FarmerAccount[];
  crops: CropContent[];
  bands?: CreditConfig['bands'];
}) {
  const id = useId();
  const people = farmers.filter((f) => !f.isGuest);
  const [question, setQuestion] = useState('Tell me about irrigation');
  const [farmerId, setFarmerId] = useState(people[0]?.userId ?? '');
  const [result, setResult] = useState<
    (ResolvedReply & { question: string; keyword: string | null }) | null
  >(null);
  const [running, setRunning] = useState(false);
  const farmer = people.find((f) => f.userId === farmerId);

  async function run(text = question) {
    if (!text.trim()) return;
    setRunning(true);
    try {
      const resolved = await resolveAssistantReply(text, contextFor(farmer, bands), {
        knowledge,
        crops,
      });
      setResult({
        ...resolved,
        question: text,
        keyword: resolved.item ? matchedKeyword(resolved.item, text) : null,
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-border bg-glass rounded-2xl border p-5"
    >
      <h2 id={`${id}-title`} className="text-text flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} aria-hidden="true" className="text-ink-purple" />
        Test console
      </h2>
      <p className="text-text-mute mt-0.5 text-xs">
        Uses the replies on this page, as a farmer would get them.
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <label className="block">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">Ask as</span>
          <Select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
            {people.map((f) => (
              <option key={f.userId} value={f.userId}>
                {f.profile.name || f.email} · {f.profile.region}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">Question</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
            placeholder="Type a farmer’s question"
            className="border-border bg-bg-2 text-text focus:border-purple/70 placeholder:text-text-mute min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" icon={Play} loading={running} className={PRIMARY_CLASS}>
            Ask
          </Button>
          {SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuestion(sample);
                void run(sample);
              }}
              className="border-border text-text-dim hover:bg-glass-strong rounded-lg border px-2 py-1 text-[11px] transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      {result && (
        <div className="mt-5 space-y-3" aria-live="polite">
          {result.item ? (
            <p className="bg-accent/10 text-ink-green flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2 text-xs">
              <span className="font-semibold">Matched “{result.item.reply.title}”</span>
              {result.keyword && (
                <>
                  via keyword{' '}
                  <span className="bg-accent/15 rounded px-1.5 py-0.5 font-mono">
                    {result.keyword}
                  </span>
                </>
              )}
            </p>
          ) : (
            <p className="bg-gold/10 text-ink-gold flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
              <CircleSlash size={14} aria-hidden="true" />
              No match → fallback reply
            </p>
          )}
          <div className="border-border bg-bg-1/60 space-y-3 rounded-2xl border p-3">
            <MessageBubble
              message={{
                id: 'q',
                role: 'user',
                content: result.question,
                createdAt: '2026-01-01T09:00:00.000Z',
              }}
            />
            <MessageBubble
              message={{
                id: 'a',
                role: 'ai',
                content: result.reply,
                createdAt: '2026-01-01T09:00:01.000Z',
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
