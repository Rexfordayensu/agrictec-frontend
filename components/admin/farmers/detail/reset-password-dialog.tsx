'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

const nameOf = (f: FarmerAccount) => f.profile.name || f.email;

/**
 * Sets a one-time password and shows it once, with a copy button. It is never logged. The farmer
 * signs in with it once and must then choose their own password.
 */
export function ResetPasswordDialog({
  farmer,
  onClose,
}: {
  farmer: FarmerAccount | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [temporary, setTemporary] = useState<string | null>(null);

  function close() {
    setTemporary(null);
    onClose();
  }

  if (temporary && farmer) {
    return (
      <Modal open onClose={close} title="Temporary password" size="sm">
        <p className="text-text-dim text-sm">Temporary password for {nameOf(farmer)}:</p>
        <div className="border-border bg-glass mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <span className="text-text font-mono text-lg font-bold">{temporary}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(temporary);
              toast.success('Copied');
            }}
            aria-label="Copy temporary password"
            className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-10 items-center justify-center rounded-lg"
          >
            <Copy size={16} aria-hidden="true" />
          </button>
        </div>
        <p
          role="alert"
          className="border-gold/40 bg-gold/10 text-ink-gold mt-4 rounded-xl border px-3.5 py-2.5 text-sm font-semibold"
        >
          Share this securely. It will not be shown again.
        </p>
        <p className="text-text-mute mt-3 text-xs">
          When {nameOf(farmer)} signs in with it, they will be asked to choose their own password,
          so this one only works once.
        </p>
        <Button className="mt-5 w-full" onClick={close}>
          Done
        </Button>
      </Modal>
    );
  }

  return (
    <ConfirmDialog
      open={farmer !== null}
      title="Reset password"
      message={
        farmer
          ? `${nameOf(farmer)}'s current password will stop working. You will see a temporary password once; they sign in with it and then choose a new password of their own.`
          : ''
      }
      confirmLabel="Reset password"
      loading={busy}
      onCancel={close}
      onConfirm={async () => {
        if (!farmer) return;
        setBusy(true);
        try {
          setTemporary(await farmersService.resetPassword(farmer.userId));
        } catch (cause) {
          toast.error(cause instanceof Error ? cause.message : 'Could not reset the password');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
