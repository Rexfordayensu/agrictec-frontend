'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

export interface EraseCounts {
  records: number;
  momo: number;
  applications: number;
  diagnoses: number;
  verifications: number;
  notes: number;
}

/**
 * Permanent delete (super admin only). Lists everything that will be erased and is only enabled
 * once the farmer's email is typed exactly. The audit entry keeps counts, not the data.
 */
export function DeleteFarmerDialog({
  farmer,
  counts,
  open,
  onClose,
  onDeleted,
}: {
  farmer: FarmerAccount;
  counts: EraseCounts;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed.trim().toLowerCase() === farmer.email.toLowerCase();
  const items = [
    ['farm record', counts.records],
    ['MoMo transaction', counts.momo],
    ['loan application', counts.applications],
    ['crop diagnosis', counts.diagnoses],
    ['verification request', counts.verifications],
    ['admin note', counts.notes],
  ] as const;

  function close() {
    setTyped('');
    onClose();
  }

  async function remove() {
    setBusy(true);
    try {
      await farmersService.remove(farmer.userId, typed);
      toast.success(`${farmer.profile.name || farmer.email} was permanently deleted`);
      onDeleted();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete the farmer');
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Delete farmer permanently"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            loading={busy}
            disabled={!matches}
            onClick={() => void remove()}
          >
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="border-danger/40 bg-danger/10 text-ink-red rounded-xl border px-3.5 py-3 text-sm font-semibold">
          This can’t be undone. {farmer.profile.name || farmer.email}’s account and all of their
          data will be erased.
        </p>
        <div>
          <p className="text-text-dim mb-2 text-xs font-semibold">What will be erased</p>
          <ul className="text-text list-disc space-y-0.5 pl-5 text-sm">
            <li>The account, profile and settings</li>
            {items.map(([label, n]) => (
              <li key={label}>
                {n} {label}
                {n === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        </div>
        <FormField label={`Type ${farmer.email} to confirm`} htmlFor="delete-confirm">
          <Input
            id="delete-confirm"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={farmer.email}
          />
        </FormField>
      </div>
    </Modal>
  );
}
