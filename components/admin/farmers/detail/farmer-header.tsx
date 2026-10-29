'use client';

import { Ban, Calendar, Eye, KeyRound, Mail, MapPin, Phone, RotateCcw, Trash2 } from 'lucide-react';
import { RowMenu } from '@/components/admin/shared/row-menu';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RiskTag } from '@/components/admin/risk/risk-tag';
import { ScoreRing } from '@/components/ui/score-ring';
import type { FarmerAbilities } from '@/lib/admin/farmer-list';
import { formatDate } from '@/lib/format';
import { locationLabel } from '@/lib/profile';
import type { FarmerAccount } from '@/types/admin';

export interface HeaderActions {
  onViewAs: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}

/** Who the farmer is at a glance, with every action the role may take. */
export function FarmerHeader({
  farmer,
  abilities,
  canDelete,
  actions,
}: {
  farmer: FarmerAccount;
  abilities: FarmerAbilities;
  canDelete: boolean;
  actions: HeaderActions;
}) {
  const name = farmer.profile.name || farmer.email;
  const facts = [
    { icon: MapPin, text: locationLabel(farmer.profile) || farmer.profile.region },
    { icon: Phone, text: farmer.profile.phone || 'No phone' },
    { icon: Mail, text: farmer.email },
    { icon: Calendar, text: `Joined ${formatDate(new Date(farmer.createdAt))}` },
  ];

  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#a855f7] to-[#f5c451] text-2xl font-bold text-[#1e1033]"
          >
            {(name[0] ?? '?').toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-text text-2xl leading-tight font-bold">{name}</h1>
              <StatusBadge kind="account" status={farmer.status} />
              <RiskTag count={farmer.riskConfirmed} className="py-1 text-[11px]" />
              {farmer.tags.map((tag) => (
                <Badge key={tag} color="purple">
                  {tag}
                </Badge>
              ))}
            </div>
            <ul className="text-text-dim mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5">
                  <Icon size={14} aria-hidden="true" className="text-text-mute" />
                  {text}
                </li>
              ))}
            </ul>
            {farmer.status === 'suspended' && farmer.suspendedReason && (
              <p className="text-ink-red mt-2 text-sm">Suspended: {farmer.suspendedReason}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <ScoreRing value={farmer.stats.score} max={850} label="Credit score" size={84} />
          <div className="flex flex-wrap items-center gap-2">
            {abilities.impersonate && (
              <Button size="sm" variant="ghost" icon={Eye} onClick={actions.onViewAs}>
                View as farmer
              </Button>
            )}
            {abilities.suspend &&
              (farmer.status === 'suspended' ? (
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={actions.onReactivate}>
                  Reactivate
                </Button>
              ) : (
                <Button size="sm" variant="danger" icon={Ban} onClick={actions.onSuspend}>
                  Suspend
                </Button>
              ))}
            {abilities.resetPassword && (
              <Button size="sm" variant="ghost" icon={KeyRound} onClick={actions.onResetPassword}>
                Reset password
              </Button>
            )}
            {canDelete && (
              <RowMenu
                label={`More actions for ${name}`}
                items={[
                  {
                    label: 'Delete permanently',
                    icon: Trash2,
                    danger: true,
                    onSelect: actions.onDelete,
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
