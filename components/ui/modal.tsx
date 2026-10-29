'use client';

import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/hooks/use-dialog';
import { useMounted } from '@/hooks/use-mounted';
import { cn } from '@/lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** A line under the title (also the dialog's accessible description). */
  description?: ReactNode;
  /** sm 420px, md 560px, lg 760px, xl 960px, full 95vw. Phones always get the full width. */
  size?: ModalSize;
  /** Action buttons, pinned to the bottom (stacked full width on phones). */
  footer?: ReactNode;
  /** A click on the dimmed backdrop closes the modal (default true). */
  closeOnBackdrop?: boolean;
  /** The modal holds a form with unsaved changes: closing it asks "Discard changes?" first. */
  dirty?: boolean;
  /** Focused when the modal opens (default: the modal itself). */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[760px]',
  xl: 'max-w-[960px]',
  full: 'max-w-[95vw]',
};

/**
 * The one dialog of the app: centred on a dimmed, blurred backdrop at every screen size, with a
 * fixed header and footer and a body that scrolls inside it. Focus is trapped while it is open,
 * Escape closes only the top-most modal, the page behind can't scroll, and focus returns to
 * whatever opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  dirty = false,
  initialFocus,
  className,
  children,
}: ModalProps) {
  const mounted = useMounted();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // A modal closed from outside never reopens with the discard prompt still showing.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setConfirmingDiscard(false);
  }

  /** X, Escape and the backdrop all close through here. */
  function requestClose() {
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  useDialog({ open, active: mounted, panelRef, initialFocus, onClose: requestClose });

  if (!mounted || !open) return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            onClick={closeOnBackdrop ? requestClose : undefined}
            className="animate-backdrop-in absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              'modal-glass modal-height animate-modal-in relative flex w-full flex-col overflow-hidden focus:outline-none',
              sizes[size],
              className,
            )}
          >
            <div className="border-border flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="font-display text-text text-lg leading-snug font-bold wrap-break-word"
                >
                  {title}
                </h2>
                {description && (
                  <div id={descriptionId} className="text-text-dim mt-1 text-sm">
                    {description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="text-text-dim hover:bg-glass-strong hover:text-text -mt-1.5 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {children}
            </div>

            {footer && (
              <div className="border-border flex shrink-0 flex-col gap-2 border-t px-5 py-4 *:w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-6 sm:*:w-auto">
                {footer}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Rendered after the panel, so it stacks on top and takes Escape first. */}
      <Modal
        open={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        title="Discard changes?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmingDiscard(false);
                onClose();
              }}
            >
              Discard
            </Button>
          </>
        }
      >
        <p className="text-text-dim text-sm leading-relaxed">
          You have unsaved changes. If you close now, they will be lost.
        </p>
      </Modal>
    </>
  );
}
