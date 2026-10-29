'use client';

import type { ReactNode } from 'react';
import { Modal, type ModalSize } from '@/components/ui/modal';

export interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Actions pinned to the bottom of the modal. */
  footer?: ReactNode;
  /** lg (760px) by default; xl for side-by-side comparisons and diffs. */
  size?: ModalSize;
}

/**
 * A row's details in the centred Modal: focus trapped inside, Escape, the X or the backdrop
 * closes it, and focus returns to the row that opened it.
 */
export function DetailModal({ size = 'lg', ...props }: DetailModalProps) {
  return <Modal size={size} {...props} />;
}
