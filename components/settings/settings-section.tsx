import type { ReactNode } from 'react';
import { SETTINGS_PAGES } from '@/components/settings/settings-sections';

/** Heading and content of one settings page, looked up by its route. */
export function SettingsSection({ href, children }: { href: string; children: ReactNode }) {
  const meta = SETTINGS_PAGES.find((page) => page.href === href);
  const Icon = meta?.icon;
  return (
    <section aria-labelledby="settings-page-heading">
      <div className="mb-4 flex items-center gap-3 px-1">
        {Icon && (
          <span className="bg-accent/15 text-ink-green inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon size={19} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id="settings-page-heading" className="text-text text-lg leading-tight font-bold">
            {meta?.label}
          </h2>
          <p className="text-text-mute text-xs">{meta?.description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
