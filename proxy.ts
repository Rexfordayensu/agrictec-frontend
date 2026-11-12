import { NextResponse, type NextRequest } from 'next/server';

// Fast redirects only. agrictec_session and agrictec_admin are the API's httpOnly session
// cookies (opaque tokens); here we only check that one is present, to redirect before a page
// renders. The API (agrictec-backend) checks the session and the role on every request, so a forged
// cookie gets a page shell and nothing else.

const SESSION_COOKIE = 'agrictec_session';
const ADMIN_COOKIE = 'agrictec_admin';
const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];
/** Open to everyone, signed in or not, onboarded or not (app/(legal)). */
const PUBLIC_PAGES = ['/privacy', '/terms'];
const ADMIN_LOGIN = '/admin-login';
/** Set by the farmer tab while an admin views the app as a farmer (read-only, phase A8). */
const IMPERSONATION_COOKIE = 'agrictec_impersonating';
/** Set once the farmer finishes onboarding (services/onboarding.service.ts). */
const ONBOARDED_COOKIE = 'agrictec_onboarded';
const ONBOARDING = '/onboarding';

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/');

// The API rate-limits per visitor (and locks admin sign-ins per visitor). Behind Vercel it sees
// Vercel's shared address, and a visitor's own X-Forwarded-For entries can be made up, so this
// app vouches for the address it served, with a secret only it and the API know
// (FRONTEND_PROXY_SECRET on both).
const CLIENT_IP_HEADER = 'x-agrictec-client-ip';
const PROXY_SECRET_HEADER = 'x-agrictec-proxy-secret';

/**
 * Where the visitor's real address comes from:
 * - "vercel": Vercel's edge sets x-real-ip itself, overwriting whatever the visitor sent.
 * - "forwarded-for": only behind a proxy that appends the address it saw to X-Forwarded-For
 *   (deploy/: Caddy). Opt in with TRUST_FORWARDED_FOR=1, and only when that proxy is the ONLY way
 *   in: if visitors can reach this app directly, they write that header themselves.
 * - "none": nothing trustworthy, so nothing is vouched for (the API then uses what it sees).
 */
export type AddressSource = 'vercel' | 'forwarded-for' | 'none';

export function addressSource(
  env: Record<string, string | undefined> = process.env,
): AddressSource {
  if (env.VERCEL) return 'vercel';
  return env.TRUST_FORWARDED_FOR === '1' ? 'forwarded-for' : 'none';
}

/** A plain IPv4 or IPv6 address, or null (never vouch for anything else). */
export function plainAddress(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  if (/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(text))
    return text;
  if (text.length <= 45 && text.includes(':') && /^[0-9a-f:.]+$/i.test(text)) return text;
  return null;
}

/** Exported for tests. */
export function apiRequestHeaders(
  incoming: Headers,
  secret = process.env.FRONTEND_PROXY_SECRET,
  source: AddressSource = addressSource(),
): Headers {
  const headers = new Headers(incoming);
  // Never pass on a visitor's attempt to vouch for themselves.
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);
  const visitor =
    source === 'vercel'
      ? plainAddress(incoming.get('x-real-ip'))
      : source === 'forwarded-for'
        ? plainAddress(incoming.get('x-forwarded-for')?.split(',').at(-1))
        : null;
  if (secret && visitor) {
    headers.set(CLIENT_IP_HEADER, visitor);
    headers.set(PROXY_SECRET_HEADER, secret);
  }
  return headers;
}

/** A "View as farmer" link carries a one-time token: only an admin's browser may use it. */
const IMPERSONATE_PARAM = 'impersonate';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- API calls: forwarded to the backend (next.config.ts) with the visitor's address. ----
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request: { headers: apiRequestHeaders(request.headers) } });
  }
  if (PUBLIC_PAGES.includes(pathname)) return NextResponse.next();

  // ---- Admin console: its own cookie. A farmer session never grants access. ----
  const hasAdmin = request.cookies.has(ADMIN_COOKIE);
  if (isAdminPath(pathname)) {
    if (!hasAdmin) {
      const url = new URL(ADMIN_LOGIN, request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  // The home-screen app starts at "/": an admin (without a farmer session) lands in the console.
  if (
    pathname === '/' &&
    hasAdmin &&
    !request.cookies.has(SESSION_COOKIE) &&
    !request.cookies.has(IMPERSONATION_COOKIE)
  ) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  if (pathname === ADMIN_LOGIN) {
    // Cookie presence cannot prove the API still accepts the session. Keep sign-in reachable
    // after an idle timeout, revocation or expiry, just like the farmer's sign-in page.
    return NextResponse.next();
  }

  // ---- Farmer app ----
  // A "View as farmer" token in anyone else's link is dropped before the page runs, so a crafted
  // link can't disturb a farmer's tab (the API would refuse the token anyway).
  if (!hasAdmin && request.nextUrl.searchParams.has(IMPERSONATE_PARAM)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(IMPERSONATE_PARAM);
    return NextResponse.redirect(url);
  }
  // An admin viewing as a farmer has no farmer session: let the read-only view through. The
  // first request carries the one-time ?impersonate= token; later ones carry the cookie.
  const viewingAsFarmer =
    hasAdmin &&
    (request.cookies.has(IMPERSONATION_COOKIE) ||
      request.nextUrl.searchParams.has(IMPERSONATE_PARAM));
  const hasFarmerSession = request.cookies.has(SESSION_COOKIE);
  const hasSession = hasFarmerSession || viewingAsFarmer;
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  const onboarded = request.cookies.has(ONBOARDED_COOKIE);
  const isOnboarding = pathname === ONBOARDING || pathname.startsWith(`${ONBOARDING}/`);

  if (!hasSession && !isAuthPage) {
    const url = new URL('/login', request.url);
    // Onboarding comes right after sign-in anyway, so it is not a useful "next".
    if (!isOnboarding) url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  // Keep farmer sign-in accessible even when a cookie remains from an expired session.
  // Cookie presence alone cannot establish that the API still accepts the session.

  // ---- Onboarding: the app stays closed until the farm setup is finished ----
  // The DataLoader checks the profile itself; this cookie is only a redirect hint.
  if (hasFarmerSession && !viewingAsFarmer && !isAuthPage) {
    if (!onboarded && !isOnboarding) return NextResponse.redirect(new URL(ONBOARDING, request.url));
    if (onboarded && isOnboarding) return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip all Next.js internals (static files, images, dev/HMR endpoints) and public assets. The
  // API is matched separately: only to add the visitor's address (the backend checks every
  // request itself).
  matcher: [
    '/((?!_next/|api/|favicon.ico|icons/|images/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)',
    '/api/:path*',
  ],
};
