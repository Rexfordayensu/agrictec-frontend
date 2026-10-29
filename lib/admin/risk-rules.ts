// Fraud and risk detection rules (phase A13). Pure functions: every farmer's data in, suspected
// issues out. Each rule looks at one farmer's data, plus all farmers for the cross-account rules
// (a MoMo reference, a phone or a Ghana Card on more than one account). risk.service stores new
// results as RiskFlags; the seed runs the same rules on its planted data.

import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { formatDate, formatGHS, parseISODate } from '@/lib/format';
import { normalizePhone } from '@/lib/profile';
import type { FarmRecord, MomoTransaction, Profile } from '@/types';
import type { RiskFlag, RiskRuleId } from '@/types/admin';

export interface RiskSubject {
  userId: string;
  profile: Profile;
  records: FarmRecord[];
  momo: MomoTransaction[];
}

export type DetectedRisk = Pick<
  RiskFlag,
  'userId' | 'rule' | 'severity' | 'description' | 'relatedIds'
>;

/** What a rule's related IDs point to, so the review screen can show the actual items. */
export type RelatedKind = 'momo' | 'records' | 'accounts';

export interface RiskRule {
  id: RiskRuleId;
  label: string;
  /** One line: what the rule looks for. */
  explanation: string;
  /** Plain language for support staff: why it matters and what to check before deciding. */
  guidance: string;
  severity: RiskFlag['severity'];
  related: RelatedKind;
  detect: (subjects: RiskSubject[]) => DetectedRisk[];
}

/** Thresholds, kept together so the rules reference shows the same numbers the rules use. */
export const RISK_THRESHOLDS = {
  /** One amount more than this many times the farmer's median for that record type… */
  outlierMultiple: 5,
  /** …and above this amount (GHS). */
  outlierMinAmount: 5000,
  /** A median needs at least this many amounts of that type. */
  outlierMinSamples: 5,
  /** More than this many records created on the same day. */
  burstPerDay: 10,
  /** A month's income more than this many times the previous 3 months' average (= 300% above)… */
  spikeMultiple: 4,
  /** …and above this amount (GHS). */
  spikeMinAmount: 10000,
  /** How many earlier months make the average, and how many of them must have income. */
  spikeLookbackMonths: 3,
  spikeMinBaselineMonths: 2,
  /** More than this many records whose date is over `backdatedDays` before they were entered. */
  backdatedCount: 15,
  backdatedDays: 90,
} as const;

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

/** "A", "A and B", "A, B and C". */
export function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

const nameOf = (s: RiskSubject) => s.profile.name.trim() || 'an unnamed farmer';
const createdDay = (r: FarmRecord) => format(parseISO(r.createdAt), 'yyyy-MM-dd');

/**
 * One flag per account in each group of two or more accounts sharing the same value (a phone,
 * a Ghana Card). The related IDs are the other accounts.
 */
function sharedValue(
  subjects: RiskSubject[],
  rule: RiskRuleId,
  severity: RiskFlag['severity'],
  value: (subject: RiskSubject) => string,
  describe: (subject: RiskSubject, others: RiskSubject[]) => string,
): DetectedRisk[] {
  const flags: DetectedRisk[] = [];
  for (const group of groupBy(subjects, value).values()) {
    if (group.length < 2) continue;
    for (const subject of group) {
      const others = group.filter((s) => s.userId !== subject.userId);
      flags.push({
        userId: subject.userId,
        rule,
        severity,
        description: describe(subject, others),
        relatedIds: others.map((s) => s.userId),
      });
    }
  }
  return flags;
}

