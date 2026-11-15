'use client';

import { useEffect, type ReactNode } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { THEME_COLORS } from '@/lib/theme-colors';

/**
 * The browser's own colours (the address bar and the phone's status bar) follow the app's theme,
 * including a theme the farmer picked that differs from their device's. The page's
 * <meta name="theme-color"> tags start from the device setting (app/layout.tsx).
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') return;
    // The launch splash keeps the bars navy and sets this theme's colour when it ends.
    if (document.getElementById('agrictec-splash')?.dataset.state === 'show') return;
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = THEME_COLORS[resolvedTheme];
    }
  }, [resolvedTheme]);
  return null;
}

/** Notices in the same theme as the app. */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
    />
  );
}

/**
 * The theme follows the device (phone or computer) until the person picks Light or Dark
 * themselves (Settings → Preferences, or the top bar's button); "System" goes back to following
 * it. The choice is kept in this browser.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorSync />
      {children}
      <ThemedToaster />
    </ThemeProvider>
  );
}
