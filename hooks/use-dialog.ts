'use client';

import { useEffect, useEffectEvent, useId, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// Open dialogs (modals and the mobile navigation menu), newest last: only the top one reacts to
// Escape and Tab (e.g. a ConfirmDialog opened from inside a detail modal).
const dialogStack: string[] = [];
// The page's state before the first dialog opened, restored when the last one closes.
let pageBeforeDialogs = { overflow: '', paddingRight: '', scrollY: 0 };

/** Stops the page behind from scrolling, without the layout jumping when the scrollbar goes. */
function lockPageScroll() {
  const { style } = document.body;
  pageBeforeDialogs = {
    overflow: style.overflow,
    paddingRight: style.paddingRight,
    scrollY: window.scrollY,
  };
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  style.overflow = 'hidden';
  if (scrollbar > 0) style.paddingRight = `${scrollbar}px`;
}

function unlockPageScroll() {
  const { style } = document.body;
  style.overflow = pageBeforeDialogs.overflow;
  style.paddingRight = pageBeforeDialogs.paddingRight;
  if (window.scrollY !== pageBeforeDialogs.scrollY) window.scrollTo(0, pageBeforeDialogs.scrollY);
}

// Touch browsers (iOS Safari, Chrome's mobile mode) don't focus a button when it is tapped, so
// the control that opened a dialog is also remembered from the last pointer press.
let lastPressed: { element: HTMLElement; at: number } | null = null;
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const element = event.target instanceof Element ? event.target.closest(FOCUSABLE) : null;
      lastPressed = element instanceof HTMLElement ? { element, at: Date.now() } : null;
    },
    true,
  );
}

/** What opened the dialog: the focused control, or the one just tapped. */
function openingControl(): HTMLElement | null {
  const focused = document.activeElement;
  if (focused instanceof HTMLElement && focused !== document.body) return focused;
  if (lastPressed && Date.now() - lastPressed.at < 2000) return lastPressed.element;
  return null;
}

export function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0,
  );
}

/**
 * Shared behaviour of every dialog-like panel: focus moves into the panel, Tab stays inside it,
 * Escape closes the top-most one, the page behind can't scroll, and focus returns to whatever
 * opened it. `active` is false until the panel is actually rendered (e.g. before mounting).
 */
export function useDialog({
  open,
  active = true,
  panelRef,
  initialFocus,
  onClose,
}: {
  open: boolean;
  active?: boolean;
  panelRef: RefObject<HTMLElement | null>;
  /** Focused on open instead of the panel itself (e.g. the first choice of a quick form). */
  initialFocus?: RefObject<HTMLElement | null>;
  onClose: () => void;
}): void {
  const dialogId = useId();

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (dialogStack.at(-1) !== dialogId) return;
    const panel = panelRef.current;
    if (!panel) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'Tab') {
      const items = focusableIn(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const focused = document.activeElement;
      const outside = !(focused instanceof Node) || !panel.contains(focused);

      if (event.shiftKey && (focused === first || focused === panel || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (focused === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  useEffect(() => {
    if (!open || !active) return;

    const trigger = openingControl();
    if (dialogStack.length === 0) lockPageScroll();
    dialogStack.push(dialogId);
    (initialFocus?.current ?? panelRef.current)?.focus();

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = dialogStack.lastIndexOf(dialogId);
      if (index !== -1) dialogStack.splice(index, 1);
      if (dialogStack.length === 0) unlockPageScroll();
      // Return focus to whatever opened the dialog (if it is still on the page).
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, active, dialogId, panelRef, initialFocus]);
}
