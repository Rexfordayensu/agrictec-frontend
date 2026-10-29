'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import Link from 'next/link';
import {
  Bot,
  Download,
  HandCoins,
  Plus,
  ScanLine,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalStore, type GlobalModal } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';
import type { FeatureKey } from '@/types/admin';

type QuickAction = { label: string; icon: LucideIcon; tone: string; flag?: FeatureKey } & (
  { modal: GlobalModal } | { href: string }
);

const ACTIONS: QuickAction[] = [
  { label: 'Add Record', icon: Plus, tone: 'bg-accent/15 text-ink-green', modal: 'record' },
  { label: 'MoMo Txn', icon: Smartphone, tone: 'bg-gold/15 text-ink-gold', modal: 'momo' },
  {
    label: 'Crop Scan',
    icon: ScanLine,
    tone: 'bg-purple/15 text-ink-purple',
    href: '/crop-doctor',
    flag: 'cropDoctor',
  },
  {
    label: 'Ask AI',
    icon: Bot,
    tone: 'bg-info/15 text-ink-blue',
    href: '/assistant',
    flag: 'aiAssistant',
  },
  {
    label: 'Apply Loan',
    icon: HandCoins,
    tone: 'bg-accent/15 text-ink-green',
    href: '/loans',
    flag: 'loans',
  },
  { label: 'Export', icon: Download, tone: 'bg-glass-strong text-text-dim', href: '/reports' },
];

const tileClass =
  'group flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-glass px-2 py-3 text-center text-xs font-semibold text-text transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:bg-glass-strong hover:shadow-[0_10px_24px_-10px_var(--accent-glow)]';

function TileContent({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  return (
    <>
      <span
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
          action.tone,
        )}
      >
        <Icon size={19} aria-hidden="true" />
      </span>
      {action.label}
    </>
  );
}

/** Six one-tap shortcuts. Lays out 3 per row, or all 6 in one row when its container is wide. */
export function QuickActions({ className }: { className?: string }) {
  const openModal = useModalStore((s) => s.openModal);
  const flags = usePlatformStore((s) => s.flags);
  const readOnly = useReadOnly();
  // Shortcuts to pages the admin has switched off are hidden.
  const actions = ACTIONS.filter((action) => !action.flag || flags[action.flag]);

  return (
    <nav aria-label="Quick actions" className={cn('@container', className)}>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3 @lg:grid-cols-6">
        {actions.map((action) => (
          <li key={action.label}>
            {'modal' in action ? (
              <button
                type="button"
                {...readOnlyProps(readOnly)}
                onClick={readOnly ? undefined : () => openModal(action.modal)}
                className={cn(tileClass, 'w-full', readOnly && READ_ONLY_CLASS)}
              >
                <TileContent action={action} />
              </button>
            ) : (
              <Link href={action.href} className={tileClass}>
                <TileContent action={action} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
