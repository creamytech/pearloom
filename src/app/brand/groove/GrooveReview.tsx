'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/brand/groove/GrooveReview.tsx
// Live showcase of the groove primitives. Use it to critique
// the direction before we migrate marketing + dashboard.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import {
  GrooveBlob,
  Wave,
  SquishyButton,
  BubbleCard,
  PillNav,
  RipeningPear,
} from '@/components/brand/groove';

export function GrooveReview() {
  // Scroll-driven ripeness so the 3D pear literally ripens as
  // the reviewer scrolls the page — the exact effect we'll
  // use on the marketing hero.
  const [ripeness, setRipeness] = useState(0);
  const [tab, setTab] = useState('shapes');

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = Math.max(1, h.scrollHeight - window.innerHeight);
      setRipeness(Math.min(1, Math.max(0, scrolled / total)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main
      style={{
        background: 'var(--pl-groove-cream)',
        color: 'var(--pl-groove-ink)',
        minHeight: '100vh',
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      {/* ───── Hero ───── */}
      <section
        style={{
          position: 'relative',
          minHeight: '92vh',
          padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 64px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Atmosphere blobs */}
        <GrooveBlob
          palette="sunrise"
          size={520}
          blur={60}
          opacity={0.55}
          style={{ position: 'absolute', top: '-120px', right: '-120px', zIndex: 0 }}
        />
        <GrooveBlob
          palette="orchard"
          size={340}
          blur={50}
          opacity={0.4}
          style={{ position: 'absolute', bottom: '-100px', left: '-80px', zIndex: 0 }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 1fr) minmax(280px, 360px)',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.82rem',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--pl-groove-terra)',
                marginBottom: 14,
              }}
            >
              Groove · Product-UI design review
            </div>
            <h1
              className="pl-display"
              style={{
                margin: 0,
                fontStyle: 'italic',
                fontSize: 'clamp(2.6rem, 7vw, 5rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Warm things, made by&nbsp;hand.
            </h1>
            <p
              style={{
                maxWidth: '46ch',
                margin: '18px 0 30px',
                fontSize: '1.08rem',
                lineHeight: 1.55,
                color: 'color-mix(in oklab, var(--pl-groove-ink) 78%, transparent)',
              }}
            >
              Scroll to ripen the pear. The product UI feels alive; your
              published site — untouched by this redesign — stays timeless.
              Two brands, one codebase, one continuous story.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SquishyButton size="lg">Plant your first site</SquishyButton>
              <SquishyButton size="lg" palette="orchard">
                See the catalogue
              </SquishyButton>
            </div>
          </div>

          {/* The pear */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RipeningPear ripeness={ripeness} size={340} />
          </div>
        </div>
      </section>

      <Wave color="var(--pl-groove-cream)" flipped depth="medium" />

      {/* ───── Palette nav ───── */}
      <section
        style={{
          padding: '48px clamp(20px, 5vw, 64px)',
          background: 'color-mix(in oklab, var(--pl-groove-butter) 14%, var(--pl-groove-cream))',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--pl-groove-terra)',
              marginBottom: 14,
            }}
          >
            Primitives
          </div>
          <h2
            className="pl-display"
            style={{
              margin: '0 0 32px',
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Every piece we'll weave with
          </h2>

          <PillNav
            activeId={tab}
            onSelect={setTab}
            items={[
              { id: 'shapes',  label: 'Shapes' },
              { id: 'buttons', label: 'Buttons' },
              { id: 'cards',   label: 'Cards' },
              { id: 'waves',   label: 'Waves' },
            ]}
          />

          <div style={{ marginTop: 32, minHeight: 360 }}>
            {tab === 'shapes' && <ShapesShowcase />}
            {tab === 'buttons' && <ButtonsShowcase />}
            {tab === 'cards' && <CardsShowcase />}
            {tab === 'waves' && <WavesShowcase />}
          </div>
        </div>
      </section>

      {/* ───── Two-brand side-by-side ───── */}
      <section
        style={{
          padding: '80px clamp(20px, 5vw, 64px)',
          background: 'var(--pl-groove-cream)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--pl-groove-plum)',
              marginBottom: 14,
            }}
          >
            Why two brands
          </div>
          <h2
            className="pl-display"
            style={{
              margin: '0 0 16px',
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Alive when you build, timeless when it&rsquo;s yours
          </h2>
          <p
            style={{
              maxWidth: '58ch',
              margin: '0 auto 48px',
              fontSize: '1.04rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 78%, transparent)',
            }}
          >
            The product UI hums with warmth. The artifact you ship —
            the wedding site, memorial page, bachelor-party microsite —
            stays in the editorial voice. Two honest things, not one
            confused one.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            <BubbleCard tone="butter" tilt={-1.5} interactive>
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-groove-terra)',
                  marginBottom: 10,
                }}
              >
                Product UI
              </div>
              <div
                className="pl-display"
                style={{
                  fontStyle: 'italic',
                  fontSize: '1.5rem',
                  marginBottom: 8,
                  fontVariationSettings: '"opsz" 96, "SOFT" 80, "WONK" 1',
                }}
              >
                Groove
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 74%, transparent)',
                }}
              >
                Marketing, dashboard, wizard chrome, /rsvps, login,
                profile, help. Warm palette, wave dividers, bubble cards,
                3D pear on the hero.
              </p>
            </BubbleCard>

            <BubbleCard tone="sage" tilt={1.5} interactive>
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-groove-plum)',
                  marginBottom: 10,
                }}
              >
                Artifact
              </div>
              <div
                className="pl-display"
                style={{
                  fontStyle: 'italic',
                  fontSize: '1.5rem',
                  marginBottom: 8,
                  fontVariationSettings: '"opsz" 96, "SOFT" 80, "WONK" 1',
                }}
              >
                Editorial
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 74%, transparent)',
                }}
              >
                Published site, block renderers, OG share cards,
                editor canvas preview. Paper, Fraunces letterpress,
                olive+gold thread. Unchanged from BRAND.md.
              </p>
            </BubbleCard>
          </div>
        </div>
      </section>

      <Wave color="color-mix(in oklab, var(--pl-groove-plum) 12%, var(--pl-groove-cream))" depth="deep" />

      {/* ───── Footer of the review ───── */}
      <section
        style={{
          padding: '64px clamp(20px, 5vw, 64px) 120px',
          background: 'color-mix(in oklab, var(--pl-groove-plum) 12%, var(--pl-groove-cream))',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--pl-groove-plum)',
            marginBottom: 10,
          }}
        >
          This page is unlisted — review only
        </div>
        <p style={{ maxWidth: '52ch', margin: '0 auto', color: 'color-mix(in oklab, var(--pl-groove-ink) 78%, transparent)' }}>
          Once approved, the groove primitives migrate into marketing
          nav + hero, then the landing sections, then the dashboard
          chrome, then the inner pages. Five focused sessions.
        </p>
      </section>
    </main>
  );
}

