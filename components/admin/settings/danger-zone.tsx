'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff, Skull, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard, TypeToConfirm } from '@/components/admin/settings/settings-card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DELETE_FARMERS_CONFIRMATION, backupService } from '@/services/admin/backup.service';

/**
 * The danger zone: delete every farmer account and all farmer data. Needs the exact phrase AND
 * the super admin's password. The team, the settings, content and the audit log are kept.
 */
export function DangerZoneCard({ onDeleted }: { onDeleted: () => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function start() {
    setTyped('');
    setPassword('');
    setError(null);
    setOpen(true);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const { farmers } = await backupService.deleteAllFarmers(typed, password);
      toast.success('All farmer data deleted', {
        description: `${farmers} farmer accounts removed.`,
      });
      setOpen(false);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the data');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      id="danger"
      icon={Skull}
      title="Danger zone"
      description="Actions here can’t be undone. Download a backup first."
      danger
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl min-w-0">
          <p className="text-text text-sm font-semibold">Delete ALL farmer data</p>
          <p className="text-text-dim mt-0.5 text-xs leading-relaxed">
            Removes every farmer account with their records, MoMo, profiles, applications,
            verifications and risk flags. Admin accounts, settings, content and the audit log are
            kept.
          </p>
        </div>
        <Button variant="danger" icon={Trash2} onClick={start}>
          Delete all farmer data
        </Button>
      </div>

      {open && (
        <Modal
          open
          onClose={() => !busy && setOpen(false)}
          title="Delete all farmer data?"
          description="This permanently removes every farmer and everything they recorded. There is no undo."
          footer={
            <>
              <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                loading={busy}
                disabled={typed !== DELETE_FARMERS_CONFIRMATION || password.length === 0}
                onClick={() => void remove()}
              >
                Delete everything
              </Button>
            </>
          }
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed === DELETE_FARMERS_CONFIRMATION && password) void remove();
            }}
          >
            <TypeToConfirm
              id={`${id}-phrase`}
              word={DELETE_FARMERS_CONFIRMATION}
              value={typed}
              onChange={setTyped}
            />
            <label htmlFor={`${id}-password`} className="block">
              <span className="text-text-dim mb-1.5 block text-sm">Your password</span>
              <span className="border-border bg-bg-2 focus-within:border-danger/70 flex min-h-11 items-center rounded-xl border pr-1">
                <input
                  id={`${id}-password`}
                  type={show ? 'text' : 'password'}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="text-text min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="text-text-mute hover:text-text inline-flex size-10 items-center justify-center"
                >
                  {show ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="text-ink-red text-sm font-semibold">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
    </SettingsCard>
  );
}
