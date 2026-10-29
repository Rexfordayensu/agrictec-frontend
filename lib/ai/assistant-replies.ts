// To use a real AI later: replace the body of getAssistantReply with a fetch to your API route.
// Keep the same input/output types so no component needs to change.
//
// Replies come from the admin's knowledge items (content.service). The router walks the active
// items by priority and uses the first whose keywords match, then fills in placeholders with the
// farmer's own data. With the default items, every reply is the same as the original router's.
import {
  ASSISTANT_FALLBACK_ID,
  DEFAULT_ASSISTANT_KB,
  DEFAULT_CROP_CONTENT,
} from '@/lib/admin/defaults';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { LOANS_LOCKED_HINT } from '@/lib/calculations/loan';
import { formatGHS } from '@/lib/format';
import { formatMarketAmount, unitLabel } from '@/lib/market/evidence';
import { marketService } from '@/services/market.service';
import { delay } from '@/services/storage';
import type { AssistantReply, CreditScoreBreakdown, GhanaCardStatus } from '@/types';
import type { AssistantKnowledgeItem, CreditConfig, CropContent } from '@/types/admin';

export interface AssistantContext {
  farmerName: string;
  region: string;
  primaryCrops: string[];
  score: number;
  income: number;
  expenses: number;
  recordCount: number;
  /** The same factors used by the dashboard; lowest factor gets the first action. */
  creditFactors?: CreditScoreBreakdown;
  /** The admin's score bands, for {scoreLabel}. Defaults to 500 / 650 / 750. */
  bands?: CreditConfig['bands'];
  /**
   * The farmer's Ghana Card status. Unless it is 'verified', a reply about loans never says the
   * farmer can get one: its tip becomes "Verify your Ghana Card to unlock loan offers."
   */
  ghanaCard?: GhanaCardStatus;
}

export interface AssistantContent {
  /** The admin's knowledge items. Defaults to the built-in topics. */
  knowledge?: AssistantKnowledgeItem[];
  /** The admin's crop data, for {tips:Crop}. */
  crops?: CropContent[];
}

/** Placeholders an admin can use in reply text (shown in the admin's assistant editor). */
export const ASSISTANT_PLACEHOLDERS: { token: string; description: string }[] = [
  { token: '{name}', description: 'The farmer’s name (or “Farmer”)' },
  { token: '{region}', description: 'The farmer’s region' },
  { token: '{crops}', description: 'The farmer’s primary crops' },
  { token: '{score}', description: 'Credit score, e.g. 612' },
  { token: '{scoreLabel}', description: 'Score band: Building, Fair, Good or Excellent' },
  { token: '{creditFocus}', description: 'A sentence naming the weakest credit factor' },
  { token: '{creditSteps}', description: 'As a whole bullet: five steps, weakest factor first' },
  { token: '{income}', description: 'Total income recorded' },
  { token: '{expenses}', description: 'Total expenses recorded' },
  { token: '{profit}', description: 'Net profit' },
  { token: '{margin}', description: 'Profit margin, e.g. 66.7%' },
  { token: '{records}', description: 'Number of farm records' },
  { token: '{financeTip}', description: 'A tip based on the farmer’s profit' },
  { token: '{plantingWindow}', description: 'Planting advice for the farmer’s zone' },
  { token: '{weather}', description: 'Today’s weather, e.g. “Sunny, 32°C, …”' },
  { token: '{rainAdvice}', description: 'Advice for the chance of rain' },
  { token: '{fieldWorkAdvice}', description: 'Advice for today’s conditions' },
  { token: '{cropWork}', description: '“ or scheduling work on Maize” (empty with no crops)' },
  { token: '{cocoaPrice}', description: 'The current cocoa price line' },
  { token: '{tips:Cassava}', description: 'As a whole bullet: that crop’s tips (any crop name)' },
];

/** Shown when no knowledge item matches and the knowledge has no fallback item. */
const FALLBACK: AssistantReply = {
  title: 'Let me help',
  intro: 'For advice specific to this issue, contact your local MoFA extension officer.',
  bullets: [
    'Maize planting seasons and cassava tips.',
    'Fall armyworm, pests and fertilizer guidance.',
    'Weather information and indicative cocoa prices.',
    'Your credit score, farm income, expenses and profit.',
  ],
  tip: 'Tell me the crop and the issue, or choose a quick prompt below.',
};

const NORTHERN = /northern|savannah|north east|upper east|upper west/i;

/** Lowercase words in the message. */
const wordsOf = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/**
 * A keyword matches when every word in it appears in the message, in any order.
 * A word ending in * matches any word starting with it ("plant*" → planting, planted).
 */
export function keywordMatches(keyword: string, words: string[]): boolean {
  const terms = keyword.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return (
    terms.length > 0 &&
    terms.every((term) =>
      term.endsWith('*')
        ? words.some((word) => word.startsWith(term.slice(0, -1)))
        : words.includes(term),
    )
  );
}

