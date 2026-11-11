'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatGhanaDate } from '@/lib/format';
import { adminIdentityService, type IdentityReviewItem } from '@/services/admin/identity.service';

/**
 * Ghana Card identity checks the provider left for review. An admin can only close one as not
 * verified (with a reason, audited): verifying an identity is the provider's answer alone.
 * Shown only when something is waiting.
 */
export function IdentityReviewQueue() {
  const [items, setItems] = useState<IdentityReviewItem[]>([]);
  const [closing, setClosing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await adminIdentityService.reviewQueue());
    } catch {
      // The verifications table below reports connection problems; this panel just stays empty.
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function close(id: string) {
    setBusy(true);
    try {
      await adminIdentityService.close(id, note);
      toast.success('Check closed as not verified');
      setClosing(null);
      setNote('');
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not close the check');
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="identity-queue-title"
      className="border-gold/35 bg-gold/8 mb-5 rounded-2xl border p-5"
    >
      <h2 id="identity-queue-title" className="text-text flex items-center gap-2 font-semibold">
        <Fingerprint size={17} aria-hidden="true" className="text-ink-gold" />
        Ghana Card identity checks needing review ({items.length})
      </h2>
      <p className="text-text-dim mt-1 text-xs">
        The identity provider could not decide these. Only the provider can verify an identity:
        you can close a check as not verified, and the farmer can try again.
      </p>
      <ul className="divide-border mt-3 divide-y">
        {items.map((item) => (
          <li key={item.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-text text-sm">
                <span className="font-semibold">{item.farmer}</span> · attempt {item.attemptCount} ·
                started {formatGhanaDate(item.initiatedAt)}
                {item.simulated ? ' · simulated' : ''}
              </span>
              {closing !== item.id && (
                <Button size="sm" variant="ghost" onClick={() => setClosing(item.id)}>
                  Close as not verified
                </Button>
              )}
            </div>
            {closing === item.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why (kept in the audit log)"
                  aria-label="Reason for closing the check"
                  className="border-border bg-bg-2 text-text min-h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm"
                />
                <Button size="sm" loading={busy} disabled={note.trim().length < 3} onClick={() => void close(item.id)}>
                  Close check
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setClosing(null)}>
                  Cancel
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
