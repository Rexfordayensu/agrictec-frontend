'use client';

import { toast } from 'sonner';
import { startImpersonation } from '@/lib/admin/impersonation';
import type { FarmerAccount } from '@/types/admin';

/**
 * "View as farmer": opens the farmer app as this farmer, read-only, in a new tab. The tab is
 * opened straight away (inside the click, so popup blockers allow it) and navigated once the
 * audited, single-use token is ready.
 */
export function useViewAsFarmer() {
  return async function viewAsFarmer(farmer: FarmerAccount) {
    const tab = window.open('about:blank', '_blank');
    try {
      const url = await startImpersonation(farmer.userId);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (cause) {
      tab?.close();
      toast.error(cause instanceof Error ? cause.message : 'Could not open the farmer view');
    }
  };
}
