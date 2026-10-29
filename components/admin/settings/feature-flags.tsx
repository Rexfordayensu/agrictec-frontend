'use client';

import { useState } from 'react';
import {
  Bot,
  FileText,
  HandCoins,
  Sprout,
  Stethoscope,
  Store,
  ToggleRight,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard } from '@/components/admin/settings/settings-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { configService } from '@/services/admin/config.service';
import type { FeatureFlags } from '@/types/admin';

type FlagKey = Exclude<
  keyof FeatureFlags,
  'maintenanceMode' | 'maintenanceMessage' | 'maintenanceEndsAt'
>;

interface FlagMeta {
  label: string;
  icon: LucideIcon;
  description: string;
  /** What farmers see when it is off. */
  whenOff: string;
  /** Turning it off asks first (it locks farmers out of something important). */
  confirmOff?: string;
}

const FLAGS: Record<FlagKey, FlagMeta> = {
  signupOpen: {
    label: 'New sign-ups',
    icon: UserPlus,
    description: 'Anyone can create a farmer account.',
    whenOff: 'The sign-up page says sign-ups are closed. Existing farmers sign in as usual.',
    confirmOff:
      'No new farmer can join until you turn this back on. Existing farmers are not affected.',
  },
  guestMode: {
    label: 'Guest mode',
    icon: UserRound,
    description: 'Try the app with a demo account, without signing up.',
    whenOff: '“Continue as guest” disappears from the sign-in and sign-up pages.',
  },
  aiAssistant: {
    label: 'AI Assistant',
    icon: Bot,
    description: 'The chat assistant for farming and finance questions.',
    whenOff: 'It leaves the menu and quick actions; its page says it is unavailable.',
  },
  cropDoctor: {
    label: 'Crop Doctor',
    icon: Stethoscope,
    description: 'Photo-based crop disease checks.',
    whenOff: 'It leaves the menu and quick actions; its page says it is unavailable.',
  },
  yieldPredictor: {
    label: 'Yield Predictor',
    icon: Sprout,
    description: 'Harvest and revenue estimates per crop.',
    whenOff: 'It leaves the menu; its page says it is unavailable.',
  },
  loans: {
    label: 'Loans & credit',
    icon: HandCoins,
    description: 'Lender offers, eligibility checks and applications.',
    whenOff:
      'Loans leave the menu and quick actions; farmers can’t apply. Sent applications stay with lenders.',
    confirmOff:
      'Farmers will not be able to see offers or apply for loans. Applications already sent are kept.',
  },
  market: {
    label: 'Market & weather',
    icon: Store,
    description: 'The separate Market Prices and Weather pages.',
    whenOff: 'Both leave the menu; each page says it is unavailable.',
  },
  pdfReports: {
    label: 'PDF reports',
    icon: FileText,
    description: 'Downloading financial reports as PDF.',
    whenOff: 'Reports can still be viewed, but the PDF download buttons are hidden.',
  },
};

/**
 * One switch per feature, with what farmers see when it is off. Changes save straight away
 * (audited). Turning off loans or sign-ups asks for confirmation.
 */
export function FeatureFlagsCard({
  flags,
  onSaved,
}: {
  flags: FeatureFlags;
  onSaved: (flags: FeatureFlags) => void;
}) {
  const [saving, setSaving] = useState<FlagKey | null>(null);
  const [confirm, setConfirm] = useState<FlagKey | null>(null);

  async function save(key: FlagKey, on: boolean) {
    setSaving(key);
    try {
      const saved = await configService.saveFlags({ ...flags, [key]: on });
      onSaved(saved);
      toast.success(`${FLAGS[key].label} ${on ? 'turned on' : 'turned off'}`, {
        description: on ? 'Farmers can use it again.' : FLAGS[key].whenOff,
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the setting');
    } finally {
      setSaving(null);
    }
  }

  function toggle(key: FlagKey) {
    const next = !flags[key];
    if (!next && FLAGS[key].confirmOff) setConfirm(key);
    else void save(key, next);
  }

  const keys = Object.keys(FLAGS) as FlagKey[];
  const offCount = keys.filter((key) => !flags[key]).length;

  return (
    <SettingsCard
      id="features"
      icon={ToggleRight}
      title="Feature flags"
      description="Turn parts of the farmer app on or off. Changes apply straight away for every farmer."
      aside={
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            offCount ? 'bg-gold/15 text-ink-gold' : 'bg-accent/15 text-ink-green',
          )}
        >
          {offCount ? `${offCount} off` : 'All on'}
        </span>
      }
    >
      <ul className="divide-border -my-2 divide-y">
        {keys.map((key) => {
          const meta = FLAGS[key];
          const Icon = meta.icon;
          const on = flags[key];
          return (
            <li key={key} className="flex items-start gap-3.5 py-3.5">
              <span
                className={cn(
                  'inline-flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                  on ? 'bg-accent/12 text-ink-green' : 'bg-glass-strong text-text-mute',
                )}
              >
                <Icon size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm font-semibold">{meta.label}</p>
                <p className="text-text-dim text-xs">{meta.description}</p>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    on ? 'text-text-mute' : 'text-ink-gold font-medium',
                  )}
                >
                  {on ? 'When off: ' : 'Farmers now see: '}
                  {meta.whenOff}
                </p>
              </div>
              <Switch
                checked={on}
                disabled={saving !== null}
                onChange={() => toggle(key)}
                label={meta.label}
              />
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? `Turn off ${FLAGS[confirm].label.toLowerCase()}?` : ''}
        message={confirm ? (FLAGS[confirm].confirmOff ?? '') : ''}
        confirmLabel="Turn off"
        danger
        loading={saving !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          await save(confirm, false);
          setConfirm(null);
        }}
      />
    </SettingsCard>
  );
}
