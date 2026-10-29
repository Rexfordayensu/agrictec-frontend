// The custom report builder (phase A14): pick a dataset, its columns and filters (region, crop,
// date range), preview the first rows and export CSV. Pure: rows and columns only, no storage.
// Never a password hash or a Ghana Card number: no column exposes them.

import { LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import { toCSV } from '@/lib/export/csv';
import { GHANA_CARD_LABELS, cropNames, formatFarmSize } from '@/lib/profile';
import type { FarmRecord, MomoTransaction } from '@/types';
import type { FarmerAccount, Lender, LoanApplication } from '@/types/admin';

export type DatasetId = 'farmers' | 'records' | 'momo' | 'applications';

type Cell = string | number;

export interface BuilderColumn<T> {
  key: string;
  label: string;
  value: (row: T) => Cell;
  /** Shown ticked when the dataset is picked. */
  default?: boolean;
}

/** A row with what the filters need, whatever the dataset. */
interface Located<T> {
  row: T;
  region: string;
  crops: string[];
  /** "yyyy-MM-dd" for the date-range filter. */
  date: string;
}

export interface BuilderSource {
  farmers: FarmerAccount[];
  records: FarmRecord[];
  momo: MomoTransaction[];
  applications: LoanApplication[];
  lenders: Lender[];
}

interface Dataset<T> {
  id: DatasetId;
  label: string;
  description: string;
  /** What the date range filters on. */
  dateLabel: string;
  columns: BuilderColumn<T>[];
  rows: (source: BuilderSource) => Located<T>[];
}

const farmerLookup = (source: BuilderSource) => new Map(source.farmers.map((f) => [f.userId, f]));
const day = (iso: string) => iso.slice(0, 10);

const FARMERS: Dataset<FarmerAccount> = {
  id: 'farmers',
  label: 'Farmers',
  description: 'One row per farmer account (guests left out).',
  dateLabel: 'Joined',
  columns: [
    { key: 'name', label: 'Name', value: (f) => f.profile.name, default: true },
    { key: 'email', label: 'Email', value: (f) => f.email },
    { key: 'phone', label: 'Phone', value: (f) => f.profile.phone },
    { key: 'region', label: 'Region', value: (f) => f.profile.region, default: true },
    { key: 'constituency', label: 'Constituency', value: (f) => f.profile.constituency },
    { key: 'farm', label: 'Farm', value: (f) => f.profile.farmName },
    { key: 'farmType', label: 'Farm type', value: (f) => f.profile.farmType },
    {
      key: 'size',
      label: 'Farm size',
      value: (f) => formatFarmSize(f.profile.acres, f.profile.sizeUnit),
    },
    { key: 'crops', label: 'Crops', value: (f) => cropNames(f.profile).join('; '), default: true },
    { key: 'score', label: 'Credit score', value: (f) => f.stats.score, default: true },
    { key: 'income', label: 'Income (GHS)', value: (f) => f.stats.income, default: true },
    { key: 'expenses', label: 'Expenses (GHS)', value: (f) => f.stats.expenses },
    { key: 'records', label: 'Records', value: (f) => f.stats.records },
    { key: 'momo', label: 'MoMo transactions', value: (f) => f.stats.momo },
    {
      key: 'card',
      label: 'Ghana Card',
      value: (f) => GHANA_CARD_LABELS[f.profile.ghanaCard.status],
      default: true,
    },
    { key: 'status', label: 'Status', value: (f) => f.status },
    { key: 'joined', label: 'Joined', value: (f) => day(f.createdAt), default: true },
  ],
  rows: (source) =>
    source.farmers
      .filter((f) => !f.isGuest)
      .map((f) => ({
        row: f,
        region: f.profile.region,
        crops: cropNames(f.profile),
        date: day(f.createdAt),
      })),
};

const RECORDS: Dataset<FarmRecord & { farmer: string }> = {
  id: 'records',
  label: 'Farm records',
  description: 'Every income, expense and activity record.',
  dateLabel: 'Record date',
  columns: [
    { key: 'date', label: 'Date', value: (r) => r.date, default: true },
    { key: 'farmer', label: 'Farmer', value: (r) => r.farmer, default: true },
    { key: 'type', label: 'Type', value: (r) => r.type, default: true },
    { key: 'crop', label: 'Crop', value: (r) => r.crop, default: true },
    { key: 'description', label: 'Description', value: (r) => r.description, default: true },
    { key: 'amount', label: 'Amount (GHS)', value: (r) => r.amount, default: true },
    { key: 'entered', label: 'Entered', value: (r) => r.createdAt.slice(0, 16).replace('T', ' ') },
  ],
  rows: (source) => {
    const farmers = farmerLookup(source);
    return source.records.flatMap((r) => {
      const f = farmers.get(r.userId);
      if (!f || f.isGuest) return [];
      return [
        {
          row: { ...r, farmer: f.profile.name || f.email },
          region: f.profile.region,
          crops: [r.crop],
          date: r.date,
        },
      ];
    });
  },
};

const MOMO: Dataset<MomoTransaction & { farmer: string }> = {
  id: 'momo',
  label: 'MoMo transactions',
  description: 'Every Mobile Money transaction farmers logged.',
  dateLabel: 'Transaction date',
  columns: [
    { key: 'date', label: 'Date', value: (t) => t.date, default: true },
    { key: 'farmer', label: 'Farmer', value: (t) => t.farmer, default: true },
    {
      key: 'direction',
      label: 'Direction',
      value: (t) => (t.direction === 'in' ? 'In' : 'Out'),
      default: true,
    },
    { key: 'counterparty', label: 'Counterparty', value: (t) => t.counterparty, default: true },
    { key: 'amount', label: 'Amount (GHS)', value: (t) => t.amount, default: true },
    { key: 'reference', label: 'Reference', value: (t) => t.reference },
    { key: 'network', label: 'Network', value: (t) => t.network ?? '' },
  ],
  rows: (source) => {
    const farmers = farmerLookup(source);
    return source.momo.flatMap((t) => {
      const f = farmers.get(t.userId);
      if (!f || f.isGuest) return [];
      return [
        {
          row: { ...t, farmer: f.profile.name || f.email },
          region: f.profile.region,
          crops: cropNames(f.profile),
          date: t.date,
        },
      ];
    });
  },
};

const APPLICATIONS: Dataset<LoanApplication & { farmer: string; lender: string }> = {
  id: 'applications',
  label: 'Loan applications',
  description: 'Every loan application with its current status.',
  dateLabel: 'Sent',
  columns: [
    { key: 'reference', label: 'Reference', value: (a) => a.reference, default: true },
    { key: 'farmer', label: 'Farmer', value: (a) => a.farmer, default: true },
    { key: 'lender', label: 'Lender', value: (a) => a.lender, default: true },
    { key: 'amount', label: 'Amount (GHS)', value: (a) => a.amount, default: true },
    { key: 'purpose', label: 'Purpose', value: (a) => a.purpose },
    { key: 'months', label: 'Months', value: (a) => a.months },
    { key: 'rate', label: 'Rate (%)', value: (a) => a.rate },
    { key: 'score', label: 'Score at application', value: (a) => a.scoreAtApplication },
    { key: 'status', label: 'Status', value: (a) => LOAN_STATUS_LABELS[a.status], default: true },
    { key: 'sent', label: 'Sent', value: (a) => day(a.createdAt), default: true },
  ],
  rows: (source) => {
    const farmers = farmerLookup(source);
    return source.applications.map((a) => {
      const f = farmers.get(a.userId);
      return {
        row: {
          ...a,
          farmer: f ? f.profile.name || f.email : 'Deleted farmer',
          lender: source.lenders.find((l) => l.id === a.partnerId)?.name ?? 'Unknown lender',
        },
        region: f?.profile.region ?? '',
        crops: f ? cropNames(f.profile) : [],
        date: day(a.createdAt),
      };
    });
  },
};

// The datasets differ in row type; the builder works on them through this common shape.
export type AnyDataset = Dataset<never>;
export const DATASETS = [FARMERS, RECORDS, MOMO, APPLICATIONS] as unknown as AnyDataset[];

export const datasetById = (id: DatasetId): AnyDataset => DATASETS.find((d) => d.id === id)!;

export const defaultColumns = (id: DatasetId) =>
  datasetById(id)
    .columns.filter((c) => c.default)
    .map((c) => c.key);

export interface BuilderSpec {
  dataset: DatasetId;
  columns: string[];
  region?: string;
  crop?: string;
  /** Inclusive "yyyy-MM-dd". */
  from?: string;
  to?: string;
}

export interface BuilderResult {
  headers: string[];
  rows: Cell[][];
  total: number;
}

/** Applies the filters and picks the columns (in the dataset's order). */
export function runBuilder(spec: BuilderSpec, source: BuilderSource): BuilderResult {
  const dataset = datasetById(spec.dataset);
  const columns = dataset.columns.filter((c) => spec.columns.includes(c.key));
  const crop = spec.crop?.toLowerCase();
  const rows = dataset
    .rows(source)
    .filter(
      (item) =>
        (!spec.region || item.region === spec.region) &&
        (!crop || item.crops.some((c) => c.toLowerCase() === crop)) &&
        (!spec.from || item.date >= spec.from) &&
        (!spec.to || item.date <= spec.to),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    headers: columns.map((c) => c.label),
    rows: rows.map((item) => columns.map((c) => c.value(item.row as never))),
    total: rows.length,
  };
}

export function builderToCSV(result: BuilderResult): string {
  return toCSV(
    result.rows,
    result.headers.map((header, i) => ({ header, value: (row: Cell[]) => row[i] ?? '' })),
  );
}
