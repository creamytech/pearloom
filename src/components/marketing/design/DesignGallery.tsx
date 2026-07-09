'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignGallery.tsx  (Landing v4)
//
// "Each day has its own language." — a 4-across photographic
// occasion gallery. Each tile is a 3:4 photograph with a tone
// eyebrow, an italic name, and (on hover) a tailored-block count.
// Clicking a tile whose occasion the hero knows switches the hero.
// ─────────────────────────────────────────────────────────────

import { PD, MONO_STYLE, DISPLAY_STYLE } from './DesignAtoms';
import { GALLERY_TILES, U, type OccasionKey } from './landing-data';

export function DesignGallery({ onPickOccasion }: { onPickOccasion?: (k: OccasionKey) => void }) {
  return (
    <section id="occasions" className="pd-sec">
      <div className="pd-sechead" data-rv>
        <div style={{ ...MONO_STYLE, color: PD.terra, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Thirty-one occasions
        </div>
        <h2 className="pl-letterpress" style={{ ...DISPLAY_STYLE, fontSize: 'clamp(34px,4.6vw,60px)', color: PD.ink, margin: '14px 0 0' }}>
          Each day has its <em style={{ fontStyle: 'italic', color: PD.olive }}>own</em> language.
        </h2>
        <p style={{ fontSize: 'clamp(16px,1.3vw,18px)', lineHeight: 1.6, color: PD.inkSoft, maxWidth: 620, margin: '16px 0 0', fontFamily: 'var(--pl-font-body)' }}>
          Pear speaks all of them. Every occasion brings its own blocks, its own tone, its own beautiful
          default: an advice wall for the shower, a livestream for the memorial, a cost-splitter for the reunion.
          <em style={{ display: 'block', marginTop: 10, fontStyle: 'italic', color: PD.olive, fontFamily: 'var(--pl-font-display)' }}>
            Tap one. The whole page re-presses to match.
          </em>
        </p>
      </div>

      {/* pd-shelf: on phones the 2-col tile grid becomes a horizontal
          snap shelf of full-size occasion cards. */}
      <div className="pd-gallery pd-shelf">
        {GALLERY_TILES.map((o, i) => (
          <button
            key={o.nm}
            type="button"
            className="pd-gtile"
            data-rv
            style={{ ['--rv-d' as string]: `${(i % 4) * 90}ms` } as React.CSSProperties}
            onClick={() => o.key && onPickOccasion?.(o.key)}
          >
            {/* Paper-tile fallback behind the photograph: a failed image
                load reveals the occasion initial on paper inside a
                hairline frame, never an empty gradient. */}
            <span className="pd-gfallback" aria-hidden>
              {o.nm.charAt(0)}
            </span>
            <img
              src={U(o.img, 700)}
              alt={o.nm}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
            />
            <span className="pd-gmeta">
              <span className="pd-gtone">{o.tone}</span>
              <span className="pd-gnm">{o.nm}</span>
              <span className="pd-gblk">{o.blk} tailored blocks</span>
            </span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .pd-sec {
          padding: clamp(64px, 9vw, 110px) clamp(20px, 4vw, 48px);
          max-width: 1280px;
          margin: 0 auto;
        }
        .pd-gallery {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: clamp(30px, 3.5vw, 50px);
        }
        .pd-gtile {
          position: relative;
          border: none;
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          aspect-ratio: 3 / 4;
          cursor: pointer;
          background: var(--pd-paper2, #f7f0e0);
          box-shadow: var(--pl-shadow-sm, 0 4px 14px -6px rgba(31, 36, 24, 0.2));
          transition: transform 0.4s var(--pl-ease-emphasis, ease), box-shadow 0.4s;
        }
        .pd-gfallback {
          position: absolute;
          inset: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--pd-line, #e2d9c3);
          border-radius: 10px;
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 64px;
          color: var(--pd-stone, #c8bfa5);
        }
        .pd-gtile:hover {
          transform: translateY(-6px);
          box-shadow: var(--pl-shadow-xl, 0 30px 60px -24px rgba(31, 36, 24, 0.4));
        }
        .pd-gtile img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(1.06) sepia(0.04);
          transition: transform 0.8s var(--pl-ease-emphasis, ease);
        }
        .pd-gtile:hover img {
          transform: scale(1.09);
        }
        .pd-gtile::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(13, 11, 7, 0.04) 38%, rgba(13, 11, 7, 0.8));
        }
        .pd-gmeta {
          position: absolute;
          left: 16px;
          right: 14px;
          bottom: 15px;
          z-index: 2;
          text-align: left;
          color: #fdfaf0;
          transform: translateY(7px);
          transition: transform 0.4s var(--pl-ease-out, ease);
        }
        .pd-gtile:hover .pd-gmeta {
          transform: translateY(0);
        }
        .pd-gtone {
          display: block;
          font-family: var(--pl-font-mono);
          font-size: 8.5px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #f0c9a8;
        }
        .pd-gnm {
          display: block;
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 22px;
          line-height: 1.04;
          margin-top: 4px;
        }
        .pd-gblk {
          display: block;
          font-size: 11px;
          color: rgba(253, 250, 240, 0.72);
          margin-top: 3px;
          opacity: 0;
          max-height: 0;
          transition: opacity 0.4s, max-height 0.4s;
        }
        .pd-gtile:hover .pd-gblk {
          opacity: 1;
          max-height: 22px;
        }
        /* Touch devices have no hover: the block count and the settled
           label position must simply be there. Desktop keeps the reveal. */
        @media (hover: none) {
          .pd-gblk {
            opacity: 1;
            max-height: 22px;
          }
          .pd-gmeta {
            transform: none;
          }
        }
        @media (max-width: 900px) {
          .pd-gallery {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
