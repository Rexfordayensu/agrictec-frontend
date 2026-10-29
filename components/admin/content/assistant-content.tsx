'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AssistantKbForm } from '@/components/admin/content/assistant-kb-form';
import { AssistantKbList } from '@/components/admin/content/assistant-kb-list';
import { AssistantTestConsole } from '@/components/admin/content/assistant-test-console';
import { LastUpdated } from '@/components/admin/content/content-kit';
import { PageHeader } from '@/components/admin/layout/page-header';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import { byPriority, contextFor, moveItem, newItemId, withOrder } from '@/lib/admin/assistant-kb';
import { PLATFORM_KEYS } from '@/lib/admin/keys';
import { contentService } from '@/services/admin/content.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AssistantReply } from '@/types';
import type { AssistantKnowledgeItem, ContentMeta, CropContent } from '@/types/admin';

type Editing = { item?: AssistantKnowledgeItem } | null;

/**
 * The AI assistant's knowledge base (phase A12): replies in matching order, a form with a live
 * preview, and a test console. Every change is saved (and audited) at once; farmers' assistants
 * use it immediately.
 */
export function AssistantContent() {
  const farmers = useAdminDataStore((s) => s.farmers);
  const bands = usePlatformStatus()?.creditConfig.bands;
  const [items, setItems] = useState<AssistantKnowledgeItem[] | null>(null);
  const [crops, setCrops] = useState<CropContent[]>([]);
  const [meta, setMeta] = useState<ContentMeta | undefined>();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AssistantKnowledgeItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      contentService.getAssistantKb(),
      contentService.getCrops(),
      contentService.getContentMeta(),
    ]).then(([kb, cropList, metas]) => {
      if (!active) return;
      setItems(kb);
      setCrops(cropList);
      setMeta(metas[PLATFORM_KEYS.assistantKb]);
    });
    return () => {
      active = false;
    };
  }, []);

  /** Saves the whole list (audited) and shows what was stored. */
  async function persist(next: AssistantKnowledgeItem[], success: string) {
    setBusy(true);
    try {
      const saved = await contentService.saveAssistantKb(next);
      setItems(byPriority(saved));
      const metas = await contentService.getContentMeta();
      setMeta(metas[PLATFORM_KEYS.assistantKb]);
      toast.success(success);
      return true;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the replies');
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!items) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const ordered = byPriority(items);
  const sample = farmers.find((f) => !f.isGuest);
  const context = contextFor(sample, bands);

  async function save(values: { keywords: string[]; reply: AssistantReply; active: boolean }) {
    const current = editing?.item;
    let next: AssistantKnowledgeItem[];
    if (current) {
      next = ordered.map((i) => (i.id === current.id ? { ...i, ...values } : i));
    } else {
      // New replies go first, so they win over older ones with similar keywords.
      const created: AssistantKnowledgeItem = {
        id: newItemId(
          values.reply.title,
          ordered.map((i) => i.id),
        ),
        priority: 0,
        ...values,
      };
      next = withOrder([created, ...ordered]);
    }
    const ok = await persist(next, current ? 'Reply saved' : 'Reply added');
    if (ok) setEditing(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI assistant"
        description="What the farm assistant answers. The first reply whose keyword matches the question is used."
        actions={
          <Button icon={Plus} onClick={() => setEditing({})} className={PRIMARY_CLASS}>
            Add reply
          </Button>
        }
      />
      <LastUpdated meta={meta} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <AssistantKbList
          items={ordered}
          busy={busy}
          onMove={(from, to) => void persist(moveItem(ordered, from, to), 'Order saved')}
          onToggle={(item) =>
            void persist(
              ordered.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i)),
              item.active
                ? `“${item.reply.title}” switched off`
                : `“${item.reply.title}” switched on`,
            )
          }
          onEdit={(item) => setEditing({ item })}
          onDelete={setDeleting}
        />
        <div className="xl:sticky xl:top-28 xl:self-start">
          <AssistantTestConsole knowledge={ordered} farmers={farmers} crops={crops} bands={bands} />
        </div>
      </div>

      <AssistantKbForm
        open={editing !== null}
        item={editing?.item}
        context={context}
        crops={crops}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete “${deleting.reply.title}”?` : 'Delete'}
        message="Farmers asking about these keywords will get another reply, or the fallback."
        confirmLabel="Delete reply"
        danger
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await persist(
            withOrder(ordered.filter((i) => i.id !== deleting.id)),
            'Reply deleted',
          );
          if (ok) setDeleting(null);
        }}
      />
    </div>
  );
}
