'use client';
 
/* Gallery section layout variants for ThemedSite. The 'grid' default
   lives in ThemedSite.tsx; these are the alternative layouts the
   LAYOUTS registry can dispatch into. */

import { useState, type CSSProperties } from 'react';
import type { GalleryVariantCtx, PhotoTone } from './types';
import { VariantSectionHead } from './_section-head';
import { InlineEdit } from '../InlineEdit';

/* Edit-context extension — captions per photo (aligned with
   C.photos by index, sourced from manifest.galleryCaptions) plus
   the per-index writer. Local extension keeps the shared types
   module untouched. Captions only apply to real host photos; the
   tone-gradient placeholders never carry one. */
export interface GalleryVariantCtxEditable extends Omit<GalleryVariantCtx, 'C'> {
  C: GalleryVariantCtx['C'] & { captions?: (string | undefined)[] };
  onEditCaption?: (idx: number, v: string) => void;
  /** Published-only: open the full-screen lightbox at this photo
   *  index (index into C.photos). Undefined in the editor. */
  onPhotoClick?: (index: number) => void;
}

/** Caption slot in the variant's own voice — pass `style` for the
 *  per-variant treatment. Edit mode: InlineEdit with the
 *  "Add a caption…" ghost. Published: renders only when authored. */
function CaptionSlot({ ctx, i, style }: { ctx: GalleryVariantCtxEditable; i: number; style: CSSProperties }) {
  const caption = ctx.C.captions?.[i];
  if (ctx.editable && ctx.onEditCaption) {
    return (
      <InlineEdit
        as="div"
        value={caption ?? ''}
        onChange={(v) => ctx.onEditCaption?.(i, v)}
        editable
        placeholder="Add a caption…"
        className="pl8-inline-ghost"
        style={style}
      />
    );
  }
  return caption ? <div style={style}>{caption}</div> : null;
}

/* ── Shared tone → gradient placeholder map ─────────────────────── */

const TONE_BG: Record<string, string> = {
  warm: 'linear-gradient(135deg,#d4a574,#b8884f)',
  cream: 'linear-gradient(135deg,#f5efe2,#e8e0d0)',
  sage: 'linear-gradient(135deg,#a4b57a,#7a8a5c)',
  dusk: 'linear-gradient(135deg,#c8b6e8,#9b88c9)',
  peach: 'linear-gradient(135deg,#f0c4a4,#d49474)',
  lavender: 'linear-gradient(135deg,#d4c4e8,#a89bc4)',
  gold: 'linear-gradient(135deg,#d9b380,#C19A4B)',
  ink: 'linear-gradient(135deg,#3a332c,#0e0d0b)',
  rose: 'linear-gradient(135deg,#e8b8b8,#c48888)',
};

/** Lazy photo fill for a sized tile. These variants used to paint
 *  photos as CSS background-image, which fetches every full-res
 *  original eagerly at first paint (no lazy-load, no async decode) —
 *  a real first-scroll hitch on photo-heavy sites. The parent keeps
 *  its aspect-ratio box (so no layout shift) and must be
 *  position:relative + overflow:hidden. */
