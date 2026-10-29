import {
  Bot,
  Bug,
  CloudSun,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { assistantText } from '@/lib/ai/assistant-text';
import type { AssistantReply } from '@/types';

export function MessageContent({
  content,
  isAssistant = true,
}: {
  content: string | AssistantReply;
  isAssistant?: boolean;
}) {
  const text = isAssistant ? assistantText : (value: string) => value;
  if (typeof content === 'string') {
    return <p className="whitespace-pre-wrap">{text(content)}</p>;
  }

  const Icon = /credit/i.test(content.title)
    ? ShieldCheck
    : /financ/i.test(content.title)
      ? Wallet
      : /weather/i.test(content.title)
        ? CloudSun
        : /pest|armyworm/i.test(content.title)
          ? Bug
          : /fertiliz/i.test(content.title)
            ? FlaskConical
            : /prices/i.test(content.title)
              ? TrendingUp
              : /maize|cassava/i.test(content.title)
                ? Sprout
                : Bot;
  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 font-bold">
        <Icon size={17} aria-hidden="true" className="text-ink-green mt-0.5 shrink-0" />
        {text(content.title)}
      </p>
      {content.intro && <p className="text-text-dim whitespace-pre-wrap">{text(content.intro)}</p>}
      {content.bullets && content.bullets.length > 0 && (
        <ul className="list-disc space-y-2 pl-5">
          {content.bullets.map((bullet, index) => (
            <li key={index} className="text-text-dim marker:text-accent">
              {text(bullet)}
            </li>
          ))}
        </ul>
      )}
      {content.tip && (
        <div className="border-accent/15 bg-accent/5 flex gap-2.5 rounded-xl border p-3 text-xs leading-relaxed">
          <Lightbulb size={16} aria-hidden="true" className="text-ink-green mt-0.5 shrink-0" />
          <p className="text-text-dim">
            <span className="font-semibold">Tip: </span>
            {text(content.tip)}
          </p>
        </div>
      )}
    </div>
  );
}
