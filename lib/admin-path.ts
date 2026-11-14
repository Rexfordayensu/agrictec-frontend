/** The console's public prefix comes from ADMIN_PATH in next.config.ts. */
export function normalizeAdminPath(value: string | undefined): string {
  if (!value?.trim()) return '';
  const path = '/' + value.trim().replace(/^\/+|\/+$/g, '');
  const reserved = new Set([
    'admin',
    'admin-login',
    'api',
    '_next',
    'login',
    'signup',
    'forgot-password',
    'dashboard',
    'records',
    'momo',
    'reports',
    'assistant',
    'crop-doctor',
    'yield-predictor',
    'weather',
    'market',
    'loans',
    'settings',
    'onboarding',
    'privacy',
    'terms',
  ]);
  if (
    !/^\/[A-Za-z0-9_$-]+(?:\/[A-Za-z0-9_$-]+)*$/.test(path) ||
    reserved.has(path.split('/')[1].toLowerCase())
  ) {
    throw new Error(
      'ADMIN_PATH must be a non-reserved path using letters, numbers, hyphens, underscores or dollar signs.',
    );
  }
  return path;
}

// The fallback is only an internal route identifier; Proxy never exposes it without ADMIN_PATH.
export const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || '/admin';
export const ADMIN_SIGN_IN = ADMIN_BASE + '/login';

/** Convert an internal console route into the configured browser URL. Never use for API paths. */
export function adminPath(route = '/admin'): string {
  if (route === '/admin-login' || route.startsWith('/admin-login?'))
    return ADMIN_SIGN_IN + route.slice('/admin-login'.length);
  if (route === '/admin' || /^\/admin[/?#]/.test(route))
    return ADMIN_BASE + route.slice('/admin'.length);
  return route;
}
