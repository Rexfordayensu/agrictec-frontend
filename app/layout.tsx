import type { Metadata, Viewport } from 'next';
import { THEME_COLORS } from '@/lib/theme-colors';
import { Inter, Outfit } from 'next/font/google';
import { PageBackground } from '@/components/layout/page-background';
import { LaunchSplash } from '@/components/pwa/launch-splash';
import { AppProviders } from '@/components/providers/app-providers';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

/** Outfit for headings and large numbers (font-display); Inter for everything else. */
const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AgriCtec — Digital Financial Identity for Farmers',
    template: '%s | AgriCtec',
  },
  description:
    'AgriCtec turns farm records into a trusted digital financial identity, helping farmers track income, build credit readiness and access finance.',
};

export const viewport: Viewport = {
  // The device's light or dark setting first; ThemeColorSync (app-providers.tsx) follows the
  // farmer's own choice after that.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
  // Native controls (scrollbars, date pickers) in the device's scheme before the page loads.
  colorScheme: 'light dark',
  // Lets the mobile bottom navigation pad itself with env(safe-area-inset-bottom).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} overscroll-none`}
    >
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before React hydrates. */}
      <body suppressHydrationWarning className="overscroll-none">
        {/* The installed app's animated opening: first in the page, so it covers the first paint. */}
        <LaunchSplash />
        {/* One shared background for every page, including the 404 and maintenance screens. */}
        <div id="agrictec-app">
          <PageBackground />
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
