// ─────────────────────────────────────────────────────────────
// Pearloom / api/export-pdf/route.ts
// GET /api/export-pdf?siteId=...
// Returns print-optimised HTML for the story book.
// Client opens it in a new tab and calls window.print().
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Sanitize values used in CSS contexts to prevent injection
function sanitizeCssValue(val: string): string {
  // Remove characters that could break out of CSS context
  return val.replace(/[^a-zA-Z0-9 ,\-#().]/g, '');
}

function buildHtml(manifest: StoryManifest, siteId: string): string {
  const chapters = manifest.chapters ?? [];
  const coupleNames = (manifest as unknown as { names?: [string, string] })?.names ?? ['', ''];
  const headingFont = sanitizeCssValue(manifest.vibeSkin?.fonts?.heading ?? 'Georgia');
  const bodyFont = sanitizeCssValue(manifest.vibeSkin?.fonts?.body ?? 'Georgia');
  const accent = sanitizeCssValue(manifest.vibeSkin?.palette?.accent ?? '#6B8F5A');

  const chaptersHtml = chapters
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((ch, i) => {
      // Up to 2 images per chapter
      const images = (ch.images ?? []).slice(0, 2);
      const imagesHtml = images.length > 0
        ? `<div class="chapter-images">${images
            .map(img => `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || '')}" loading="lazy" />`)
            .join('')}</div>`
        : '';

      const locationHtml = ch.location
        ? `<p class="meta">📍 ${escapeHtml(ch.location.label)}</p>`
        : '';

      const dateHtml = ch.date
        ? `<p class="meta">${escapeHtml(formatDate(ch.date))}</p>`
        : '';

      const moodHtml = ch.mood
        ? `<span class="mood-badge">${escapeHtml(ch.mood)}</span>`
        : '';

      return `
        <section class="chapter" id="chapter-${i + 1}">
          <div class="chapter-number">Chapter ${String(i + 1).padStart(2, '0')}</div>
          ${moodHtml}
          <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
          ${ch.subtitle ? `<p class="chapter-subtitle">${escapeHtml(ch.subtitle)}</p>` : ''}
          ${dateHtml}
          ${locationHtml}
          ${imagesHtml}
          <div class="chapter-description">
            ${ch.description
              .split('\n')
              .filter(Boolean)
              .map(p => `<p>${escapeHtml(p)}</p>`)
              .join('')}
          </div>
        </section>
      `;
    })
    .join('\n');

  const title = coupleNames[0] && coupleNames[1]
    ? `${coupleNames[0]} & ${coupleNames[1]} — Our Story`
    : 'Our Story Book';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:ital,wght@0,400;0,700;1,400&family=${encodeURIComponent(bodyFont)}:wght@300;400;500&display=swap" rel="stylesheet" />
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Base ── */
    body {
      font-family: '${bodyFont}', Georgia, serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.7;
    }

    /* ── Cover page ── */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4cm 2cm;
      border-bottom: 3px solid ${accent};
      page-break-after: always;
    }
    .cover-eyebrow {
      font-size: 9pt;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: ${accent};
      margin-bottom: 2rem;
    }
    .cover-title {
      font-family: '${headingFont}', Georgia, serif;
      font-size: 36pt;
      font-weight: 400;
      font-style: italic;
      color: #111;
      line-height: 1.1;
      margin-bottom: 1.5rem;
    }
    .cover-subtitle {
      font-size: 11pt;
      color: #666;
      letter-spacing: 0.08em;
    }
    .cover-accent {
      font-size: 24pt;
      color: ${accent};
      margin: 1.5rem 0;
      opacity: 0.6;
    }

    /* ── Chapters ── */
    .chapter {
      padding: 2cm 0;
      border-bottom: 1px solid #e8e4e0;
      page-break-inside: avoid;
    }
    .chapter:last-child { border-bottom: none; }

    .chapter-number {
      font-size: 8pt;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: ${accent};
      margin-bottom: 0.6rem;
      font-weight: 700;
    }
    .mood-badge {
      display: inline-block;
      font-size: 8pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 0.2rem 0.6rem;
      border-radius: 100px;
      border: 1px solid ${accent}55;
      color: ${accent};
      margin-bottom: 0.75rem;
    }
    .chapter-title {
      font-family: '${headingFont}', Georgia, serif;
      font-size: 22pt;
      font-weight: 400;
      color: #111;
      line-height: 1.15;
      margin-bottom: 0.4rem;
      letter-spacing: -0.01em;
    }
    .chapter-subtitle {
      font-family: '${headingFont}', Georgia, serif;
      font-style: italic;
      font-size: 12pt;
      color: #666;
      margin-bottom: 0.6rem;
      font-weight: 300;
    }
    .meta {
      font-size: 9pt;
      color: #888;
      letter-spacing: 0.08em;
      margin-bottom: 0.3rem;
    }

    /* ── Images ── */
    .chapter-images {
      display: flex;
      gap: 0.8cm;
      margin: 0.8cm 0;
    }
    .chapter-images img {
      flex: 1;
      max-width: 50%;
      height: auto;
      border-radius: 4px;
      object-fit: cover;
      aspect-ratio: 4/3;
    }
    .chapter-images img:only-child {
      max-width: 80%;
      margin: 0 auto;
      display: block;
    }

    /* ── Body text ── */
    .chapter-description p {
      font-size: 10.5pt;
      line-height: 1.8;
      color: #333;
      margin-bottom: 0.6em;
    }
    .chapter-description p:first-child {
      font-size: 11.5pt;
      font-weight: 500;
      color: #1a1a1a;
    }

    /* ── Print rules ── */
    @page {
      size: A4;
      margin: 2cm;
    }
    @media print {
      body { font-size: 10pt; }
      .cover { min-height: auto; padding: 3cm 0; }
      .chapter-images img { max-height: 8cm; }
      a { color: inherit; text-decoration: none; }
    }

    /* ── Screen-only helper bar ── */
    .print-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1a1a1a;
      color: #fff;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      z-index: 9999;
    }
    .print-bar button {
      background: ${accent};
      color: #fff;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 600;
    }
    @media print {
      .print-bar { display: none; }
    }
  </style>
</head>
<body>

  <!-- Print bar (screen only) -->
  <div class="print-bar">
    <span>📄 Story Book — ready to print or save as PDF</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-eyebrow">A Love Story</div>
    <h1 class="cover-title">${escapeHtml(title)}</h1>
    <div class="cover-accent">♡</div>
    <p class="cover-subtitle">
      ${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${escapeHtml(formatDate(new Date().toISOString()))}
    </p>
  </div>

  <!-- Chapters -->
  <main style="max-width:700px;margin:0 auto;padding:0 0 4cm;">
    ${chaptersHtml}
  </main>

  <script>
    // Auto-trigger print dialog after fonts load
    window.addEventListener('load', function() {
      // Small delay so fonts render
      setTimeout(function() {
        // Only auto-print on load if ?print=1 param present
        if (new URLSearchParams(location.search).get('print') === '1') {
          window.print();
        }
      }, 800);
    });
  </script>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return new Response('Missing siteId parameter', { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch site manifest from Supabase
    const { data: site, error } = await supabase
      .from('sites')
      .select('site_config')
      .eq('id', siteId)
      .maybeSingle();

    if (error) {
      console.error('[export-pdf] Supabase error:', error);
      return new Response('Error fetching site', { status: 500 });
    }

    if (!site) {
      return new Response('Site not found', { status: 404 });
    }

    const manifest = (site.site_config as unknown as { manifest?: StoryManifest })?.manifest;

    if (!manifest) {
      return new Response('Site has no story manifest yet', { status: 404 });
    }

    const html = buildHtml(manifest, siteId);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export-pdf] Unexpected error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
