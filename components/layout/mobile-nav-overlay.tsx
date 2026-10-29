'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/store/ui-store';

/**
 * Backdrop behind the mobile Menu sheet. Closes the sheet on click, on Escape and on route
 * change, and stops the page behind it from scrolling while it is open.
 */
export function MobileNavOverlay() {
  const pathname = usePathname();
  const open = useUiStore((s) => s.mobileNavOpen);
  const close = useUiStore((s) => s.closeMobileNav);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    // Close if the window grows past the mobile breakpoint, where the sheet is hidden.
    const desktop = window.matchMedia('(min-width: 900px)');
    const onResize = () => {
      if (desktop.matches) close();
    };
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onResize);
    return () => {
      root.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onResize);
    };
  }, [open, close]);

  return (
    <div
      aria-hidden="true"
      onClick={close}
      className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none min-[900px]:hidden ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    />
  );
}
