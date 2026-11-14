'use client';

import { useEffect, useState } from 'react';
import { Bell, IdCard, ShieldCheck } from 'lucide-react';
import { GhanaCardModal } from '@/components/profile/ghana-card-modal';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useGhanaCardStatus } from '@/hooks/use-ghana-card';
import {
  dismissForVisit,
  msUntilDue,
  needsReminder,
  remindLater,
  startReminder,
  type ReminderState,
} from '@/lib/ghana-card-reminder';
import { useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { identityService } from '@/services/identity.service';
import { sessionStore, userKey } from '@/services/storage';
import { useAuthStore } from '@/store/auth-store';
import { useModalStore } from '@/store/modal-store';
import { useProfileStore } from '@/store/profile-store';

const scheduleKey = (userId: string) => userKey(userId, 'ghana-card-reminder');
/** The three choices: tall, rounded, bold, sharing the row (stacked on phones). */
const choice = 'min-h-13 rounded-2xl border border-border text-base font-bold';
/** A form is open, or the farmer is in another tab: look again shortly. */
const BUSY_RETRY_MS = 15_000;

/**
 * "Verify your Ghana Card": a pop-up one minute after a farmer without a verified card opens
 * AgriCtec. "Remind me later" brings it back every ten minutes while they are in the app; "Not
 * now" stops it until their next visit. It waits while another form is open or the tab is in the
 * background, and stops for good once a card is submitted (under review) or verified.
 */
export function GhanaCardReminder() {
  const status = useGhanaCardStatus();
  const userId = useProfileStore((s) => s.userId);
  const rejectedReason = useProfileStore((s) => s.profile?.ghanaCard.rejectedReason);
  const isGuest = useAuthStore((s) => s.session?.isGuest ?? false);
  const readOnly = useReadOnly();
  const formOpen = useModalStore((s) => s.modal !== null);
  const active = Boolean(userId) && needsReminder(status, { isGuest, readOnly });

  const [schedule, setSchedule] = useState<ReminderState | null>(null);
  const [showing, setShowing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Load (or start) this tab's schedule once the farmer is known.
  useEffect(() => {
    if (!active || !userId) return;
    const saved = sessionStore.get<ReminderState | null>(scheduleKey(userId), null);
    const next = startReminder(saved, Date.now());
    sessionStore.set(scheduleKey(userId), next);
    // Deferred: the schedule comes from browser storage, which the server render can't read.
    const timer = setTimeout(() => setSchedule(next), 0);
    return () => clearTimeout(timer);
  }, [active, userId]);

  // Wait until it is due, then show it (or wait again while a form or another tab has the farmer).
  useEffect(() => {
    if (!active || !schedule || showing || verifying) return;
    const wait = msUntilDue(schedule, Date.now());
    if (wait === null) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const attempt = () => {
      if (formOpen || document.visibilityState !== 'visible') {
        timer = setTimeout(attempt, BUSY_RETRY_MS);
        return;
      }
      // Identity verified with NIA already meets what an AgriCtec review would: no reminder.
      identityService.status().then(
        (identity) => {
          if (cancelled) return;
          if (identity.level === 'nia_verified') setSchedule((s) => (s ? dismissForVisit(s) : s));
          else setShowing(true);
        },
        () => !cancelled && setShowing(true),
      );
    };
    timer = setTimeout(attempt, wait);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, schedule, showing, verifying, formOpen]);

  function save(next: ReminderState) {
    if (userId) sessionStore.set(scheduleKey(userId), next);
    setSchedule(next);
  }

  function later() {
    setShowing(false);
    save(remindLater(Date.now()));
  }

  function notNow() {
    setShowing(false);
    if (schedule) save(dismissForVisit(schedule));
  }

  function verify() {
    setShowing(false);
    setVerifying(true);
  }

  if (!active) return null;
  const rejected = status === 'rejected';

  return (
    <>
      <Modal
        open={showing}
        // Closing it any other way (Esc, the X, the backdrop) counts as "Remind me later".
        onClose={later}
        title={rejected ? 'Submit your Ghana Card again' : 'Add your Ghana Card'}
        size="lg"
        className="rounded-[28px] sm:max-w-[46rem]"
        decoration={<ReminderArt />}
        headerClassName="border-b-0 px-6 pt-7 pb-2 sm:px-10 sm:pt-9"
        titleClassName="text-3xl font-extrabold tracking-tight"
        bodyClassName="px-6 pt-4 pb-0 sm:px-10"
        footerClassName="flex-col-reverse gap-3 border-t-0 px-6 pt-0 pb-7 sm:flex-nowrap sm:gap-4 sm:px-10 sm:pb-9"
        footer={
          <>
            <Button variant="ghost" onClick={notNow} className={cn(choice, 'sm:flex-[1]')}>
              Not now
            </Button>
            <Button
              variant="ghost"
              icon={Bell}
              onClick={later}
              className={cn(choice, 'sm:flex-[1.45]')}
            >
              Remind me later
            </Button>
            <Button
              icon={ShieldCheck}
              onClick={verify}
              className={cn(
                choice,
                'bg-icon-light border-0 bg-none text-white shadow-[0_10px_24px_-10px_rgba(16,130,50,0.7)] hover:bg-[#0d6e2a] sm:flex-[1.55]',
              )}
            >
              {rejected ? 'Submit again' : 'Verify now'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-7">
          <span className="bg-icon-bg text-icon inline-flex size-18 shrink-0 items-center justify-center rounded-2xl">
            <IdCard size={36} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-3">
            {rejected ? (
              <p className="text-text text-base leading-relaxed">
                Your last Ghana Card was not accepted
                {rejectedReason ? `: ${rejectedReason.replace(/\.$/, '')}` : ''}. Submit it again so
                lenders can consider your applications.
              </p>
            ) : (
              <p className="text-text text-base leading-relaxed">
                Your Ghana Card must be reviewed by AgriCtec before you can apply for a loan. It
                takes about a minute: enter your card number, and an AgriCtec reviewer checks it,
                usually within one working day.
              </p>
            )}
            <p className="text-text-dim text-sm leading-relaxed">
              Everything else in AgriCtec works without it. Your full card number is never stored.
            </p>
          </div>
        </div>
        <hr className="border-border mt-7 mb-6" />
      </Modal>
      <GhanaCardModal
        open={verifying}
        onClose={() => {
          setVerifying(false);
          // Closed without sending a card: remind again in ten minutes. A card that was sent is
          // under review now, and the reminder stops on its own.
          save(remindLater(Date.now()));
        }}
      />
    </>
  );
}

/** The corner decoration: a soft green glow over a field, with a seedling. */
function ReminderArt() {
  return (
    <svg
      viewBox="0 0 360 150"
      preserveAspectRatio="xMaxYMin meet"
      className="absolute top-0 right-0 h-[104px] w-[52%] max-w-[340px] [[data-theme=dark]_&]:opacity-25"
    >
      <defs>
        <radialGradient id="gc-glow" cx="72%" cy="35%" r="70%">
          <stop offset="0" stopColor="#bfeccd" stopOpacity="0.75" />
          <stop offset="1" stopColor="#bfeccd" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gc-hill" x1="0" x2="1">
          <stop offset="0" stopColor="#d9f3e2" stopOpacity="0" />
          <stop offset="0.5" stopColor="#cdeed8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d9f3e2" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect width="360" height="150" fill="url(#gc-glow)" />
      <path d="M40 150 Q 170 92 360 104 V150 Z" fill="url(#gc-hill)" />
      <path d="M110 150 Q 220 118 360 128 V150 Z" fill="#c4ead0" opacity="0.55" />
      <path
        d="M192 112 Q 189 88 193 66"
        stroke="#9edcb2"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M192 84 Q 162 80 160 56 Q 186 58 192 84 Z" fill="#a8e2bb" />
      <path d="M193 76 Q 218 52 232 66 Q 218 86 193 76 Z" fill="#a8e2bb" />
    </svg>
  );
}
