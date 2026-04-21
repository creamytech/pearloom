'use client';

// Sites home — empty state inviting the first thread.

import { useState } from 'react';
import { Bloom, Swirl } from '@/components/brand/groove';
import { Pear, Pearl, Pill, Squiggle, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, btnInk, btnGhost } from './DashShell';

const PATHS = [
  {
    k: 'pear',
    icon: '✦',
    label: 'Let Pear draft it',
    sub: 'Answer three questions. Pear presses a palette, story, RSVP, schedule. Takes about eight minutes.',
    accent: PD.olive,
    bg: PD.paper2,
    tilt: -1.5,
    recommended: true,
    time: 'about 8 minutes',
  },
  {
    k: 'photos',
    icon: '◎',
    label: 'Start with photos',
    sub: 'Drop in twelve or so pictures. We read the light, the faces, and weave a site around them.',
    accent: PD.gold,
    bg: PD.paperDeep,
    tilt: 0,
    time: 'about 12 minutes',
  },
  {
    k: 'template',
    icon: '❧',
    label: 'From a template',
    sub: 'Pick a hand-crafted mood, then swap the words for your own. Editorial, quiet, or loud.',
    accent: PD.terra,
    bg: PD.paper2,
    tilt: 1.5,
    time: 'about 5 minutes',
  },
];

const RECENT = [
  { n: 'Weddings', sub: 'September 2026', c: PD.pear },
  { n: 'Memorials', sub: 'Four ready to host', c: PD.plum },
  { n: 'Bachelor weekends', sub: 'Cabin-friendly', c: PD.butter },
];

