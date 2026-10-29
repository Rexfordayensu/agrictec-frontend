'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SYSTEM_SETTINGS_SECTIONS } from '@/constants/admin-settings';
import { cn } from '@/lib/utils';

export function SystemSettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="System settings pages" className="min-w-0 lg:sticky lg:top-24">
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
        {SYSTEM_SETTINGS_SECTIONS.map(({ id, href, label, icon: Icon }) => {
          const active = pathname === href;
          const danger = id === 'danger';
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? danger
                      ? 'border-danger/40 bg-danger/10 text-ink-red'
                      : 'border-purple/40 bg-purple/12 text-text'
                    : cn(
                        'border-border text-text-dim hover:text-text hover:bg-glass',
                        danger && 'text-ink-red/80',
                      ),
                )}
              >
                <Icon size={15} aria-hidden="true" className="shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
