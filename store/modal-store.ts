import { create } from 'zustand';
import { isEntriesReadOnly, notifyReadOnly } from '@/lib/read-only';
import type { NewMomoInput, NewRecordInput } from '@/types';

export type GlobalModal = 'record' | 'momo';

interface ModalState {
  modal: GlobalModal | null;
  /** Set when editing an existing record / transaction; undefined when creating. */
  editingId?: string;
  recordDefaults?: Partial<NewRecordInput>;
  /** Prefills a new MoMo transaction, e.g. the direction from "Log money received". */
  momoDefaults?: Partial<NewMomoInput>;
  /** A receipt chosen with "Import receipt": attached as evidence once the new record is saved. */
  receipt?: File;
  openModal: (modal: GlobalModal, editingId?: string) => void;
  openRecordWithDefaults: (defaults: Partial<NewRecordInput>) => void;
  openMomoWithDefaults: (defaults: Partial<NewMomoInput>) => void;
  openRecordWithReceipt: (receipt: File) => void;
  closeModal: () => void;
}

/** Which app-wide form modal is open. The modals are mounted once in app/(main)/layout.tsx. */
/**
 * True (with a note) when the record or MoMo form must not open: while an admin views the app
 * as a farmer. The guest demo may open them (entries stay in the browser's memory).
 */
function blocked(): boolean {
  if (!isEntriesReadOnly()) return false;
  notifyReadOnly();
  return true;
}

export const useModalStore = create<ModalState>()((set) => ({
  modal: null,
  editingId: undefined,
  recordDefaults: undefined,
  momoDefaults: undefined,
  receipt: undefined,
  openModal: (modal, editingId) =>
    blocked() ||
    set({
      modal,
      editingId,
      recordDefaults: undefined,
      momoDefaults: undefined,
      receipt: undefined,
    }),
  openRecordWithDefaults: (recordDefaults) =>
    blocked() ||
    set({
      modal: 'record',
      editingId: undefined,
      recordDefaults,
      momoDefaults: undefined,
      receipt: undefined,
    }),
  openRecordWithReceipt: (receipt) =>
    blocked() ||
    set({
      modal: 'record',
      editingId: undefined,
      recordDefaults: undefined,
      momoDefaults: undefined,
      receipt,
    }),
  openMomoWithDefaults: (momoDefaults) =>
    blocked() ||
    set({
      modal: 'momo',
      editingId: undefined,
      recordDefaults: undefined,
      momoDefaults,
      receipt: undefined,
    }),
  closeModal: () =>
    set({
      modal: null,
      editingId: undefined,
      recordDefaults: undefined,
      momoDefaults: undefined,
      receipt: undefined,
    }),
}));
