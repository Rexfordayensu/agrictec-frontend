'use client';

import { useId, useState } from 'react';
import { format } from 'date-fns';
import { RefreshCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard, TypeToConfirm } from '@/components/admin/settings/settings-card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { RESET_CONFIRMATION, backupService } from '@/services/admin/backup.service';

/**
 * "Reset demo world": rebuilds the 60 demo farmers, applications, verifications and flags from
 * the seed. Real accounts, the team and the audit log are kept. Needs RESET typed.
 */
export function DemoDataCard({
  seededAt,
  onReset,
}: {
  seededAt: string | null;
  onReset: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      const { farmers } = await backupService.resetDemo(typed);
      toast.success('Demo world reset', {
        description: `${farmers} farmer accounts are in place.`,
      });
      setOpen(false);
      onReset();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not reset the demo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      id="demo"
      icon={Sparkles}
      title="Demo data"
      description="The sample farmers, loans and flags used for demos and training."
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-text-dim text-sm">
          {seededAt
            ? `Created ${format(new Date(seededAt), "d MMM yyyy 'at' HH:mm")}.`
            : 'Not created yet.'}{' '}
          <span className="text-text-mute">
            Real farmers, the team and the audit log are never touched.
          </span>
        </p>
        <Button
          variant="ghost"
          icon={RefreshCcw}
          onClick={() => {
            setTyped('');
            setOpen(true);
          }}
          className="border-border border"
        >
          Reset demo world
        </Button>
      </div>

      {open && (
        <Modal
          open
          onClose={() => !busy && setOpen(false)}
          title="Reset the demo world?"
          description="Every demo farmer goes back to how they started: edits, decisions and flags on demo accounts are undone."
          footer={
            <>
              <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={RefreshCcw}
                loading={busy}
                disabled={typed !== RESET_CONFIRMATION}
                onClick={() => void reset()}
              >
                Reset demo world
              </Button>
            </>
          }
        >
          <TypeToConfirm id={id} word={RESET_CONFIRMATION} value={typed} onChange={setTyped} />
        </Modal>
      )}
    </SettingsCard>
  );
}
