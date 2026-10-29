'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { fieldErrorId } from '@/components/ui/form-field';
import { geocodingService, type PlaceResult } from '@/services/geocoding.service';
import { cn } from '@/lib/utils';

/**
 * The "Community / town" field, which also finds the place on the map: type the town or
 * village, press Enter or "Find on map", pick a match, and the map moves there. Searches run
 * on request only (the free OpenStreetMap search asks for no more than one a second).
 */
export function CommunityField({
  id,
  value,
  onChange,
  onBlur,
  onPick,
  region,
  error,
  inputRef,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** A place was chosen: the field takes its name and the map moves there. */
  onPick: (place: PlaceResult) => void;
  /** The chosen region, added to the search so the right "Ejura" comes first. */
  region?: string;
  error?: string;
  inputRef?: (element: HTMLInputElement | null) => void;
}) {
  const listId = useId();
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  async function search() {
    const q = value.trim();
    if (q.length < 2) {
      setMessage('Type at least 2 letters of your town or village.');
      setResults(null);
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage(null);
    try {
      // The region narrows it down; if that finds nothing, try the name alone.
      let found = region
        ? await geocodingService.searchPlaces(`${q}, ${region} Region`, controller.signal)
        : [];
      if (found.length === 0) found = await geocodingService.searchPlaces(q, controller.signal);
      setResults(found);
      if (found.length === 0)
        setMessage(
          `No place called “${q}” found. Check the spelling or try a nearby town. You can still zoom the map and tap your farm.`,
        );
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setResults(null);
      setMessage(
        'Finding places needs an internet connection. You can still zoom and tap the map.',
      );
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  }

  function choose(place: PlaceResult) {
    setResults(null);
    setMessage(null);
    onChange(place.name.slice(0, 80));
    onPick(place);
  }

  const describedBy = [error && fieldErrorId(id), message && `${id}-msg`].filter(Boolean).join(' ');

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            id={id}
            ref={inputRef}
            type="search"
            value={value}
            maxLength={80}
            enterKeyHint="search"
            autoComplete="address-level3"
            placeholder="e.g. Ejura"
            aria-invalid={error ? true : undefined}
            aria-controls={results ? listId : undefined}
            aria-describedby={describedBy || undefined}
            onBlur={onBlur}
            onChange={(event) => {
              onChange(event.target.value);
              setMessage(null);
            }}
            onKeyDown={(event) => {
              // Enter finds the place; it must not submit the onboarding step.
              if (event.key === 'Enter') {
                event.preventDefault();
                void search();
              }
              if (event.key === 'Escape') setResults(null);
            }}
            className={cn(
              'bg-bg-2 text-text focus:border-accent placeholder:text-text-mute min-h-11 w-full rounded-xl border pr-3 pl-10 text-sm outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]',
              error ? 'border-danger' : 'border-border',
            )}
          />
        </div>
        <button
          type="button"
          onClick={() => void search()}
          disabled={busy}
          className="bg-accent/15 text-ink-green hover:bg-accent/25 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <MapPin size={16} aria-hidden="true" />
          )}
          <span className="hidden min-[400px]:inline">Find on map</span>
          <span className="min-[400px]:hidden">Find</span>
        </button>
      </div>

      {message && (
        <p id={`${id}-msg`} role="status" className="text-text-mute mt-2 text-xs">
          {message}
        </p>
      )}

      {results && results.length > 0 && (
        <div className="border-border bg-bg-1 absolute inset-x-0 top-full z-[600] mt-1.5 overflow-hidden rounded-xl border shadow-2xl">
          <div className="border-border flex items-center justify-between border-b px-3.5 py-2">
            <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">
              {results.length} place{results.length === 1 ? '' : 's'} found
            </p>
            <button
              type="button"
              onClick={() => setResults(null)}
              aria-label="Close results"
              className="text-text-mute hover:text-text inline-flex size-8 items-center justify-center rounded-lg"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <ul id={listId} aria-label="Places found" className="max-h-64 overflow-y-auto py-1">
            {results.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => choose(place)}
                  className="hover:bg-glass-strong focus-visible:bg-glass-strong flex min-h-11 w-full items-start gap-2.5 px-3.5 py-2 text-left outline-none"
                >
                  <MapPin size={15} aria-hidden="true" className="text-ink-green mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="text-text block text-sm font-semibold">{place.name}</span>
                    {place.detail && (
                      <span className="text-text-mute block truncate text-xs">{place.detail}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
