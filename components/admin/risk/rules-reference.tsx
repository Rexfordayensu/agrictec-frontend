'use client';

import { useId, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { RULE_ICONS, SeverityDot } from '@/components/admin/risk/risk-meta';
import { RISK_RULES } from '@/lib/admin/risk-rules';
import { cn } from '@/lib/utils';

/**
 * The seven rules in plain language, so support staff know why something was flagged and what
 * to check before deciding. Collapsed by default.
 */
export function RulesReference() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="border-border bg-glass rounded-2xl border">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left"
        >
          <span className="bg-purple/12 text-ink-purple inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
            <BookOpen size={17} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text block text-sm font-semibold">How the rules work</span>
            <span className="text-text-mute block text-xs">
              What each of the {RISK_RULES.length} rules looks for, and what to check before
              deciding.
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn('text-text-mute shrink-0 transition-transform', open && 'rotate-180')}
          />
        </button>
      </h2>
      <div id={id} hidden={!open} className="border-border border-t">
        <ul className="divide-border divide-y">
          {RISK_RULES.map((rule) => {
            const Icon = RULE_ICONS[rule.id];
            return (
              <li key={rule.id} className="flex gap-4 px-5 py-4">
                <span className="bg-glass-strong text-text-dim inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-text text-sm font-semibold">{rule.label}</h3>
                    <SeverityDot severity={rule.severity} showLabel />
                  </div>
                  <p className="text-text-dim mt-1 text-sm">{rule.explanation}</p>
                  <p className="text-text-mute mt-1.5 text-xs leading-relaxed">{rule.guidance}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
