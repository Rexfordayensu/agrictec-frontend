import { create } from 'zustand';
import { assertWritable } from '@/lib/read-only';
import { buildSampleData } from '@/data/mock/sample-data';
import { diagnosesService } from '@/services/diagnoses.service';
import { momoService } from '@/services/momo.service';
import { recordsService } from '@/services/records.service';
import type {
  Diagnosis,
  FarmRecord,
  MomoTransaction,
  NewDiagnosisInput,
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
  addRecord: (input: NewRecordInput) => Promise<FarmRecord>;
  updateRecord: (id: string, patch: Partial<NewRecordInput>) => Promise<FarmRecord>;
  deleteRecord: (id: string) => Promise<void>;
  addMomo: (input: NewMomoInput) => Promise<MomoTransaction>;
  updateMomo: (id: string, patch: Partial<NewMomoInput>) => Promise<MomoTransaction>;
  deleteMomo: (id: string) => Promise<void>;
  addDiagnosis: (input: NewDiagnosisInput) => Promise<Diagnosis>;
  deleteDiagnosis: (id: string) => Promise<void>;
  loadSampleData: () => Promise<void>;
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

    addRecord: async (input) => {
      assertWritable();
      const record = await recordsService.create(requireUser(), input);
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

    addMomo: async (input) => {
      assertWritable();
      const transaction = await momoService.create(requireUser(), input);
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

    addDiagnosis: async (input) => {
      assertWritable();
      const userId = requireUser();
      const diagnosis = await diagnosesService.create(userId, input);
      if (get().userId === userId) {
        set((state) => ({ diagnoses: [diagnosis, ...state.diagnoses].slice(0, 10) }));
      }
      return diagnosis;
    },

    deleteDiagnosis: async (id) => {
      assertWritable();
      const userId = requireUser();
      await diagnosesService.remove(userId, id);
      if (get().userId === userId) {
        set((state) => ({ diagnoses: state.diagnoses.filter((diagnosis) => diagnosis.id !== id) }));
      }
    },

    loadSampleData: async () => {
      assertWritable();
      const userId = requireUser();
      const sample = buildSampleData(userId);
      const [records, momo] = await Promise.all([
        recordsService.replaceAll(userId, sample.records),
        momoService.replaceAll(userId, sample.momo),
      ]);
      set({ records, momo });
    },

    clearAll: async () => {
      assertWritable();
      const userId = requireUser();
      await Promise.all([
        recordsService.replaceAll(userId, []),
        momoService.replaceAll(userId, []),
        diagnosesService.clear(userId),
      ]);
      set({ records: [], momo: [], diagnoses: [] });
    },
  };
});
