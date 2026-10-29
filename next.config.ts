import type { NextConfig } from 'next';

/**
 * Where the AgriCtec API (backend/) runs. The app calls /api/v1 on its own origin and Next.js
 * forwards it there, so the API's httpOnly session cookies belong to this site: proxy.ts can
 * see them and no CORS is needed.
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactCompiler: true, // stable in Next.js 16: automatic memoization
  // The Docker image (deploy/web.Dockerfile) ships the self-contained server only.
  output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined,
  // Hide the dev-only Next.js badge; on phones it sat over the bottom navigation.
  devIndicators: false,
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