function LazyPhoto({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

/** Small helper — destructure the editable head props out of any
 *  variant ctx in one go, keeping JSX terse. */
function headProps(ctx: GalleryVariantCtxEditable) {
  return {
    eyebrow: ctx.C.eyebrow, title: ctx.C.title, italic: ctx.C.italic,
    editable: ctx.editable,
    onEditEyebrow: ctx.onEditEyebrow,
    onEditTitle: ctx.onEditTitle,
    eyebrowPlaceholder: ctx.eyebrowPlaceholder,
    titlePlaceholder: ctx.titlePlaceholder,
  };
}

/* ── (a) Masonry — CSS columns, varying aspect ratios ──────────── */

export function GalleryMasonry({ ctx }: { ctx: GalleryVariantCtxEditable }) {
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
      <VariantSectionHead {...headProps(ctx)} />
      {/* Responsive column count lives in a class + media queries
          (inline `columnCount` can't respond to viewport width):
          4 columns desktop → 2 below 860px → 1 below 520px. */}
      <style>{`
        .pl8-gallery-masonry { column-count: 4; column-gap: 9px; }
        @media (max-width: 860px) { .pl8-gallery-masonry { column-count: 2; } }
        @media (max-width: 520px) { .pl8-gallery-masonry { column-count: 1; } }
      `}</style>
      <div className="pl8-gallery-masonry" style={{ maxWidth: 940, margin: '0 auto' }}>
        {items.map((it, i) => (
          <div key={i} style={{ breakInside: 'avoid', marginBottom: 9 }}>
            <div
              onClick={it.kind === 'photo' && ctx.onPhotoClick ? () => ctx.onPhotoClick!(i) : undefined}
              role={it.kind === 'photo' && ctx.onPhotoClick ? 'button' : undefined}
              aria-label={it.kind === 'photo' && ctx.onPhotoClick ? 'Open photo' : undefined}
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: it.kind === 'photo' ? 'var(--t-section)' : TONE_BG[it.tone],
                aspectRatio: ratios[i % ratios.length],
                borderRadius: 'var(--t-radius)',
                cursor: it.kind === 'photo' && ctx.onPhotoClick ? 'zoom-in' : undefined,
              }}
            >
              {it.kind === 'photo' && <LazyPhoto url={it.url} />}
            </div>
            {it.kind === 'photo' && (
              <CaptionSlot
                ctx={ctx}
                i={i}
                style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', lineHeight: 1.4, marginTop: 4, padding: '0 2px' }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── (b) Slideshow — hero tile + thumb strip ───────────────────── */

export function GallerySlideshow({ ctx }: { ctx: GalleryVariantCtxEditable }) {
  const { C } = ctx;
  const tones: PhotoTone[] = C.tones?.length ? C.tones : ['warm', 'cream', 'sage', 'dusk', 'peach', 'lavender', 'warm'];
  const hasPhotos = !!(C.photos && C.photos.length > 0);
  const photos = C.photos ?? [];
  /* Real paging (2026-07-02): every photo is a thumb, tapping a
     thumb brings it onto the stage, and the stage opens the
     lightbox at the active photo. The old version hard-capped the
     strip at photos 1-6 — a 30-photo gallery silently showed 7. */
  const [active, setActive] = useState(0);
  const stageIdx = hasPhotos ? Math.min(active, photos.length - 1) : 0;
  const thumbTones = tones.slice(1, 7);
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div
        onClick={hasPhotos && ctx.onPhotoClick ? () => ctx.onPhotoClick!(stageIdx) : undefined}
        role={hasPhotos && ctx.onPhotoClick ? 'button' : undefined}
        aria-label={hasPhotos && ctx.onPhotoClick ? 'Open photo' : undefined}
        style={{
          aspectRatio: '16/9',
          maxWidth: 760,
          margin: '0 auto',
          borderRadius: 'var(--t-radius)',
          position: 'relative',
          overflow: 'hidden',
          background: hasPhotos ? 'var(--t-section)' : TONE_BG[tones[0]],
          cursor: hasPhotos && ctx.onPhotoClick ? 'zoom-in' : undefined,
        }}
      >
        {hasPhotos && <LazyPhoto key={stageIdx} url={photos[stageIdx]} />}
      </div>
      {/* Caption for the ACTIVE stage photo — under the stage,
          centered, in the variant's editorial voice. */}
      {hasPhotos && (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <CaptionSlot
            ctx={ctx}
            i={stageIdx}
            style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--t-ink-soft)', textAlign: 'center', marginTop: 10, lineHeight: 1.4 }}
          />
        </div>
      )}
      <div style={{ maxWidth: 760, margin: '14px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
        {hasPhotos
          ? photos.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === stageIdx || undefined}
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--t-section)',
                  border: i === stageIdx ? '2px solid var(--t-accent)' : '2px solid transparent',
                  borderRadius: 'var(--t-radius)',
                  padding: 0,
                  cursor: 'pointer',
                  opacity: i === stageIdx ? 1 : 0.85,
                }}
              >
                <LazyPhoto url={url} />
              </button>
            ))
          : thumbTones.map((tone, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  overflow: 'hidden',
                  background: TONE_BG[tone],
                  borderRadius: 'var(--t-radius)',
                }}
              />
            ))}
      </div>
    </>
  );
}

/* ── (c) Frames — hairline-framed asymmetric editorial rows ─────
   BRAND §10 bans symmetrical full-bleed photography without a
   hairline frame; this is the gallery variant that leans INTO the
   rule. Photos sit on card mats inside a 1px hairline, arranged in
   asymmetric two-up rows (wide + narrow, alternating), with a
   small gold pearl punctuating each row's gutter. Captions read as
   plate labels — mono small caps under the frame. */

