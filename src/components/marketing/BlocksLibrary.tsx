'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/BlocksLibrary.tsx
//
// "The parts of a day, as small blocks." Interactive showcase
// of Pearloom's 26 block types. Click an icon tile to bring its
// preview into the left-hand stage — RSVP shows form fields,
// Photo wall shows a live grid, Toast signup shows a seating-
// style name list, etc. Each preview is a tiny editorial
// sketch, not a full working block.
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties } from 'react';
import { BlurFade, Bloom, Worm, CurvedText } from '@/components/brand/groove';

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
  const [sel, setSel] = useState<Block>(BLOCKS[2]); // RSVP opens first — most-used block

  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(96px, 14vh, 160px) clamp(20px, 5vw, 64px)',
        background: 'var(--pl-groove-cream)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative worm drifting across the top-left */}
      <div style={{ position: 'absolute', top: 60, left: -80, opacity: 0.3, pointerEvents: 'none' }}>
        <Worm width={420} height={80} color="var(--pl-groove-terra)" segments={4} />
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1fr)',
            gap: 'clamp(32px, 5vw, 64px)',
            alignItems: 'start',
            marginBottom: 40,
          }}
          className="pl-blocks-library-grid"
        >
          {/* Left — copy */}
          <div>
            <BlurFade>
              <div
                aria-hidden
                style={{
                  color: 'var(--pl-groove-plum)',
                  marginBottom: 8,
                  marginLeft: -6,
                }}
              >
                <CurvedText
                  variant="wave"
                  width={360}
                  amplitude={10}
                  fontFamily="var(--pl-font-body)"
                  fontSize={14}
                  fontWeight={500}
                  letterSpacing={1.4}
                  aria-label="Twenty-six blocks, and counting"
                >
                  ✦  Twenty-six blocks, and counting  ✦
                </CurvedText>
              </div>
            </BlurFade>
            <BlurFade delay={0.08}>
              <h2
                style={{
                  margin: '0 0 20px',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                  fontWeight: 700,
                  lineHeight: 1.04,
                  letterSpacing: '-0.025em',
                  color: 'var(--pl-groove-ink)',
                }}
              >
                The parts of a day,
                <br />
                <span
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: 'var(--pl-groove-sage)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  as small blocks.
                </span>
              </h2>
            </BlurFade>
            <BlurFade delay={0.16}>
              <p
                style={{
                  margin: '0 0 12px',
                  maxWidth: '46ch',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '1.04rem',
                  lineHeight: 1.6,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                }}
              >
                Your RSVP asks the right questions. Your run of show shows guests where
                the day is going. Your photo wall fills up as it happens. Tap one to see
                it as a block, the way Pear threads it into your site.
              </p>
              <div
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  color: 'var(--pl-groove-terra)',
                  marginTop: 18,
                }}
              >
                → click a block
              </div>
            </BlurFade>
          </div>

          {/* Right — preview panel */}
          <BlurFade delay={0.16}>
            <div
              style={{
                background: 'color-mix(in oklab, var(--pl-groove-butter) 22%, var(--pl-groove-cream))',
                border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
                borderRadius: 'var(--pl-groove-radius-blob-5)',
                padding: 'clamp(24px, 3vw, 36px)',
                minHeight: 320,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.38, pointerEvents: 'none' }}>
                <Bloom size={140} color="var(--pl-groove-sage)" centerColor="var(--pl-groove-ink)" speed={8} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, position: 'relative' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    background: 'var(--pl-groove-ink)',
                    color: 'var(--pl-groove-cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontFamily: '"Fraunces", Georgia, serif',
                    flexShrink: 0,
                  }}
                >
                  {sel.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                      marginBottom: 2,
                    }}
                  >
                    Block · {sel.k}
                  </div>
                  <div
                    style={{
                      fontFamily: '"Fraunces", Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 32,
                      fontWeight: 400,
                      lineHeight: 1,
                      color: 'var(--pl-groove-ink)',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    {sel.name}
                  </div>
                </div>
              </div>
              <p
                style={{
                  margin: '10px 0 20px',
                  maxWidth: '42ch',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.96rem',
                  lineHeight: 1.55,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)',
                  position: 'relative',
                }}
              >
                {sel.desc}
              </p>
              <div style={{ position: 'relative' }}>
                <BlockPreview block={sel.k} />
              </div>
            </div>
          </BlurFade>
        </div>

        {/* Tile grid — all 26 blocks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 10,
          }}
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
                  background: isSel
                    ? 'var(--pl-groove-ink)'
                    : 'color-mix(in oklab, var(--pl-groove-butter) 16%, var(--pl-groove-cream))',
                  color: isSel ? 'var(--pl-groove-cream)' : 'var(--pl-groove-ink)',
                  borderRadius: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 8,
                  transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-groove-ease-bloom)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                aria-pressed={isSel}
                aria-label={`Preview ${b.name} block`}
              >
                <div style={{ fontSize: 24, fontFamily: '"Fraunces", Georgia, serif' }}>{b.icon}</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1.1,
                    textAlign: 'center',
                    fontFamily: 'var(--pl-font-body)',
                    letterSpacing: '-0.005em',
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
        @media (max-width: 820px) {
          .pl-blocks-library-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Per-block tiny previews ───────────────────────────────────
// Editorial sketches, not full renderers. Each is a one-screen
// demonstration of what the block does.

const card: CSSProperties = {
  background: 'color-mix(in oklab, var(--pl-groove-cream) 85%, transparent)',
  borderRadius: 14,
  padding: 14,
  border: '1px solid color-mix(in oklab, var(--pl-groove-ink) 10%, transparent)',
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
                padding: '9px 0',
                borderBottom: i < 2 ? '1px solid color-mix(in oklab, var(--pl-groove-ink) 8%, transparent)' : 'none',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: '1.5px solid var(--pl-groove-sage)',
                  background: i === 0 ? 'var(--pl-groove-sage)' : 'transparent',
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 13, fontFamily: 'var(--pl-font-body)' }}>{q}</div>
            </div>
          ))}
        </div>
      );
    case 'photo':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {[
            'var(--pl-groove-terra)',
            'var(--pl-groove-rose)',
            'var(--pl-groove-sage)',
            'var(--pl-groove-butter)',
            'var(--pl-groove-plum)',
            'color-mix(in oklab, var(--pl-groove-terra) 70%, var(--pl-groove-butter))',
            'var(--pl-groove-sage)',
            'color-mix(in oklab, var(--pl-groove-sage) 40%, var(--pl-groove-cream))',
            'var(--pl-groove-rose)',
            'color-mix(in oklab, var(--pl-groove-butter) 60%, var(--pl-groove-cream))',
          ].map((c, i) => (
            <div key={i} style={{ aspectRatio: '1', background: c, borderRadius: 4 }} />
          ))}
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
                background: i === 4 ? 'var(--pl-groove-terra)' : 'var(--pl-groove-cream)',
                border: '1px solid color-mix(in oklab, var(--pl-groove-ink) 15%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--pl-font-body)',
                fontWeight: 600,
                color: i === 4 ? 'var(--pl-groove-cream)' : 'var(--pl-groove-ink)',
              }}
            >
              T{i + 1}
            </div>
          ))}
        </div>
      );
    case 'run':
      return (
        <div style={{ position: 'relative', height: 40 }}>
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 0,
              right: 0,
              height: 3,
              background: 'color-mix(in oklab, var(--pl-groove-ink) 12%, transparent)',
              borderRadius: 99,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 0,
              width: '52%',
              height: 3,
              background: 'linear-gradient(90deg, var(--pl-groove-sage), var(--pl-groove-terra))',
              borderRadius: 99,
            }}
          />
          {[8, 28, 52, 74, 92].map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${p}%`,
                top: 10,
                width: 14,
                height: 14,
                borderRadius: 99,
                background: 'var(--pl-groove-cream)',
                border: `1.5px solid ${i < 3 ? 'var(--pl-groove-sage)' : 'color-mix(in oklab, var(--pl-groove-ink) 20%, transparent)'}`,
                transform: 'translateX(-50%)',
              }}
            />
          ))}
        </div>
      );
    case 'cost':
      return (
        <div style={{ ...card, fontSize: 13 }}>
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
                padding: '8px 0',
                borderBottom: i < 2 ? '1px solid color-mix(in oklab, var(--pl-groove-ink) 8%, transparent)' : 'none',
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
                background: 'var(--pl-groove-cream)',
                borderRadius: 10,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  background: 'var(--pl-groove-sage)',
                  color: 'var(--pl-groove-cream)',
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
          {[
            'She taught me to bake without a recipe.',
            "I'll never forget the laugh.",
            'Kind above all. Generous to a fault.',
            'She loved jazz on Sundays.',
            'A second mother to me.',
            'Thank you for the afternoons.',
          ].map((note, i) => (
            <div
              key={i}
              style={{
                background: 'color-mix(in oklab, var(--pl-groove-butter) 14%, var(--pl-groove-cream))',
                padding: 10,
                borderRadius: 8,
                fontSize: 10.5,
                fontStyle: 'italic',
                fontFamily: '"Fraunces", Georgia, serif',
                lineHeight: 1.4,
                transform: `rotate(${[-2, 1, -1, 2, -1, 1][i]}deg)`,
                border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 18%, transparent)',
              }}
            >
              {note}
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
                padding: '7px 0',
                borderBottom: i < 2 ? '1px solid color-mix(in oklab, var(--pl-groove-ink) 8%, transparent)' : 'none',
                fontSize: 12,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  background: 'var(--pl-groove-sage)',
                  color: 'var(--pl-groove-cream)',
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
            stroke="var(--pl-groove-sage)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
          />
          <circle cx="10" cy="90" r="5" fill="var(--pl-groove-terra)" />
          <circle cx="120" cy="60" r="5" fill="var(--pl-groove-butter)" />
          <circle cx="240" cy="50" r="5" fill="var(--pl-groove-butter)" />
          <circle cx="290" cy="30" r="6" fill="var(--pl-groove-sage)" />
          <text x="16" y="110" fontSize="10" fill="currentColor" fontFamily="Fraunces" fontStyle="italic">home</text>
          <text x="256" y="25" fontSize="10" fill="currentColor" fontFamily="Fraunces" fontStyle="italic">the vow</text>
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
                background: 'var(--pl-groove-ink)',
                color: 'var(--pl-groove-cream)',
                padding: '14px 18px',
                borderRadius: 14,
                textAlign: 'center',
                minWidth: 70,
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  lineHeight: 1,
                  fontStyle: 'italic',
                  fontFamily: '"Fraunces", Georgia, serif',
                  color: 'var(--pl-groove-butter)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {n}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  marginTop: 4,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--pl-font-body)',
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
            color: 'color-mix(in oklab, var(--pl-groove-ink) 60%, transparent)',
            fontStyle: 'italic',
            fontFamily: '"Fraunces", Georgia, serif',
            padding: '20px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 999,
              background: 'var(--pl-groove-blob-sunrise, linear-gradient(135deg, var(--pl-groove-butter), var(--pl-groove-rose)))',
            }}
          />
          Preview in the editor.
        </div>
      );
  }
}
