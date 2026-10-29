import { Wrench } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { Card } from '@/components/ui/card';

/**
 * Full-screen page farmers see while the admin has maintenance mode on. The admin console is
 * separate (/admin), so staff are never locked out by it.
 */
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <main
      role="alert"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center px-4 py-10"
    >
      <div className="animate-fade-in w-full max-w-[460px]">
        <div className="mb-6 flex justify-center">
          <BrandLogo subtitle="Digital Identity" />
        </div>
        <Card padding="lg" className="text-center">
          <div className="bg-gold/15 text-ink-gold mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl">
            <Wrench size={30} aria-hidden="true" />
          </div>
          <h1 className="font-display text-text text-2xl font-bold">We&apos;ll be right back</h1>
          {message.trim() && (
            <p className="text-text-dim mt-3 text-sm leading-relaxed whitespace-pre-line">
              {message}
            </p>
          )}
          <p className="text-text-mute mt-4 text-sm font-semibold">Please check back soon.</p>
        </Card>
      </div>
    </main>
  );
}
