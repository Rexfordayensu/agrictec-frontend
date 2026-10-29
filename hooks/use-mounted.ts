import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * false during server rendering and hydration, true after the first client render.
 * Use it to render browser-only values (localStorage data, theme) without hydration mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
