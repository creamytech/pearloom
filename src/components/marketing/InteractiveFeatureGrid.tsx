'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/InteractiveFeatureGrid.tsx
//
// A 6-tile feature grid where hovering a tile triggers a tiny
// animated SVG demo of the feature in action. The hover IS the
// pitch — no screenshots, no "feature list", just live mini-
// demos that read at a glance.
//
// Tiles:
//   • Custom RSVP — form checkmarks fill in
//   • Guestbook   — messages stack up
//   • Palette     — five swatches shuffle in
//   • Pricing     — three tier cards flip to prices
//   • Editor      — "Type to edit" text that actually types
//   • Share       — a link fans out into three pills
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { BlurFade, CurvedText } from '@/components/brand/groove';

interface Tile {
  id: string;
  title: string;
  body: string;
  tone: 'butter' | 'rose' | 'sage' | 'terra' | 'plum' | 'cream';
  Demo: () => ReactNode;
}

const TONE_WASH: Record<Tile['tone'], string> = {
  butter: 'color-mix(in oklab, var(--pl-groove-butter) 20%, var(--pl-groove-cream))',
  rose:   'color-mix(in oklab, var(--pl-groove-rose) 22%, var(--pl-groove-cream))',
  sage:   'color-mix(in oklab, var(--pl-groove-sage) 22%, var(--pl-groove-cream))',
  terra:  'color-mix(in oklab, var(--pl-groove-terra) 18%, var(--pl-groove-cream))',
  plum:   'color-mix(in oklab, var(--pl-groove-plum) 14%, var(--pl-groove-cream))',
  cream:  'var(--pl-groove-cream)',
};

const TONE_INK: Record<Tile['tone'], string> = {
  butter: 'var(--pl-groove-terra)',
  rose:   'var(--pl-groove-plum)',
  sage:   'var(--pl-groove-sage)',
  terra:  'var(--pl-groove-terra)',
  plum:   'var(--pl-groove-plum)',
  cream:  'var(--pl-groove-terra)',
};

// ── Demo components ────────────────────────────────────────
// Each is a small SVG-free composition so we don't ship extra
// bundle weight. Framer-motion drives the animation; the demo
// remounts on hover-enter so the timeline replays each time.

function RsvpDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {['Attending gladly', 'Plus-one · Jo', 'Dietary · none'].map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 + i * 0.14, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 12px',
            borderRadius: 999,
            background: 'var(--pl-groove-cream)',
            border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--pl-groove-ink)',
          }}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.28 + i * 0.14, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--pl-groove-sage)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ✓
          </motion.span>
          {label}
        </motion.div>
      ))}
    </div>
  );
}

