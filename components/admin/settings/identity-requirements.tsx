'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LogoLoader } from '@/components/ui/logo-loader';
import {
  adminIdentityService,
  type IdentityRequirementsConfig,
} from '@/services/admin/identity.service';
import type { IdentityLevel } from '@/types/identity';

const LEVEL_TEXT: Record<IdentityLevel, { label: string; help: string }> = {
  none: { label: 'No identity needed', help: 'Anyone signed in can use it.' },
  reviewed: {
    label: 'Ghana Card reviewed by AgriCtec',
    help: 'An admin reviewed the typed-in card number. Not an identity check against NIA.',
  },
  nia_verified: {
    label: 'Verified with NIA',
    help: "The identity provider confirmed the farmer's identity. Nobody qualifies until NIA verification is live.",
  },
};

/** Which identity level each feature needs. Switch loans to NIA once NIA verification is live. */
export function IdentityRequirementsCard() {
  const [config, setConfig] = useState<IdentityRequirementsConfig | null>(null);
  const [draft, setDraft] = useState<Record<string, IdentityLevel>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminIdentityService.requirements().then(
      (loaded) => {
        if (!active) return;
        setConfig(loaded);
        setDraft(loaded.requirements);
      },
      (cause: unknown) =>
        active && setError(cause instanceof Error ? cause.message : 'Could not load the settings'),
    );
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const saved = await adminIdentityService.saveRequirements(draft);
      setConfig(saved);
      setDraft(saved.requirements);
      toast.success('Identity requirements saved');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (error)
    return (
      <p role="alert" className="text-ink-red text-sm">
        {error}
      </p>
    );
  if (!config)
    return <LogoLoader center label="Loading identity requirements" className="min-h-40" />;
  const changed = JSON.stringify(draft) !== JSON.stringify(config.requirements);

  return (
    <section className="border-border bg-glass space-y-5 rounded-2xl border p-5">
      <div>
        <h2 className="text-text flex items-center gap-2 font-semibold">
          <Fingerprint size={17} aria-hidden="true" className="text-ink-green" />
          Identity requirements
        </h2>
        <p className="text-text-dim mt-1 text-sm">
          Choose the Ghana Card level each feature needs. NIA verification works only once NIA
          onboarding is complete; until then, choosing it blocks the feature for every farmer.
        </p>
      </div>
      {Object.entries(config.features).map(([feature, label]) => (
        <fieldset key={feature} className="space-y-2">
          <legend className="text-text text-sm font-semibold">{label}</legend>
          {config.levels.map((level) => (
            <label
              key={level}
              className="text-text-dim flex cursor-pointer items-start gap-3 text-sm"
            >
              <input
                type="radio"
                name={`identity-${feature}`}
                checked={draft[feature] === level}
                onChange={() => setDraft((current) => ({ ...current, [feature]: level }))}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                <span className="text-text font-medium">{LEVEL_TEXT[level].label}</span>
                <span className="text-text-mute block text-xs">{LEVEL_TEXT[level].help}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
      <Button icon={Save} loading={saving} disabled={!changed} onClick={() => void save()}>
        Save
      </Button>
    </section>
  );
}
