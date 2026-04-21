'use client';

// Faithful port of design bundle's blocks.jsx. 26 blocks, click
// a tile to see its preview. Exact match:
// - straight mono Pill kicker with Sparkle (not CurvedText)
// - Fraunces display headline, 40-72px, "as small blocks." italic olive
// - 0.9fr / 1fr two-column grid, gap 60
// - preview panel: paper3 bg, border rgba(31,36,24,0.14), radius 24
//   (NOT a blob shape), Bloom drifting in top-right
// - tile grid: 8 columns, aspect-ratio 1, rounded 18px, ink-filled
//   when selected, paper3 on rest

import { useState, type CSSProperties } from 'react';
import { Bloom, Sparkle, Worm } from '@/components/brand/groove';
import { Pearl, Pill, PD, DISPLAY_STYLE, MONO_STYLE } from './design/DesignAtoms';

type BlockKey =
  | 'cover' | 'story' | 'rsvp' | 'run' | 'travel' | 'toast' | 'tribute'
  | 'cost' | 'photo' | 'seat' | 'advice' | 'vote' | 'reg' | 'live'
  | 'gate' | 'book' | 'pack' | 'spot' | 'map' | 'count' | 'chap'
  | 'quiz' | 'video' | 'obit' | 'prog' | 'memwall';

interface Block {
  k: BlockKey;
  name: string;
  icon: string;
  desc: string;
}

const BLOCKS: Block[] = [
  { k: 'cover',   name: 'Cover',          icon: '✦', desc: 'The front page. Hero image, names, date.' },
  { k: 'story',   name: 'Story',          icon: '❧', desc: "How you met. How it grew. Pear drafts the arc." },
  { k: 'rsvp',    name: 'RSVP',           icon: '◎', desc: 'Questions per occasion. Allergies, plus-ones, songs.' },
  { k: 'run',     name: 'Run of show',    icon: '◐', desc: 'Your day on a thread. Guests follow along.' },
  { k: 'travel',  name: 'Travel',         icon: '▲', desc: 'Airports, hotels, a map, the shuttle schedule.' },
  { k: 'toast',   name: 'Toast signup',   icon: '✢', desc: "Who's speaking. In what order. How long." },
  { k: 'tribute', name: 'Tribute wall',   icon: '✾', desc: 'Memories guests leave for the person.' },
  { k: 'cost',    name: 'Cost splitter',  icon: '$', desc: 'Shared weekends, no spreadsheets.' },
  { k: 'photo',   name: 'Photo wall',     icon: '◉', desc: 'Guests scan a QR. The wall fills up live.' },
  { k: 'seat',    name: 'Seating',        icon: '▦', desc: 'Drag and drop, real floor plan, constraints.' },
  { k: 'advice',  name: 'Advice wall',    icon: '✱', desc: 'A soft space for guests to leave notes.' },
  { k: 'vote',    name: 'Activity vote',  icon: '⚘', desc: 'Pick the hike, the movie, the dinner spot.' },
  { k: 'reg',     name: 'Registry',       icon: '⛉', desc: 'Links to every list, in one place.' },
  { k: 'live',    name: 'Livestream',     icon: '▷', desc: "For family who couldn't fly in." },
  { k: 'gate',    name: 'Privacy gate',   icon: '◈', desc: 'Password-protected. Quiet events stay quiet.' },
  { k: 'book',    name: 'Guestbook',      icon: '☞', desc: 'Notes, a photo, a gif. Signed and kept.' },
  { k: 'pack',    name: 'Packing list',   icon: '▢', desc: 'For destination weekends. Pear tailors it.' },
  { k: 'spot',    name: 'Spotify',        icon: '♪', desc: 'Playlist baked into the site, crowd-sourced.' },
  { k: 'map',     name: 'Map',            icon: '◇', desc: 'Every address. Hand-drawn style.' },
  { k: 'count',   name: 'Countdown',      icon: '⏱', desc: 'To the day, the hour, the vow.' },
  { k: 'chap',    name: 'Story chapters', icon: '§', desc: 'Acts, like a film reel, with images.' },
  { k: 'quiz',    name: "Couple's quiz",  icon: '?', desc: 'Light, playful. Guests test their guesses.' },
  { k: 'video',   name: 'Video chapter',  icon: '▣', desc: 'Watch the weekend in cuts.' },
  { k: 'obit',    name: 'Obituary',       icon: '✧', desc: 'A written life, on the page.' },
  { k: 'prog',    name: 'Program',        icon: '◨', desc: 'Ceremony order, readings, music.' },
  { k: 'memwall', name: 'Memory wall',    icon: '☘', desc: 'Guest submissions, moderated.' },
];

