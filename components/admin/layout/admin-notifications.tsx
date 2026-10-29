'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Bell, ClipboardList, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useAdminRole } from '@/hooks/admin/use-can';
import { can } from '@/lib/admin/permissions';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { Permission } from '@/types/admin';

interface Alert {
  key: string;
  icon: LucideIcon;
  count: number;
  label: string;
  href: string;
  permission: Permission;
}

/** The bell: open risk flags and pending work, only for queues the role can open. */
export function AdminNotifications() {
  const role = useAdminRole();
  const badges = useAdminDataStore((s) => s.badgeCounts);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const alerts: Alert[] = (
    [
      {
        key: 'risk',
        icon: ShieldAlert,
        count: badges.openRisk,
        label: 'open risk flags',
        href: '/admin/risk',
        permission: 'risk.review',
      },
      {
        key: 'verifications',
        icon: BadgeCheck,
        count: badges.pendingVerifications,
        label: 'verifications waiting',
        href: '/admin/verifications',
        permission: 'verifications.review',
      },
      {
        key: 'applications',
        icon: ClipboardList,
        count: badges.newApplications,
        label: 'new loan applications',
        href: '/admin/loans?status=submitted',
        permission: 'loans.view',
      },
    ] satisfies Alert[]
  ).filter((alert) => can(role, alert.permission) && alert.count > 0);
  const total = alerts.reduce((sum, alert) => sum + alert.count, 0);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={total ? `Notifications: ${total} items need attention` : 'Notifications'}
        className="text-text-dim hover:bg-glass-strong hover:text-text relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors"
      >
        <Bell size={18} aria-hidden="true" />
        {total > 0 && (
          <span
            aria-hidden="true"
            className="bg-danger-strong ring-bg-2 absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-bold text-white ring-2"
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="animate-fade-in border-border bg-bg-2 shadow-glass absolute top-full right-0 z-50 mt-2 w-72 rounded-2xl border p-2"
        >
          {alerts.length === 0 ? (
            <p className="text-text-mute px-3 py-4 text-sm">You&apos;re all caught up.</p>
          ) : (
            <ul>
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <li key={alert.key}>
                    <Link
                      href={alert.href}
                      onClick={() => setOpen(false)}
                      className="hover:bg-glass-strong flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors"
                    >
                      <Icon size={16} aria-hidden="true" className="text-ink-purple shrink-0" />
                      <span className="text-text">
                        <strong className="tabular-nums">{alert.count}</strong> {alert.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
