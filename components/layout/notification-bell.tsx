'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BadgeCheck, CloudRain, Landmark, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { notificationsService, type Inbox } from '@/services/notifications.service';

/** How often the inbox is re-read while the app is open (live events also refresh the app). */
const POLL_MS = 60_000;

const ICONS = {
  verification: BadgeCheck,
  loan: Landmark,
  account: ShieldAlert,
  weather: CloudRain,
  price: TrendingUp,
} as const;

/**
 * The top bar's bell: notices about the farmer's account, newest first. Opening it marks them
 * read (not in the admin's read-only view).
 */
export function NotificationBell({ buttonClassName }: { buttonClassName: string }) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const readOnly = useReadOnly();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      notificationsService.inbox().then(
        (next) => active && setInbox(next),
        () => {
          // Offline for a moment: the next poll catches up.
        },
      );
    void load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, []);

  // Close on a click outside, or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && inbox && inbox.unread > 0 && !readOnly) {
      setInbox({ unread: 0, items: inbox.items.map((n) => ({ ...n, read: true })) });
      void notificationsService.markRead().catch(() => {});
    }
  }

  const unread = inbox?.unread ?? 0;
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        className={buttonClassName}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="bg-danger ring-bg-2 absolute top-2.5 right-2.5 size-2 rounded-full ring-2"
          />
        )}
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="animate-fade-in border-border bg-bg-2 shadow-glass absolute top-full right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-2"
        >
          <p className="text-text border-border border-b px-3 pt-1 pb-2 text-sm font-semibold">
            Notifications
          </p>
          {!inbox || inbox.items.length === 0 ? (
            <p className="text-text-dim px-3 py-6 text-center text-sm">
              Nothing yet. Weather and price alerts, and decisions on your verifications and loans,
              will appear here.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {inbox.items.map((n) => {
                const Icon = ICONS[n.kind as keyof typeof ICONS] ?? Bell;
                const body = (
                  <>
                    <Icon size={16} aria-hidden="true" className="text-ink-green mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="text-text block text-sm font-semibold break-words">
                        {n.title}
                      </span>
                      <span className="text-text-dim block text-xs break-words">{n.body}</span>
                      <span className="text-text-mute mt-1 block text-[11px]">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </>
                );
                const rowClass = cn(
                  'hover:bg-glass-strong flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left',
                  !n.read && 'bg-accent/5',
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={() => setOpen(false)} className={rowClass}>
                        {body}
                      </Link>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
