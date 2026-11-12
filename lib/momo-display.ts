// Wording for the MoMo page's figures (GET /me/momo/summary).

/**
 * "+54.58% vs last month", "+0% vs last month" (nothing either month), or "New this month".
 * `change` is absent (undefined: the API layer drops nulls) when last month had nothing.
 */
export function vsLastMonth(
  change: string | null | undefined,
  now: string,
  before: string,
): string {
  if (change != null) return `${change.startsWith('-') ? '' : '+'}${change}% vs last month`;
  if (Number(now) > 0 && Number(before) === 0) return 'New this month';
  return '+0% vs last month';
}

/** What the donut's total is: sent only, received only, or both. */
export function movedLabel(countIn: number, countOut: number): string {
  if (countIn === 0 && countOut > 0) return 'Total Sent';
  if (countOut === 0 && countIn > 0) return 'Total Received';
  return 'Total Moved';
}