/** The first active item (highest priority first) with a matching keyword. */
export function matchKnowledge(
  message: string,
  knowledge: AssistantKnowledgeItem[],
): AssistantKnowledgeItem | undefined {
  const words = wordsOf(message);
  return [...knowledge]
    .filter((item) => item.active)
    .sort((a, b) => b.priority - a.priority)
    .find((item) => item.keywords.some((keyword) => keywordMatches(keyword, words)));
}

function creditSteps(ctx: AssistantContext, name: string): { weakest?: string; steps: string[] } {
  const factors = [
    {
      key: 'paymentHistory',
      label: 'Payment History',
      step: 'Record genuine farm or MoMo activity each month to build a consistent six-month history.',
    },
    {
      key: 'recordCompleteness',
      label: 'Record Completeness',
      step: `You have ${ctx.recordCount} farm records. Log every sale, expense and activity, and work towards 30 combined farm and MoMo entries.`,
    },
    {
      key: 'incomeStability',
      label: 'Income Stability',
      step: `With ${formatGHS(ctx.income)} income and ${formatGHS(ctx.expenses)} expenses, ${ctx.income > ctx.expenses ? 'protect your surplus by budgeting for the next season' : 'review your largest costs and plan sales to improve your surplus'}.`,
    },
    {
      key: 'momoActivity',
      label: 'MoMo Activity',
      step: 'Log genuine farm-related Mobile Money receipts and payments; the activity factor reaches its maximum at 20 entries.',
    },
    {
      key: 'verification',
      label: 'Verification',
      step: `${name}, complete your name, phone, farm name and acreage, then review phone, location and Ghana Card verification in your profile.`,
    },
  ] satisfies { key: Exclude<keyof CreditScoreBreakdown, 'score'>; label: string; step: string }[];

  const credit = ctx.creditFactors;
  if (credit) factors.sort((a, b) => credit[a.key] - credit[b.key]);
  return {
    weakest: credit ? `${factors[0].label} (${credit[factors[0].key]}%)` : undefined,
    steps: factors.map((factor) =>
      credit ? `${factor.label} (${credit[factor.key]}%): ${factor.step}` : factor.step,
    ),
  };
}

type Value = string | string[];

/** Every placeholder value. Weather and prices are fetched only when a reply uses them. */
async function placeholderValues(
  tokens: Set<string>,
  ctx: AssistantContext,
  crops: CropContent[],
): Promise<Record<string, Value>> {
  const name = ctx.farmerName.trim() || 'Farmer';
  const region = ctx.region.trim() || 'your region';
  const profit = ctx.income - ctx.expenses;
  const credit = creditSteps(ctx, name);
  const values: Record<string, Value> = {
    name,
    region,
    crops: ctx.primaryCrops.length ? ctx.primaryCrops.join(', ') : 'your crops',
    score: String(ctx.score),
    scoreLabel: scoreLabel(ctx.score, ctx.bands),
    creditFocus: credit.weakest
      ? `Your weakest factor is ${credit.weakest}. Start with the first step below.`
      : 'These five steps help build your farm financial history.',
    creditSteps: credit.steps,
    income: formatGHS(ctx.income),
    expenses: formatGHS(ctx.expenses),
    profit: formatGHS(profit),
    margin:
      ctx.income > 0
        ? `${((profit / ctx.income) * 100).toFixed(1)}%`
        : 'not available (no income recorded)',
    records: String(ctx.recordCount),
    financeTip:
      ctx.recordCount === 0
        ? 'Add your first sale and expense in Farm Records to start tracking your profit.'
        : profit <= 0
          ? 'Review your largest expense category and compare input prices before your next purchase.'
          : 'Set aside part of your surplus for next season’s inputs before taking on new spending.',
    plantingWindow: NORTHERN.test(region)
      ? 'plan around the May–June window and confirm rainfall onset with your local MoFA extension officer'
      : 'confirm your local rainfall pattern with a MoFA extension officer; coastal areas can differ from forest and transitional zones',
    cropWork: ctx.primaryCrops.length
      ? ` or scheduling work on ${ctx.primaryCrops.join(', ')}`
      : '',
  };

  for (const token of tokens) {
    if (token.startsWith('tips:')) {
      const crop = token.slice(5).toLowerCase();
      values[token] = crops.find((c) => c.crop.toLowerCase() === crop)?.tips ?? [];
    }
  }
  if (['weather', 'rainAdvice', 'fieldWorkAdvice'].some((t) => tokens.has(t))) {
    const weather = await marketService.getWeather();
    values.weather = weather
      ? `${weather.description}, ${weather.temp}°C, ${weather.humidity}% humidity and ${weather.rainChance}% chance of rain`
      : 'Weather data unavailable. Open the Weather page to select your location.';
    values.rainAdvice = !weather
      ? 'Location-specific rainfall advice is unavailable until a real weather provider is connected.'
      : weather.rainChance >= 60
        ? 'Check field drainage and postpone spraying if rain is expected.'
        : 'Check soil moisture and mulch to reduce water loss; water young plants where needed.';
    values.fieldWorkAdvice = !weather
      ? 'Check a trusted local forecast before planning weather-sensitive field work.'
      : weather.condition === 'storm'
        ? 'Stay out of exposed fields during thunderstorms and secure loose equipment.'
        : 'Plan demanding field work for cooler morning hours and keep drinking water nearby.';
  }
  if (tokens.has('cocoaPrice')) {
    const cocoa = (await marketService.getPrices()).find((price) => price.crop === 'Cocoa');
    values.cocoaPrice = cocoa
      ? `Cocoa: ${formatMarketAmount(cocoa.price)} per ${unitLabel(cocoa)}; ${cocoa.market || cocoa.region || 'source-reported coverage'}, observed ${cocoa.observedAt}. Source: ${cocoa.source?.publisher}.`
      : 'Market price data unavailable. No published, reviewed cocoa observation is available.';
  }
  return values;
}

