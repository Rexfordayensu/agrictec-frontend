// The admin's ready-made reports (phase A14). Pure functions: platform data in, a report out.
// Each report is a few headline figures plus tables, so the same object renders as the on-screen
// preview, a CSV and a landscape PDF (lib/pdf/generate-admin-report.ts).

import { differenceInMinutes, format, startOfMonth, subMonths } from 'date-fns';
import { REGIONS } from '@/constants/regions';
import { kpis, scoreDistribution } from '@/lib/admin/analytics';
import { loanStats } from '@/lib/admin/loan-pipeline';
import { APPROVED_LOAN_STATUSES, LOAN_STATUSES, LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import { RISK_RULES, SEVERITY_LABELS } from '@/lib/admin/risk-rules';
import { toCSV } from '@/lib/export/csv';
import { formatGHS } from '@/lib/format';
import { cropNames } from '@/lib/profile';
import type {
  CreditConfig,
  FarmerAccount,
  Lender,
  LoanApplication,
  RiskFlag,
  VerificationKind,
  VerificationRequest,
} from '@/types/admin';

export type ReportId = 'platform' | 'regions' | 'loans' | 'credit' | 'verifications' | 'risk';

export interface ReportTable {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  /** Right-aligned columns (numbers). */
  numeric: number[];
}

export interface AdminReport {
  id: ReportId;
  title: string;
  description: string;
  generatedAt: string;
  /** Headline figures shown as tiles and at the top of the PDF. */
  summary: { label: string; value: string }[];
  tables: ReportTable[];
}

/** Everything the reports read (loaded once by reports.service). */
export interface ReportInput {
  farmers: FarmerAccount[];
  applications: LoanApplication[];
  lenders: Lender[];
  verifications: VerificationRequest[];
  riskFlags: RiskFlag[];
  bands: CreditConfig['bands'];
  now?: Date;
}

export const REPORT_CATALOG: { id: ReportId; title: string; description: string }[] = [
  {
    id: 'platform',
    title: 'Platform Summary',
    description: 'Headline KPIs, sign-ups over the last 12 months and farmers per region.',
  },
  {
    id: 'regions',
    title: 'Farmers by Region',
    description: 'Farmers, average credit score, income and Ghana Card verification per region.',
  },
  {
    id: 'loans',
    title: 'Loan Portfolio',
    description: 'Applications by status, lender and region, with approval and default rates.',
  },
  {
    id: 'credit',
    title: 'Credit Score Report',
    description: 'The score distribution by band, and the average score per region and per crop.',
  },
  {
    id: 'verifications',
    title: 'Verification Report',
    description: 'Volumes by check, approval rate and average review time.',
  },
  {
    id: 'risk',
    title: 'Risk Report',
    description: 'Risk flags by rule and outcome (open, dismissed, confirmed), with severities.',
  },
];

const registered = (farmers: FarmerAccount[]) => farmers.filter((f) => !f.isGuest);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0);
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const pctLabel = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`);
const money = (value: number) => formatGHS(Math.round(value));

const DECIDED = (a: LoanApplication) =>
  APPROVED_LOAN_STATUSES.includes(a.status) || a.status === 'rejected';
const APPROVED = (a: LoanApplication) => APPROVED_LOAN_STATUSES.includes(a.status);

/** Approved ÷ decided, as a fraction; null before any decision. */
function approvalRate(apps: LoanApplication[]): number | null {
  const decided = apps.filter(DECIDED).length;
  return decided ? apps.filter(APPROVED).length / decided : null;
}

function platform(
  input: ReportInput,
  now: Date,
): Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'> {
  const people = registered(input.farmers);
  const k = kpis(input.farmers, input.applications, input.riskFlags, input.verifications, now);
  const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(now, 11 - i)));
  return {
    summary: [
      { label: 'Farmers', value: String(k.totalFarmers) },
      { label: 'Active (30 days)', value: String(k.activeLast30Days) },
      { label: 'New this month', value: String(k.newThisMonth) },
      { label: 'Average score', value: String(Math.round(k.averageScore)) },
      { label: 'Recorded income', value: money(k.totalIncome) },
      { label: 'Loans requested', value: money(k.loanRequested) },
      { label: 'Approval rate', value: k.approvalRate === null ? '—' : `${k.approvalRate}%` },
      { label: 'Pending verifications', value: String(k.pendingVerifications) },
    ],
    tables: [
      {
        title: 'Sign-ups by month',
        headers: ['Month', 'New farmers'],
        numeric: [1],
        rows: months.map((month) => [
          format(month, 'MMM yyyy'),
          people.filter(
            (f) => format(new Date(f.createdAt), 'yyyy-MM') === format(month, 'yyyy-MM'),
          ).length,
        ]),
      },
      {
        title: 'Farmers by region',
        headers: ['Region', 'Farmers', 'Share'],
        numeric: [1, 2],
        rows: REGIONS.map((region) => {
          const count = people.filter((f) => f.profile.region === region).length;
          return [region, count, `${pct(count, people.length)}%`];
        }).sort((a, b) => Number(b[1]) - Number(a[1])),
      },
    ],
  };
}

function regions(
  input: ReportInput,
): Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'> {
  const people = registered(input.farmers);
  const rows = REGIONS.map((region) => {
    const here = people.filter((f) => f.profile.region === region);
    const verified = here.filter((f) => f.profile.ghanaCard.status === 'verified').length;
    return {
      region,
      count: here.length,
      score: Math.round(avg(here.map((f) => f.stats.score))),
      income: sum(here.map((f) => f.stats.income)),
      verified: pct(verified, here.length),
    };
  }).sort((a, b) => b.count - a.count);
  const verifiedAll = people.filter((f) => f.profile.ghanaCard.status === 'verified').length;
  return {
    summary: [
      { label: 'Farmers', value: String(people.length) },
      { label: 'Regions covered', value: `${rows.filter((r) => r.count > 0).length} of 16` },
      { label: 'Ghana Card verified', value: `${pct(verifiedAll, people.length)}%` },
      { label: 'Recorded income', value: money(sum(rows.map((r) => r.income))) },
    ],
    tables: [
      {
        title: 'Per region',
        headers: ['Region', 'Farmers', 'Average score', 'Income (GHS)', 'Ghana Card verified'],
        numeric: [1, 2, 3, 4],
        rows: rows.map((r) => [
          r.region,
          r.count,
          r.count ? r.score : '—',
          Math.round(r.income),
          r.count ? `${r.verified}%` : '—',
        ]),
      },
    ],
  };
}

function loans(
  input: ReportInput,
): Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'> {
  const apps = input.applications;
  const stats = loanStats(apps);
  const regionOf = new Map(input.farmers.map((f) => [f.userId, f.profile.region]));
  const group = (key: (a: LoanApplication) => string) => {
    const map = new Map<string, LoanApplication[]>();
    for (const a of apps) map.set(key(a), [...(map.get(key(a)) ?? []), a]);
    return map;
  };
  const lenderName = (id: string) =>
    input.lenders.find((l) => l.id === id)?.name ?? 'Unknown lender';
  const groupRows = (map: Map<string, LoanApplication[]>) =>
    [...map.entries()]
      .map(([name, list]): (string | number)[] => [
        name,
        list.length,
        Math.round(sum(list.map((a) => a.amount))),
        pctLabel(approvalRate(list)),
      ])
      .sort((a, b) => Number(b[1]) - Number(a[1]));

  return {
    summary: [
      { label: 'Applications', value: String(apps.length) },
      { label: 'Requested', value: money(stats.totalRequested) },
      { label: 'Approved', value: money(stats.approvedAmount) },
      { label: 'Disbursed', value: money(stats.disbursedAmount) },
      { label: 'Approval rate', value: pctLabel(approvalRate(apps)) },
      { label: 'Default rate', value: pctLabel(stats.defaultRate) },
    ],
    tables: [
      {
        title: 'By status',
        headers: ['Status', 'Applications', 'Amount (GHS)'],
        numeric: [1, 2],
        rows: LOAN_STATUSES.map((status) => {
          const list = apps.filter((a) => a.status === status);
          return [
            LOAN_STATUS_LABELS[status],
            list.length,
            Math.round(sum(list.map((a) => a.amount))),
          ];
        }),
      },
      {
        title: 'By lender',
        headers: ['Lender', 'Applications', 'Amount (GHS)', 'Approval rate'],
        numeric: [1, 2, 3],
        rows: groupRows(group((a) => lenderName(a.partnerId))),
      },
      {
        title: 'By region',
        headers: ['Region', 'Applications', 'Amount (GHS)', 'Approval rate'],
        numeric: [1, 2, 3],
        rows: groupRows(group((a) => regionOf.get(a.userId) || 'Unknown')),
      },
    ],
  };
}

function credit(
  input: ReportInput,
): Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'> {
  const people = registered(input.farmers);
  const distribution = scoreDistribution(input.farmers, input.bands);
  const scores = people.map((f) => f.stats.score);
  const byCrop = new Map<string, number[]>();
  for (const f of people)
    for (const crop of cropNames(f.profile))
      byCrop.set(crop, [...(byCrop.get(crop) ?? []), f.stats.score]);
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return {
    summary: [
      { label: 'Farmers scored', value: String(people.length) },
      { label: 'Average score', value: String(Math.round(avg(scores))) },
      { label: 'Median score', value: String(median) },
      {
        label: 'Good or better',
        value: `${pct(
          distribution
            .filter((b) => b.band === 'Good' || b.band === 'Excellent')
            .reduce((n, b) => n + b.count, 0),
          people.length,
        )}%`,
      },
    ],
    tables: [
      {
        title: 'Distribution',
        headers: ['Band', 'Score range', 'Farmers', 'Share'],
        numeric: [2, 3],
        rows: distribution.map((b) => [
          b.band,
          b.label,
          b.count,
          `${pct(b.count, people.length)}%`,
        ]),
      },
      {
        title: 'Average per region',
        headers: ['Region', 'Farmers', 'Average score'],
        numeric: [1, 2],
        rows: REGIONS.map((region): (string | number)[] => {
          const here = people.filter((f) => f.profile.region === region);
          return [
            region,
            here.length,
            here.length ? Math.round(avg(here.map((f) => f.stats.score))) : '—',
          ];
        }).sort((a, b) => Number(b[1]) - Number(a[1])),
      },
      {
        title: 'Average per crop',
        headers: ['Crop', 'Farmers', 'Average score'],
        numeric: [1, 2],
        rows: [...byCrop.entries()]
          .map(([crop, list]): (string | number)[] => [crop, list.length, Math.round(avg(list))])
          .sort((a, b) => Number(b[1]) - Number(a[1])),
      },
    ],
  };
}

const KIND_LABELS: Record<VerificationKind, string> = {
  ghanaCard: 'Ghana Card',
  phone: 'Phone',
  location: 'Location',
};

/** "2 h 15 min", "3 days". */
function duration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;
  return `${(minutes / 1440).toFixed(1)} days`;
}

function verifications(
  input: ReportInput,
): Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'> {
  const all = input.verifications;
  // Instant checks are approved automatically; review time only counts people's reviews.
  const reviewed = (list: VerificationRequest[]) =>
    list.filter(
      (v) => v.status !== 'pending' && v.reviewedAt && v.reviewedBy !== 'Automatic check',
    );
  const reviewMinutes = (list: VerificationRequest[]) =>
    avg(
      reviewed(list).map((v) =>
        differenceInMinutes(new Date(v.reviewedAt!), new Date(v.submittedAt)),
      ),
    );
  const rate = (list: VerificationRequest[]) => {
    const approved = list.filter((v) => v.status === 'approved').length;
    const rejected = list.filter((v) => v.status === 'rejected').length;
    return approved + rejected ? approved / (approved + rejected) : null;
  };
  return {
    summary: [
      { label: 'Requests', value: String(all.length) },
      { label: 'Pending', value: String(all.filter((v) => v.status === 'pending').length) },
      { label: 'Approval rate', value: pctLabel(rate(all)) },
      { label: 'Average review time', value: duration(reviewMinutes(all)) },
    ],
    tables: [
      {
        title: 'By check',
        headers: [
          'Check',
          'Requests',
          'Pending',
          'Approved',
          'Rejected',
          'Approval rate',
          'Average review time',
        ],
        numeric: [1, 2, 3, 4, 5],
        rows: (Object.keys(KIND_LABELS) as VerificationKind[]).map((kind) => {
          const list = all.filter((v) => v.kind === kind);
          return [
            KIND_LABELS[kind],
            list.length,
            list.filter((v) => v.status === 'pending').length,
            list.filter((v) => v.status === 'approved').length,
            list.filter((v) => v.status === 'rejected').length,
            pctLabel(rate(list)),
            duration(reviewMinutes(list)),
          ];
        }),
      },
      {
        title: 'Rejection reasons',
        headers: ['Reason', 'Rejected'],
        numeric: [1],
        rows: [
          ...new Set(
            all.filter((v) => v.status === 'rejected').map((v) => v.reason ?? 'No reason'),
          ),
        ]
          .map((reason): (string | number)[] => [
            reason,
            all.filter((v) => v.status === 'rejected' && (v.reason ?? 'No reason') === reason)
              .length,
          ])
          .sort((a, b) => Number(b[1]) - Number(a[1])),
      },
    ],
  };
}

function risk(
  input: ReportInput,
): Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'> {
  const flags = input.riskFlags;
  const count = (list: RiskFlag[], status: RiskFlag['status']) =>
    list.filter((f) => f.status === status).length;
  return {
    summary: [
      { label: 'Flags', value: String(flags.length) },
      { label: 'Open', value: String(count(flags, 'open')) },
      { label: 'Confirmed fraud', value: String(count(flags, 'confirmed')) },
      { label: 'Dismissed', value: String(count(flags, 'dismissed')) },
      {
        label: 'Accounts confirmed',
        value: String(
          new Set(flags.filter((f) => f.status === 'confirmed').map((f) => f.userId)).size,
        ),
      },
    ],
    tables: [
      {
        title: 'By rule and outcome',
        headers: ['Rule', 'Severity', 'Flags', 'Open', 'Confirmed', 'Dismissed'],
        numeric: [2, 3, 4, 5],
        rows: RISK_RULES.map((rule) => {
          const list = flags.filter((f) => f.rule === rule.id);
          return [
            rule.label,
            SEVERITY_LABELS[rule.severity],
            list.length,
            count(list, 'open'),
            count(list, 'confirmed'),
            count(list, 'dismissed'),
          ];
        }),
      },
    ],
  };
}

const BUILDERS: Record<
  ReportId,
  (
    input: ReportInput,
    now: Date,
  ) => Omit<AdminReport, 'id' | 'title' | 'description' | 'generatedAt'>
> = {
  platform,
  regions,
  loans,
  credit,
  verifications,
  risk,
};

export function buildAdminReport(id: ReportId, input: ReportInput): AdminReport {
  const now = input.now ?? new Date();
  const meta = REPORT_CATALOG.find((r) => r.id === id)!;
  return { ...meta, generatedAt: now.toISOString(), ...BUILDERS[id](input, now) };
}

/** The report as CSV: the headline figures, then each table under its title. */
export function reportToCSV(report: AdminReport): string {
  type Row = (string | number)[];
  const rows: Row[] = [
    [`AgriCtec — ${report.title}`],
    [`Generated ${format(new Date(report.generatedAt), 'd MMM yyyy, HH:mm')}`],
    [],
    ['Summary'],
    ...report.summary.map((s): Row => [s.label, s.value]),
  ];
  for (const table of report.tables) rows.push([], [table.title], table.headers, ...table.rows);
  const width = Math.max(...rows.map((r) => r.length));
  return toCSV(
    rows,
    Array.from({ length: width }, (_, i) => ({ header: '', value: (row: Row) => row[i] ?? '' })),
  ).replace(/^(﻿)[^\r\n]*\r\n/, '$1');
}

export const reportFileName = (
  report: Pick<AdminReport, 'title' | 'generatedAt'>,
  ext: 'csv' | 'pdf',
) => `AgriCtec_${report.title.replace(/\W+/g, '_')}_${report.generatedAt.slice(0, 10)}.${ext}`;
