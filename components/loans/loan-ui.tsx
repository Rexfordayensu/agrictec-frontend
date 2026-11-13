'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LoanAction } from '@/lib/loans/loan-path';
import { cn } from '@/lib/utils';
import { useLoanStore } from '@/store/loan-store';

/** The look the redesigned dashboard uses, shared by every section of /loans. */
export const loanUi = {
  panel: 'border-border bg-glass min-w-0 rounded-card border p-5 sm:p-6',
  eyebrow: 'text-ink-green text-xs font-semibold tracking-[1.6px] uppercase',
  title: 'text-text text-lg font-semibold',
  sub: 'text-text-mute mt-1 text-xs leading-relaxed',
  label: 'text-text mb-2.5 text-sm font-semibold',
  link: 'group text-ink-green inline-flex min-h-11 items-center gap-1.5 text-small font-semibold hover:underline',
} as const;

/** The same action as a main button (the page header's next step). */
export function LoanActionButton({
  action,
  className,
}: {
  action: LoanAction;
  className?: string;
}) {
  const router = useRouter();
  const setTab = useLoanStore((s) => s.setTab);
  const setGhanaCardOpen = useLoanStore((s) => s.setGhanaCardOpen);
  return (
    <Button
      icon={ArrowRight}
      className={cn('min-h-12 shrink-0 rounded-[14px]', className)}
      onClick={() => {
        if ('href' in action) router.push(action.href);
        else if (action.run === 'ghana-card') setGhanaCardOpen(true);
        else setTab(action.run);
      }}
    >
      {action.label}
    </Button>
  );
}

/** A next step: a link to another page, or something done here (Ghana Card, compare tab). */
export function LoanActionLink({
  action,
  className,
  onNavigate,
}: {
  action: LoanAction;
  className?: string;
  /** Called before leaving or acting (e.g. to close a dialog). */
  onNavigate?: () => void;
}) {
  const setTab = useLoanStore((s) => s.setTab);
  const setGhanaCardOpen = useLoanStore((s) => s.setGhanaCardOpen);
  const arrow = (
    <ArrowRight
      size={14}
      aria-hidden="true"
      className="transition-transform group-hover:translate-x-0.5"
    />
  );
  if ('href' in action) {
    return (
      <Link href={action.href} onClick={onNavigate} className={cn(loanUi.link, className)}>
        {action.label}
        {arrow}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        if (action.run === 'ghana-card') setGhanaCardOpen(true);
        else setTab(action.run);
      }}
      className={cn(loanUi.link, className)}
    >
      {action.label}
      {arrow}
    </button>
  );
}
