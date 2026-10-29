'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { formatGHS } from '@/lib/format';
import { usePlatformStore } from '@/store/platform-store';
import { useSubscription } from '@/hooks/use-subscription';

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plans = usePlatformStore((s) => s.plans);
  const { plan } = useSubscription();
  return (
    <Modal open={open} title="Choose a plan for your farm" onClose={onClose} size="md">
      <p className="text-text-dim text-sm">
        Your current plan is {plan.name}. Compare monthly plans and see your remaining AI credits.
      </p>
      <ul className="divide-border mt-4 divide-y">
        {plans
          .filter((p) => p.active)
          .map((p) => (
            <li key={p.id} className="text-text flex justify-between gap-3 py-3 text-sm">
              <span>{p.name}</span>
              <span>{formatGHS(p.priceGHS)} / month</span>
            </li>
          ))}
      </ul>
      <p className="text-text-mute mt-3 text-xs">
        Payments are simulated for this demo. No money is charged.
      </p>
      <Link
        href="/settings/plans"
        onClick={onClose}
        className="bg-accent text-bg-1 mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold"
      >
        Open plans &amp; billing
      </Link>
    </Modal>
  );
}
