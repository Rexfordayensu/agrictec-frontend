// The assistant's knowledge base in the console (phase A12): ordering, duplicate keywords and the
// sample farmer used by the previews. Pure, so the list, the form, the console and the tests agree.

import { ASSISTANT_FALLBACK_ID } from '@/lib/admin/defaults';
import { keywordMatches, type AssistantContext } from '@/lib/ai/assistant-replies';
import type { AssistantKnowledgeItem, CreditConfig, FarmerAccount } from '@/types/admin';

export const isFallback = (item: Pick<AssistantKnowledgeItem, 'id'>) =>
  item.id === ASSISTANT_FALLBACK_ID;

/** Matching order: highest priority first, the fallback always last. */
export const byPriority = (items: AssistantKnowledgeItem[]) =>
  [...items].sort(
    (a, b) => Number(isFallback(a)) - Number(isFallback(b)) || b.priority - a.priority,
  );

/**
 * Re-numbers priorities to follow the given order (first = highest). Steps of 10 leave room;
 * the fallback keeps priority 0 and stays last.
 */
export function withOrder(ordered: AssistantKnowledgeItem[]): AssistantKnowledgeItem[] {
  const items = ordered.filter((i) => !isFallback(i));
  const fallback = ordered.filter(isFallback);
  const step = items.length * 10 <= 1000 ? 10 : 1;
  return [
    ...items.map((item, index) => ({
      ...item,
      priority: Math.max(1, (items.length - index) * step),
    })),
    ...fallback.map((item) => ({ ...item, priority: 0 })),
  ];
}

/** Moves the item at `from` to `to` (both in matching order) and re-numbers priorities. */
export function moveItem(
  items: AssistantKnowledgeItem[],
  from: number,
  to: number,
): AssistantKnowledgeItem[] {
  const ordered = byPriority(items);
  if (isFallback(ordered[from]) || isFallback(ordered[to] ?? ordered[from])) return ordered;
  const [moved] = ordered.splice(from, 1);
  ordered.splice(to, 0, moved);
  return withOrder(ordered);
}

/** Keywords used by more than one active item: only the higher one ever answers. */
export function duplicateKeywords(
  items: AssistantKnowledgeItem[],
): { keyword: string; titles: string[] }[] {
  const owners = new Map<string, string[]>();
  for (const item of items) {
    if (!item.active || isFallback(item)) continue;
    for (const keyword of new Set(item.keywords.map((k) => k.trim().toLowerCase()))) {
      owners.set(keyword, [...(owners.get(keyword) ?? []), item.reply.title]);
    }
  }
  return [...owners.entries()]
    .filter(([, titles]) => titles.length > 1)
    .map(([keyword, titles]) => ({ keyword, titles }));
}

/** Which of an item's keywords matches the message (for the test console). */
export function matchedKeyword(item: AssistantKnowledgeItem, message: string): string | null {
  const words = message.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return item.keywords.find((k) => keywordMatches(k, words)) ?? null;
}

/** A new item's ID ("kb-irrigation-3f2a"). */
export function newItemId(title: string, taken: string[]): string {
  const base =
    'kb-' +
    (title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'reply');
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** The assistant context for a farmer from the console's data (for previews and tests). */
export function contextFor(
  farmer: FarmerAccount | undefined,
  bands?: CreditConfig['bands'],
): AssistantContext {
  return {
    farmerName: farmer?.profile.name ?? 'Ama',
    region: farmer?.profile.region ?? 'Ashanti',
    primaryCrops: farmer?.profile.primaryCrops ?? ['Maize'],
    score: farmer?.stats.score ?? 640,
    income: farmer?.stats.income ?? 24_000,
    expenses: farmer?.stats.expenses ?? 15_000,
    recordCount: farmer?.stats.records ?? 18,
    bands,
  };
}
