// Several tabs of one browser share its sign-in (cookies) and its guest demo (localStorage). When
// one tab signs in, signs up, signs out or starts the demo, the others hear about it here and
// reload into the right place, instead of showing the old account or the wrong mode. The admin
// console has its own staff session and doesn't listen; nor does an admin's "View as farmer" tab.

/** localStorage keys the other tabs watch (the demo's own token, and this change notice). */
const CHANGE_KEY = 'agrictec:auth-change';
const DEMO_KEY = 'agrictec:demo';

export type AuthChange = 'signed-in' | 'signed-out' | 'demo-started';

/** Tells the browser's other tabs that who is using the farmer app changed. */
export function announceAuthChange(kind: AuthChange): void {
  if (typeof window === 'undefined') return;
  try {
    // A new value every time, so every other tab gets a storage event.
    window.localStorage.setItem(CHANGE_KEY, JSON.stringify({ kind, at: Date.now() }));
  } catch {
    // Storage blocked (private mode): the other tabs catch up on their next request.
  }
}

/** Calls `onChange` when another tab changed the sign-in or the guest demo. Returns the unsubscribe. */
export function onOtherTabAuthChange(onChange: () => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key === CHANGE_KEY || event.key === DEMO_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
