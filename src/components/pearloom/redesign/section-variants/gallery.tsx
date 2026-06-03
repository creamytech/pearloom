'use client';
/* eslint-disable no-restricted-syntax */
/* Gallery section layout variants for ThemedSite. The 'grid' default
   lives in ThemedSite.tsx; these are the alternative layouts the
   LAYOUTS registry can dispatch into. */

import type { GalleryVariantCtx, PhotoTone } from './types';

/* ── Shared tone → gradient placeholder map ─────────────────────── */

const TONE_BG: Record<string, string> = {
  warm: 'linear-gradient(135deg,#d4a574,#b8884f)',
  cream: 'linear-gradient(135deg,#f5efe2,#e8e0d0)',
  sage: 'linear-gradient(135deg,#a4b57a,#7a8a5c)',
  dusk: 'linear-gradient(135deg,#c8b6e8,#9b88c9)',
  peach: 'linear-gradient(135deg,#f0c4a4,#d49474)',
  lavender: 'linear-gradient(135deg,#d4c4e8,#a89bc4)',
  gold: 'linear-gradient(135deg,#d9b380,#b8935a)',
  ink: 'linear-gradient(135deg,#3a332c,#0e0d0b)',
  rose: 'linear-gradient(135deg,#e8b8b8,#c48888)',
};

/* ── Inline section head (mirrors TSectionHead in ThemedSite) ──── */

function SectionHead({ eyebrow, title, italic }: { eyebrow: string; title: string; italic?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 40, margin: 0, lineHeight: 1.0, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
        {title}
        {italic && <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {italic}</span>}
      </h2>
    </div>
  );
}

/* ── (a) Masonry — CSS columns, varying aspect ratios ──────────── */

export function GalleryMasonry({ ctx }: { ctx: GalleryVariantCtx }) {
  const { C } = ctx;
  const tones: PhotoTone[] = C.tones?.length ? C.tones : ['warm', 'cream', 'sage', 'dusk', 'peach', 'lavender'];
  const ratios = ['3/4', '1', '4/5', '1', '3/4', '1'];
  /* Host photos take precedence when set; tone gradient grid is
     the empty-state fallback. */
  const hasPhotos = !!(C.photos && C.photos.length > 0);
  const items: Array<{ kind: 'photo'; url: string } | { kind: 'tone'; tone: PhotoTone }> = hasPhotos
    ? C.photos!.map((url) => ({ kind: 'photo' as const, url }))
    : tones.map((tone) => ({ kind: 'tone' as const, tone }));
  return (
    <>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div style={{ maxWidth: 940, margin: '0 auto', columnCount: 4, columnGap: 9 }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              breakInside: 'avoid',
              marginBottom: 9,
              background: it.kind === 'photo'
                ? `var(--t-section) center / cover no-repeat url("${it.url.replace(/"/g, '%22')}")`
                : TONE_BG[it.tone],
              aspectRatio: ratios[i % ratios.length],
              borderRadius: 'var(--t-radius)',
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ── (b) Slideshow — hero tile + thumb strip ───────────────────── */

export function GallerySlideshow({ ctx }: { ctx: GalleryVariantCtx }) {
  const { C } = ctx;
  const tones: PhotoTone[] = C.tones?.length ? C.tones : ['warm', 'cream', 'sage', 'dusk', 'peach', 'lavender', 'warm'];
  const hasPhotos = !!(C.photos && C.photos.length > 0);
  const heroBg = hasPhotos
    ? `var(--t-section) center / cover no-repeat url("${C.photos![0].replace(/"/g, '%22')}")`
    : TONE_BG[tones[0]];
  const thumbs = hasPhotos ? C.photos!.slice(1, 7) : tones.slice(1, 7);
  return (
    <>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div
        style={{
          aspectRatio: '16/9',
          maxWidth: 760,
          margin: '0 auto',
          borderRadius: 'var(--t-radius)',
          background: heroBg,
        }}
      />
      <div style={{ maxWidth: 760, margin: '14px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
        {thumbs.map((item, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              background: hasPhotos
                ? `var(--t-section) center / cover no-repeat url("${(item as string).replace(/"/g, '%22')}")`
                : TONE_BG[item as PhotoTone],
              borderRadius: 'var(--t-radius)',
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ── (c) Polaroid — scattered tilted cards ─────────────────────── */

export function GalleryPolaroid({ ctx }: { ctx: GalleryVariantCtx }) {
  const { C } = ctx;
  const tones: PhotoTone[] = C.tones?.length ? C.tones : ['warm', 'cream', 'sage', 'dusk', 'peach', 'lavender', 'warm', 'cream'];
  const rotations = [-3, 2, -1.5, 3, -2, 1.5, -2.5, 2];
  const hasPhotos = !!(C.photos && C.photos.length > 0);
  const items: Array<{ bg: string }> = hasPhotos
    ? C.photos!.map((url) => ({ bg: `var(--t-section) center / cover no-repeat url("${url.replace(/"/g, '%22')}")` }))
    : tones.map((tone) => ({ bg: TONE_BG[tone] }));
  return (
    <>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 920, margin: '0 auto' }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              width: 150,
              background: '#fffdf7',
              padding: '8px 8px 28px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              borderRadius: 2,
              transform: `rotate(${rotations[i % rotations.length]}deg)`,
            }}
          >
            <div style={{ aspectRatio: '1', background: it.bg }} />
          </div>
        ))}
      </div>
    </>
  );
}
