import type { ReactNode } from 'react';
import { SettingsNav } from '@/components/settings/settings-nav';

/** Profile & Settings: a menu of its pages beside (or above, on phones) the open page. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-6 @5xl:grid-cols-[240px_minmax(0,1fr)] @5xl:items-start">
        <SettingsNav />
        <div className="@container min-w-0">{children}</div>
      </div>
    </div>
  );
}