const TOKEN = /\{([\w:]+)\}/g;

function tokensIn(reply: AssistantReply): Set<string> {
  const text = [reply.title, reply.intro, ...(reply.bullets ?? []), reply.tip].join(' ');
  return new Set([...text.matchAll(TOKEN)].map((match) => match[1]));
}

/** Unknown placeholders are left as written, so an admin can spot a typo. */
const fill = (text: string, values: Record<string, Value>) =>
  text.replace(TOKEN, (whole, token: string) => {
    const value = values[token];
    if (value === undefined) return whole;
    return Array.isArray(value) ? value.join(' ') : value;
  });

/** Fills a reply. A bullet that is only a list placeholder ({creditSteps}) becomes several. */
function render(reply: AssistantReply, values: Record<string, Value>): AssistantReply {
  const bullets = reply.bullets?.flatMap((bullet) => {
    const whole = /^\{([\w:]+)\}$/.exec(bullet.trim());
    const value = whole ? values[whole[1]] : undefined;
    return Array.isArray(value) ? value : [fill(bullet, values)];
  });
  const intro = reply.intro === undefined ? undefined : fill(reply.intro, values);
  const tip = reply.tip === undefined ? undefined : fill(reply.tip, values);
  return {
    title: fill(reply.title, values),
    ...(intro && { intro }),
    ...(bullets && bullets.length > 0 && { bullets }),
    ...(tip && { tip }),
  };
}

/** What answered a message: the matching item, or the fallback (`item` null). */
export interface ResolvedReply {
  item: AssistantKnowledgeItem | null;
  reply: AssistantReply;
}

/**
 * The reply for a message, without the typing delay (the admin's test console uses this). When
 * nothing matches, the admin's fallback item answers (or the built-in one).
 */
export async function resolveAssistantReply(
  message: string,
  ctx: AssistantContext,
  { knowledge = DEFAULT_ASSISTANT_KB, crops = DEFAULT_CROP_CONTENT }: AssistantContent = {},
): Promise<ResolvedReply> {
  const item = matchKnowledge(message, knowledge);
  const fallback = knowledge.find((k) => k.id === ASSISTANT_FALLBACK_ID)?.reply ?? FALLBACK;
  const template = item?.reply ?? fallback;
  const values = await placeholderValues(tokensIn(template), ctx, crops);
  return { item: item ?? null, reply: lockLoans(render(template, values), ctx) };
}

const LOAN_WORDS = /\bloans?\b|\bborrow/i;

/** Without a verified Ghana Card, a reply that talks about loans ends with how to unlock them. */
function lockLoans(reply: AssistantReply, ctx: AssistantContext): AssistantReply {
  if (!ctx.ghanaCard || ctx.ghanaCard === 'verified') return reply;
  const text = [reply.title, reply.intro, ...(reply.bullets ?? []), reply.tip].join(' ');
  return LOAN_WORDS.test(text) ? { ...reply, tip: LOANS_LOCKED_HINT } : reply;
}

/** Renders any reply with a farmer's values (the admin's live preview). */
export async function renderAssistantReply(
  reply: AssistantReply,
  ctx: AssistantContext,
  crops: CropContent[] = DEFAULT_CROP_CONTENT,
): Promise<AssistantReply> {
  return render(reply, await placeholderValues(tokensIn(reply), ctx, crops));
}

export async function getAssistantReply(
  message: string,
  ctx: AssistantContext,
  content: AssistantContent = {},
): Promise<AssistantReply> {
  await delay(700);
  return (await resolveAssistantReply(message, ctx, content)).reply;
}
