'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { useMounted } from '@/hooks/use-mounted';
import { cn } from '@/lib/utils';

export interface RowMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Red, for actions like Suspend. */
  danger?: boolean;
}

const MENU_WIDTH = 208;

/**
 * The ⋮ menu at the end of a table row. Rendered in a portal (a table's scroll area would clip
 * it), positioned under the button, with arrow-key navigation like the account menus.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const mounted = useMounted();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const open = position !== null;

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    menuItems()[0]?.focus();
    const close = () => setPosition(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  function toggle() {
    if (open) return setPosition(null);
    const rect = buttonRef.current!.getBoundingClientRect();
    const height = items.length * 44 + 12;
    const below = rect.bottom + 4 + height <= window.innerHeight;
    setPosition({
      top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - height),
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    });
  }

  function close(returnFocus = true) {
    setPosition(null);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = menuItems();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {mounted &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="animate-fade-in border-border bg-bg-2 shadow-glass fixed z-50 rounded-xl border p-1.5"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'hover:bg-glass-strong focus-visible:bg-glass-strong flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm focus:outline-none',
                    item.danger ? 'text-ink-red' : 'text-text',
                  )}
                >
                  <Icon size={15} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
