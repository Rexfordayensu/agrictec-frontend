import { create } from 'zustand';
import { toast } from 'sonner';
import { isReadOnly, READ_ONLY_MESSAGE } from '@/lib/read-only';
import type { NewMomoInput, NewRecordInput } from '@/types';

export type GlobalModal = 'record' | 'momo';

interface ModalState {
  modal: GlobalModal | null;
  /** Set when editing an existing record / transaction; undefined when creating. */
  editingId?: string;
  recordDefaults?: Partial<NewRecordInput>;
  /** Prefills a new MoMo transaction, e.g. the direction from "Log money received". */
  momoDefaults?: Partial<NewMomoInput>;
  openModal: (modal: GlobalModal, editingId?: string) => void;
  openRecordWithDefaults: (defaults: Partial<NewRecordInput>) => void;
  openMomoWithDefaults: (defaults: Partial<NewMomoInput>) => void;
  closeModal: () => void;
}

/** Which app-wide form modal is open. The modals are mounted once in app/(main)/layout.tsx. */
/** True (with a note) when forms must not open because the app is read-only. */
function blocked(): boolean {
  if (!isReadOnly()) return false;
  toast.info(READ_ONLY_MESSAGE);
  return true;
}

export const useModalStore = create<ModalState>()((set) => ({
  modal: null,
  editingId: undefined,
  recordDefaults: undefined,
  momoDefaults: undefined,
  openModal: (modal, editingId) =>
    blocked() || set({ modal, editingId, recordDefaults: undefined, momoDefaults: undefined }),
  openRecordWithDefaults: (recordDefaults) =>
    blocked() ||
    set({ modal: 'record', editingId: undefined, recordDefaults, momoDefaults: undefined }),
  openMomoWithDefaults: (momoDefaults) =>
    blocked() ||
    set({ modal: 'momo', editingId: undefined, recordDefaults: undefined, momoDefaults }),
  closeModal: () =>
    set({ modal: null, editingId: undefined, recordDefaults: undefined, momoDefaults: undefined }),
}));
