'use client';

import { useState } from 'react';
import { Lock, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

const nameOf = (f: FarmerAccount) => f.profile.name || f.email;

/** Lifts a suspension (audited). */
export function ReactivateDialog({
  farmer,
  onClose,
  onDone,
}: {
  farmer: FarmerAccount | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmDialog
      open={farmer !== null}
      title="Reactivate farmer"
      message={
        farmer
          ? `${nameOf(farmer)} will be able to sign in again.${farmer.suspendedReason ? ` They were suspended for: ${farmer.suspendedReason}` : ''}`
          : ''
      }
      confirmLabel="Reactivate"
      loading={busy}
      onCancel={onClose}
      onConfirm={async () => {
        if (!farmer) return;
        setBusy(true);
        try {
          await farmersService.reactivate(farmer.userId);
          toast.success(`${nameOf(farmer)} reactivated`);
          onDone();
        } catch (cause) {
          toast.error(cause instanceof Error ? cause.message : 'Could not reactivate');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

/** An internal note on the farmer's record (visible to staff only, audited). */
export function AddNoteDialog({
  farmer,
  onClose,
  onDone,
}: {
  farmer: FarmerAccount | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    setText('');
    onClose();
  }

  return (
    <Modal
      open={farmer !== null}
      onClose={close}
      title={farmer ? `Note on ${nameOf(farmer)}` : 'Add note'}
      dirty={!busy && text.trim() !== ''}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            icon={StickyNote}
            loading={busy}
            disabled={text.trim().length === 0}
            onClick={async () => {
              if (!farmer) return;
              setBusy(true);
              try {
                await farmersService.addNote(farmer.userId, text);
                toast.success('Note added');
                setText('');
                onDone();
              } catch (cause) {
                toast.error(cause instanceof Error ? cause.message : 'Could not add the note');
              } finally {
                setBusy(false);
              }
            }}
          >
            Add note
          </Button>
        </>
      }
    >
      <FormField label="Note (staff only)" htmlFor="farmer-note">
        <Textarea
          id="farmer-note"
          rows={4}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Called to confirm farm size. Details are correct."
        />
      </FormField>
      <p className="text-text-mute mt-2 flex items-center gap-1.5 text-xs">
        <Lock size={12} aria-hidden="true" /> Notes are never shown to the farmer.
      </p>
    </Modal>
  );
}