function GuestbookDemo() {
  const msgs = [
    { from: 'Auntie Ro', text: 'So much love!' },
    { from: 'Marcus',    text: 'Can\u2019t wait.' },
    { from: 'Priya',     text: 'Safe travels, you two.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {msgs.map((m, i) => (
        <motion.div
          key={m.from}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            padding: '8px 12px',
            borderRadius: 14,
            background: 'var(--pl-groove-cream)',
            border: '1px solid color-mix(in oklab, var(--pl-groove-plum) 18%, transparent)',
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--pl-groove-plum)', marginBottom: 2 }}>{m.from}</div>
          <div style={{ color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)' }}>
            &ldquo;{m.text}&rdquo;
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PaletteDemo() {
  const stops = [
    'var(--pl-groove-terra)',
    'var(--pl-groove-butter)',
    'var(--pl-groove-sage)',
    'var(--pl-groove-rose)',
    'var(--pl-groove-plum)',
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {stops.map((c, i) => (
        <motion.span
          key={c}
          initial={{ scaleY: 0, originY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.08 + i * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            flex: 1,
            height: 62,
            borderRadius: 14,
            background: c,
            boxShadow: '0 4px 12px rgba(43,30,20,0.12)',
          }}
        />
      ))}
    </div>
  );
}

function PricingDemo() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[
        { tier: 'Journal',  price: 'Free',  tone: 'var(--pl-groove-sage)' },
        { tier: 'Atelier',  price: '$19',   tone: 'var(--pl-groove-terra)' },
        { tier: 'Legacy',   price: '$12/mo', tone: 'var(--pl-groove-plum)' },
      ].map((t, i) => (
        <motion.div
          key={t.tier}
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.1 + i * 0.14, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flex: 1,
            padding: '10px 6px',
            textAlign: 'center',
            borderRadius: 14,
            background: 'var(--pl-groove-cream)',
            border: `1px solid color-mix(in oklab, ${t.tone} 32%, transparent)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: t.tone,
              marginBottom: 4,
            }}
          >
            {t.tier}
          </div>
          <div
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--pl-groove-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {t.price}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EditorDemo() {
  // Typewriter-style reveal of a sample line the host might edit.
  const text = 'We\u2019d love to see you.';
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: 'var(--pl-groove-cream)',
        border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
        fontFamily: '"Fraunces", Georgia, serif',
        fontStyle: 'italic',
        fontSize: '1rem',
        color: 'var(--pl-groove-ink)',
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        position: 'relative',
        minHeight: 58,
        lineHeight: 1.35,
      }}
    >
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 + i * 0.035, duration: 0.12 }}
          style={{ display: 'inline-block' }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
      <motion.span
        aria-hidden
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display: 'inline-block',
          width: 2,
          height: '1em',
          background: 'var(--pl-groove-terra)',
          marginLeft: 2,
          verticalAlign: 'middle',
        }}
      />
    </div>
  );
}

function ShareDemo() {
  const pills = ['Copy link', 'Text', 'Email', 'WhatsApp'];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {pills.map((p, i) => (
        <motion.span
          key={p}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--pl-groove-cream)',
            border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--pl-groove-ink)',
          }}
        >
          {p}
        </motion.span>
      ))}
    </div>
  );
}

const TILES: Tile[] = [
  {
    id: 'rsvp',
    title: 'RSVPs that feel like letters',
    body: 'Full names, plus-ones, dietary. Optional preset fields by event type.',
    tone: 'butter',
    Demo: RsvpDemo,
  },
  {
    id: 'guestbook',
    title: 'A guestbook worth reading',
    body: 'Threaded notes with moderation. Pin the ones that make you cry.',
    tone: 'plum',
    Demo: GuestbookDemo,
  },
  {
    id: 'palette',
    title: 'Palettes pressed from your photos',
    body: 'Pear reads your uploads and pulls five colors that belong together.',
    tone: 'rose',
    Demo: PaletteDemo,
  },
  {
    id: 'pricing',
    title: 'One-time, not a subscription',
    body: 'Atelier is $19 forever per celebration. Legacy is for every future one.',
    tone: 'sage',
    Demo: PricingDemo,
  },
  {
    id: 'editor',
    title: 'Inline edits, nothing to learn',
    body: 'Click any word and type. Autosaves while you breathe.',
    tone: 'terra',
    Demo: EditorDemo,
  },
  {
    id: 'share',
    title: 'Share in one tap',
    body: 'Printable link, QR code, Text / Email / WhatsApp in the share tray.',
    tone: 'cream',
    Demo: ShareDemo,
  },
];

export function InteractiveFeatureGrid() {
  const reduced = useReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
        background: 'var(--pl-groove-cream)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <BlurFade>
          <div
            aria-hidden
            style={{
              color: 'var(--pl-groove-terra)',
              marginBottom: 4,
              marginLeft: -6,
            }}
          >
            <CurvedText
              variant="wave"
              width={420}
              amplitude={10}
              fontFamily='var(--pl-font-body)'
              fontSize={14}
              fontWeight={500}
              letterSpacing={1.2}
              aria-label="Everything in, nothing bolted on"
            >
              Everything in, nothing bolted on
            </CurvedText>
          </div>
        </BlurFade>
        <BlurFade delay={0.08}>
          <h2
            style={{
              margin: '0 0 14px',
              maxWidth: '18ch',
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: 'clamp(2rem, 4.8vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
            }}
          >
            Hover each tile. That&rsquo;s the feature, live.
          </h2>
        </BlurFade>
        <BlurFade delay={0.16}>
          <p
            style={{
              margin: '0 0 48px',
              maxWidth: '56ch',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1.04rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
            }}
          >
            No screenshots. No &ldquo;features&rdquo; lists. Move your pointer over
            a tile and the feature plays.
          </p>
        </BlurFade>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {TILES.map((tile, i) => {
            const active = hoveredId === tile.id;
            return (
              <BlurFade key={tile.id} delay={0.08 + i * 0.05}>
                <article
                  onMouseEnter={() => setHoveredId(tile.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(tile.id)}
                  onBlur={() => setHoveredId(null)}
                  tabIndex={0}
                  style={{
                    position: 'relative',
                    padding: 'clamp(22px, 3vw, 28px)',
                    minHeight: 260,
                    borderRadius: i % 2 === 0
                      ? 'var(--pl-groove-radius-blob)'
                      : '28px',
                    background: TONE_WASH[tile.tone],
                    border: `1px solid color-mix(in oklab, ${TONE_INK[tile.tone]} 22%, transparent)`,
                    transition:
                      'transform var(--pl-dur-base) var(--pl-groove-ease-bloom),' +
                      ' box-shadow var(--pl-dur-base) var(--pl-ease-out),' +
                      ' border-color var(--pl-dur-fast) var(--pl-ease-out)',
                    transform: active ? 'translateY(-4px)' : '',
                    boxShadow: active
                      ? `0 4px 10px rgba(43,30,20,0.05), 0 26px 56px color-mix(in oklab, ${TONE_INK[tile.tone]} 24%, transparent)`
                      : `0 1px 2px rgba(43,30,20,0.04), 0 14px 40px color-mix(in oklab, ${TONE_INK[tile.tone]} 10%, transparent)`,
                    cursor: 'default',
                    outline: 'none',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 8px',
                      fontFamily: 'var(--pl-font-body)',
                      fontWeight: 700,
                      fontSize: '1.12rem',
                      lineHeight: 1.2,
                      letterSpacing: '-0.01em',
                      color: 'var(--pl-groove-ink)',
                    }}
                  >
                    {tile.title}
                  </h3>
                  <p
                    style={{
                      margin: '0 0 18px',
                      maxWidth: '36ch',
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                    }}
                  >
                    {tile.body}
                  </p>

                  {/* Demo slot — remounts on hover enter so the animation replays */}
                  <div style={{ minHeight: 88 }}>
                    <AnimatePresence mode="popLayout">
                      {(active || reduced) && (
                        <motion.div
                          key="demo"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <tile.Demo />
                        </motion.div>
                      )}
                      {!active && !reduced && (
                        <motion.div
                          key="hint"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            fontFamily: 'var(--pl-font-body)',
                            fontSize: '0.78rem',
                            color: 'color-mix(in oklab, var(--pl-groove-ink) 48%, transparent)',
                            fontStyle: 'italic',
                          }}
                        >
                          Hover to play →
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </article>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
