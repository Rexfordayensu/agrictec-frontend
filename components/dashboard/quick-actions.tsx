'use client';

import Link from 'next/link';
import { ArrowUpRight, Bot, FileText, ScanLine, Smartphone, type LucideIcon } from 'lucide-react';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { useModalStore, type GlobalModal } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';
import type { FeatureKey } from '@/types/admin';

type QuickAction = { label: string; description: string; icon: LucideIcon; flag?: FeatureKey } & (
  { modal: GlobalModal } | { href: string }
);
const ACTIONS: QuickAction[] = [
  { label: 'MoMo transactions', description: 'Log a payment', icon: Smartphone, modal: 'momo' },
  {
    label: 'Scan a crop',
    description: 'Open Crop Doctor',
    icon: ScanLine,
    href: '/crop-doctor',
    flag: 'cropDoctor',
  },
  {
    label: 'Ask the assistant',
    description: 'Get farming help',
    icon: Bot,
    href: '/assistant',
    flag: 'aiAssistant',
  },
  { label: 'View reports', description: 'Review your finances', icon: FileText, href: '/reports' },
];

export function QuickActions() {
  const openModal = useModalStore((state) => state.openModal);
  const flags = usePlatformStore((state) => state.flags);
  const readOnly = useReadOnly();
  const actions = ACTIONS.filter((action) => !action.flag || flags[action.flag]);
  return (
    <nav aria-label="Everyday farm tools" className="farmer-dashboard-tools">
      <ul>
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span className="farmer-dashboard-tool-icon">
                <Icon size={21} aria-hidden="true" />
              </span>
              <span className="farmer-dashboard-tool-copy">
                <span>{action.label}</span>
                <span>{action.description}</span>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" className="farmer-dashboard-tool-arrow" />
            </>
          );
          return (
            <li key={action.label}>
              {'modal' in action ? (
                <button
                  type="button"
                  {...readOnlyProps(readOnly)}
                  onClick={readOnly ? undefined : () => openModal(action.modal)}
                  className={cn('farmer-dashboard-tool', readOnly && READ_ONLY_CLASS)}
                >
                  {content}
                </button>
              ) : (
                <Link href={action.href} className="farmer-dashboard-tool">
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