export const RISK_RULES: RiskRule[] = [
  {
    id: 'duplicate_momo_ref',
    label: 'Duplicate MoMo reference',
    explanation:
      'The same MoMo reference is used on two or more transactions, in one account or across accounts.',
    guidance:
      'Every Mobile Money transfer has its own reference, so one reference on two transactions usually means the same payment was entered twice, perhaps to make income look bigger. Compare the amounts, dates and counterparties; a genuine typo is common, so ask the farmer before confirming.',
    severity: 'high',
    related: 'momo',
    detect: (subjects) => {
      const owner = new Map<string, RiskSubject>();
      const all = subjects.flatMap((s) =>
        s.momo.map((t) => {
          owner.set(t.id, s);
          return t;
        }),
      );
      return [...groupBy(all, (t) => t.reference.trim().toUpperCase()).entries()]
        .filter(([, group]) => group.length > 1)
        .flatMap(([reference, group]) => {
          const accounts = [...new Set(group.map((t) => owner.get(t.id)!.userId))];
          const amounts = listOf(group.map((t) => formatGHS(t.amount)));
          const across = accounts.length > 1 ? ` across ${accounts.length} accounts` : '';
          return accounts.map((userId) => ({
            userId,
            rule: 'duplicate_momo_ref' as const,
            severity: 'high' as const,
            description: `Reference ${reference} appears on ${group.length} transactions${across} (${amounts}).`,
            relatedIds: ids(group),
          }));
        });
    },
  },
  {
    id: 'amount_outlier',
    label: 'Unusual amount',
    explanation: `One amount more than ${RISK_THRESHOLDS.outlierMultiple}× the farmer’s median for that type, and above ${formatGHS(RISK_THRESHOLDS.outlierMinAmount)}.`,
    guidance:
      'A single sale or expense far bigger than everything else the farmer records. It can be real (a tractor, a whole harvest sold at once) or a typing mistake with an extra zero, or an invented sale. Look at the description and ask for a receipt if it matters for a loan.',
    severity: 'medium',
    related: 'records',
    detect: (subjects) =>
      subjects.flatMap((s) =>
        (['income', 'expense'] as const).flatMap((type) => {
          const ofType = s.records.filter((r) => r.type === type && r.amount > 0);
          if (ofType.length < RISK_THRESHOLDS.outlierMinSamples) return [];
          const typical = median(ofType.map((r) => r.amount));
          return ofType
            .filter(
              (r) =>
                r.amount > RISK_THRESHOLDS.outlierMinAmount &&
                r.amount > typical * RISK_THRESHOLDS.outlierMultiple,
            )
            .map((r) => ({
              userId: s.userId,
              rule: 'amount_outlier' as const,
              severity: 'medium' as const,
              description: `${type === 'income' ? 'Income' : 'Expense'} of ${formatGHS(r.amount)} on ${formatDate(r.date)} is ${Math.round(r.amount / typical)}× this farmer’s median ${type} (${formatGHS(typical)}).`,
              relatedIds: [r.id],
            }));
        }),
      ),
  },
  {
    id: 'burst_entries',
    label: 'Burst of entries',
    explanation: `More than ${RISK_THRESHOLDS.burstPerDay} farm records created on the same day.`,
    guidance:
      'Many records typed in at once. Often harmless (a farmer catching up after a busy week, or a cooperative entering for its members), but it is also how a history gets made up just before a loan application. Check whether the dates and amounts look natural.',
    severity: 'medium',
    related: 'records',
    detect: (subjects) =>
      subjects.flatMap((s) =>
        [...groupBy(s.records, createdDay).entries()]
          .filter(([, group]) => group.length > RISK_THRESHOLDS.burstPerDay)
          .map(([day, group]) => ({
            userId: s.userId,
            rule: 'burst_entries' as const,
            severity: 'medium' as const,
            description: `${group.length} records were entered on ${formatDate(day)}.`,
            relatedIds: ids(group),
          })),
      ),
  },
  {
    id: 'income_spike',
    label: 'Income spike',
    explanation: `A month’s income more than 300% above the previous ${RISK_THRESHOLDS.spikeLookbackMonths} months’ average, and above ${formatGHS(RISK_THRESHOLDS.spikeMinAmount)}.`,
    guidance:
      'Income suddenly jumps far above what the farmer usually earns. Harvest months do bring big sales, so compare with the crop and season; a spike just before a loan application, with no matching MoMo receipts, deserves a closer look.',
    severity: 'medium',
    related: 'records',
    detect: (subjects) =>
      subjects.flatMap((s) => {
        const months = groupBy(
          s.records.filter((r) => r.type === 'income' && r.amount > 0),
          (r) => r.date.slice(0, 7),
        );
        const total = (month: string) =>
          (months.get(month) ?? []).reduce((sum, r) => sum + r.amount, 0);
        return [...months.entries()].flatMap(([month, group]) => {
          const amount = total(month);
          if (amount <= RISK_THRESHOLDS.spikeMinAmount) return [];
          const start = parseISODate(`${month}-01`);
          // The previous months that had income make the baseline.
          const baseline = Array.from({ length: RISK_THRESHOLDS.spikeLookbackMonths }, (_, i) =>
            total(format(addMonths(start, -(i + 1)), 'yyyy-MM')),
          ).filter((value) => value > 0);
          if (baseline.length < RISK_THRESHOLDS.spikeMinBaselineMonths) return [];
          const average = baseline.reduce((sum, v) => sum + v, 0) / baseline.length;
          if (amount <= average * RISK_THRESHOLDS.spikeMultiple) return [];
          return [
            {
              userId: s.userId,
              rule: 'income_spike' as const,
              severity: 'medium' as const,
              description: `Income in ${format(start, 'MMMM yyyy')} was ${formatGHS(amount)}, ${Math.round(((amount - average) / average) * 100)}% above the previous ${RISK_THRESHOLDS.spikeLookbackMonths} months’ average (${formatGHS(average)}).`,
              relatedIds: ids(group),
            },
          ];
        });
      }),
  },
  {
    id: 'shared_phone',
    label: 'Shared phone number',
    explanation: 'The same phone number is on more than one account.',
    guidance:
      'A phone (and its MoMo wallet) normally belongs to one farmer. Two accounts on one number can be a family sharing a phone, or one person running several accounts to borrow more than once. Compare the two accounts side by side.',
    severity: 'high',
    related: 'accounts',
    detect: (subjects) =>
      sharedValue(
        subjects,
        'shared_phone',
        'high',
        (s) => (s.profile.phone.trim() ? normalizePhone(s.profile.phone) : ''),
        (s, others) =>
          `Phone ${normalizePhone(s.profile.phone)} is also on ${others.length === 1 ? 'the account of' : `${others.length} other accounts:`} ${listOf(others.map(nameOf))}.`,
      ),
  },
  {
    id: 'shared_ghana_card',
    label: 'Shared Ghana Card',
    explanation: 'The same Ghana Card (matched by its fingerprint) is on more than one account.',
    guidance:
      'One Ghana Card belongs to one person. Matching is done on a one-way fingerprint of the full number, never the number itself. Two accounts with the same card is a strong sign of a duplicate or borrowed identity: compare the accounts and check which one the card really belongs to.',
    severity: 'high',
    related: 'accounts',
    detect: (subjects) =>
      sharedValue(
        subjects,
        'shared_ghana_card',
        'high',
        (s) =>
          s.profile.ghanaCard.status !== 'not_provided' ? (s.profile.ghanaCard.hash ?? '') : '',
        (s, others) =>
          `The same Ghana Card${s.profile.ghanaCard.masked ? ` (${s.profile.ghanaCard.masked})` : ''} is also on ${others.length === 1 ? 'the account of' : `${others.length} other accounts:`} ${listOf(others.map(nameOf))}.`,
      ),
  },
  {
    id: 'backdated_bulk',
    label: 'Backdated bulk entry',
    explanation: `More than ${RISK_THRESHOLDS.backdatedCount} records dated over ${RISK_THRESHOLDS.backdatedDays} days before they were entered.`,
    guidance:
      'Old activity entered long after it happened. New farmers often add their past season when they join, which is fine; but a large old history appearing all at once can be invented to pass the record requirement for a loan. Check the dates against the farmer’s sign-up and season.',
    severity: 'low',
    related: 'records',
    detect: (subjects) =>
      subjects.flatMap((s) => {
        const late = s.records.filter(
          (r) =>
            differenceInCalendarDays(parseISODate(createdDay(r)), parseISODate(r.date)) >
            RISK_THRESHOLDS.backdatedDays,
        );
        if (late.length <= RISK_THRESHOLDS.backdatedCount) return [];
        const worst = Math.max(
          ...late.map((r) =>
            differenceInCalendarDays(parseISODate(createdDay(r)), parseISODate(r.date)),
          ),
        );
        return [
          {
            userId: s.userId,
            rule: 'backdated_bulk' as const,
            severity: 'low' as const,
            description: `${late.length} records were entered more than ${RISK_THRESHOLDS.backdatedDays} days after their date (up to ${worst} days late).`,
            relatedIds: ids(late),
          },
        ];
      }),
  },
];

