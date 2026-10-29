'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

/** A temporary password, shown once, with a copy button. It is never stored in plain text. */
export function TempPassword({ password, name }: { password: string; name: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed. Select the password and copy it by hand.');
    }
  }
  return (
    <div className="space-y-3">
      <div className="border-accent/30 bg-accent/8 rounded-2xl border p-4">
        <p className="text-text-mute flex items-center gap-1.5 text-xs font-semibold">
          <KeyRound size={13} aria-hidden="true" />
          Temporary password for {name}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="bg-bg-1 text-text min-w-0 flex-1 rounded-xl px-3.5 py-2.5 font-mono text-base font-bold tracking-wider break-all select-all">
            {password}
          </code>
          <button
            type="button"
            onClick={() => void copy()}
            className="bg-accent/15 text-ink-green hover:bg-accent/25 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold"
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <p className="text-ink-gold flex items-start gap-2 text-xs">
        <TriangleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
        This is the only time it is shown. Share it privately; {name} must choose a new password at
        first sign-in.
      </p>
    </div>
  );
}