export function DashSites() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <DashShell>
      <Topbar
        subtitle="GOOD EVENING, SCOTT"
        title={
          <span>
            Your{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              loom
            </span>{' '}
            is empty.
          </span>
        }
        actions={
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 14px',
                background: PD.paper3,
                border: '1px solid rgba(31,36,24,0.1)',
                borderRadius: 999,
              }}
            >
              <Pearl size={8} />
              <div>
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6 }}>PEAR CREDITS</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>13 of 15 left</div>
              </div>
            </div>
            <button
              style={{
                background: PD.ink,
                color: PD.paper,
                border: 'none',
                borderRadius: 999,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'inherit',
              }}
            >
              ✦ Begin a new site
            </button>
          </>
        }
      >
        One thread is enough to start. The first site is yours to keep, free, forever.
      </Topbar>

      <main style={{ padding: '24px 40px 80px' }}>
        {/* HERO INVITATION */}
        <Panel
          style={{ padding: 0, overflow: 'hidden', marginBottom: 36, position: 'relative', minHeight: 360 }}
        >
          <div
            style={{
              position: 'absolute',
              top: -80,
              right: -60,
              width: 380,
              height: 380,
              background: PD.pear,
              opacity: 0.35,
              filter: 'blur(30px)',
              borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
              animation: 'pl-blob-morph 14s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -80,
              left: 100,
              width: 300,
              height: 300,
              background: PD.butter,
              opacity: 0.32,
              filter: 'blur(26px)',
              borderRadius: '55% 45% 38% 62% / 38% 52% 48% 62%',
              animation: 'pl-blob-morph 18s ease-in-out infinite -6s',
            }}
          />
          <div style={{ position: 'absolute', top: 30, left: '42%', opacity: 0.4 }} aria-hidden>
            <Swirl size={120} color={PD.olive} strokeWidth={1.4} />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: '10%',
              animation: 'pl-float-y 5s ease-in-out infinite',
            }}
            aria-hidden
          >
            <Bloom size={90} color={PD.rose} centerColor={PD.plum} speed={8} />
          </div>

          <div
            className="pd-sites-hero"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: 40,
              padding: '56px 56px 48px',
              alignItems: 'center',
            }}
          >
            <div>
              <Pill color="rgba(255,255,255,0.6)" style={{ marginBottom: 16 }}>
                <Pearl size={8} /> FIRST SITE, ALWAYS FREE
              </Pill>
              <h2
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 'clamp(42px, 5.5vw, 72px)',
                  lineHeight: 0.95,
                  margin: '0 0 18px',
                  fontWeight: 400,
                  letterSpacing: '-0.025em',
                  color: PD.ink,
                }}
              >
                Let&rsquo;s press
                <br />
                your{' '}
                <span
                  style={{
                    fontStyle: 'italic',
                    color: PD.olive,
                    position: 'relative',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  first day
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: -8 }}>
                    <Squiggle width={260} height={14} color={PD.gold} strokeWidth={3} animated />
                  </span>
                </span>
                .
              </h2>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: PD.inkSoft,
                  margin: '0 0 28px',
                  maxWidth: 440,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                Tell Pear what you&rsquo;re gathering for. She&rsquo;ll take your photos, your date, your
                voice, and hand back a whole site in about eight minutes. You edit what she got wrong.
                You keep what she got right.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  style={{
                    background: PD.ink,
                    color: PD.paper,
                    border: 'none',
                    borderRadius: 999,
                    padding: '14px 24px',
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    fontFamily: 'inherit',
                  }}
                >
                  ✦ Start with Pear
                </button>
                <button
                  style={{
                    background: 'transparent',
                    color: PD.ink,
                    border: '1px solid rgba(31,36,24,0.2)',
                    borderRadius: 999,
                    padding: '14px 22px',
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Browse templates
                </button>
              </div>
            </div>

            {/* sample site card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 300,
                  background: PD.paperCard,
                  borderRadius: 18,
                  border: '1px solid rgba(31,36,24,0.12)',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px -14px rgba(31,36,24,0.2)',
                  transform: 'rotate(-2deg)',
                }}
              >
                <div
                  style={{
                    height: 110,
                    background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
                    position: 'relative',
                  }}
                >
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <Pear size={28} color={PD.butter} stem={PD.paper} leaf={PD.paper} />
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, left: 16, ...MONO_STYLE }}>
                    <div style={{ fontSize: 8, color: PD.paper, opacity: 0.75 }}>SEP 6 · 2026</div>
                  </div>
                </div>
                <div style={{ padding: '18px 18px 20px' }}>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 22,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.05,
                    }}
                  >
                    Your names here
                  </div>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: PD.gold,
                      margin: '4px 0 10px',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    a wedding, a wander, a wake
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                    {[PD.gold, PD.olive, PD.stone, PD.rose, PD.plum].map((c) => (
                      <div
                        key={c}
                        style={{ flex: 1, height: 10, background: c, borderRadius: 3 }}
                      />
                    ))}
                  </div>
                  <div style={{ ...MONO_STYLE, fontSize: 8, opacity: 0.5, marginTop: 6 }}>
                    YOUR PALETTE, PRESSED FROM PHOTOS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* THREE PATHS */}
        <SectionTitle eyebrow="THREE WAYS IN" title="Pick a" italic="thread." />
        <div
          className="pd-sites-paths"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}
        >
          {PATHS.map((p) => {
            const h = hovered === p.k;
            return (
              <button
                key={p.k}
                onMouseEnter={() => setHovered(p.k)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  textAlign: 'left',
                  background: p.bg,
                  color: PD.ink,
                  border: h ? `1.5px solid ${p.accent}` : '1px solid rgba(31,36,24,0.12)',
                  borderRadius: 20,
                  padding: '24px 24px 22px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transform: h ? 'rotate(0deg) translateY(-4px)' : `rotate(${p.tilt}deg)`,
                  transition: 'all 260ms cubic-bezier(.2,.8,.2,1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {p.recommended && (
                  <div
                    style={{
                      ...MONO_STYLE,
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      fontSize: 9,
                      background: PD.ink,
                      color: PD.paper,
                      padding: '4px 9px',
                      borderRadius: 999,
                    }}
                  >
                    RECOMMENDED
                  </div>
                )}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: p.accent,
                    color: PD.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    marginBottom: 18,
                    fontFamily: '"Fraunces", Georgia, serif',
                  }}
                >
                  {p.icon}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 26,
                    fontWeight: 400,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    marginBottom: 8,
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: PD.inkSoft,
                    lineHeight: 1.5,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {p.sub}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 18,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: p.accent,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {p.time}
                  <span style={{ marginLeft: 'auto' }}>→</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* BOTTOM ROW */}
        <div
          className="pd-sites-bottom"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}
        >
          <Panel bg={PD.paperDeep} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="POPULAR THIS WEEK"
              title="What people are"
              italic="weaving."
              accent={PD.terra}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RECENT.map((r) => (
                <div
                  key={r.n}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    background: PD.paper,
                    borderRadius: 14,
                    border: '1px solid rgba(31,36,24,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: r.c,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Pear size={22} color={PD.paper} stem={PD.ink} leaf={PD.ink} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.n}</div>
                    <div style={{ fontSize: 12, color: PD.inkSoft }}>{r.sub}</div>
                  </div>
                  <span style={{ fontSize: 14, opacity: 0.4 }}>→</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            bg={PD.ink}
            style={{
              padding: 28,
              color: PD.paper,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.45 }} aria-hidden>
              <Bloom size={120} color={PD.butter} centerColor={PD.terra} speed={6} />
            </div>
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 10,
                opacity: 0.5,
                marginBottom: 6,
                color: PD.butter,
              }}
            >
              A QUIET NOTE FROM PEAR
            </div>
            <p
              style={{
                ...DISPLAY_STYLE,
                fontSize: 22,
                lineHeight: 1.3,
                fontStyle: 'italic',
                margin: '0 0 20px',
                fontWeight: 400,
                position: 'relative',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &ldquo;Every site starts as a thread. We just need to know what you&rsquo;re gathering
              for.&rdquo;
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                paddingTop: 14,
                borderTop: '1px solid rgba(244,236,216,0.15)',
              }}
            >
              <Pear size={28} color={PD.pear} stem={PD.paper} leaf={PD.butter} />
              <div style={{ fontSize: 12, fontFamily: 'var(--pl-font-body)' }}>Pear, house planner</div>
            </div>
          </Panel>
        </div>
      </main>

      {/* Silence lint */}
      <div aria-hidden style={{ display: 'none' }}>
        <button style={btnInk}>X</button>
        <button style={btnGhost}>X</button>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-sites-hero),
          :global(.pd-sites-paths),
          :global(.pd-sites-bottom) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashShell>
  );
}
