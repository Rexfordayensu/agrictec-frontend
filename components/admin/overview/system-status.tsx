'use client';

import { formatDistanceToNowStrict } from 'date-fns';
import { Panel, PanelLink } from '@/components/admin/overview/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/hooks/admin/use-can';
import type { PlatformStatus } from '@/hooks/admin/use-platform-status';
import { cn } from '@/lib/utils';
import type { FeatureFlags } from '@/types/admin';

const FEATURES: { key: keyof FeatureFlags; label: string }[] = [
  { key: 'signupOpen', label: 'Sign-ups' },
  { key: 'guestMode', label: 'Guest mode' },
  { key: 'aiAssistant', label: 'AI Assistant' },
  { key: 'cropDoctor', label: 'Crop Doctor' },
  { key: 'yieldPredictor', label: 'Yield' },
  { key: 'loans', label: 'Loans' },
  { key: 'market', label: 'Market' },
  { key: 'pdfReports', label: 'PDF reports' },
];

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

/** Is the farmer app up, which features are on, and the platform's housekeeping facts. */
export function SystemStatus({ status }: { status: PlatformStatus | null }) {
  const canSettings = useCan('settings.manage');
  const down = status?.flags.maintenanceMode;

  return (
    <Panel
      title="System"
      description="What farmers can use right now"
      action={canSettings && <PanelLink href="/admin/settings">Settings</PanelLink>}
    >
      {!status ? (
        <div className="space-y-2" role="status" aria-label="Loading system status">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <p
            className={cn(
              'flex items-center gap-2.5 text-sm font-semibold',
              down ? 'text-ink-red' : 'text-ink-green',
            )}
          >
            <span aria-hidden="true" className="relative flex size-2.5">
              {!down && (
                <span className="bg-accent absolute inline-flex size-full animate-ping rounded-full opacity-50 motion-reduce:hidden" />
              )}
              <span
                className={cn(
                  'relative inline-flex size-2.5 rounded-full',
                  down ? 'bg-danger' : 'bg-accent',
                )}
              />
            </span>
            {down ? 'Maintenance mode is on' : 'Farmer app is online'}
          </p>

          <ul className="flex flex-wrap gap-1.5" aria-label="Features">
            {FEATURES.map((feature) => {
              const on = Boolean(status.flags[feature.key]);
              return (
                <li
                  key={feature.key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs',
                    on ? 'border-border text-text' : 'border-border/60 text-text-mute',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', on ? 'bg-accent' : 'bg-text-mute/50')}
                  />
                  {feature.label}
                  <span className="sr-only">{on ? 'on' : 'off'}</span>
                </li>
              );
            })}
          </ul>

          <dl className="border-border grid grid-cols-3 gap-3 border-t pt-3 text-xs">
            <div className="min-w-0">
              <dt className="text-text-mute">Credit rules</dt>
              <dd className="text-text mt-0.5 font-semibold">v{status.creditConfig.version}</dd>
              <dd className="text-text-mute truncate" title={`by ${status.creditConfig.updatedBy}`}>
                {ago(status.creditConfig.updatedAt)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-text-mute">Demo data</dt>
              <dd className="text-text mt-0.5 truncate font-semibold">
                {status.seededAt ? ago(status.seededAt) : 'Not seeded'}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-text-mute">Storage</dt>
              <dd className="text-text mt-0.5 font-semibold">PostgreSQL</dd>
            </div>
          </dl>
        </div>
      )}
    </Panel>
  );
}
