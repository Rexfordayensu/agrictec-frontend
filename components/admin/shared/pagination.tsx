import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Page numbers to show: always the first, last and two around the current, with gaps. */
export function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap' as const, p] : [p]));
}

const buttonClass =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40';

/** "Showing 26–50 of 60" with previous/next and page numbers. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-2', className)}
    >
      <p className="text-text-dim text-xs">
        Showing{' '}
        <span className="text-text font-semibold tabular-nums">
          {from}–{to}
        </span>{' '}
        of <span className="text-text font-semibold tabular-nums">{total.toLocaleString()}</span>
      </p>
      {pageCount > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className={cn(buttonClass, 'text-text-dim hover:bg-glass-strong')}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          </li>
          {pageWindow(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <li key={`gap-${index}`} aria-hidden="true" className="text-text-mute px-1 text-xs">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                  className={cn(
                    buttonClass,
                    item === page
                      ? 'bg-purple/20 text-ink-purple'
                      : 'text-text-dim hover:bg-glass-strong',
                  )}
                >
                  {item}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={page >= pageCount}
              aria-label="Next page"
              className={cn(buttonClass, 'text-text-dim hover:bg-glass-strong')}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}
