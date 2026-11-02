'use client';

import { useEffect, useState } from 'react';
import { BellOff, BellRing, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard } from '@/components/admin/settings/settings-card';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { alertsService } from '@/services/admin/alerts.service';

type Support = 'yes' | 'no' | 'install-first';

function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(
    text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4),
  );
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(subscription: PushSubscription, publicKey: string): boolean {
  const key = subscription.options.applicationServerKey;
  if (!key) return false;
  const expected = base64UrlToBytes(publicKey);
  const actual = new Uint8Array(key);
  return actual.length === expected.length && actual.every((b, i) => b === expected[i]);
}

/** Web push needs a service worker; on iPhone also an app opened from the home screen. */
function pushSupport(): Support {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !installed) return 'install-first';
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    ? 'yes'
    : 'no';
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

/**
 * Error alerts: a notification on this phone or computer when a request or a background job
 * fails on the server. Each device is turned on separately.
 */
export function ErrorAlertsCard() {
  const [support, setSupport] = useState<Support | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [devices, setDevices] = useState(0);
  const [onHere, setOnHere] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState<'on' | 'off' | 'test' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Browser-only checks, after the first render.
    let alive = true;
    const supported = pushSupport();
    void alertsService
      .status()
      .then(async (status) => {
        const subscription = supported === 'yes' ? await currentSubscription() : null;
        if (!alive) return;
        setSupport(supported);
        setBlocked(supported === 'yes' && Notification.permission === 'denied');
        setPublicKey(status.publicKey);
        setDevices(status.devices);
        setOnHere(Boolean(subscription && sameKey(subscription, status.publicKey)));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (alive)
          setError(cause instanceof Error ? cause.message : 'Could not load error alerts.');
      });
    return () => {
      alive = false;
    };
  }, [version]);

  async function turnOn() {
    if (!publicKey) return;
    setBusy('on');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setBlocked(permission === 'denied');
        toast.error('Notifications were not allowed on this device.');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      // A subscription made with an older key can't receive alerts any more: start afresh.
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      });
      const status = await alertsService.subscribe(subscription.toJSON());
      setDevices(status.devices);
      setOnHere(true);
      toast.success('Error alerts are on for this device', {
        description: 'Send a test alert to check that it arrives.',
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not turn on error alerts.');
    } finally {
      setBusy(null);
    }
  }

  async function turnOff() {
    setBusy('off');
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        const status = await alertsService.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
        setDevices(status.devices);
      }
      setOnHere(false);
      toast.success('Error alerts are off for this device');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not turn off error alerts.');
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy('test');
    try {
      const { sent, failed } = await alertsService.sendTest();
      if (sent > 0)
        toast.success(`Test alert sent to ${sent} ${sent === 1 ? 'device' : 'devices'}`, {
          description: failed ? `${failed} could not be reached.` : 'It should arrive in a moment.',
        });
      else toast.error('The test alert could not be delivered. Turn alerts off and on again.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not send a test alert.');
    } finally {
      setBusy(null);
    }
  }

  if (error)
    return (
      <div role="alert" className="border-danger/30 bg-danger/5 rounded-2xl border p-5">
        <p className="text-ink-red text-sm">{error}</p>
        <Button
          variant="ghost"
          onClick={() => {
            setError(null);
            setVersion((v) => v + 1);
          }}
          className="mt-3"
        >
          Try again
        </Button>
      </div>
    );
  if (support === null || publicKey === null) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <SettingsCard
      id="alerts"
      icon={BellRing}
      title="Error alerts"
      description="Get a notification on this phone or computer when something breaks on the server, so you can act before farmers report it."
      aside={
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase',
            onHere ? 'bg-accent/15 text-ink-green' : 'bg-glass-strong text-text-mute',
          )}
        >
          {onHere ? 'On here' : 'Off here'}
        </span>
      }
    >
      <div className="space-y-5">
        <ul className="text-text-dim marker:text-ink-purple list-disc space-y-1.5 pl-5 text-sm">
          <li>You get an alert when a page or a background job fails on the server.</li>
          <li>
            The same problem alerts you at most once every 15 minutes; the next alert says how many
            times it happened in between.
          </li>
          <li>
            Alerts name what failed, never any farmer&apos;s details. The full details are in the
            server logs on Render.
          </li>
          <li>
            Each phone or computer is turned on separately. You have{' '}
            <strong className="text-text">
              {devices} {devices === 1 ? 'device' : 'devices'}
            </strong>{' '}
            turned on.
          </li>
        </ul>

        {support === 'install-first' && (
          <p className="bg-gold/10 text-ink-gold flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed">
            <Smartphone size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            On iPhone, add AgriCtec to your Home Screen first: tap the Share button, then &quot;Add
            to Home Screen&quot;. Open AgriCtec from the new icon, sign in to the console there, and
            come back to this page.
          </p>
        )}
        {support === 'no' && (
          <p className="bg-gold/10 text-ink-gold rounded-xl p-3 text-xs leading-relaxed">
            This browser can&apos;t receive alerts. Use Chrome, Edge, Firefox or Samsung Internet,
            or Safari on a Mac or iPhone.
          </p>
        )}
        {support === 'yes' && blocked && !onHere && (
          <p className="bg-danger/8 text-ink-red rounded-xl p-3 text-xs leading-relaxed">
            Notifications are blocked for this site. Allow them in your browser&apos;s site settings
            (the lock icon next to the address), then try again.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {onHere ? (
            <>
              <Button
                variant="ghost"
                icon={BellOff}
                loading={busy === 'off'}
                disabled={busy !== null}
                onClick={() => void turnOff()}
              >
                Turn off on this device
              </Button>
              <Button
                icon={Send}
                loading={busy === 'test'}
                disabled={busy !== null}
                onClick={() => void sendTest()}
                className={PRIMARY_CLASS}
              >
                Send a test alert
              </Button>
            </>
          ) : (
            <Button
              icon={BellRing}
              loading={busy === 'on'}
              disabled={busy !== null || support !== 'yes'}
              onClick={() => void turnOn()}
              className={PRIMARY_CLASS}
            >
              Turn on alerts on this device
            </Button>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}
