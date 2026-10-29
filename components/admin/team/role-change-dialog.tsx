'use client';

import { useState } from 'react';
import { ArrowRight, Lock, Minus, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ROLE_LABELS } from '@/lib/admin/permissions';
import {
  ROLE_DESCRIPTIONS,
  ROLES_HIGH_FIRST,
  permissionLabel,
  roleChangeDiff,
} from '@/lib/admin/team';
import { cn } from '@/lib/utils';
import { teamService } from '@/services/admin/team.service';
import type { AdminRole, AdminUser } from '@/types/admin';

/**
 * Change a team member's role, seeing exactly which permissions they gain and lose. Blocked
 * (with the reason) for your own account and for the last active Super Admin.
 */
export function RoleChangeDialog({
  member,
  locked,
  onClose,
  onChanged,
}: {
  member: AdminUser | null;
  /** Why the change isn't allowed, or null. */
  locked: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  if (!member) return null;
  return (
    <Change
      key={member.id}
      member={member}
      locked={locked}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

function Change({
  member,
  locked,
  onClose,
  onChanged,
}: {
  member: AdminUser;
  locked: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<AdminRole>(member.role);
  const [saving, setSaving] = useState(false);
  const diff = roleChangeDiff(member.role, role);
  const changed = role !== member.role;

  async function save() {
    setSaving(true);
    try {
      await teamService.changeRole(member.id, role);
      toast.success(`${member.name} is now ${ROLE_LABELS[role]}`);
      onChanged();
      onClose();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not change the role');
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Change ${member.name}’s role`}
      description="Access changes from their next action. The change is recorded in the audit log."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            icon={ShieldCheck}
            loading={saving}
            disabled={!changed || Boolean(locked)}
            onClick={() => void save()}
            className={PRIMARY_CLASS}
          >
            {changed ? `Make ${ROLE_LABELS[role]}` : 'Choose a new role'}
          </Button>
        </>
      }
    >
      {locked ? (
        <p
          role="alert"
          className="border-gold/40 bg-gold/10 text-ink-gold flex items-start gap-2.5 rounded-xl border p-4 text-sm font-semibold"
        >
          <Lock size={16} aria-hidden="true" className="mt-px shrink-0" />
          {locked}
        </p>
      ) : (
        <div className="space-y-5">
          <div role="radiogroup" aria-label="New role" className="grid gap-2 sm:grid-cols-2">
            {ROLES_HIGH_FIRST.map((option) => {
              const on = option === role;
              const current = option === member.role;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRole(option)}
                  className={cn(
                    'flex min-h-11 flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors',
                    on ? 'border-purple/50 bg-purple/10' : 'border-border hover:bg-glass-strong',
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <RoleBadge role={option} />
                    {current && (
                      <span className="text-text-mute text-[10px] font-bold tracking-wider uppercase">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="text-text-dim text-xs leading-relaxed">
                    {ROLE_DESCRIPTIONS[option]}
                  </span>
                </button>
              );
            })}
          </div>

          {changed && (
            <div className="border-border rounded-2xl border p-4">
              <p className="text-text flex flex-wrap items-center gap-2 text-sm font-semibold">
                <RoleBadge role={member.role} />
                <ArrowRight size={15} aria-hidden="true" className="text-text-mute" />
                <RoleBadge role={role} />
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-ink-green mb-2 text-xs font-semibold">
                    Gains {diff.gained.length}
                  </p>
                  {diff.gained.length === 0 ? (
                    <p className="text-text-mute text-xs">Nothing new.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {diff.gained.map((p) => (
                        <li key={p} className="text-text flex items-start gap-2 text-xs">
                          <Plus
                            size={13}
                            aria-hidden="true"
                            className="text-ink-green mt-px shrink-0"
                          />
                          {permissionLabel(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-ink-red mb-2 text-xs font-semibold">
                    Loses {diff.lost.length}
                  </p>
                  {diff.lost.length === 0 ? (
                    <p className="text-text-mute text-xs">Nothing removed.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {diff.lost.map((p) => (
                        <li key={p} className="text-text flex items-start gap-2 text-xs">
                          <Minus
                            size={13}
                            aria-hidden="true"
                            className="text-ink-red mt-px shrink-0"
                          />
                          {permissionLabel(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
