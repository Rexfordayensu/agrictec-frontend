'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AnnouncementForm,
  type AnnouncementFormMode,
} from '@/components/admin/announcements/announcement-form';
import {
  AnnouncementsList,
  type AnnouncementAction,
} from '@/components/admin/announcements/announcements-list';
import { PageHeader } from '@/components/admin/layout/page-header';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { StatusTabs } from '@/components/admin/shared/status-tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { REGIONS } from '@/constants/regions';
import {
  ANNOUNCEMENT_TABS,
  announcementState,
  tabOf,
  type AnnouncementTab,
} from '@/lib/admin/announcements';
import { replaceQuery } from '@/lib/url-state';
import {
  announcementsService,
  type AnnouncementInput,
} from '@/services/admin/announcements.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import { farmersService } from '@/services/admin/farmers.service';
import type { Announcement, FarmerAccount } from '@/types/admin';

const TAB_LABELS: Record<AnnouncementTab, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  ended: 'Ended',
};

/** "?new=1&regions=Northern,Volta" (from All Farmers' bulk actions) opens a pre-filled form. */
function prefillFrom(params: URLSearchParams): AnnouncementFormMode | null {
  if (params.get('new') !== '1') return null;
  const regions = (params.get('regions') ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter((r) => REGIONS.includes(r));
  return { kind: 'create', prefill: { regions } };
}

/**
 * Announcements (phase A12): banners on the farmer dashboard. Tabs for active, scheduled and
 * ended; create, edit before start, duplicate, end now, delete when not live. Every write goes
 * through the audited service, which checks the same rules again.
 */
export function AnnouncementsManager() {
  const params = useSearchParams();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [farmers, setFarmers] = useState<FarmerAccount[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<AnnouncementTab>('active');
  const [form, setForm] = useState<AnnouncementFormMode | null>(() =>
    prefillFrom(new URLSearchParams(params.toString())),
  );
  const [pending, setPending] = useState<{ action: 'end' | 'delete'; item: Announcement } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);

  useEffect(() => {
    let active = true;
    Promise.all([announcementsService.list(), farmersService.list()]).then(([list, accounts]) => {
      if (!active) return;
      setItems(list);
      setFarmers(accounts);
      setNow(new Date());
    });
    return () => {
      active = false;
    };
  }, [version, syncVersion]);

  // Keep the tabs honest as time passes (scheduled → active → ended).
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // The pre-fill is read once; drop it from the URL so a reload doesn't reopen the form.
  const hasPrefill = params.get('new') === '1';
  useEffect(() => {
    if (hasPrefill) replaceQuery('/admin/announcements', '');
  }, [hasPrefill]);

  const reload = () => setVersion((v) => v + 1);

  async function submit(input: AnnouncementInput, confirmedCritical: boolean) {
    if (!form) return false;
    if (form.kind === 'edit') {
      await announcementsService.update(form.announcement.id, input, { confirmedCritical });
      toast.success('Announcement updated');
    } else {
      const created = await announcementsService.create(input, { confirmedCritical });
      const state = announcementState(created);
      toast.success(state === 'live' ? 'Announcement is live' : 'Announcement scheduled', {
        description:
          state === 'live'
            ? 'Farmers in the audience see it now.'
            : 'It goes live at the start time.',
      });
      setTab(tabOf(state));
    }
    setForm(null);
    reload();
    return true;
  }

  function onAction(action: AnnouncementAction, item: Announcement) {
    if (action === 'edit') setForm({ kind: 'edit', announcement: item });
    else if (action === 'duplicate') setForm({ kind: 'duplicate', announcement: item });
    else setPending({ action, item });
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === 'end') {
        await announcementsService.end(pending.item.id);
        toast.success(`Ended “${pending.item.title}”`);
      } else {
        await announcementsService.remove(pending.item.id);
        toast.success(`Deleted “${pending.item.title}”`);
      }
      setPending(null);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not do that');
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <PageHeader
      title="Announcements"
      description="Banners at the top of the farmer dashboard, for everyone, some regions or the growers of some crops."
      actions={
        <Button icon={Plus} onClick={() => setForm({ kind: 'create' })} className={PRIMARY_CLASS}>
          New announcement
        </Button>
      }
    />
  );

  if (!items) {
    return (
      <div className="space-y-5">
        {header}
        <Skeleton className="h-11 w-80 rounded-xl" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const byTab = (t: AnnouncementTab) => items.filter((a) => tabOf(announcementState(a, now)) === t);
  // Scheduled: soonest first. Others: newest start first.
  const shown = byTab(tab).sort((a, b) =>
    tab === 'scheduled'
      ? a.startsAt.localeCompare(b.startsAt)
      : b.startsAt.localeCompare(a.startsAt),
  );

  return (
    <div className="space-y-5">
      {header}
      <StatusTabs
        label="Announcement status"
        value={tab}
        onChange={setTab}
        tabs={ANNOUNCEMENT_TABS.map((t) => ({
          value: t,
          label: TAB_LABELS[t],
          count: byTab(t).length,
        }))}
      />
      <AnnouncementsList
        items={shown}
        tab={tab}
        farmers={farmers}
        now={now}
        onAction={onAction}
        onCreate={() => setForm({ kind: 'create' })}
      />

      <AnnouncementForm
        mode={form}
        farmers={farmers}
        onClose={() => setForm(null)}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.action === 'end'
            ? `End “${pending.item.title}” now?`
            : `Delete “${pending?.item.title ?? ''}”?`
        }
        message={
          pending?.action === 'end'
            ? 'Farmers stop seeing it straight away. It moves to Ended, where you can duplicate it.'
            : 'It is removed from the list for good. The audit log keeps a record.'
        }
        confirmLabel={pending?.action === 'end' ? 'End now' : 'Delete'}
        danger
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmPending()}
      />
    </div>
  );
}
