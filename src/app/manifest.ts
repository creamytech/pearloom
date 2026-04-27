// ─────────────────────────────────────────────────────────────
// Pearloom / app/manifest.ts
// Web app manifest — makes Pearloom and published wedding sites
// installable as a PWA on iOS / Android home screens.
// ─────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pearloom',
    short_name: 'Pearloom',
    description: 'Wedding sites, guests, vendors, and the post-event film — woven into one calm command center.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF7F2',
    theme_color: '#5C6B3F',
    icons: [
      { src: '/favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
    ],
  };
}
