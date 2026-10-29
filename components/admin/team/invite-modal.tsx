'use client';

import { useId, useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { TempPassword } from '@/components/admin/team/temp-password';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ROLE_PERMISSIONS } from '@/lib/admin/permissions';
import { ROLE_DESCRIPTIONS, ROLES_HIGH_FIRST } from '@/lib/admin/team';
import { cn } from '@/lib/utils';
import { teamService, type InviteResult } from '@/services/admin/team.service';
import type { AdminRole } from '@/types/admin';

/**
 * Invite a team member (a centred modal, never a drawer): name, email and role. The account is
 * created with a temporary password, shown once with a copy button; they must change it at
 * first sign-in.
 */
export function InviteModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  if (!open) return null;
  return <Invite onClose={onClose} onInvited={onInvited} />;
}

function Invite({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const formId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('support');
  const [error, setError] = useState<{ field: 'name' | 'email' | 'form'; message: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);

  async function submit() {
    if (name.trim().length < 2)
      return setError({ field: 'name', message: 'Enter their full name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError({ field: 'email', message: 'Enter a valid email address.' });
    setSaving(true);
    setError(null);
    try {
      const invited = await teamService.invite(name, email, role);
      setResult(invited);
      onInvited();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not send the invite';
      setError({ field: /email/i.test(message) ? 'email' : 'form', message });
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <Modal
        open
        onClose={onClose}
        title={`${result.admin.name} is on the team`}
        description={`${result.admin.email} can now sign in at /admin-login.`}
        footer={
          <Button onClick={onClose} className={PRIMARY_CLASS}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-dim">Role:</span>
            <RoleBadge role={result.admin.role} />
          </div>
          <TempPassword password={result.temporaryPassword} name={result.admin.name} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Invite a team member"
      description="They get a temporary password and choose their own at first sign-in."
      dirty={(name.length > 0 || email.length > 0) && !saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            icon={UserPlus}
            loading={saving}
            className={PRIMARY_CLASS}
          >
            Create account
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full name"
            htmlFor={`${formId}-name`}
            error={error?.field === 'name' ? error.message : undefined}
          >
            <Input
              id={`${formId}-name`}
              value={name}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abena Owusu"
              error={error?.field === 'name'}
              aria-describedby={
                error?.field === 'name' ? fieldErrorId(`${formId}-name`) : undefined
              }
            />
          </FormField>
          <FormField
            label="Work email"
            htmlFor={`${formId}-email`}
            error={error?.field === 'email' ? error.message : undefined}
            hint="Not used by any team member or farmer."
          >
            <Input
              id={`${formId}-email`}
              type="email"
              value={email}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@agrictec.app"
              error={error?.field === 'email'}
              aria-describedby={
                error?.field === 'email' ? fieldErrorId(`${formId}-email`) : undefined
              }
            />
          </FormField>
        </div>

        <fieldset>
          <legend className="text-text-dim mb-2 text-xs font-semibold tracking-wide uppercase">
            Role
          </legend>
          <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-2">
            {ROLES_HIGH_FIRST.map((option) => {
              const on = option === role;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRole(option)}
                  className={cn(
                    'relative flex min-h-11 flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors',
                    on ? 'border-purple/50 bg-purple/10' : 'border-border hover:bg-glass-strong',
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <RoleBadge role={option} />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex size-5 items-center justify-center rounded-full border',
                        on ? 'border-purple bg-purple text-white' : 'border-border',
                      )}
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                  </span>
                  <span className="text-text-dim text-xs leading-relaxed">
                    {ROLE_DESCRIPTIONS[option]}
                  </span>
                  <span className="text-text-mute text-[11px]">
                    {ROLE_PERMISSIONS[option].length} permissions
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {error?.field === 'form' && (
          <p role="alert" className="text-ink-red text-sm font-semibold">
            {error.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
