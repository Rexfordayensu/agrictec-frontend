'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** A friendly error inside the console shell, with "Try again" (re-renders the page). */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <Card padding="lg" className="mx-auto mt-6 max-w-lg text-center" role="alert">
      <div className="bg-gold/15 text-ink-gold mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
        <AlertTriangle size={26} aria-hidden="true" />
      </div>
      <h2 className="text-text text-lg font-semibold">Something went wrong on this page</h2>
      <p className="text-text-dim mx-auto mt-2 max-w-sm text-sm">
        Nothing was changed. Try again, or go back to the overview.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button icon={RotateCcw} onClick={reset}>
          Try again
        </Button>
        <Link
          href="/admin"
          className="border-border bg-glass text-text hover:bg-glass-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition-colors"
        >
          Back to Overview
        </Link>
      </div>
    </Card>
  );
}
