import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Where farmers reach us about their data or these terms. */
export const CONTACT_EMAIL = 'agrictec.app@gmail.com';

/** Building blocks for the privacy policy and terms (app/(legal)). */
export function LegalHeader({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <header className="border-border mb-8 border-b pb-6">
      <h1 className="font-display text-text text-3xl font-bold">{title}</h1>
      <p className="text-text-mute mt-2 text-xs">Last updated {updated}</p>
      <div className="text-text-dim mt-4 space-y-3 text-sm leading-relaxed">{children}</div>
    </header>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="mt-8 scroll-mt-6 first-of-type:mt-0"
    >
      <h2 id={`${id}-title`} className="font-display text-text text-lg font-semibold">
        {title}
      </h2>
      <div className="text-text-dim mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="marker:text-ink-green list-disc space-y-2 pl-5">{children}</ul>;
}

/** A term in bold at the start of a list item. */
export function Term({ children }: { children: ReactNode }) {
  return <strong className="text-text font-semibold">{children}</strong>;
}

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink-green font-semibold hover:underline">
      {CONTACT_EMAIL}
    </a>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={cn('text-text-mute flex justify-center gap-4 text-xs', className)}
    >
      <Link href="/privacy" className="hover:text-text hover:underline">
        Privacy Policy
      </Link>
      <Link href="/terms" className="hover:text-text hover:underline">
        Terms of Use
      </Link>
    </nav>
  );
}
