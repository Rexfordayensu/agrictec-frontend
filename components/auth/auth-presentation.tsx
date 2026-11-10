'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/layout/brand-logo';
import { LegalLinks } from '@/components/legal/legal-document';
import './login.css';

export function AuthPresentation({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname !== '/login' && pathname !== '/signup') return children;

  return (
    <main className={'agric-login-screen'} data-theme="dark">
      <div className={'agric-login-ribbonTop'} aria-hidden="true" />
      <div className={'agric-login-ribbonBottom'} aria-hidden="true" />
      <div className={'agric-login-content'}>
        <header className={'agric-login-brand'}>
          <BrandLogo subtitle="Digital Identity" className={'agric-login-logo'} />
          <p>Build your digital financial identity</p>
        </header>
        <section
          className="agric-login-panel"
          aria-label={pathname === '/signup' ? 'Create an AgriCtec account' : 'Sign in to AgriCtec'}
        >
          {content}
        </section>
        <LegalLinks className={'agric-login-legal'} />
      </div>
    </main>
  );
}
