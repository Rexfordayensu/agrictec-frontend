import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { PageBackground } from '@/components/layout/page-background';
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
  themeColor: '#0a0e1a',
  // Lets the mobile bottom navigation pad itself with env(safe-area-inset-bottom).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before React hydrates. */}
      <body suppressHydrationWarning>
        {/* One shared background for every page, including the 404 and maintenance screens. */}
        <PageBackground />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