export function GalleryFrames({ ctx }: { ctx: GalleryVariantCtxEditable }) {
  const { C } = ctx;
  const tones: PhotoTone[] = C.tones?.length ? C.tones : ['warm', 'cream', 'sage', 'dusk', 'peach', 'lavender'];
  const hasPhotos = !!(C.photos && C.photos.length > 0);
  const items: Array<{ url?: string; tone?: PhotoTone }> = hasPhotos
    ? C.photos!.map((url) => ({ url }))
    : tones.slice(0, 4).map((tone) => ({ tone }));

  /* Pair the photos into rows; every other row flips the wide
     side. Odd trailing photo gets a centered single frame. */
  const rows: Array<Array<{ item: { url?: string; tone?: PhotoTone }; idx: number }>> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2).map((item, j) => ({ item, idx: i + j })));
  }

  const frame = (entry: { item: { url?: string; tone?: PhotoTone }; idx: number }, aspect: string) => (
    <figure key={entry.idx} style={{ margin: 0, minWidth: 0 }}>
      <div
        onClick={entry.item.url && ctx.onPhotoClick ? () => ctx.onPhotoClick!(entry.idx) : undefined}
        role={entry.item.url && ctx.onPhotoClick ? 'button' : undefined}
        aria-label={entry.item.url && ctx.onPhotoClick ? 'Open photo' : undefined}
        style={{
          /* The hairline frame — mat + rule, the plate the brand
             asks every photograph to wear. */
          background: 'var(--t-card)',
          border: '1px solid var(--t-line)',
          padding: 'clamp(6px, 1.2vw, 12px)',
          cursor: entry.item.url && ctx.onPhotoClick ? 'zoom-in' : undefined,
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            aspectRatio: aspect,
            background: entry.item.url ? 'var(--t-section)' : TONE_BG[entry.item.tone ?? 'warm'],
            /* Inner hairline so the photo reads set INTO the mat. */
            boxShadow: 'inset 0 0 0 1px var(--t-line-soft)',
          }}
        >
          {entry.item.url && <LazyPhoto url={entry.item.url} />}
        </div>
      </div>
      {entry.item.url && (
        <CaptionSlot
          ctx={ctx}
          i={entry.idx}
          style={{
            fontFamily: 'var(--t-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--t-ink-muted)',
            textAlign: 'center',
            marginTop: 8,
          }}
        />
      )}
    </figure>
  );

  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(18px, 3vw, 34px)' }}>
        {rows.map((row, r) => {
          if (row.length === 1) {
            return (
              <div key={r} style={{ maxWidth: 560, width: '100%', margin: '0 auto' }}>
                {frame(row[0], '4/3')}
              </div>
            );
          }
          const wideFirst = r % 2 === 0;
          return (
            <div
              key={r}
              className="pl8-gallery-frames-row"
              style={{
                display: 'grid',
                gridTemplateColumns: wideFirst ? '1.5fr auto 1fr' : '1fr auto 1.5fr',
                gap: 'clamp(10px, 2vw, 20px)',
                alignItems: 'center',
              }}
            >
              {frame(row[0], wideFirst ? '4/3' : '3/4')}
              {/* Gold pearl in the gutter — the row's punctuation. */}
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-gold)', flexShrink: 0 }} />
              {frame(row[1], wideFirst ? '3/4' : '4/3')}
            </div>
          );
        })}
      </div>
      {/* Phones: rows stack, pearls step aside. */}
      <style>{`
        @media (max-width: 560px) {
          .pl8-gallery-frames-row { grid-template-columns: 1fr !important; }
          .pl8-gallery-frames-row > span[aria-hidden] { display: none; }
        }
      `}</style>
    </>
  );
}

/* ── (d) Polaroid — scattered tilted cards ─────────────────────── */

export function GalleryPolaroid({ ctx }: { ctx: GalleryVariantCtxEditable }) {
  const { C } = ctx;
  const tones: PhotoTone[] = C.tones?.length ? C.tones : ['warm', 'cream', 'sage', 'dusk', 'peach', 'lavender', 'warm', 'cream'];
  const rotations = [-3, 2, -1.5, 3, -2, 1.5, -2.5, 2];
  const hasPhotos = !!(C.photos && C.photos.length > 0);
  const items: Array<{ bg: string; url?: string }> = hasPhotos
    ? C.photos!.map((url) => ({ bg: 'var(--t-section)', url }))
    : tones.map((tone) => ({ bg: TONE_BG[tone] }));
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 920, margin: '0 auto' }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              width: 150,
              /* Theme card token, not a hardcoded light-mode hex —
                 editorial midnight keeps its warmth (BRAND §10) and
                 the caption ink below stays legible on the frame. */
              background: 'var(--t-card)',
              /* The bottom band is the polaroid's handwritten label
                 slot — previously dead 28px padding, now hosting the
                 caption. The caption row's minHeight keeps blank
                 polaroids the same height as before. */
              padding: '8px 8px 10px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              borderRadius: 2,
              transform: `rotate(${rotations[i % rotations.length]}deg)`,
            }}
          >
            <div
              onClick={hasPhotos && ctx.onPhotoClick ? () => ctx.onPhotoClick!(i) : undefined}
              role={hasPhotos && ctx.onPhotoClick ? 'button' : undefined}
              aria-label={hasPhotos && ctx.onPhotoClick ? 'Open photo' : undefined}
              style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: it.bg, cursor: hasPhotos && ctx.onPhotoClick ? 'zoom-in' : undefined }}
            >
              {it.url && <LazyPhoto url={it.url} />}
            </div>
            {/* Label band — always present so blank polaroids keep
                the classic empty-bottom proportions. */}
            <div style={{ minHeight: 18, marginTop: 4 }}>
              {hasPhotos && (
                <CaptionSlot
                  ctx={ctx}
                  i={i}
                  style={{
                    fontFamily: 'var(--t-script, var(--t-display))',
                    fontStyle: 'italic',
                    fontSize: 13,
                    lineHeight: 1.3,
                    color: 'var(--t-ink-soft)',
                    textAlign: 'center',
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
