'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  HandCoins,
  Leaf,
  ShieldCheck,
  Smartphone,
  Sprout,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { guestSawTour, recordTourSeen, tourSteps, type TourStepId } from '@/lib/tour';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useModalStore } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTourStore } from '@/store/tour-store';

const ICONS: Record<TourStepId, LucideIcon> = {
  welcome: Sprout,
  records: Leaf,
  momo: Smartphone,
  score: BarChart3,
  loans: HandCoins,
  settings: ShieldCheck,
};

/** Room around the highlighted item, the gap to the card, and the screen margin. */
const PAD = 6;
const GAP = 12;
const EDGE = 16;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The first matching element that is actually on screen (a phone hides the sidebar). */
function findTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
    }
  }
  return null;
}

/** Where the card goes: beside the item on a wide screen, above or below it on a phone. */
function placeCard(target: Box | null, card: { width: number; height: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - card.width - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - card.height - EDGE);
  if (!target) return { top: clampY((vh - card.height) / 2), left: clampX((vw - card.width) / 2) };
  const right = target.left + target.width + PAD + GAP;
  if (vw >= 640 && right + card.width <= vw - EDGE)
    return { top: clampY(target.top + target.height / 2 - card.height / 2), left: right };
  const below = target.top + target.height + PAD + GAP;
  const top =
    below + card.height <= vh - EDGE || target.top < vh / 2
      ? below
      : target.top - PAD - GAP - card.height;
  return { top: clampY(top), left: clampX(target.left + target.width / 2 - card.width / 2) };
}

/**
 * The app tour (lib/tour.ts): six short steps, each lighting up the real place on the screen
 * with an explanation beside it. Skip, Back and Next on every step; Esc skips, the arrow keys
 * move. It opens once for a new farmer and at the start of a guest demo, on the dashboard.
 */
export function AppTour() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const impersonating = useAuthStore((s) => s.impersonation !== null);
  const settingsReady = useSettingsStore((s) => s.status === 'ready');
  const tourSeenAt = useSettingsStore((s) => s.tourSeenAt);
  const loans = usePlatformStore((s) => s.flags.loans);
  const { open, step, pending, start, go, close } = useTourStore();
  const guest = session?.isGuest === true;
  const steps = useMemo(() => tourSteps({ guest, loans }), [guest, loans]);
  const startedOnce = useRef(false);

  // Opens by itself once, on the dashboard: a new farmer, or a guest starting the demo.
  const due =
    pathname === '/dashboard' &&
    !!session &&
    !impersonating &&
    (guest ? !guestSawTour() : settingsReady && !tourSeenAt);
  useEffect(() => {
    if (!due || open || startedOnce.current) return;
    startedOnce.current = true;
    const timer = window.setTimeout(start, 900);
    return () => window.clearTimeout(timer);
  }, [due, open, start]);

  // A replay asked from another page opens once the dashboard (with the score card) is shown.
  useEffect(() => {
    if (!pending || pathname !== '/dashboard') return;
    const timer = window.setTimeout(start, 600);
    return () => window.clearTimeout(timer);
  }, [pending, pathname, start]);

  // Leaving the dashboard (a link in the dimmed page can't be reached, but the back button can).
  useEffect(() => {
    if (open && pathname !== '/dashboard') close();
  }, [open, pathname, close]);

  if (!open || impersonating || !session) return null;
  const current = steps[Math.min(step, steps.length - 1)];
  return (
    <TourStepView
      key={current.id}
      index={Math.min(step, steps.length - 1)}
      total={steps.length}
      step={current}
      guest={guest}
      onBack={() => go(Math.max(0, step - 1))}
      onNext={() => go(step + 1)}
      onEnd={(after) => {
        close();
        // Finished or skipped: not again by itself (a farmer's account, or this demo's phone).
        useSettingsStore.setState({ tourSeenAt: new Date().toISOString() });
        recordTourSeen(guest)
          .then((saved) => {
            if (saved) useSettingsStore.setState({ tourSeenAt: saved.tourSeenAt ?? null });
          })
          .catch(() => {});
        after?.();
      }}
    />
  );
}

function TourStepView({
  index,
  total,
  step,
  guest,
  onBack,
  onNext,
  onEnd,
}: {
  index: number;
  total: number;
  step: ReturnType<typeof tourSteps>[number];
  guest: boolean;
  onBack: () => void;
  onNext: () => void;
  onEnd: (after?: () => void) => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<Box | null>(null);
  const [found, setFound] = useState(true);
  const [card, setCard] = useState({ width: 360, height: 260 });
  const last = index === total - 1;
  const Icon = guest && step.id === 'settings' ? UserPlus : ICONS[step.id];

  // Bring the item into view, then follow it while the page moves (scroll, resize, animation).
  useEffect(() => {
    const el = step.targets.length ? findTarget(step.targets) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    let frame = 0;
    const follow = () => {
      const now = step.targets.length ? findTarget(step.targets) : null;
      const r = now?.getBoundingClientRect();
      setFound(!step.targets.length || !!now);
      setTarget((prev) => {
        if (!r) return prev === null ? prev : null;
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        return prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.height === next.height
          ? prev
          : next;
      });
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCard({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEnd();
      else if (e.key === 'ArrowRight' && !last) onNext();
      else if (e.key === 'ArrowLeft' && index > 0) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, last, onBack, onNext, onEnd]);

  const place = typeof window === 'undefined' ? { top: 0, left: 0 } : placeCard(target, card);

  return (
    <div className="fixed inset-0 z-[90]" data-app-tour>
      {/* The page is dimmed except the item this step is about; clicks don't reach it. */}
      {target ? (
        <div
          aria-hidden="true"
          className="ring-accent pointer-events-none fixed rounded-2xl ring-2 transition-all duration-200"
          style={{
            top: target.top - PAD,
            left: target.left - PAD,
            width: target.width + PAD * 2,
            height: target.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(3, 12, 9, 0.74)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(3,12,9,0.74)]" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="border-border bg-bg-2 fixed w-[min(22.5rem,calc(100vw-2rem))] rounded-2xl border p-5 shadow-2xl transition-[top,left] duration-200"
        style={{ top: place.top, left: place.left }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-text-mute text-xs font-semibold" aria-live="polite">
            Step {index + 1} of {total}
          </p>
          <button
            type="button"
            onClick={() => onEnd()}
            className="text-text-mute hover:text-text inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold"
          >
            Skip tour <X size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2 flex items-start gap-3">
          <IconTile icon={Icon} />
          <div className="min-w-0">
            <h2 id={titleId} className="text-text text-lg leading-tight font-bold">
              {step.title}
            </h2>
            <p id={bodyId} className="text-text-dim mt-1.5 text-sm leading-relaxed">
              {step.body}
              {!found && step.elsewhere ? ` ${step.elsewhere}` : ''}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'bg-accent w-5' : 'bg-border w-1.5',
              )}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          {last ? (
            guest ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => onEnd()}>
                  Keep exploring
                </Button>
                <Button
                  ref={primaryRef}
                  size="sm"
                  // A full page load on purpose: leaving the demo starts the sign-up clean.
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  onClick={() => onEnd(() => window.location.assign('/signup'))}
                >
                  Create a free account
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => onEnd()}>
                  Finish
                </Button>
                <Button
                  ref={primaryRef}
                  size="sm"
                  onClick={() => onEnd(() => useModalStore.getState().openModal('record'))}
                >
                  Add your first record
                </Button>
              </>
            )
          ) : (
            <Button ref={primaryRef} size="sm" onClick={onNext}>
              {index === 0 ? 'Show me around' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
