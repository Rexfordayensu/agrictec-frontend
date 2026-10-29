'use client';

import { useId, useState } from 'react';
import { Check, ChevronDown, Grid3x3, Minus } from 'lucide-react';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { ROLE_PERMISSIONS } from '@/lib/admin/permissions';
import { PERMISSION_GROUPS, ROLES_HIGH_FIRST, permissionLabel } from '@/lib/admin/team';
import { cn } from '@/lib/utils';

/** The roles × permissions table (admin spec Section 2), read-only, for reference. */
export function PermissionsMatrix() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="border-border bg-glass rounded-2xl border">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left"
        >
          <span className="bg-purple/12 text-ink-purple inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Grid3x3 size={17} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-text block text-sm font-semibold">Roles & permissions</span>
            <span className="text-text-mute block text-xs">
              What each role can do. Read-only: roles are fixed by the platform.
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn('text-text-mute shrink-0 transition-transform', open && 'rotate-180')}
          />
        </button>
      </h2>
      <div id={id} hidden={!open} className="border-border overflow-x-auto border-t">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Permissions by role</caption>
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                className="text-text-mute px-5 py-3 text-[11px] font-semibold tracking-wider uppercase"
              >
                Permission
              </th>
              {ROLES_HIGH_FIRST.map((role) => (
                <th key={role} scope="col" className="px-3 py-3 text-center">
                  <RoleBadge role={role} />
                </th>
              ))}
            </tr>
          </thead>
          {PERMISSION_GROUPS.map((group) => (
            <tbody key={group.label} className="divide-border divide-y">
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={ROLES_HIGH_FIRST.length + 1}
                  className="bg-bg-2/50 text-text-mute px-5 py-2 text-[11px] font-semibold tracking-wider uppercase"
                >
                  {group.label}
                </th>
              </tr>
              {group.permissions.map((permission) => (
                <tr key={permission} className="hover:bg-glass">
                  <th scope="row" className="text-text px-5 py-2.5 font-normal">
                    {permissionLabel(permission)}
                  </th>
                  {ROLES_HIGH_FIRST.map((role) => {
                    const has = ROLE_PERMISSIONS[role].includes(permission);
                    return (
                      <td key={role} className="px-3 py-2.5 text-center">
                        {has ? (
                          <Check size={16} aria-label="Yes" className="text-ink-green mx-auto" />
                        ) : (
                          <Minus size={14} aria-label="No" className="text-text-mute/50 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
