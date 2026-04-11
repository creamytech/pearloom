// ─────────────────────────────────────────────────────────────
// Pearloom / app/sitemap.ts
// Dynamic sitemap for SEO — lists all published sites.
// ─────────────────────────────────────────────────────────────

import { MetadataRoute } from 'next';
import { getPublishedSites } from '@/lib/db';
import { buildSiteUrl } from '@/lib/site-urls';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: 'https://pearloom.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://pearloom.com/demo',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://pearloom.com/marketplace',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://pearloom.com/faq',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Add all published (non-coming-soon) sites
  try {
    const sites = await getPublishedSites();
    for (const site of sites) {
      entries.push({
        url: buildSiteUrl(site.domain),
        lastModified: new Date(site.updated_at || site.created_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // If DB is unavailable, return just the static pages
  }

  return entries;
}
