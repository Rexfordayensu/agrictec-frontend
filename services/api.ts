// The one way the app talks to the AgriCtec API (agrictec-backend). Every service goes through here.
//
// Requests go to /api/v1 on this same origin; next.config.ts forwards them to the backend, so
// the httpOnly session cookies it sets belong to this site (proxy.ts can see them) and no CORS
// is needed. Set NEXT_PUBLIC_API_URL only to call the API on another origin directly.

import { sessionStore } from '@/services/storage';

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

/** This tab's read-only "View as farmer" token (sent on every request from that tab only). */
const IMPERSONATION_TOKEN_KEY = 'impersonation-token';

export const impersonationToken = {
  get: () => sessionStore.get<string | null>(IMPERSONATION_TOKEN_KEY, null),
  set: (token: string | null) => sessionStore.set(IMPERSONATION_TOKEN_KEY, token),
};

/** An error from the API, with the message the UI shows and a machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  /** Any other fields of the error (e.g. `until` on a sign-in lockout). */
  readonly data: Record<string, unknown>;

  constructor(message: string, status: number, code: string | null, data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Sent as JSON (or as-is for FormData). */
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

function url(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function send({ method = 'GET', body, query, signal }: RequestOptions, path: string) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = typeof window === 'undefined' ? null : impersonationToken.get();
  if (token) headers['X-Impersonation-Token'] = token;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(url(path, query), {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Can’t reach AgriCtec right now. Check your connection and try again.', 0, 'network');
  }
  if (!response.ok) {
    let detail = `Something went wrong (${response.status}). Please try again.`;
    let code: string | null = null;
    let extra: Record<string, unknown> = {};
    try {
      const data = (await response.json()) as { detail?: unknown; code?: string | null };
      if (typeof data.detail === 'string') detail = data.detail;
      code = data.code ?? null;
      if (data && typeof data === 'object') extra = data as Record<string, unknown>;
    } catch {
      // Not JSON (a proxy error page): keep the generic message.
    }
    throw new ApiError(detail, response.status, code, extra);
  }
  return response;
}

/**
 * Fields where null means something ("unlimited", "no end", "none set"). Every other null from
 * the API becomes a missing field, matching the app's optional (`?:`) types and zod schemas.
 */
const MEANINGFUL_NULLS = new Set([
  'aiCredits',
  'creditsLimit',
  'creditsRemaining',
  'startsAt',
  'expiresAt',
  'weatherOverride',
  'approvalRate',
  'defaultRate',
  'seededAt',
  // "Not given by this source" (MET Norway publishes no probability of rain for Ghana).
  'rainChance',
]);

const reviver = (key: string, value: unknown) =>
  value === null && key !== '' && !MEANINGFUL_NULLS.has(key) ? undefined : value;

/** A JSON request. 204 responses resolve to undefined. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(options, path);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text, reviver) : undefined) as T;
}

/** A file download (CSV): the text and the name the server gave it. */
export async function apiFile(
  path: string,
  options: RequestOptions = {},
): Promise<{ filename: string; content: string; headers: Headers }> {
  const response = await send(options, path);
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'AgriCtec_Export.csv';
  const text = await response.text();
  // text() drops the UTF-8 byte-order mark; Excel needs it to read ₵ and accents correctly.
  const content = filename.endsWith('.csv') && !text.startsWith('﻿') ? `﻿${text}` : text;
  return { filename, content, headers: response.headers };
}

/** True for a "you are not signed in (any more)" answer. */
export const isSignedOut = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.code === 'account_suspended');
