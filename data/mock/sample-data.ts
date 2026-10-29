import { format, subDays, subMonths } from 'date-fns';
import { generateId } from '@/lib/utils';
import type { FarmRecord, MomoTransaction, NewMomoInput, NewRecordInput } from '@/types';

/** A date relative to today, e.g. ago(2, 5) = 2 months and 5 days ago. */
function ago(months: number, days: number): Date {
  return subDays(subMonths(new Date(), months), days);
}

function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

type RecordSeed = Omit<NewRecordInput, 'date'> & { when: Date };
type MomoSeed = Omit<NewMomoInput, 'date'> & { when: Date };

const recordSeeds = (): RecordSeed[] => [
  {
    type: 'expense',
    crop: 'Maize',
    description: 'NPK fertilizer, 10 bags',
    amount: 2400,
    when: ago(5, 20),
  },
  {
    type: 'expense',
    crop: 'Maize',
    description: 'Certified maize seeds',
    amount: 850,
    notes: '25kg of Obatanpa seed',
    when: ago(5, 12),
  },
  {
    type: 'activity',
    crop: 'Maize',
    description: 'Planted 5 acres of maize',
    amount: 0,
    when: ago(5, 10),
  },
  {
    type: 'expense',
    crop: 'Cassava',
    description: 'Labour for weeding (6 workers)',
    amount: 1200,
    when: ago(4, 18),
  },
  {
    type: 'income',
    crop: 'Cassava',
    description: 'Cassava sales to gari processors',
    amount: 3600,
    notes: '40 bags',
    when: ago(4, 3),
  },
  {
    type: 'expense',
    crop: 'Cocoa',
    description: 'Fungicide for black pod control',
    amount: 680,
    when: ago(3, 22),
  },
  {
    type: 'income',
    crop: 'Cocoa',
    description: 'Cocoa sales to LBC',
    amount: 8100,
    notes: '6 bags of 64kg',
    when: ago(3, 8),
  },
  {
    type: 'activity',
    crop: 'Cocoa',
    description: 'Pruned and cleared cocoa farm',
    amount: 0,
    when: ago(2, 25),
  },
  {
    type: 'expense',
    crop: 'Maize',
    description: 'Transport of produce to Kumasi market',
    amount: 450,
    when: ago(1, 20),
  },
  {
    type: 'income',
    crop: 'Maize',
    description: 'Maize sales at Techiman market',
    amount: 6400,
    notes: '20 bags of 100kg',
    when: ago(1, 15),
  },
  {
    type: 'expense',
    crop: 'Maize',
    description: 'Labour for harvesting and shelling',
    amount: 900,
    when: ago(0, 25),
  },
  {
    type: 'income',
    crop: 'Maize',
    description: 'Maize sales to Kofi Mensah',
    amount: 3200,
    notes: '10 bags of 100kg',
    when: ago(0, 6),
  },
];

const momoSeeds = (): MomoSeed[] => [
  {
    direction: 'out',
    network: 'MTN',
    amount: 2400,
    counterparty: 'Agro-Input Shop Kumasi',
    reference: 'MOMO483920',
    when: ago(5, 20),
  },
  {
    direction: 'in',
    network: 'MTN',
    amount: 3600,
    counterparty: 'Ama Owusu – Gari Processor',
    reference: 'MOMO512874',
    when: ago(4, 3),
  },
  {
    direction: 'in',
    network: 'Telecel',
    amount: 8100,
    counterparty: 'Asante Cocoa Buyers LBC',
    reference: 'MOMO604215',
    when: ago(3, 8),
  },
  {
    direction: 'out',
    network: 'AirtelTigo',
    amount: 450,
    counterparty: 'Yaw Boateng – Transport',
    reference: 'MOMO731058',
    when: ago(1, 20),
  },
  {
    direction: 'out',
    network: 'MTN',
    amount: 900,
    counterparty: 'Kwame Asare – Farm Labour',
    reference: 'MOMO845390',
    when: ago(0, 25),
  },
  {
    direction: 'in',
    network: 'MTN',
    amount: 3200,
    counterparty: 'Kofi Mensah – Buyer',
    reference: 'MOMO962147',
    when: ago(0, 6),
  },
];

/** Demo records and MoMo transactions dated relative to today, so charts always have data. */
export function buildSampleData(userId: string): {
  records: FarmRecord[];
  momo: MomoTransaction[];
} {
  const records = recordSeeds().map(({ when, ...seed }): FarmRecord => ({
    ...seed,
    id: generateId(),
    userId,
    date: toISODate(when),
    createdAt: when.toISOString(),
  }));

  const momo = momoSeeds().map(({ when, ...seed }): MomoTransaction => ({
    ...seed,
    id: generateId(),
    userId,
    date: toISODate(when),
    createdAt: when.toISOString(),
  }));

  return { records, momo };
}
