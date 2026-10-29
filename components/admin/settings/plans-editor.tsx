'use client';

import { useState } from 'react';
import { BadgeDollarSign, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ListEditor } from '@/components/admin/content/content-kit';
import { SettingsCard } from '@/components/admin/settings/settings-card';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FEATURE_NAMES, normalizePlans, planAccess } from '@/lib/subscriptions/plans';
import { configService } from '@/services/admin/config.service';
import type { Plan } from '@/types/admin';
import type { PlanFeature } from '@/types/subscription';

const clean = (plans: Plan[]): Plan[] =>
  normalizePlans(plans).map((p) => ({
    ...p,
    name: p.name.trim(),
    features: p.features.map((f) => f.trim()).filter(Boolean),
    access: planAccess(p),
    aiCredits: p.id === 'advanced' ? null : p.id === 'premium' ? (p.aiCredits ?? 100) : 0,
  }));

export function PlansEditor({
  plans,
  onSaved,
}: {
  plans: Plan[];
  onSaved: (plans: Plan[]) => void;
}) {
  const [draft, setDraft] = useState<Plan[]>(normalizePlans(plans));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(clean(draft)) !== JSON.stringify(clean(plans));
  const invalid = draft.some(
    (p) =>
      !p.name.trim() ||
      p.features.every((f) => !f.trim()) ||
      !Number.isFinite(p.priceGHS) ||
      (p.id !== 'free' && (p.priceGHS < 1 || p.priceGHS > 10000)) ||
      (p.id === 'premium' &&
        (!Number.isInteger(p.aiCredits) || (p.aiCredits ?? 0) < 1 || (p.aiCredits ?? 0) > 1000000)),
  );
  const update = (id: Plan['id'], patch: Partial<Plan>) =>
    setDraft((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function save() {
    setSaving(true);
    try {
      const saved = await configService.savePlans(clean(draft));
      setDraft(saved);
      onSaved(saved);
      toast.success('Plans saved', {
        description: 'Prices, access and allowances now apply to the farmer app.',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save plans');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      id="plans"
      icon={BadgeDollarSign}
      title="Subscription plans"
      description="Manage monthly prices, offered tiers and Premium AI credits. Checkout uses mock payments; no money is collected."
    >
      <p className="text-text-dim mb-4 text-sm">
        Free keeps the essentials. Basic adds PDFs. Premium adds limited AI tools. Advanced includes
        all available tools and unlimited AI credits. Global feature switches still apply.
      </p>
      <div className="@container/plan-editor min-w-0">
        <div className="grid min-w-0 grid-cols-1 gap-4 @3xl/plan-editor:grid-cols-2">
          {draft.map((plan) => {
            const isFree = plan.id === 'free';
            const access = planAccess(plan);
            return (
              <article
                key={plan.id}
                className="border-border bg-bg-2/30 min-w-0 rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-text font-display min-w-0 text-xl font-bold break-words">
                    {plan.name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-text-mute text-xs">
                      {plan.active ? 'Offered' : 'Hidden'}
                    </span>
                    <Switch
                      checked={plan.active}
                      disabled={isFree || saving}
                      onChange={(active) => update(plan.id, { active })}
                      label={`${plan.name} offered`}
                    />
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="text-text-dim mb-1.5 block text-sm">Monthly price (GHS)</span>
                  <input
                    type="number"
                    min={isFree ? 0 : 1}
                    max={10000}
                    step="1"
                    disabled={isFree || saving}
                    value={Number.isFinite(plan.priceGHS) ? plan.priceGHS : ''}
                    onChange={(e) =>
                      update(plan.id, {
                        priceGHS: e.target.value === '' ? NaN : Number(e.target.value),
                      })
                    }
                    className="border-border bg-bg-2 text-text min-h-11 w-full min-w-0 rounded-xl border px-3 disabled:opacity-60"
                  />
                </label>
                {plan.id === 'premium' && (
                  <label className="mt-4 block">
                    <span className="text-text-dim mb-1.5 block text-sm">AI credits per month</span>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      step={1}
                      disabled={saving}
                      value={Number.isFinite(plan.aiCredits) ? plan.aiCredits! : ''}
                      onChange={(e) =>
                        update(plan.id, {
                          aiCredits: e.target.value === '' ? NaN : Number(e.target.value),
                        })
                      }
                      className="border-border bg-bg-2 text-text min-h-11 w-full min-w-0 rounded-xl border px-3"
                    />
                    <span className="text-text-mute mt-1 block text-xs">
                      1 per assistant question; 5 per crop scan. Monthly usage survives plan
                      changes.
                    </span>
                  </label>
                )}
                {plan.id === 'advanced' && (
                  <p className="text-ink-green mt-4 text-sm font-semibold">Unlimited AI credits</p>
                )}
                <div className="mt-4 space-y-3">
                  {(Object.keys(FEATURE_NAMES) as PlanFeature[]).map((feature) => (
                    <div key={feature} className="flex min-w-0 items-center justify-between gap-3">
                      <span className="text-text-dim min-w-0 text-sm break-words">
                        {FEATURE_NAMES[feature]}
                      </span>
                      <Switch
                        checked={access[feature]}
                        disabled={
                          saving ||
                          isFree ||
                          plan.id === 'advanced' ||
                          (plan.id === 'basic' && feature !== 'pdfReports')
                        }
                        label={`${plan.name}: ${FEATURE_NAMES[feature]}`}
                        className="shrink-0"
                        onChange={(value) =>
                          update(plan.id, { access: { ...access, [feature]: value } })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <ListEditor
                    label="Plan description"
                    items={plan.features}
                    onChange={(features) => update(plan.id, { features })}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {invalid && (
        <p role="alert" className="text-ink-red mt-4 text-sm">
          Check each paid price (GHS 1–10,000), plan description, and Premium allowance (1–1,000,000
          whole credits).
        </p>
      )}
      <p className="text-text-mute mt-4 text-xs">
        Hiding a plan stops new activations. Existing subscriptions keep access until expiry. Free
        always remains available.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          icon={RotateCcw}
          disabled={!dirty || saving}
          onClick={() => setDraft(normalizePlans(plans))}
        >
          Undo
        </Button>
        <Button
          icon={Save}
          loading={saving}
          disabled={!dirty || invalid}
          onClick={() => void save()}
          className={PRIMARY_CLASS}
        >
          Save plans
        </Button>
      </div>
    </SettingsCard>
  );
}
