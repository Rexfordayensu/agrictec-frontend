'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChartNoAxesCombined, Layers, ShieldCheck } from 'lucide-react';
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
  const signup = pathname === '/signup';

  return (
    <main
      className={signup ? 'agric-login-screen agric-login-screen--signup' : 'agric-login-screen'}
      data-theme="dark"
    >
      <div className={'agric-login-ribbonTop'} aria-hidden="true" />
      <div className={'agric-login-ribbonBottom'} aria-hidden="true" />
      <div className={'agric-login-content'}>
        <div className="agric-login-columns">
          <section className="agric-login-story" aria-label="Your digital financial identity">
            <Image
              src={signup ? '/images/auth/signup-farmer.png' : '/images/auth/login-farmer.png'}
              alt={
                signup
                  ? 'A farmer checking her phone in a maize field'
                  : 'A farmer checking his phone in a maize field'
              }
              fill
              preload
              sizes="(max-width: 760px) 100vw, 50vw"
              className="agric-login-storyPhoto"
            />
            <div className="agric-login-storyShade" />
            <div className="agric-login-storyContent">
              <div className="agric-login-storyAccent" />
              <h2>
                {signup ? (
                  <>
                    Turn your
                    <br />
                    farm activities
                    <br />
                    into{' '}
                    <span>
                      financial
                      <br />
                      opportunities.
                    </span>
                  </>
                ) : (
                  <>
                    Your farm.
                    <br />
                    Your records.
                    <br />
                    <span>Your financial identity.</span>
                  </>
                )}
              </h2>
              <p>
                {signup
                  ? 'Create your AgriCtec account, keep verifiable farm records and get better access to loans, inputs and market support.'
                  : 'Keep track of your farm activities, build a trusted financial record and get better access to loans and farm support.'}
              </p>
              <ul className="agric-login-benefits">
                <li>
                  <span>
                    <ChartNoAxesCombined aria-hidden="true" />
                  </span>
                  {signup ? 'Record income & expenses' : 'Record farm income & expenses'}
                </li>
                <li>
                  <span>
                    <ShieldCheck aria-hidden="true" />
                  </span>
                  Build a verified farm record
                </li>
                <li>
                  <span>
                    <Layers aria-hidden="true" />
                  </span>
                  Access loans and financial support
                </li>
              </ul>
            </div>
            <svg
              className="agric-login-storyWave"
              viewBox="0 0 900 110"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="auth-wave" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#00d996" />
                  <stop offset="1" stopColor="#003f35" />
                </linearGradient>
              </defs>
              <path
                d="M0 70 Q140 -10 310 55 T570 95 Q710 75 900 110 L900 110 L0 110Z"
                fill="url(#auth-wave)"
                fillOpacity=".85"
                stroke="#00efad"
                strokeWidth="1.5"
              />
            </svg>
          </section>
          {/* Only this half scrolls; the photo stays put. */}
          <div className="agric-login-side">
            <div className="agric-login-sideInner">
              <header className={'agric-login-brand'}>
                <BrandLogo subtitle="Digital Identity" className={'agric-login-logo'} />
                <p>Build your digital financial identity</p>
              </header>
              <section
                className="agric-login-panel"
                aria-label={signup ? 'Create an AgriCtec account' : 'Sign in to AgriCtec'}
              >
                {content}
              </section>
              <LegalLinks className={'agric-login-legal'} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
