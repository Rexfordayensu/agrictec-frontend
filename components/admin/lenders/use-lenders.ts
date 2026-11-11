'use client';

import { useEffect, useState } from 'react';
import { lendersService } from '@/services/admin/lenders.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AdminLender } from '@/types/admin';

type LendersState =
  | { status: 'loading'; lenders: AdminLender[] }
  | { status: 'ready'; lenders: AdminLender[] }
  | { status: 'error'; lenders: AdminLender[]; error: string };

/** Every lender in the register (GET /admin/lenders). `reload()` reads them again. */
export function useLenders() {
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [state, setState] = useState<LendersState>({ status: 'loading', lenders: [] });

  useEffect(() => {
    let active = true;
    lendersService.list().then(
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

/** One lender (GET /admin/lenders/{id}), kept in step with other tabs. */
export function useLender(id: string) {
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [state, setState] = useState<{
    lender: AdminLender | null;
    error: string | null;
    loaded: boolean;
  }>({ lender: null, error: null, loaded: false });

  useEffect(() => {
    let active = true;
    lendersService.get(id).then(
      (lender) => active && setState({ lender, error: null, loaded: true }),
      (cause: unknown) =>
        active &&
        setState({
          lender: null,
          error: cause instanceof Error ? cause.message : 'Could not load the lender',
          loaded: true,
        }),
    );
    return () => {
      active = false;
    };
  }, [id, version, syncVersion]);

  return {
    ...state,
    reload: () => setVersion((v) => v + 1),
    /** Shows a saved answer at once (the server's own copy). */
    replace: (lender: AdminLender) => setState({ lender, error: null, loaded: true }),
  };
}
