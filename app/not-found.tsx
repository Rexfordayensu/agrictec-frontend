import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass } from 'lucide-react';

export const metadata: Metadata = { title: 'Page not found' };

/** Any address the app doesn't have. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="border-border bg-glass shadow-glass w-full max-w-md rounded-3xl border p-8 text-center">
        <div className="bg-icon-bg text-icon mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
          <Compass size={24} aria-hidden="true" />
        </div>
        <h1 className="font-display text-text text-display font-bold">Page not found</h1>
        <p className="text-text-dim mt-2 text-sm">
          This page doesn&apos;t exist or has moved. Check the address, or start again from the home
          page.
        </p>
        <Link
          href="/"
          className="bg-accent text-bg-1 mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
        >
          Go to AgriCtec
        </Link>
      </div>
    </main>
  );
}
