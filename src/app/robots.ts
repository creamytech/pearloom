// ─────────────────────────────────────────────────────────────
// Pearloom / app/robots.ts
// Dynamic robots.txt — allow crawlers on public pages,
// block dashboard, editor, API, and preview routes.
// ─────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/editor/', '/api/', '/preview/'],
    },
    sitemap: 'https://pearloom.com/sitemap.xml',
  };
}
