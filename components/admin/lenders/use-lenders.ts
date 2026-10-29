'use client';

import { useEffect, useState } from 'react';
import { lendersService } from '@/services/admin/lenders.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { Lender } from '@/types/admin';

type LendersState =
  | { status: 'loading'; lenders: Lender[] }
  | { status: 'ready'; lenders: Lender[] }
  | { status: 'error'; lenders: Lender[]; error: string };

/** Every lender, active or not. `reload()` reads them again after a change. */
export function useLenders() {
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [state, setState] = useState<LendersState>({ status: 'loading', lenders: [] });

  useEffect(() => {
    let active = true;
    lendersService.list({ includeInactive: true }).then(
      (lenders) => active && setState({ status: 'ready', lenders }),
      (cause: unknown) =>
        active &&
        setState({
          status: 'error',
          lenders: [],
          error: cause instanceof Error ? cause.message : 'Could not load lenders',
        }),
    );
    return () => {
      active = false;
    };
  }, [version, syncVersion]);

  return { ...state, reload: () => setVersion((v) => v + 1) };
}