export function BlocksLibrary() {
  const [sel, setSel] = useState<Block>(BLOCKS[0]);

  return (
    <section
      style={{
        padding: '140px 24px',
        background: PD.paper,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 60, left: -60, opacity: 0.3 }} aria-hidden>
        <Worm width={400} height={80} color={PD.gold} segments={4} />
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div
          className="pd-blocks-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '0.9fr 1fr',
            gap: 60,
            alignItems: 'start',
            marginBottom: 40,
          }}
        >
          {/* Left — copy */}
          <div>
            <Pill style={{ marginBottom: 16 }}>
              <Sparkle size={12} color={PD.olive} /> TWENTY-SIX BLOCKS, AND COUNTING
            </Pill>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(40px, 5.2vw, 72px)',
                lineHeight: 0.95,
                margin: '0 0 20px',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: PD.ink,
              }}
            >
              The parts of a day,
              <br />
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                as small blocks.
              </span>
            </h2>
            <p
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: 17,
                lineHeight: 1.6,
                color: PD.inkSoft,
                margin: '0 0 12px',
                maxWidth: 480,
              }}
            >
              Your RSVP asks the right questions. Your run of show shows guests where the day is
              going. Your photo wall fills up as it happens. Tap one to see it as a block, the
              way Pear threads it into your site.
            </p>
            <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginTop: 18 }}>
              → CLICK A BLOCK
            </div>
          </div>

          {/* Preview panel — rectangular rounded card, NOT a blob */}
          <div
            style={{
              background: PD.paper3,
              border: '1px solid rgba(31,36,24,0.14)',
              borderRadius: 24,
              padding: '28px 30px',
              minHeight: 280,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.5 }} aria-hidden>
              <Bloom size={120} color={PD.pear} centerColor={PD.olive} speed={6} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: PD.ink,
                  color: PD.paper,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontFamily: '"Fraunces", Georgia, serif',
                  flexShrink: 0,
                }}
              >
                {sel.icon}
              </div>
              <div>
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
                  BLOCK · {sel.k.toUpperCase()}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 28,
                    fontStyle: 'italic',
                    fontWeight: 400,
                    lineHeight: 1,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {sel.name}
                </div>
              </div>
            </div>
            <p
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: 15,
                lineHeight: 1.55,
                color: PD.inkSoft,
                margin: '12px 0 18px',
                maxWidth: 420,
              }}
            >
              {sel.desc}
            </p>

            <BlockPreview block={sel.k} />
          </div>
        </div>

        {/* Tile grid — 8 columns, square tiles */}
        <div
          className="pd-block-tiles"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}
        >
          {BLOCKS.map((b) => {
            const isSel = sel.k === b.k;
            return (
              <button
                key={b.k}
                onClick={() => setSel(b)}
                style={{
                  aspectRatio: '1',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isSel ? PD.ink : PD.paper3,
                  color: isSel ? PD.paper : PD.ink,
                  borderRadius: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: 8,
                  transition: 'all 180ms',
                }}
                aria-pressed={isSel}
                aria-label={`Preview ${b.name} block`}
              >
                <div style={{ fontSize: 22, fontFamily: '"Fraunces", Georgia, serif' }}>{b.icon}</div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    lineHeight: 1.1,
                    textAlign: 'center',
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {b.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-blocks-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-block-tiles) {
            grid-template-columns: repeat(6, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pd-block-tiles) {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Per-block tiny previews ───────────────────────────────────

const card: CSSProperties = {
  background: PD.paper,
  borderRadius: 14,
  padding: 14,
  border: '1px solid rgba(31,36,24,0.1)',
};

function BlockPreview({ block }: { block: BlockKey }) {
  switch (block) {
    case 'rsvp':
      return (
        <div style={card}>
          {['Will you be there?', 'Any allergies?', 'A song to play?'].map((q, i) => (
            <div
              key={q}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < 2 ? '1px solid rgba(31,36,24,0.08)' : 'none',
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: `1.5px solid ${PD.olive}`,
                  background: i === 0 ? PD.olive : 'transparent',
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 13 }}>{q}</div>
            </div>
          ))}
        </div>
      );
    case 'photo':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {[PD.stone, PD.rose, PD.pear, PD.butter, PD.plum, PD.gold, PD.olive, PD.pearSkin, PD.terra, PD.paper2].map(
            (c, i) => (
              <div key={i} style={{ aspectRatio: '1', background: c, borderRadius: 4 }} />
            ),
          )}
        </div>
      );
    case 'seat':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: 10,
                background: i === 4 ? PD.terra : PD.paper,
                border: '1px solid rgba(31,36,24,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontFamily: 'var(--pl-font-body)',
                color: i === 4 ? PD.paper : PD.ink,
              }}
            >
              T{i + 1}
            </div>
          ))}
        </div>
      );
    case 'run':
      return (
        <div style={{ position: 'relative', height: 36 }}>
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 0,
              right: 0,
              height: 3,
              background: PD.line,
              borderRadius: 99,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 0,
              width: '52%',
              height: 3,
              background: `linear-gradient(90deg, ${PD.olive}, ${PD.gold})`,
              borderRadius: 99,
            }}
          />
          {[8, 28, 52, 74, 92].map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${p}%`,
                top: 8,
                width: 14,
                height: 14,
                borderRadius: 99,
                background: PD.paper,
                border: `1.5px solid ${i < 3 ? PD.olive : PD.stone}`,
                transform: 'translateX(-50%)',
              }}
            />
          ))}
        </div>
      );
    case 'cost':
      return (
        <div style={{ ...card, fontSize: 12.5 }}>
          {([
            ['Cabin', '$1,240', '6 ways'],
            ['Groceries', '$385', '6 ways'],
            ['Boat rental', '$420', '4 ways'],
          ] as const).map((row, i) => (
            <div
              key={row[0]}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '7px 0',
                borderBottom: i < 2 ? '1px solid rgba(31,36,24,0.08)' : 'none',
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <span>{row[0]}</span>
              <span style={{ opacity: 0.65 }}>{row[2]}</span>
              <span style={{ fontWeight: 600 }}>{row[1]}</span>
            </div>
          ))}
        </div>
      );
    case 'toast':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {([
            ['Maid of honor', 'Niamh', '3 min'],
            ['Best man', 'Ravi', '4 min'],
            ['The father', 'Henrik', '2 min'],
          ] as const).map((r, i) => (
            <div
              key={r[1]}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: PD.paper,
                borderRadius: 10,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  background: PD.olive,
                  color: PD.paper,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, fontSize: 12.5 }}>
                <b>{r[1]}</b> <span style={{ opacity: 0.6 }}>· {r[0]}</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.65 }}>{r[2]}</div>
            </div>
          ))}
        </div>
      );
    case 'tribute':
    case 'advice':
    case 'memwall':
    case 'book':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[PD.paper, PD.paper2, PD.paperDeep, PD.sand, PD.paperCard, PD.paper3].map((c, i) => (
            <div
              key={i}
              style={{
                background: c,
                padding: 10,
                borderRadius: 8,
                fontSize: 10,
                fontStyle: 'italic',
                fontFamily: '"Fraunces", Georgia, serif',
                lineHeight: 1.4,
                transform: `rotate(${[-2, 1, -1, 2, -1, 1][i]}deg)`,
              }}
            >
              {[
                'She taught me to bake without a recipe.',
                "I'll never forget the laugh.",
                'Kind above all. Generous to a fault.',
                'She loved jazz on Sundays.',
                'A second mother to me.',
                'Thank you for the afternoons.',
              ][i]}
            </div>
          ))}
        </div>
      );
    case 'spot':
      return (
        <div style={card}>
          {['Harvest Moon · Neil Young', 'At Last · Etta James', 'Linger · The Cranberries'].map((s, i) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 0',
                borderBottom: i < 2 ? '1px solid rgba(31,36,24,0.08)' : 'none',
                fontSize: 12,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  background: PD.olive,
                  color: PD.paper,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                }}
              >
                ♪
              </div>
              <span>{s}</span>
            </div>
          ))}
        </div>
      );
    case 'map':
      return (
        <svg viewBox="0 0 300 120" width="100%" height="140" style={{ display: 'block' }}>
          <path
            d="M 10 90 Q 60 20, 120 60 T 240 50 L 290 30"
            stroke={PD.olive}
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
          />
          <circle cx="10" cy="90" r="5" fill={PD.terra} />
          <circle cx="120" cy="60" r="5" fill={PD.gold} />
          <circle cx="240" cy="50" r="5" fill={PD.gold} />
          <circle cx="290" cy="30" r="6" fill={PD.olive} />
          <text x="16" y="110" fontSize="9" fill={PD.ink} fontFamily="Fraunces" fontStyle="italic">
            home
          </text>
          <text x="260" y="25" fontSize="9" fill={PD.ink} fontFamily="Fraunces" fontStyle="italic">
            the vow
          </text>
        </svg>
      );
    case 'count':
      return (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {([
            ['42', 'days'],
            ['18', 'hrs'],
            ['24', 'mins'],
          ] as const).map(([n, l]) => (
            <div
              key={l}
              style={{
                background: PD.ink,
                color: PD.paper,
                padding: '14px 18px',
                borderRadius: 14,
                textAlign: 'center',
                minWidth: 70,
              }}
            >
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 28,
                  lineHeight: 1,
                  fontStyle: 'italic',
                  color: PD.butter,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {n}
              </div>
              <div
                style={{
                  ...MONO_STYLE,
                  fontSize: 9,
                  opacity: 0.65,
                  marginTop: 4,
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div
          style={{
            fontSize: 13,
            color: PD.inkSoft,
            fontStyle: 'italic',
            fontFamily: '"Fraunces", Georgia, serif',
            padding: '20px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Pearl size={8} /> Preview in the editor.
        </div>
      );
  }
}
