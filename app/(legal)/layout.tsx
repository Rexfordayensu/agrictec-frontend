import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { LegalLinks } from '@/components/legal/legal-document';
import { Card } from '@/components/ui/card';

// Public pages (proxy.ts lets everyone in), readable during maintenance too.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="AgriCtec home">
          <BrandLogo />
        </Link>
        <Link
          href="/"
          className="text-text-dim hover:text-text inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to the app
        </Link>
      </div>
      <Card padding="lg">{children}</Card>
      <LegalLinks className="mt-6" />
    </main>
  );
}
