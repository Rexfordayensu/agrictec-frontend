import { BrandLogo } from '@/components/layout/brand-logo';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserMenu } from '@/components/layout/user-menu';

/**
 * Floating sidebar: inset from the screen edges with rounded corners. Shown from 900px;
 * below that, MobileNav's bottom bar and Menu sheet take over.
 */
export function Sidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="glass shadow-glass fixed inset-y-3 left-3 z-40 hidden w-[260px] flex-col overflow-hidden rounded-3xl backdrop-blur-xl min-[900px]:flex"
    >
      <BrandLogo
        subtitle="Digital Identity"
        // 1px less than the top bar: the aside's own border already adds 1px above this row.
        className="border-border h-[calc(var(--spacing-header)-1px)] shrink-0 border-b px-5"
      />

      <SidebarNav />

      <div className="border-border border-t p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
