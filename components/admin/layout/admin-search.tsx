'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Landmark, Search, UserRound, type LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { Modal } from '@/components/ui/modal';
import { useAdminRole } from '@/hooks/admin/use-can';
import { useDebounce } from '@/hooks/use-debounce';
import { can } from '@/lib/admin/permissions';
import { formatGHS } from '@/lib/format';
import { normalizePhone } from '@/lib/profile';
import { cn } from '@/lib/utils';
import { lendersService } from '@/services/admin/lenders.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import { useAdminUiStore } from '@/store/admin/admin-ui-store';
import type {
  AdminRole,
  FarmerAccount,
  Lender,
  LoanApplication,
  LoanStatus,
  AccountStatus,
} from '@/types/admin';

const MAX_PER_GROUP = 6;

export type SearchHit =
  | {
      kind: 'farmer';
      id: string;
      href: string;
      title: string;
      detail: string;
      status: AccountStatus;
    }
  | {
      kind: 'application';
      id: string;
      href: string;
      title: string;
      detail: string;
      status: LoanStatus;
    }
  | { kind: 'lender'; id: string; href: string; title: string; detail: string };

const KIND_ICON: Record<SearchHit['kind'], LucideIcon> = {
  farmer: UserRound,
  application: ClipboardList,
  lender: Landmark,
};

const digits = (value: string) => value.replace(/\D/g, '');

/**
 * Farmers by name, email or phone; applications by reference; lenders by name. Only what the
 * role may open is searched. Pure, so it is easy to test.
 */
export function searchConsole(
  query: string,
  data: { farmers: FarmerAccount[]; applications: LoanApplication[]; lenders: Lender[] },
  role: AdminRole | undefined,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const qDigits = digits(q);
  // Phones are stored as +233…; a local "024…" search is the same number without the 0.
  const phoneQuery = qDigits.startsWith('0') ? `233${qDigits.slice(1)}` : qDigits;
  const names = new Map(data.farmers.map((f) => [f.userId, f.profile.name || f.email]));

  const farmers: SearchHit[] = can(role, 'farmers.view')
    ? data.farmers
        .filter((f) => {
          const phone = f.profile.phone ? digits(normalizePhone(f.profile.phone)) : '';
          return (
            f.profile.name.toLowerCase().includes(q) ||
            f.email.toLowerCase().includes(q) ||
            (qDigits.length >= 4 && phone !== '' && phone.includes(phoneQuery))
          );
        })
        .slice(0, MAX_PER_GROUP)
        .map((f) => ({
          kind: 'farmer' as const,
          id: f.userId,
          href: `/admin/farmers/${f.userId}`,
          title: f.profile.name || f.email,
          detail: [f.email, f.profile.region].filter(Boolean).join(' · '),
          status: f.status,
        }))
    : [];

  const applications: SearchHit[] = can(role, 'loans.view')
    ? data.applications
        .filter((a) => a.reference.toLowerCase().includes(q))
        .slice(0, MAX_PER_GROUP)
        .map((a) => ({
          kind: 'application' as const,
          id: a.id,
          href: `/admin/loans/${a.id}`,
          title: a.reference,
          detail: `${names.get(a.userId) ?? 'Farmer'} · ${formatGHS(a.amount)}`,
          status: a.status,
        }))
    : [];

  const lenders: SearchHit[] = can(role, 'lenders.manage')
    ? data.lenders
        .filter((l) => l.name.toLowerCase().includes(q))
        .slice(0, MAX_PER_GROUP)
        .map((l) => ({
          kind: 'lender' as const,
          id: l.id,
          href: `/admin/lenders?q=${encodeURIComponent(l.name)}`,
          title: l.name,
          detail: `${l.rate}% · up to ${formatGHS(l.maxAmount)}${l.active ? '' : ' · inactive'}`,
        }))
    : [];

  return [...farmers, ...applications, ...lenders];
}

/** Opens the palette with Ctrl+K / ⌘K from anywhere in the console. */
export function useSearchShortcut() {
  const setOpen = useAdminUiStore((s) => s.setSearchOpen);
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useAdminUiStore.getState().searchOpen);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);
}

/** The global admin search (a combobox inside a dialog). */
export function AdminSearch() {
  const router = useRouter();
  const open = useAdminUiStore((s) => s.searchOpen);
  const setOpen = useAdminUiStore((s) => s.setSearchOpen);
  const role = useAdminRole();
  const farmers = useAdminDataStore((s) => s.farmers);
  const applications = useAdminDataStore((s) => s.applications);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-${index}`;

  useSearchShortcut();

  // Lenders aren't in the admin data store; load them when the palette opens.
  useEffect(() => {
    if (!open || !can(role, 'lenders.manage')) return;
    let active = true;
    lendersService.list({ includeInactive: true }).then((list) => active && setLenders(list));
    return () => {
      active = false;
    };
  }, [open, role]);

  // The dialog focuses its panel first; move focus to the input right after.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const debounced = useDebounce(query, 150);
  const results = searchConsole(debounced, { farmers, applications, lenders }, role);

  function close() {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  function choose(hit: SearchHit) {
    close();
    router.push(hit.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length) setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length) setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Search the console">
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search farmers, applications and lenders"
          aria-expanded={results.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
          placeholder="Name, email, phone, APP-2026-… or lender"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          className="border-border bg-bg-2 text-text placeholder:text-text-mute focus:border-purple min-h-12 w-full rounded-xl border pr-3 pl-10 text-sm focus:shadow-[0_0_0_3px_rgba(168,85,247,0.25)] focus:outline-none"
        />
      </div>

      <ul
        id={listboxId}
        role="listbox"
        aria-label="Results"
        className="mt-3 max-h-80 overflow-y-auto"
      >
        {debounced.trim().length >= 2 && results.length === 0 && (
          <li
            role="option"
            aria-selected={false}
            aria-disabled="true"
            className="text-text-mute px-3 py-4 text-sm"
          >
            No matches
          </li>
        )}
        {debounced.trim().length < 2 && (
          <li
            role="option"
            aria-selected={false}
            aria-disabled="true"
            className="text-text-mute px-3 py-4 text-sm"
          >
            Type at least two characters.
          </li>
        )}
        {results.map((hit, index) => {
          const Icon = KIND_ICON[hit.kind];
          return (
            <li
              key={`${hit.kind}-${hit.id}`}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(hit)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
                index === activeIndex && 'bg-glass-strong',
              )}
            >
              <span className="bg-purple/15 text-ink-purple inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-text block truncate font-semibold">{hit.title}</span>
                <span className="text-text-mute block truncate text-xs">{hit.detail}</span>
              </span>
              {hit.kind === 'farmer' && <StatusBadge kind="account" status={hit.status} />}
              {hit.kind === 'application' && <StatusBadge kind="loan" status={hit.status} />}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