export const RISK_RULE_LABELS = Object.fromEntries(
  RISK_RULES.map((rule) => [rule.id, rule.label]),
) as Record<RiskRuleId, string>;

export const ruleById = (id: RiskRuleId): RiskRule => RISK_RULES.find((r) => r.id === id)!;

/** Runs every rule over every farmer. */
export function detectRisks(subjects: RiskSubject[]): DetectedRisk[] {
  return RISK_RULES.flatMap((rule) => rule.detect(subjects));
}

/** Identifies "the same finding": a new scan never re-adds a flag that already exists. */
export function riskKey(flag: Pick<RiskFlag, 'rule' | 'userId' | 'relatedIds'>): string {
  return `${flag.rule}|${flag.userId}|${[...flag.relatedIds].sort().join(',')}`;
}

// ---------- Review screen helpers ----------

export const SEVERITY_ORDER: Record<RiskFlag['severity'], number> = { high: 0, medium: 1, low: 2 };

export const SEVERITY_LABELS: Record<RiskFlag['severity'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export interface RiskSummary {
  open: Record<RiskFlag['severity'], number>;
  byStatus: Record<RiskFlag['status'], number>;
  /** The farmer with the most open or confirmed flags (null when there are none). */
  mostFlagged: { userId: string; count: number } | null;
}

/** Counts by severity (open flags) and by status, and the farmer most often flagged. */
export function summarizeRisk(flags: RiskFlag[]): RiskSummary {
  const open = { high: 0, medium: 0, low: 0 };
  const byStatus = { open: 0, dismissed: 0, confirmed: 0 };
  const perFarmer = new Map<string, number>();
  for (const flag of flags) {
    byStatus[flag.status]++;
    if (flag.status === 'open') open[flag.severity]++;
    if (flag.status !== 'dismissed')
      perFarmer.set(flag.userId, (perFarmer.get(flag.userId) ?? 0) + 1);
  }
  let mostFlagged: RiskSummary['mostFlagged'] = null;
  for (const [userId, count] of perFarmer)
    if (!mostFlagged || count > mostFlagged.count) mostFlagged = { userId, count };
  return { open, byStatus, mostFlagged };
}

/** Confirmed flags per farmer: they show the red "Risk" tag and "Account under review". */
export const confirmedRiskUsers = (flags: RiskFlag[]) =>
  new Set(flags.filter((f) => f.status === 'confirmed').map((f) => f.userId));
