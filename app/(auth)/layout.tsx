import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { MaintenanceGate } from '@/components/shared/maintenance-gate';
import { Card } from '@/components/ui/card';

/** Ghana's flag as a tiny inline SVG (the app never uses emoji). */
function GhanaFlag() {
  return (
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      className="inline-block h-3 w-4.5 rounded-xs align-[-1px]"
    >
      <rect width="30" height="6.67" fill="#ce1126" />
      <rect y="6.67" width="30" height="6.67" fill="#fcd116" />
      <rect y="13.33" width="30" height="6.67" fill="#006b3f" />
      <polygon
        fill="#000"
        points="15,6.9 15.9,9.4 18.5,9.4 16.4,11 17.2,13.5 15,12 12.8,13.5 13.6,11 11.5,9.4 14.1,9.4"
      />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Farmers can't sign in or sign up during maintenance. */}
      <MaintenanceGate>
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="animate-fade-in w-full max-w-[440px]">
            <div className="mb-6 flex flex-col items-center text-center">
              <BrandLogo subtitle="Digital Identity" />
              <p className="text-text-dim mt-3 text-sm">Build your digital financial identity</p>
            </div>
            <Card padding="lg">{children}</Card>
            <p className="text-text-mute mt-6 flex items-center justify-center gap-1.5 text-xs">
              Built for Ghana&apos;s smallholder farmers <GhanaFlag />
            </p>
          </div>
        </main>
      </MaintenanceGate>
    </>
  );
}
