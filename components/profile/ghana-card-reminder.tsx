'use client';

import { useEffect, useState } from 'react';
import { BellRing, IdCard, ShieldCheck } from 'lucide-react';
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
import { identityService } from '@/services/identity.service';
import { sessionStore, userKey } from '@/services/storage';
import { useAuthStore } from '@/store/auth-store';
import { useModalStore } from '@/store/modal-store';
import { useProfileStore } from '@/store/profile-store';

const scheduleKey = (userId: string) => userKey(userId, 'ghana-card-reminder');
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
        size="md"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={notNow}>
              Not now
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="ghost" icon={BellRing} onClick={later}>
                Remind me later
              </Button>
              <Button icon={ShieldCheck} onClick={verify}>
                Verify now
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex gap-4">
          <span className="bg-gold/20 text-ink-gold inline-flex size-12 shrink-0 items-center justify-center rounded-2xl">
            <IdCard size={22} aria-hidden="true" />
          </span>
          <div className="text-text-dim space-y-2 text-sm leading-relaxed">
            {rejected ? (
              <p>
                Your last Ghana Card was not accepted
                {rejectedReason ? `: ${rejectedReason.replace(/\.$/, '')}` : ''}. Submit it again
                so lenders can consider your applications.
              </p>
            ) : (
              <p>
                Your Ghana Card must be reviewed by AgriCtec before you can apply for a loan. It
                takes about a minute: enter your card number, and an AgriCtec reviewer checks it,
                usually within one working day.
              </p>
            )}
            <p className="text-text-mute text-xs">
              Everything else in AgriCtec works without it. Your full card number is never stored.
            </p>
          </div>
        </div>
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
