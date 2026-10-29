// Heavy loops over every farmer (the credit-rules impact preview, the risk scan) run in small
// slices and give the browser a turn between them, so typing, scrolling and the progress bar stay
// smooth while they work (phase A15).

/** Called after each slice with how many items are done so far. */
export type ProgressFn = (done: number, total: number) => void;

export interface ChunkOptions {
  /** Items per slice (default 8). */
  size?: number;
  onProgress?: ProgressFn;
  /** Stops between slices with an AbortError (e.g. the draft changed again). */
  signal?: AbortSignal;
}

/** Resolves once the browser is idle (or on the next task where idle callbacks don't exist). */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Like `items.map(fn)`, a slice at a time, yielding before each slice. */
export async function mapInChunks<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => R,
  { size = 8, onProgress, signal }: ChunkOptions = {},
): Promise<R[]> {
  const out: R[] = [];
  for (let start = 0; start < items.length; start += size) {
    await yieldToBrowser();
    signal?.throwIfAborted();
    const end = Math.min(start + size, items.length);
    for (let index = start; index < end; index++) out.push(fn(items[index], index));
    onProgress?.(end, items.length);
  }
  return out;
}

/** True for the error an aborted mapInChunks throws (callers ignore it: a newer run took over). */
export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
