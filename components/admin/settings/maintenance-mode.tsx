'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Construction, Eye, Save } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard } from '@/components/admin/settings/settings-card';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { MaintenanceScreen } from '@/components/shared/maintenance-screen';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { fromLocalInput, toLocalInput } from '@/lib/admin/announcements';
import { cn } from '@/lib/utils';
import { configService } from '@/services/admin/config.service';
import type { FeatureFlags } from '@/types/admin';

const MESSAGE_MAX = 300;

/**
 * Maintenance mode: farmers see the maintenance screen instead of the app (the console keeps
 * working). A message, an optional automatic end time and a live preview of what farmers see.
 */
export function MaintenanceModeCard({
  flags,
  onSaved,
}: {
  flags: FeatureFlags;
  onSaved: (flags: FeatureFlags) => void;
}) {
  const [on, setOn] = useState(flags.maintenanceMode);
  const [message, setMessage] = useState(flags.maintenanceMessage);
  const [endsAt, setEndsAt] = useState(
    flags.maintenanceEndsAt ? toLocalInput(flags.maintenanceEndsAt) : '',
  );
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => new Date());

  const endsIso = fromLocalInput(endsAt);
  const endError =
    on && endsAt && (!endsIso || endsIso <= now.toISOString())
      ? 'Pick a time in the future.'
      : null;
  const dirty =
    on !== flags.maintenanceMode ||
    message.trim() !== flags.maintenanceMessage ||
    (on ? endsIso : undefined) !== flags.maintenanceEndsAt;

  async function save() {
    setSaving(true);
    try {
      const saved = await configService.saveFlags({
        ...flags,
        maintenanceMode: on,
        maintenanceMessage: message.trim(),
        maintenanceEndsAt: on && endsIso ? endsIso : undefined,
      });
      onSaved(saved);
      toast.success(on ? 'Maintenance mode is on' : 'Maintenance mode is off', {
        description: on
          ? 'Farmers now see the maintenance screen.'
          : 'Farmers can use the app again.',
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save');
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <SettingsCard
      id="maintenance"
      icon={Construction}
      title="Maintenance mode"
      description="While it is on, farmers see a maintenance screen instead of the app. The admin console keeps working."
      aside={
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase',
            flags.maintenanceMode ? 'bg-danger/15 text-ink-red' : 'bg-accent/15 text-ink-green',
          )}
        >
          {flags.maintenanceMode ? 'On' : 'Off'}
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-xl border px-4 py-3',
              on ? 'border-danger/40 bg-danger/8' : 'border-border',
            )}
          >
            <div>
              <p className="text-text text-sm font-semibold">Maintenance mode</p>
              <p className="text-text-mute text-xs">
                {on ? 'Farmers will be locked out when you save.' : 'Farmers use the app normally.'}
              </p>
            </div>
            <Switch checked={on} onChange={setOn} label="Maintenance mode" />
          </div>

          <label className="block">
            <span className="text-text-dim mb-1.5 flex items-center justify-between text-xs font-semibold">
              Message for farmers
              <span
                className={cn(
                  'font-normal tabular-nums',
                  message.length > MESSAGE_MAX - 30 ? 'text-ink-gold' : 'text-text-mute',
                )}
              >
                {message.length}/{MESSAGE_MAX}
              </span>
            </span>
            <textarea
              rows={4}
              maxLength={MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border-border bg-bg-2 text-text focus:border-purple/70 w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="text-text-dim mb-1.5 block text-xs font-semibold">
              Auto-end at (optional)
            </span>
            <input
              type="datetime-local"
              disabled={!on}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              aria-invalid={endError ? true : undefined}
              className={cn(
                'bg-bg-2 text-text focus:border-purple/70 min-h-11 w-full rounded-xl border px-3.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60',
                endError ? 'border-danger' : 'border-border',
              )}
            />
            <span
              className={cn(
                'mt-1.5 block text-xs',
                endError ? 'text-ink-red font-semibold' : 'text-text-mute',
              )}
            >
              {endError ??
                (endsIso
                  ? `Farmers get the app back on ${format(new Date(endsIso), "d MMM 'at' HH:mm")}.`
                  : 'Leave empty to switch it off yourself.')}
            </span>
          </label>

          <div className="flex justify-end">
            <Button
              icon={Save}
              loading={saving}
              disabled={!dirty || Boolean(endError) || message.trim().length === 0}
              onClick={() => (on && !flags.maintenanceMode ? setConfirming(true) : void save())}
              className={PRIMARY_CLASS}
            >
              Save maintenance settings
            </Button>
          </div>
        </div>

        <figure className="m-0 min-w-0">
          <figcaption className="text-text-mute mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
            <Eye size={13} aria-hidden="true" />
            What farmers see
          </figcaption>
          {/* The real farmer screen, scaled down. */}
          <div
            aria-hidden="true"
            className="border-border bg-bg-1 pointer-events-none relative h-80 overflow-hidden rounded-2xl border"
          >
            <div className="absolute top-0 left-1/2 w-[200%] origin-top -translate-x-1/2 scale-50">
              <MaintenanceScreen message={message.trim() || 'Your message appears here.'} />
            </div>
          </div>
        </figure>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Turn on maintenance mode?"
        message="Every farmer will see the maintenance screen until you turn it off (or until the end time). Anyone in the middle of something will be interrupted."
        confirmLabel="Turn on"
        danger
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void save()}
      />
    </SettingsCard>
  );
}
