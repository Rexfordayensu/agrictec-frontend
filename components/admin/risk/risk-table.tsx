'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { formatDistanceStrict } from 'date-fns';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { RiskDetailModal } from '@/components/admin/risk/risk-detail-modal';
import { RULE_ICONS, SeverityDot } from '@/components/admin/risk/risk-meta';
import { RiskTag } from '@/components/admin/risk/risk-tag';
import {
  AdminTable,
  type AdminColumn,
  type AdminMobileCardParts,
} from '@/components/admin/shared/admin-table';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { StatusTabs } from '@/components/admin/shared/status-tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { REGIONS } from '@/constants/regions';
import { useAdminTable } from '@/hooks/admin/use-admin-table';
import {
  RISK_RULES,
  RISK_RULE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@/lib/admin/risk-rules';
import { replaceQuery } from '@/lib/url-state';
import type { FarmerAccount, RiskFlag } from '@/types/admin';

type StatusTab = RiskFlag['status'] | 'all';
const TABS: { value: StatusTab; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];
const parseTab = (value: string | null): StatusTab =>
  TABS.some((t) => t.value === value) ? (value as StatusTab) : 'open';

const nameOf = (f: FarmerAccount | undefined) => (f ? f.profile.name || f.email : 'Deleted farmer');

/**
 * Risk flags: status tabs (open by default), filters for severity, rule and region, high
 * severity first then newest. A row opens the review modal.
 */
export function RiskTable({
  flags,
  farmers,
  loading,
  onChanged,
}: {
  flags: RiskFlag[];
  farmers: FarmerAccount[];
  loading: boolean;
  onChanged: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [now] = useState(() => new Date());
  const [openId, setOpenId] = useState<string | null>(null);
  const tab = parseTab(params.get('status'));
  const farmerById = new Map(farmers.map((f) => [f.userId, f]));
  const farmerOf = (flag: RiskFlag) => farmerById.get(flag.userId);

  const table = useAdminTable(tab === 'all' ? flags : flags.filter((f) => f.status === tab), {
    getRowId: (f) => f.id,
    searchKeys: [(f) => nameOf(farmerOf(f)), (f) => f.description, (f) => RISK_RULE_LABELS[f.rule]],
    filters: {
      severity: (f, value) => f.severity === value,
      rule: (f, value) => f.rule === value,
      region: (f, value) => farmerOf(f)?.profile.region === value,
    },
    sortAccessors: {
      // High first, then newest first.
      severity: (f) => SEVERITY_ORDER[f.severity] * 1e13 - Date.parse(f.detectedAt),
      rule: (f) => RISK_RULE_LABELS[f.rule],
      farmer: (f) => nameOf(farmerOf(f)).toLowerCase(),
      detected: (f) => f.detectedAt,
      status: (f) => f.status,
    },
    initialSort: { key: 'severity', dir: 'asc' },
  });

  const counts = Object.fromEntries(
    TABS.map((t) => [
      t.value,
      t.value === 'all' ? flags.length : flags.filter((f) => f.status === t.value).length,
    ]),
  ) as Record<StatusTab, number>;

  function setTab(next: StatusTab) {
    const search = new URLSearchParams(params.toString());
    if (next === 'open') search.delete('status');
    else search.set('status', next);
    search.delete('page');
    const query = search.toString();
    replaceQuery(pathname, query);
  }

  const detected = (f: RiskFlag) => (
    <span
      title={new Date(f.detectedAt).toLocaleString()}
      className="text-text-dim whitespace-nowrap"
    >
      {formatDistanceStrict(new Date(f.detectedAt), now, { addSuffix: true })}
    </span>
  );

  const ruleCell = (f: RiskFlag) => {
    const Icon = RULE_ICONS[f.rule];
    return (
      <span className="text-text inline-flex items-center gap-2 whitespace-nowrap">
        <Icon size={14} aria-hidden="true" className="text-text-mute" />
        {RISK_RULE_LABELS[f.rule]}
      </span>
    );
  };

  const farmerCell = (f: RiskFlag) => {
    const farmer = farmerOf(f);
    return (
      <span className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={nameOf(farmer)} />
        <span className="min-w-0">
          <span className="flex max-w-52 items-center gap-1.5">
            <span className="truncate">{nameOf(farmer)}</span>
            {farmer && <RiskTag count={farmer.riskConfirmed} />}
          </span>
          <span className="text-text-mute block text-xs font-normal">
            {farmer?.profile.region || '—'}
          </span>
        </span>
      </span>
    );
  };

  const columns: AdminColumn<RiskFlag>[] = [
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      className: 'w-24',
      cell: (f) => <SeverityDot severity={f.severity} showLabel />,
    },
    { key: 'rule', header: 'Rule', sortable: true, cell: ruleCell },
    { key: 'farmer', header: 'Farmer', sortable: true, primary: true, cell: farmerCell },
    {
      key: 'description',
      header: 'Description',
      className: 'hidden xl:table-cell',
      cell: (f) => (
        <span className="text-text-dim line-clamp-2 max-w-md text-xs leading-relaxed">
          {f.description}
        </span>
      ),
    },
    { key: 'detected', header: 'Detected', sortable: true, cell: detected },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (f) => <StatusBadge kind="risk" status={f.status} />,
    },
    {
      key: 'action',
      header: '',
      className: 'w-24 text-right',
      cell: (f) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpenId(f.id)}
          aria-label={`${f.status === 'open' ? 'Review' : 'View'} ${RISK_RULE_LABELS[f.rule]} for ${nameOf(farmerOf(f))}`}
          className="gap-1"
        >
          {f.status === 'open' ? 'Review' : 'View'}
          <ArrowRight size={14} aria-hidden="true" />
        </Button>
      ),
    },
  ];

  function mobileCard(f: RiskFlag, { opener }: AdminMobileCardParts) {
    const farmer = farmerOf(f);
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <SeverityDot severity={f.severity} showLabel />
          <StatusBadge kind="risk" status={f.status} />
        </div>
        {opener(<span className="block">{ruleCell(f)}</span>)}
        <p className="text-text-dim text-xs leading-relaxed">{f.description}</p>
        <div className="border-border flex items-center justify-between gap-3 border-t pt-2.5 text-xs">
          <span className="text-text flex min-w-0 items-center gap-1.5 font-semibold">
            <span className="truncate">{nameOf(farmer)}</span>
            {farmer && <RiskTag count={farmer.riskConfirmed} />}
          </span>
          {detected(f)}
        </div>
      </div>
    );
  }

  const openFlag = flags.find((f) => f.id === openId) ?? null;
  const select = (key: string, value: string) => table.setFilter(key, value || null);

  return (
    <div className="space-y-4">
      <StatusTabs
        label="Flag status"
        value={tab}
        onChange={setTab}
        tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))}
      />

      <div
        role="search"
        aria-label="Filter flags"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_13rem_11rem]"
      >
        <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
          <Search
            size={16}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label="Search by farmer or description"
            placeholder="Search farmer or description"
            value={table.query}
            onChange={(e) => table.setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Severity"
          value={table.filters.severity ?? ''}
          onChange={(e) => select('severity', e.target.value)}
        >
          <option value="">All severities</option>
          {(['high', 'medium', 'low'] as const).map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Rule"
          value={table.filters.rule ?? ''}
          onChange={(e) => select('rule', e.target.value)}
        >
          <option value="">All rules</option>
          {RISK_RULES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Region"
          value={table.filters.region ?? ''}
          onChange={(e) => select('region', e.target.value)}
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      <p className="text-text-dim text-xs font-semibold" aria-live="polite">
        {table.total} {table.total === 1 ? 'flag' : 'flags'}
        {table.sort?.key === 'severity' && table.sort.dir === 'asc' && table.total > 1
          ? ' · high severity first'
          : ''}
      </p>

      <AdminTable
        table={table}
        columns={columns}
        getRowId={(f) => f.id}
        caption="Risk flags"
        rowLabel={(f) => `${RISK_RULE_LABELS[f.rule]} for ${nameOf(farmerOf(f))}`}
        onRowClick={(f) => setOpenId(f.id)}
        loading={loading && flags.length === 0}
        mobileCard={mobileCard}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={tab === 'open' ? 'Nothing to review' : 'No flags here'}
            description={
              tab === 'open'
                ? 'No open flags. Run a scan to check every account again.'
                : 'Try another tab, filter or search.'
            }
          />
        }
      />

      <RiskDetailModal
        flag={openFlag}
        farmerName={openFlag ? nameOf(farmerOf(openFlag)) : ''}
        onClose={() => setOpenId(null)}
        onReviewed={onChanged}
      />
    </div>
  );
}