// ── Showcase panels ─────────────────────────────────────────

function ShapesShowcase() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 24,
        alignItems: 'center',
      }}
    >
      {(['sunrise', 'orchard', 'petal'] as const).map((p) => (
        <div
          key={p}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <GrooveBlob palette={p} size={220} />
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--pl-groove-ink)',
            }}
          >
            {p}
          </span>
        </div>
      ))}
    </div>
  );
}

function ButtonsShowcase() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SquishyButton size="sm">Small sunrise</SquishyButton>
        <SquishyButton>Default sunrise</SquishyButton>
        <SquishyButton size="lg">Large sunrise</SquishyButton>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SquishyButton palette="orchard">Orchard</SquishyButton>
        <SquishyButton palette="petal">Petal</SquishyButton>
        <SquishyButton palette="ink">Ink</SquishyButton>
        <SquishyButton disabled>Disabled</SquishyButton>
      </div>
      <SquishyButton fullWidth size="lg">Full-width</SquishyButton>
    </div>
  );
}

function CardsShowcase() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
      }}
    >
      <BubbleCard tone="cream" tilt={-1.2}>
        <strong>Cream</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)' }}>
          Default card. Subtle random tilt for editorial collage.
        </p>
      </BubbleCard>
      <BubbleCard tone="butter" tilt={1} interactive>
        <strong>Butter · interactive</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)' }}>
          Hover me — lifts + untilts.
        </p>
      </BubbleCard>
      <BubbleCard tone="sage">
        <strong>Sage</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)' }}>
          For "you" moments — first-birthday, memorial, anniversary.
        </p>
      </BubbleCard>
      <BubbleCard tone="rose" blobShape>
        <strong>Rose · blob shape</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)' }}>
          Asymmetric border-radius for the loose moments.
        </p>
      </BubbleCard>
      <BubbleCard tone="glass">
        <strong>Glass</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: 'color-mix(in oklab, var(--pl-groove-ink) 72%, transparent)' }}>
          Backdrop-blur, for overlays.
        </p>
      </BubbleCard>
    </div>
  );
}

function WavesShowcase() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {(['shallow', 'medium', 'deep'] as const).map((d) => (
        <div key={d}>
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--pl-groove-ink)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            {d}
          </span>
          <Wave
            color="color-mix(in oklab, var(--pl-groove-terra) 18%, var(--pl-groove-cream))"
            depth={d}
            height={72}
          />
        </div>
      ))}
    </div>
  );
}
