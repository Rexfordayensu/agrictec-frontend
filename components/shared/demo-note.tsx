'use client';

import Link from 'next/link';
import { ArrowRight, UserPlus } from 'lucide-react';
import { IconTile } from '@/components/ui/icon-tile';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

/** True in the guest demo (lib/demo.ts): no account, so nothing is stored or worked out for it. */
export function useDemo(): boolean {
  return useAuthStore((s) => s.session?.isGuest === true && s.impersonation === null);
}

/**
 * Stands in, in the guest demo, for a section whose figures the server works out from a farmer's
 * own account (score, totals, reviews). Never invented numbers: it says what the section shows
 * and offers to create the account it needs.
 */
export function DemoNote({
  title,
  children,
  className,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** One line, for a small card or a strip above a list. */
  compact?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'border-border bg-glass rounded-2xl border',
        compact ? 'flex flex-wrap items-center gap-3 p-4' : 'flex flex-col items-start gap-3 p-5',
        className,
      )}
    >
      {/* At least 16rem wide: on a phone the button wraps below instead of squeezing the text. */}
      <div className="flex min-w-[min(100%,16rem)] flex-1 items-start gap-3">
        <IconTile icon={UserPlus} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0">
          <h2 className="text-text text-sm font-semibold">{title}</h2>
          <p className="text-text-dim mt-0.5 text-sm">{children}</p>
        </div>
      </div>
      <Link
        href="/signup"
        className="bg-accent inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-[#022c22]"
      >
        Create a free account <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}
