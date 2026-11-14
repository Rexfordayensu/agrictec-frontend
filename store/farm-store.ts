import { create } from 'zustand';
import { assertWritable } from '@/lib/read-only';
import { diagnosesService } from '@/services/diagnoses.service';
import { momoService } from '@/services/momo.service';
import { recordsService } from '@/services/records.service';
import type {
  Diagnosis,
  FarmRecord,
  MomoTransaction,
  NewMomoInput,
  NewRecordInput,
  LoadOptions,
  StoreStatus,
} from '@/types';

interface FarmState {
  userId: string | null;
  records: FarmRecord[];
  momo: MomoTransaction[];
  diagnoses: Diagnosis[];
  status: StoreStatus;
  load: (userId: string, options?: LoadOptions) => Promise<void>;
  /** With a receipt the record and receipt are saved together (mobile money: sent for review). */
  addRecord: (input: NewRecordInput, receipt?: File) => Promise<FarmRecord>;
  updateRecord: (id: string, patch: Partial<NewRecordInput>) => Promise<FarmRecord>;
  deleteRecord: (id: string) => Promise<void>;
  /** A new MoMo transaction always comes with its receipt (sent for review). */
  addMomo: (input: NewMomoInput, receipt: File) => Promise<MomoTransaction>;
  updateMomo: (id: string, patch: Partial<NewMomoInput>) => Promise<MomoTransaction>;
  deleteMomo: (id: string) => Promise<void>;
  /** A diagnosis the API saved with a scan: shown in the history at once. */
  receiveDiagnosis: (diagnosis: Diagnosis) => void;
  deleteDiagnosis: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const byNewest = <T extends { date: string; createdAt: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

// Every action calls the service first, then updates state.
// Errors are not caught here: they reach the caller, which shows a toast.
export const useFarmStore = create<FarmState>()((set, get) => {
  const requireUser = (): string => {
    const { userId } = get();
    if (!userId) throw new Error('You need to sign in first');
    return userId;
  };

  return {
    userId: null,
    records: [],
    momo: [],
    diagnoses: [],
    status: 'idle',

    load: async (userId, { silent = false } = {}) => {
      set(silent ? { userId } : { userId, status: 'loading' });
      try {
        const [records, momo, diagnoses] = await Promise.all([
          recordsService.list(userId),
          momoService.list(userId),
          diagnosesService.list(userId),
        ]);
        // Ignore a stale response if another user was loaded in the meantime.
        if (get().userId !== userId) return;
        set({ records, momo, diagnoses, status: 'ready' });
      } catch (error) {
        set({ status: 'error' });
        throw error;
      }
    },

    addRecord: async (input, receipt) => {
      assertWritable();
      const record = receipt
        ? await recordsService.createWithReceipt(requireUser(), input, receipt)
        : await recordsService.create(requireUser(), input);
      set((state) => ({ records: [record, ...state.records].sort(byNewest) }));
      return record;
    },

    updateRecord: async (id, patch) => {
      assertWritable();
      const updated = await recordsService.update(requireUser(), id, patch);
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? updated : r)).sort(byNewest),
      }));
      return updated;
    },

    deleteRecord: async (id) => {
      assertWritable();
      await recordsService.remove(requireUser(), id);
      set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
    },

    addMomo: async (input, receipt) => {
      assertWritable();
      const transaction = await momoService.create(requireUser(), input, receipt);
      set((state) => ({ momo: [transaction, ...state.momo].sort(byNewest) }));
      return transaction;
    },

    updateMomo: async (id, patch) => {
      assertWritable();
      const updated = await momoService.update(requireUser(), id, patch);
      set((state) => ({
        momo: state.momo.map((t) => (t.id === id ? updated : t)).sort(byNewest),
      }));
      return updated;
    },

    deleteMomo: async (id) => {
      assertWritable();
      await momoService.remove(requireUser(), id);
      set((state) => ({ momo: state.momo.filter((t) => t.id !== id) }));
    },

    receiveDiagnosis: (diagnosis) => {
      if (get().userId !== diagnosis.userId) return;
      set((state) => ({
        diagnoses: [diagnosis, ...state.diagnoses.filter((d) => d.id !== diagnosis.id)].slice(
          0,
          10,
        ),
      }));
    },

    deleteDiagnosis: async (id) => {
      assertWritable();
      const userId = requireUser();
      await diagnosesService.remove(userId, id);
      if (get().userId === userId) {
        set((state) => ({ diagnoses: state.diagnoses.filter((diagnosis) => diagnosis.id !== id) }));
      }
    },

    clearAll: async () => {
      assertWritable();
      const userId = requireUser();
      await Promise.all([
        recordsService.clear(userId),
        momoService.clear(userId),
        diagnosesService.clear(userId),
      ]);
      set({ records: [], momo: [], diagnoses: [] });
    },
  };
});
