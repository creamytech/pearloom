// ─────────────────────────────────────────────────────────────
// Pearloom / api/export-program/route.ts
// Printable ceremony program — public endpoint, no auth required
// GET ?subdomain=xxx → text/html print-optimized page
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`export-program:${ip}`, { max: 20, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain query parameter is required' }, { status: 400 });
  }

  const config = await getSiteConfig(subdomain);
  if (!config) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const manifest = config.manifest;
  const accentColor: string =
    (manifest?.vibeSkin?.palette?.accent as string | undefined) ?? '#A3B18A';

  // ── Extract data ──────────────────────────────────────────
  const names: string =
    Array.isArray(config.names) && config.names.length === 2
      ? `${config.names[0]} & ${config.names[1]}`
      : (config.names?.[0] ?? 'The Happy Couple');

  const weddingDate: string = manifest?.logistics?.date
    ? new Date(manifest.logistics.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const venue: string = manifest?.logistics?.venue ?? '';
  const venueAddress: string = manifest?.logistics?.venueAddress ?? '';

  // Order of service from manifest.events
  const events = manifest?.events ?? [];
  const orderOfServiceItems = events
    .map(
      (ev: { title?: string; name?: string; time?: string; description?: string }) =>
        `<li class="program-item">
          <span class="item-time">${ev.time ?? ''}</span>
          <span class="item-title">${escapeHtml(ev.title ?? ev.name ?? '')}</span>
          ${ev.description ? `<span class="item-desc">${escapeHtml(ev.description)}</span>` : ''}
        </li>`,
    )
    .join('\n');

  // Chapter highlights: first 3
  const chapters = manifest?.chapters ?? [];
  const chapterHighlights = chapters
    .slice(0, 3)
    .map(
      (ch: { title?: string }) =>
        `<li>${escapeHtml(ch.title ?? '')}</li>`,
    )
    .join('\n');

  // Closing line
  const closingLine: string =
    manifest?.poetry?.closingLine ??
    'With gratitude and joy, we thank you for sharing this day with us.';

  // ── HTML ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ceremony Program — ${escapeHtml(names)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --accent: ${accentColor};
      --ink: #1a1705;
      --muted: #6b6657;
      --rule: rgba(0,0,0,0.12);
    }

    body {
      font-family: 'Lora', Georgia, serif;
      font-size: 11pt;
      color: var(--ink);
      background: #fff;
      line-height: 1.7;
    }

    /* ── Page layout ── */
    .page {
      width: 8.5in;
      min-height: 11in;
      margin: 0 auto;
      padding: 0.9in 1in;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ── Cover ── */
    .cover {
      text-align: center;
      padding-bottom: 2rem;
      border-bottom: 1.5px solid var(--rule);
      margin-bottom: 2rem;
    }

    .cover-label {
      font-family: 'Lora', serif;
      font-size: 8pt;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.2rem;
    }

    .couple-names {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 34pt;
      font-weight: 400;
      font-style: italic;
      color: var(--ink);
      line-height: 1.15;
      margin-bottom: 1rem;
    }

    .wedding-date {
      font-family: 'Lora', serif;
      font-size: 11pt;
      color: var(--muted);
      margin-bottom: 0.35rem;
    }

    .venue-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 13pt;
      font-weight: 700;
      color: var(--ink);
    }

    .venue-address {
      font-size: 9pt;
      color: var(--muted);
      margin-top: 0.2rem;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 2rem;
    }

    .section-heading {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--rule);
    }

    /* ── Order of service ── */
    .program-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .program-item {
      display: grid;
      grid-template-columns: 80px 1fr;
      grid-template-rows: auto auto;
      column-gap: 1rem;
    }

    .item-time {
      font-size: 8.5pt;
      color: var(--accent);
      font-style: italic;
      padding-top: 1px;
    }

    .item-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11pt;
      font-weight: 600;
    }

    .item-desc {
      grid-column: 2;
      font-size: 9pt;
      color: var(--muted);
      line-height: 1.5;
    }

    /* ── Story highlights ── */
    .story-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .story-list li {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      font-family: 'Lora', serif;
      font-style: italic;
      color: var(--ink);
      font-size: 10.5pt;
    }

    .story-list li::before {
      content: '✦';
      color: var(--accent);
      font-style: normal;
      font-size: 7pt;
      flex-shrink: 0;
    }

    /* ── Thank you / closing ── */
    .closing {
      text-align: center;
      border-top: 1.5px solid var(--rule);
      padding-top: 1.5rem;
      margin-top: auto;
    }

    .closing-line {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 12pt;
      font-style: italic;
      color: var(--ink);
      line-height: 1.6;
      max-width: 5in;
      margin: 0 auto 1rem;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 7.5pt;
      color: rgba(0,0,0,0.28);
      letter-spacing: 0.08em;
    }

    /* ── Print styles ── */
    @media print {
      @page {
        size: letter;
        margin: 0;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 100%;
        min-height: 100vh;
        padding: 0.9in 1in;
        break-inside: avoid;
      }

      .no-break {
        break-inside: avoid;
      }
    }

    /* ── Screen preview ── */
    @media screen {
      body { background: #f5f4f0; }
      .page {
        background: #fff;
        margin: 2rem auto;
        box-shadow: 0 8px 40px rgba(0,0,0,0.12);
      }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Cover -->
    <div class="cover">
      <div class="cover-label">Wedding Ceremony</div>
      <h1 class="couple-names">${escapeHtml(names)}</h1>
      ${weddingDate ? `<div class="wedding-date">${escapeHtml(weddingDate)}</div>` : ''}
      ${venue ? `<div class="venue-name">${escapeHtml(venue)}</div>` : ''}
      ${venueAddress ? `<div class="venue-address">${escapeHtml(venueAddress)}</div>` : ''}
    </div>

    ${
      events.length > 0
        ? `<!-- Order of Service -->
    <div class="section no-break">
      <div class="section-heading">Order of Service</div>
      <ul class="program-list">
        ${orderOfServiceItems}
      </ul>
    </div>`
        : ''
    }

    ${
      chapterHighlights
        ? `<!-- Our Story -->
    <div class="section no-break">
      <div class="section-heading">Our Story So Far</div>
      <ul class="story-list">
        ${chapterHighlights}
      </ul>
    </div>`
        : ''
    }

    <!-- Closing -->
    <div class="closing">
      <p class="closing-line">${escapeHtml(closingLine)}</p>
    </div>

    <!-- Footer -->
    <div class="footer">Powered by Pearloom &middot; pearloom.com</div>

  </div>
  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
