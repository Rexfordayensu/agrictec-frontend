'use client';

import { useEffect, useState } from 'react';
import { Crown, KeyRound, UserPlus, Users, UserCheck, Hourglass, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/layout/page-header';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { StatTile } from '@/components/admin/shared/stat-tile';
import { InviteModal } from '@/components/admin/team/invite-modal';
import { PermissionsMatrix } from '@/components/admin/team/permissions-matrix';
import { RoleChangeDialog } from '@/components/admin/team/role-change-dialog';
import { TeamTable, type TeamAction } from '@/components/admin/team/team-table';
import { TempPassword } from '@/components/admin/team/temp-password';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { activeSuperAdminCount, lockReason } from '@/lib/admin/team';
import { teamService } from '@/services/admin/team.service';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AdminUser } from '@/types/admin';

type Pending = { action: 'toggle' | 'reset'; member: AdminUser } | null;

/**
 * Team & roles (phase A14, Super Admin only): invite staff, change roles (seeing what they gain
 * and lose), disable or enable access and reset passwords. Your own account and the last active
 * Super Admin are protected, here and in the service.
 */
export function TeamManager() {
  const me = useAdminAuthStore((s) => s.admin);
  const [team, setTeam] = useState<AdminUser[] | null>(null);
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [now, setNow] = useState(() => new Date());
  const [inviting, setInviting] = useState(false);
  const [roleFor, setRoleFor] = useState<AdminUser | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState<{ name: string; password: string } | null>(null);

  useEffect(() => {
    let active = true;
    teamService.list().then(
      (list) => {
        if (!active) return;
        setTeam(list);
        setNow(new Date());
      },
      (cause: unknown) =>
        active && toast.error(cause instanceof Error ? cause.message : 'Could not load the team'),
    );
    return () => {
      active = false;
    };
  }, [version, syncVersion]);

  const reload = () => setVersion((v) => v + 1);

  function onAction(action: TeamAction, member: AdminUser) {
    if (action === 'role') setRoleFor(member);
    else setPending({ action, member });
  }

  const toggleLock =
    pending?.action === 'toggle' && pending.member.status === 'active' && team
      ? lockReason(pending.member, me?.id, team, 'disable')
      : null;

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    try {
      const { member } = pending;
      if (pending.action === 'reset') {
        const password = await teamService.resetPassword(member.id);
        setReset({ name: member.name, password });
      } else if (member.status === 'active') {
        await teamService.disable(member.id);
        toast.success(`${member.name} can no longer sign in`);
      } else {
        await teamService.enable(member.id);
        toast.success(`${member.name} can sign in again`);
      }
      setPending(null);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the change');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & roles"
        description="Who can use the console and what each person can do. Every change is recorded in the audit log."
        actions={
          <Button icon={UserPlus} onClick={() => setInviting(true)} className={PRIMARY_CLASS}>
            Invite member
          </Button>
        }
      />

      {!team ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Users} label="Members" value={String(team.length)} />
            <StatTile
              icon={UserCheck}
              label="Active"
              value={String(team.filter((a) => a.status === 'active').length)}
              hint={`${team.filter((a) => a.status === 'disabled').length} disabled`}
            />
            <StatTile
              icon={Crown}
              label="Super Admins"
              value={String(activeSuperAdminCount(team))}
              hint={activeSuperAdminCount(team) <= 1 ? 'Add a second' : 'Active'}
              tone={activeSuperAdminCount(team) <= 1 ? 'danger' : undefined}
            />
            <StatTile
              icon={Hourglass}
              label="Awaiting first sign-in"
              value={String(
                team.filter((a) => a.mustChangePassword && a.status === 'active').length,
              )}
              hint="New members"
            />
          </div>

          <TeamTable team={team} currentAdminId={me?.id} now={now} onAction={onAction} />
        </>
      )}

      <PermissionsMatrix />

      <InviteModal open={inviting} onClose={() => setInviting(false)} onInvited={reload} />

      <RoleChangeDialog
        member={roleFor}
        locked={roleFor && team ? lockReason(roleFor, me?.id, team, 'role') : null}
        onClose={() => setRoleFor(null)}
        onChanged={reload}
      />

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.action === 'reset'
            ? `Reset ${pending.member.name}’s password?`
            : pending?.member.status === 'active'
              ? `Disable ${pending.member.name}?`
              : `Enable ${pending?.member.name ?? ''}?`
        }
        message={
          toggleLock ??
          (pending?.action === 'reset'
            ? 'You get a temporary password to share. They must choose a new one at their next sign-in.'
            : pending?.member.status === 'active'
              ? 'They are signed out at their next action and can’t sign in until enabled again. Their audit history is kept.'
              : 'They can sign in again with their current password.')
        }
        confirmLabel={
          pending?.action === 'reset'
            ? 'Reset password'
            : pending?.member.status === 'active'
              ? 'Disable access'
              : 'Enable access'
        }
        danger={pending?.action === 'toggle' && pending.member.status === 'active'}
        confirmDisabled={Boolean(toggleLock)}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmPending()}
      >
        {toggleLock && (
          <p className="text-ink-gold mt-3 flex items-center gap-2 text-sm font-semibold">
            <Lock size={15} aria-hidden="true" />
            This account is protected.
          </p>
        )}
      </ConfirmDialog>

      {reset && (
        <Modal
          open
          onClose={() => setReset(null)}
          title="Password reset"
          description="Their old password no longer works."
          footer={
            <Button icon={KeyRound} onClick={() => setReset(null)} className={PRIMARY_CLASS}>
              Done
            </Button>
          }
        >
          <TempPassword password={reset.password} name={reset.name} />
        </Modal>
      )}
    </div>
  );
}
