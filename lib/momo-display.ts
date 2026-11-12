// Wording for the MoMo page's figures (GET /me/momo/summary).

/**
 * "+54.58% vs last month", "New this month" or "Nothing last month". `change` is absent
 * (undefined: the API layer drops nulls) when last month had nothing to compare with.
 */
export function vsLastMonth(
  change: string | null | undefined,
  now: string,
  before: string,
): string {
  if (change != null) return `${change.startsWith('-') ? '' : '+'}${change}% vs last month`;
  if (Number(now) > 0 && Number(before) === 0) return 'New this month';
  return 'Nothing last month';
}
