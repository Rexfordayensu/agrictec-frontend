'use client';

import { useId, useState } from 'react';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

/** "Pilot 2026" → "pilot-2026" (the same rule the service applies). */
const normalize = (tag: string) =>
  tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Adds one tag to every selected farmer (each farmer is updated and audited separately). */
export function TagEditor({
  farmers,
  knownTags,
  onClose,
  onDone,
}: {
  /** Empty = closed. */
  farmers: FarmerAccount[];
  knownTags: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  // Re-mounted per opening, so the form always starts empty.
  if (farmers.length === 0) return null;
  return (
    <TagForm
      key={farmers.map((f) => f.userId).join()}
      farmers={farmers}
      knownTags={knownTags}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function TagForm({
  farmers,
  knownTags,
  onClose,
  onDone,
}: {
  farmers: FarmerAccount[];
  knownTags: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const listId = useId();
  const formId = useId();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const tag = normalize(value);

  async function submit() {
    if (!tag) return;
    setBusy(true);
    let added = 0;
    for (const farmer of farmers) {
      if (farmer.tags.includes(tag)) continue;
      try {
        await farmersService.setTags(farmer.userId, [...farmer.tags, tag]);
        added++;
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : 'Could not add the tag');
        break;
      }
    }
    setBusy(false);
    toast.success(
      added
        ? `Tagged ${added} farmer${added === 1 ? '' : 's'} “${tag}”`
        : 'Everyone already had that tag',
    );
    onDone();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add a tag to ${farmers.length} farmer${farmers.length === 1 ? '' : 's'}`}
      size="sm"
      dirty={!busy && value.trim() !== ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} icon={Tag} loading={busy} disabled={!tag}>
            Add tag
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormField label="Tag" htmlFor="bulk-tag">
          <Input
            id="bulk-tag"
            list={listId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. pilot-2026"
            maxLength={40}
            autoComplete="off"
          />
          <datalist id={listId}>
            {knownTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </FormField>
        {tag && value.trim() !== tag && (
          <p className="text-text-mute text-xs">
            Saved as <span className="font-mono">{tag}</span>
          </p>
        )}
      </form>
    </Modal>
  );
}
