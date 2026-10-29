'use client';

import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Save, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId, fieldHintId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ROLE_LABELS } from '@/lib/admin/permissions';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { useAdminUiStore } from '@/store/admin/admin-ui-store';
import type { AdminUser } from '@/types/admin';

/** Still the placeholder from the seed ("Super Admin"): the admin hasn't added their own name. */
export const hasDefaultName = (admin: Pick<AdminUser, 'name'>) =>
  Object.values(ROLE_LABELS).some(
    (label) => label.toLowerCase() === admin.name.trim().toLowerCase(),
  );

const initialOf = (name: string) => (name.trim()[0] ?? 'A').toUpperCase();

/**
 * The top bar's account chip: the admin's own name. Until they've added one it asks for it
 * instead of showing the placeholder. Opens the "Your name" dialog either way.
 */
export function AdminNameChip() {
  const admin = useAdminAuthStore((s) => s.admin);
  const openName = useAdminUiStore((s) => s.setNameOpen);
  if (!admin) return null;

  if (hasDefaultName(admin)) {
    return (
      <button
        type="button"
        onClick={() => openName(true)}
        className="border-gold/50 bg-gold/10 text-ink-gold hover:bg-gold/20 inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors"
      >
        <UserPen size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Add your name</span>
        <span className="sr-only sm:hidden">Add your name</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openName(true)}
      aria-label={`${admin.name}: edit your name`}
      title="Edit your name"
      className="glass hover:bg-glass-strong inline-flex min-h-11 max-w-56 items-center gap-2 rounded-xl py-1.5 pr-3 pl-1.5 transition-colors"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-sm font-bold text-white"
      >
        {initialOf(admin.name)}
      </span>
      <span className="text-text hidden truncate text-sm font-semibold sm:inline">
        {admin.name}
      </span>
    </button>
  );
}

/** Mounted once in the console layout; opened from the top bar and the user menu. */
export function EditNameDialog() {
  const open = useAdminUiStore((s) => s.nameOpen);
  const setOpen = useAdminUiStore((s) => s.setNameOpen);
  const admin = useAdminAuthStore((s) => s.admin);
  const [dirty, setDirty] = useState(false);
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  if (!admin) return null;

  const close = () => {
    setOpen(false);
    setDirty(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={hasDefaultName(admin) ? 'Add your name' : 'Your name'}
      description="Shown in the top bar, the team list and on everything you do in the audit log."
      dirty={dirty}
      initialFocus={inputRef}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={formId} icon={Save} className={PRIMARY_CLASS}>
            Save name
          </Button>
        </>
      }
    >
      {open && (
        <NameForm
          formId={formId}
          inputRef={inputRef}
          initial={hasDefaultName(admin) ? '' : admin.name}
          onDirty={setDirty}
          onSaved={close}
        />
      )}
    </Modal>
  );
}

function NameForm({
  formId,
  inputRef,
  initial,
  onDirty,
  onSaved,
}: {
  formId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  initial: string;
  onDirty: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const updateName = useAdminAuthStore((s) => s.updateName);
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const admin = await updateName(name);
      toast.success(`Saved. You now appear as ${admin.name}.`);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your name.');
      setSaving(false);
    }
  }

  return (
    <form id={formId} onSubmit={(event) => void submit(event)} noValidate>
      <FormField
        label="Full name"
        htmlFor={inputId}
        error={error ?? undefined}
        hint="For example, Akosua Mensah."
      >
        <Input
          id={inputId}
          ref={inputRef}
          value={name}
          autoComplete="name"
          maxLength={60}
          error={Boolean(error)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? fieldErrorId(inputId) : fieldHintId(inputId)}
          onChange={(event) => {
            setName(event.target.value);
            onDirty(event.target.value.trim() !== initial.trim());
          }}
          className="min-h-11"
        />
      </FormField>
    </form>
  );
}
