'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/ShowroomParallax.tsx
//
// Two rows of template cards that scroll in opposing
// directions as the user scrolls the page vertically. Pattern
// from Aceternity UI's Hero Parallax, rebuilt on groove tokens
// + existing SITE_TEMPLATES data.
//
// Sits between the hero and the interactive SiteShowroom —
// first the "look at everything we can weave" reveal, then the
// click-to-open shelf below.
// ─────────────────────────────────────────────────────────────

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { SITE_TEMPLATES } from '@/lib/templates/wedding-templates';
import { BlurFade } from '@/components/brand/groove';

// Curated picks so the two rows feel balanced visually.
const ROW_ONE_IDS = ['ethereal-garden', 'golden-hour', 'blush-bloom', 'coastal-breeze', 'rustic-romance', 'lavender-dreams'];
const ROW_TWO_IDS = ['midnight-luxe', 'y2k-reloaded', 'gothic-masquerade', 'martini-hour', 'aged-to-perfection', 'future-noir'];

function pickTemplates(ids: string[]) {
  return ids
    .map((id) => SITE_TEMPLATES.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);
}

interface ShowroomParallaxProps {
  onGetStarted?: () => void;
}

export function ShowroomParallax({ onGetStarted }: ShowroomParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 40 });

  const rowOneX = useTransform(smooth, [0, 1], ['0%', '-35%']);
  const rowTwoX = useTransform(smooth, [0, 1], ['-35%', '0%']);
  const opacity = useTransform(smooth, [0, 0.2, 0.8, 1], [0, 1, 1, 0.6]);

  const rowOne = pickTemplates(ROW_ONE_IDS);
  const rowTwo = pickTemplates(ROW_TWO_IDS);

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        padding: 'clamp(80px, 12vh, 140px) 0',
        background:
          'linear-gradient(180deg, var(--pl-groove-cream) 0%, color-mix(in oklab, var(--pl-groove-rose) 10%, var(--pl-groove-cream)) 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto 56px',
          padding: '0 clamp(20px, 5vw, 64px)',
        }}
      >
        <BlurFade>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--pl-groove-plum)',
              marginBottom: 14,
            }}
          >
            The Showroom
          </div>
        </BlurFade>
        <BlurFade delay={0.08}>
          <h2
            className="pl-display"
            style={{
              margin: '0 0 14px',
              fontStyle: 'italic',
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.015em',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              color: 'var(--pl-groove-ink)',
            }}
          >
            Every celebration, woven.
          </h2>
        </BlurFade>
        <BlurFade delay={0.16}>
          <p
            style={{
              margin: 0,
              maxWidth: '56ch',
              fontSize: '1.04rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 74%, transparent)',
            }}
          >
            Scroll — the bolts of fabric move past. Each one is a real
            Pearloom theme you can apply in one click. Pick yours below.
          </p>
        </BlurFade>
      </div>

      {/* Row 1 — scrolls left */}
      <motion.div
        style={{
          display: 'flex',
          gap: 22,
          paddingLeft: 'clamp(20px, 5vw, 64px)',
          paddingRight: 'clamp(20px, 5vw, 64px)',
          x: rowOneX,
          opacity,
        }}
      >
        {rowOne.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </motion.div>

      {/* Row 2 — scrolls right, offset up */}
      <motion.div
        style={{
          display: 'flex',
          gap: 22,
          paddingLeft: 'clamp(20px, 5vw, 64px)',
          paddingRight: 'clamp(20px, 5vw, 64px)',
          marginTop: 22,
          x: rowTwoX,
          opacity,
        }}
      >
        {rowTwo.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </motion.div>
    </section>
  );
}

// ── Single card — stylised preview using the template palette ─

function TemplateCard({
  template,
}: {
  template: (typeof SITE_TEMPLATES)[number];
}) {
  const colors = template.theme?.colors ?? {};
  const bg = colors.background ?? '#FBF3E4';
  const fg = colors.foreground ?? '#2B1E14';
  const accent = colors.accent ?? '#D97746';
  const accent2 = colors.accentLight ?? accent;
  const muted = colors.muted ?? fg;
  const headingFont = template.theme?.fonts?.heading ?? 'Fraunces';

  return (
    <article
      style={{
        flexShrink: 0,
        width: 'min(280px, 44vw)',
        aspectRatio: '3 / 4',
        borderRadius: 28,
        background: bg,
        color: fg,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 24,
        border: `1px solid color-mix(in oklab, ${fg} 12%, transparent)`,
        boxShadow: '0 2px 6px rgba(43,30,20,0.06), 0 18px 40px rgba(43,30,20,0.10)',
      }}
    >
      {/* Palette stripe across the top */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${accent} 0%, ${accent2} 100%)`,
        }}
      />
      {/* Soft atmospheric blob */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: accent,
          opacity: 0.18,
          filter: 'blur(40px)',
          bottom: -60,
          right: -60,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 10,
          }}
        >
          {template.name}
        </div>
        <div
          style={{
            fontFamily: `"${headingFont}", var(--pl-font-display), serif`,
            fontStyle: 'italic',
            fontSize: '1.8rem',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {template.tagline ?? 'Woven for you'}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: `color-mix(in oklab, ${fg} 65%, transparent)`,
            marginBottom: 6,
          }}
        >
          Palette
        </div>
        <div style={{ display: 'flex', gap: 0, height: 22, borderRadius: 4, overflow: 'hidden', border: `1px solid color-mix(in oklab, ${fg} 10%, transparent)` }}>
          {[accent, accent2, muted, fg].map((c, i) => (
            <div key={i} style={{ flex: 1, background: c }} />
          ))}
        </div>
      </div>
    </article>
  );
}
