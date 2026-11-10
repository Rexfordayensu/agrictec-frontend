'use client';

import { useEffect } from 'react';

/**
 * The last resort, when even the root layout fails: it replaces the whole document, so it has
 * its own <html> and plain styles (the app's CSS may not have loaded).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[root]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: '#0a0e1a',
          color: '#e5e7eb',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>AgriCtec couldn&apos;t load</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 20px' }}>
            Your records are safe. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 12,
              border: 0,
              background: '#10b981',
              color: '#0a0e1a',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
