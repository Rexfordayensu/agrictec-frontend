import type { NextConfig } from 'next';

/**
 * Where the AgriCtec API (the agrictec-backend repository) runs. The app calls /api/v1 on its
 * own origin and Next.js forwards it there, so the API's httpOnly session cookies belong to this
 * site: proxy.ts can see them and no CORS is needed.
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

const isDev = process.env.NODE_ENV !== 'production';

/** The API's origin when it is called directly (NEXT_PUBLIC_API_URL), else none: same origin. */
function apiOrigin(): string | null {
  const direct = process.env.NEXT_PUBLIC_API_URL;
  if (!direct || direct.startsWith('/')) return null;
  try {
    return new URL(direct).origin;
  } catch {
    return null;
  }
}

/**
 * What the pages may load. Scripts and styles come from this site only ('unsafe-inline' is
 * needed for the small inline scripts Next.js and next-themes write into each page); images
 * from this site, inline thumbnails and the farm map's tile servers. No page may be framed.
 */
function contentSecurityPolicy(): string {
  const api = apiOrigin();
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      // Lender logos are served by the API.
      ...(api ? [api] : []),
      'data:',
      'blob:',
      'https://tile.openstreetmap.org',
      'https://*.tile.openstreetmap.org',
      'https://server.arcgisonline.com',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(api ? [api] : []), ...(isDev ? ['ws:', 'wss:'] : [])],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  // No upgrade-insecure-requests: it would break `npm start` over plain http; HSTS covers HTTPS.
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The crop doctor's camera and the farm map's "use my location"; nothing else.
  {
    key: 'Permissions-Policy',
    value:
      'camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactCompiler: true, // stable in Next.js 16: automatic memoization
  experimental: {
    // Forwarded API calls may wait this long for an answer: a crop doctor photo read by Claude
    // can take longer than the default 30 s (the API gives up on Claude before this).
    proxyTimeout: 120_000,
  },
  // The Docker image (deploy/web.Dockerfile) ships the self-contained server only.
  output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined,
  // Hide the dev-only Next.js badge; on phones it sat over the bottom navigation.
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  // No webpack config: Turbopack is the default bundler.
  // Tailwind v4 is compiled by its Turbopack loader (this project has no PostCSS config).
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
