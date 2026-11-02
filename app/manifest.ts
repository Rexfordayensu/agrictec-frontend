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
  };
}
