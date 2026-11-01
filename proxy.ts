import { NextResponse, type NextRequest } from 'next/server';

// Fast redirects only. agrictec_session and agrictec_admin are the API's httpOnly session
// cookies (opaque tokens); here we only check that one is present, to redirect before a page
// renders. The API (agrictec-backend) checks the session and the role on every request, so a forged
// cookie gets a page shell and nothing else.

const SESSION_COOKIE = 'agrictec_session';
const ADMIN_COOKIE = 'agrictec_admin';
const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];
const ADMIN_LOGIN = '/admin-login';
/** Set by the farmer tab while an admin views the app as a farmer (read-only, phase A8). */
const IMPERSONATION_COOKIE = 'agrictec_impersonating';
/** Set once the farmer finishes onboarding (services/onboarding.service.ts). */
const ONBOARDED_COOKIE = 'agrictec_onboarded';
const ONBOARDING = '/onboarding';

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/');

// The API rate-limits per visitor. Behind Vercel it sees Vercel's shared address, and the
// visitor's own X-Forwarded-For entries can be made up, so this app vouches for the address it
// served, with a secret only it and the API know (FRONTEND_PROXY_SECRET on both).
const CLIENT_IP_HEADER = 'x-agrictec-client-ip';
const PROXY_SECRET_HEADER = 'x-agrictec-proxy-secret';

/** Exported for tests. */
export function apiRequestHeaders(
  incoming: Headers,
  secret = process.env.FRONTEND_PROXY_SECRET,
  onVercel = Boolean(process.env.VERCEL),
): Headers {
  const headers = new Headers(incoming);
  // Never pass on a visitor's attempt to vouch for themselves.
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);
  // Vercel sets x-real-ip to the address it served. Elsewhere (deploy/: Caddy in front) the
  // last X-Forwarded-For entry is the one the proxy appended; a visitor's x-real-ip isn't.
  const visitor = onVercel
    ? incoming.get('x-real-ip')?.trim()
    : incoming.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (secret && visitor) {
    headers.set(CLIENT_IP_HEADER, visitor);
    headers.set(PROXY_SECRET_HEADER, secret);
  }
  return headers;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- API calls: forwarded to the backend (next.config.ts) with the visitor's address. ----
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request: { headers: apiRequestHeaders(request.headers) } });
  }

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
  if (pathname === ADMIN_LOGIN) {
    // Open without any farmer session; an admin who is already signed in goes to the console.
    return hasAdmin ? NextResponse.redirect(new URL('/admin', request.url)) : NextResponse.next();
  }

  // ---- Farmer app ----
  // An admin viewing as a farmer has no farmer session: let the read-only view through. The
  // first request carries the one-time ?impersonate= token; later ones carry the cookie.
  const viewingAsFarmer =
    hasAdmin &&
    (request.cookies.has(IMPERSONATION_COOKIE) || request.nextUrl.searchParams.has('impersonate'));
  const hasFarmerSession = request.cookies.has(SESSION_COOKIE);
  const hasSession = hasFarmerSession || viewingAsFarmer;
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  const onboarded = request.cookies.has(ONBOARDED_COOKIE);
  const isOnboarding = pathname === ONBOARDING || pathname.startsWith(`${ONBOARDING}/`);
  const home = onboarded ? '/dashboard' : ONBOARDING;

  if (!hasSession && !isAuthPage) {
    const url = new URL('/login', request.url);
    // Onboarding comes right after sign-in anyway, so it is not a useful "next".
    if (!isOnboarding) url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  // Registration remains accessible so a guest can create a full account.
  // Only a real farmer session skips /login (a leftover view-as-farmer cookie must not loop).
  if (hasFarmerSession && isAuthPage && !pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL(home, request.url));
  }

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
    '/((?!_next/|api/|favicon.ico|icons/|images/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)',
    '/api/:path*',
  ],
};
