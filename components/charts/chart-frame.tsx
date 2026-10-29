'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wraps a Chart.js chart and mounts it after the page has painted: straight away when it is
 * on (or near) screen, otherwise as soon as the browser is idle. Until then it reserves
 * exactly the chart's space (fixed height, parent height, or the chart's aspect ratio), so
 * nothing shifts when it appears. This keeps chart set-up and drawing (the largest share of
 * navigation time in profiling) off the click-to-content path, without leaving it for the
 * moment the user scrolls to the chart.
 */
export function ChartFrame({
  height,
  aspectRatio,
  className,
  children,
}: {
  /** Fixed px height, or 'fill' to take the parent's height. */
  height?: number | 'fill';
  /** Width ÷ height, used when no height is given. */
  aspectRatio: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const show = () => setNear(true);
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && show(), {
      rootMargin: '300px 0px',
    });
    observer.observe(el);
    // Off-screen charts: mount when the main thread is free (Safari has no
    // requestIdleCallback, so it falls back to a short timer).
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(show, { timeout: 1500 })
        : window.setTimeout(show, 300);
    return () => {
      observer.disconnect();
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [near]);

  const style: CSSProperties | undefined =
    height === 'fill'
      ? { height: '100%', position: 'relative' }
      : height
        ? { height, position: 'relative' }
        : near
          ? undefined
          : { aspectRatio: String(aspectRatio) };

  return (
    <div ref={ref} className={cn(className)} style={style}>
      {near ? children : null}
    </div>
  );
}
