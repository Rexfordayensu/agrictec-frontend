// The one way the app talks to the AgriCtec API (agrictec-backend). Every service goes through here.
//
// Requests go to /api/v1 on this same origin; next.config.ts forwards them to the backend, so
// the httpOnly session cookies it sets belong to this site (proxy.ts can see them) and no CORS
// is needed. Set NEXT_PUBLIC_API_URL only to call the API on another origin directly.

import { sessionStore } from '@/services/storage';
import { DEMO_MESSAGE, isDemoBrowser, needsAccount } from '@/lib/demo';

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

/** A full URL for an API path (e.g. an image the API serves: <img src={apiUrl(path)} />). */
export const apiUrl = (path: string) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

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

  constructor(
    message: string,
    status: number,
    code: string | null,
    data: Record<string, unknown> = {},
  ) {
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

/** Bound reads through body consumption. Writes keep their existing long-running behavior. */
async function withReadTimeout<T>(
  options: RequestOptions,
  task: (options: RequestOptions) => Promise<T>,
): Promise<T> {
  if (options.method && options.method !== 'GET') return task(options);
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timeoutError = () =>
    new ApiError(
      'The server took too long to respond. Please try again in a moment.',
      0,
      'timeout',
    );
  try {
    return await Promise.race([
      task({ ...options, signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(timeoutError());
        }, 30_000);
      }),
    ]);
  } catch (error) {
    if (timedOut && !options.signal?.aborted) throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

/**
 * How long a read waits before each retry. A free Render API that is waking up or switching to a
 * new deploy can drop a request (the proxy then answers 500/502/503 with no JSON); a moment
 * later the same read works. Writes are never repeated: they might already have been applied.
 */
const READ_RETRY_DELAYS_MS = [800, 2_000];

/** A read worth trying again: the server or the connection failed, not the request itself. */
const isTransient = (error: unknown) =>
  error instanceof ApiError && (error.code === 'network' || error.status >= 500);

/** Resolves after `ms`, or rejects at once when the caller cancels. */
function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function send(options: RequestOptions, path: string): Promise<Response> {
  const read = !options.method || options.method === 'GET';
  for (let attempt = 0; ; attempt++) {
    try {
      return await sendOnce(options, path);
    } catch (error) {
      const delay = READ_RETRY_DELAYS_MS[attempt];
      if (!read || delay === undefined || !isTransient(error) || options.signal?.aborted)
        throw error;
      await pause(delay, options.signal);
    }
  }
}

/** The guest demo never sends an account's request: nothing of a guest is stored by the API. */
function refuseInDemo(path: string): void {
  // An admin's "View as farmer" tab reads that farmer's data with the admin's own permission
  // (the X-Impersonation-Token header), even in a browser where a guest demo is open.
  if (typeof window !== 'undefined' && impersonationToken.get()) return;
  if (isDemoBrowser() && needsAccount(path)) throw new ApiError(DEMO_MESSAGE, 403, 'demo');
}

async function sendOnce({ method = 'GET', body, query, signal }: RequestOptions, path: string) {
  refuseInDemo(path);
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
    throw new ApiError(
      'Can’t reach AgriCtec right now. Check your connection and try again.',
      0,
      'network',
    );
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
  'approvalRate',
  'defaultRate',
  'seededAt',
  // "Not given by this source" (MET Norway publishes no probability of rain for Ghana), and a
  // rain amount or wind speed a provider left out: unknown, never 0.
  'rainChance',
  'rainMm',
  'windKph',
]);

const reviver = (key: string, value: unknown) =>
  value === null && key !== '' && !MEANINGFUL_NULLS.has(key) ? undefined : value;

/** A JSON request. 204 responses resolve to undefined. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return withReadTimeout(options, async (request) => {
    const response = await send(request, path);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text, reviver) : undefined) as T;
  });
}

/** A file download (CSV): the text and the name the server gave it. */
export async function apiFile(
  path: string,
  options: RequestOptions = {},
): Promise<{ filename: string; content: string; headers: Headers }> {
  return withReadTimeout(options, async (request) => {
    const response = await send(request, path);
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'AgriCtec_Export.csv';
    const text = await response.text();
    // text() drops the UTF-8 byte-order mark; Excel needs it to read ₵ and accents correctly.
    const content = filename.endsWith('.csv') && !text.startsWith('﻿') ? `﻿${text}` : text;
    return { filename, content, headers: response.headers };
  });
}

/** True for a "you are not signed in (any more)" answer. */
export const isSignedOut = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.code === 'account_suspended');

/** Binary evidence, authenticated exactly like JSON calls. */
export async function apiBlob(path: string): Promise<Blob> {
  return withReadTimeout({}, async (options) => (await send(options, path)).blob());
}

/** Evidence upload with real byte progress, preserving credentials and read-only context. */
export function apiUpload<T>(
  path: string,
  form: FormData,
  onProgress: (value: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (isDemoBrowser() && needsAccount(path))
      return reject(new ApiError(DEMO_MESSAGE, 403, 'demo'));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(path));
    xhr.withCredentials = true;
    const token = impersonationToken.get();
    if (token) xhr.setRequestHeader('X-Impersonation-Token', token);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new ApiError('Upload failed. Check your connection and try again.', 0, 'network'));
    xhr.timeout = 120_000;
    xhr.ontimeout = () => reject(new ApiError('Upload timed out. Please try again.', 0, 'timeout'));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText, reviver);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
        else reject(new ApiError(data.detail ?? 'Upload failed.', xhr.status, data.code ?? null));
      } catch {
        reject(new ApiError('The server could not accept the file. Try again.', xhr.status, null));
      }
    };
    xhr.send(form);
  });
}
