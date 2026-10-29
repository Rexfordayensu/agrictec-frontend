'use client';

import { formatDistanceStrict } from 'date-fns';
import { Ban, CircleCheck, KeyRound, ShieldCheck } from 'lucide-react';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import type { AdminUser } from '@/types/admin';

export type TeamAction = 'role' | 'toggle' | 'reset';

/**
 * The team: who they are, their role and status, last sign-in, who added them, and actions
 * (change role, disable or enable, reset password). Your own row has no actions.
 */
export function TeamTable({
  team,
  currentAdminId,
  now,
  onAction,
}: {
  team: AdminUser[];
  currentAdminId?: string;
  now: Date;
  onAction: (action: TeamAction, member: AdminUser) => void;
}) {
  const nameOf = (id?: string) =>
    id ? (team.find((a) => a.id === id)?.name ?? 'A former member') : 'Platform setup';
  const lastLogin = (a: AdminUser) =>
    a.lastLoginAt
      ? formatDistanceStrict(new Date(a.lastLoginAt), now, { addSuffix: true })
      : 'Never';

  const menu = (a: AdminUser): RowMenuItem[] => [
    { label: 'Change role', icon: ShieldCheck, onSelect: () => onAction('role', a) },
    a.status === 'active'
      ? { label: 'Disable access', icon: Ban, danger: true, onSelect: () => onAction('toggle', a) }
      : { label: 'Enable access', icon: CircleCheck, onSelect: () => onAction('toggle', a) },
    { label: 'Reset password', icon: KeyRound, onSelect: () => onAction('reset', a) },
  ];

  const who = (a: AdminUser, large = false) => (
    <span className="flex min-w-0 items-center gap-3">
      <InitialsAvatar name={a.name} size={large ? 'lg' : undefined} />
      <span className="min-w-0">
        <span className="text-text flex items-center gap-2 font-semibold">
          <span className="truncate">{a.name}</span>
          {a.id === currentAdminId && (
            <span className="bg-purple/15 text-ink-purple rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase">
              You
            </span>
          )}
        </span>
        <span className="text-text-mute block truncate text-xs">{a.email}</span>
      </span>
    </span>
  );

  const status = (a: AdminUser) => (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusBadge kind="admin" status={a.status} />
      {a.mustChangePassword && a.status === 'active' && (
        <span className="text-ink-gold text-[11px] font-semibold">Awaiting first sign-in</span>
      )}
    </span>
  );

  return (
    <div className="border-border bg-glass overflow-hidden rounded-2xl border">
      {/* Wide screens: a table. */}
      <table className="hidden w-full text-left text-sm md:table">
        <caption className="sr-only">Team members</caption>
        <thead className="border-border text-text-mute border-b text-[11px] tracking-wider uppercase">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Member
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Role
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Last sign-in
            </th>
            <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">
              Added by
            </th>
            <th scope="col" className="w-14 px-3 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {team.map((a) => (
            <tr key={a.id} className="hover:bg-glass">
              <td className="px-5 py-3">{who(a)}</td>
              <td className="px-3 py-3">
                <RoleBadge role={a.role} />
              </td>
              <td className="px-3 py-3">{status(a)}</td>
              <td className="text-text-dim px-3 py-3 whitespace-nowrap">{lastLogin(a)}</td>
              <td className="text-text-dim hidden px-3 py-3 lg:table-cell">
                {nameOf(a.createdBy)}
              </td>
              <td className="px-3 py-3 text-right">
                {a.id !== currentAdminId && (
                  <RowMenu label={`Actions for ${a.name}`} items={menu(a)} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones: cards. */}
      <ul aria-label="Team members" className="divide-border divide-y md:hidden">
        {team.map((a) => (
          <li key={a.id} className="space-y-3 p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">{who(a, true)}</div>
              {a.id !== currentAdminId && (
                <RowMenu label={`Actions for ${a.name}`} items={menu(a)} />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={a.role} />
              {status(a)}
            </div>
            <p className="text-text-mute text-xs">
              Last sign-in {lastLogin(a).toLowerCase()} · added by {nameOf(a.createdBy)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
