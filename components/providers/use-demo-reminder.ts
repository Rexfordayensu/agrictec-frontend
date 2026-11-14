'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { currentDemo } from '@/lib/demo';
import { msUntilDemoReminder, takeDemoReminder } from '@/lib/demo-reminder';
import { useAuthStore } from '@/store/auth-store';

/**
 * Every 10 minutes of the guest demo: a reminder to create a free account, each time with
 * something an account adds (lib/demo-reminder.ts). A hidden tab waits until the guest is back,
 * and only one reminder is on screen at a time.
 */
export function useDemoReminder(enabled: boolean): void {
  useEffect(() => {
    const { session, impersonation } = useAuthStore.getState();
    if (!enabled || !session?.isGuest || impersonation) return;
    let timer: number | undefined;
    let waiting = false;

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(show, msUntilDemoReminder());
    };

    function show() {
      if (!currentDemo()) return;
      if (document.visibilityState !== 'visible') {
        waiting = true;
        return;
      }
      waiting = false;
      const reminder = takeDemoReminder();
      toast.info(reminder.title, {
        id: 'demo-reminder',
        description: reminder.body,
        duration: 15_000,
        action: {
          label: 'Create account',
          // A full page load on purpose: leaving the demo starts the sign-up from a clean app.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          onClick: () => window.location.assign('/signup'),
        },
      });
      schedule();
    }

    const onVisible = () => {
      if (waiting && document.visibilityState === 'visible') show();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}
