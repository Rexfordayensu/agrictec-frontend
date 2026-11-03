import type { MetadataRoute } from 'next';

// Lets phones add AgriCtec to the home screen. On iPhone that is also what allows error alerts
// (web push works only for apps opened from the home screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AgriCtec',
    short_name: 'AgriCtec',
    description: 'Digital financial identity for farmers in Ghana.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0e1a',
    theme_color: '#0a0e1a',
    // The Growth Leaf on navy (components/layout/agrictec-mark.tsx).
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
