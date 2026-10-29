'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { enabledNavSections, isItemActive } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import { navKey, useT } from '@/lib/i18n';
import { usePlatformStore } from '@/store/platform-store';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  // Pages the admin has switched off are hidden.
  const flags = usePlatformStore((s) => s.flags);

  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
      {enabledNavSections(flags).map((section) => (
        <div key={section.title} className="mb-5 last:mb-0">
          <p className="text-text-mute mb-2 px-3 text-[10px] font-semibold tracking-wider uppercase">
            {t(`nav.section.${section.title}`)}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = isItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors duration-200',
                      active
                        ? 'border-accent/30 from-accent/20 to-accent/5 text-ink-green bg-linear-to-r'
                        : 'text-text-dim hover:bg-glass-strong hover:text-text border-transparent',
                    )}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{t(navKey(item.href))}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
