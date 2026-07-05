'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignStudio.tsx
//
// "Pear sets the type. You dress the rest." — the studio
// playground. A live-re-theming device preview: pick a palette
// and a typeface on the left, and the mock site on the right
// re-inks in place. The outer section is PD-token chrome; the
// inner device runs its OWN --dv-* theme vars driven by the
// selected StudioTheme, so it re-skins independently of the page.
//
// The "cover photo" is a real occasion photograph behind a subtle
// dark scrim; the accent gradient over it re-tints live with the
// selected theme, so the device still re-skins in place.
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties, type ReactNode } from 'react';
import { PD, MONO_STYLE, DISPLAY_STYLE, Pearl, pdInkMix } from './DesignAtoms';
import {
  OCC,
  OCC_IMG,
  U,
  STUDIO_THEMES,
  STUDIO_SANS,
  CORE_BLOCKS,
  BLOCKS_BY_OCC,
  parseNames,
  slugifyNames,
  type OccasionKey,
  type StudioTheme,
} from './landing-data';

const CONTROL_LABEL: CSSProperties = {
  ...MONO_STYLE,
  fontSize: 10,
  color: PD.inkSoft,
  opacity: 0.75,
  marginBottom: 12,
  display: 'block',
};

export function DesignStudio({ occ = 'wedding', names }: { occ?: OccasionKey; names?: string }) {
  const O = OCC[occ];
  const displayNames = names || O.ph;
  const p = parseNames(displayNames);

  const [theme, setTheme] = useState<StudioTheme>(STUDIO_THEMES[0]);
  const [serif, setSerif] = useState(true);

  const blocks = BLOCKS_BY_OCC[occ] || BLOCKS_BY_OCC.wedding;

  // The device runs its own theme, decoupled from the page chrome.
  const vars = {
    '--dv-bg': theme.bg,
    '--dv-ink': theme.ink,
    '--dv-accent': theme.accent,
    '--dv-line': theme.line,
    '--dv-muted': theme.muted,
    '--dv-display': serif ? theme.display : STUDIO_SANS,
  } as CSSProperties;

  return (
    <section
      id="themes"
      style={{ padding: 'clamp(64px,9vw,110px) 24px', maxWidth: 1180, margin: '0 auto' }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <div style={{ ...MONO_STYLE, color: PD.terra, marginBottom: 16 }}>
          Draft once · dress it any way
        </div>
        <h2
          className="pl-letterpress"
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(34px,4.6vw,56px)',
            color: PD.ink,
            margin: 0,
          }}
        >
          Pear sets the type.{' '}
          <em style={{ fontStyle: 'italic', color: PD.olive }}>You</em> dress the rest.
        </h2>
        <p
          style={{
            color: PD.inkSoft,
            fontSize: 'clamp(16px,1.3vw,18px)',
            maxWidth: 620,
            lineHeight: 1.6,
            marginTop: 20,
            marginBottom: 0,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          Every Pearloom site arrives fully drafted, then re-skins live. Pick a palette and a
          typeface, and watch the whole thing re-ink — real components on real paper.
        </p>
      </div>

      {/* ── Two-column: controls | device ──────────────────── */}
      <div
        className="pd-studio-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,340px) 1fr',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* Left — controls */}
        <div
          style={{
            background: PD.paperCard,
            border: `1px solid ${PD.line}`,
            borderRadius: 18,
            padding: 22,
          }}
        >
          <span style={CONTROL_LABEL}>Palette</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 26,
            }}
          >
            {STUDIO_THEMES.map((t) => {
              const selected = t.key === theme.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={selected}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 10,
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: selected
                      ? `color-mix(in oklab, ${PD.olive} 8%, transparent)`
                      : PD.paper,
                    border: selected ? `1.5px solid ${PD.olive}` : `1px solid ${PD.line}`,
                    transition: 'border-color .2s ease, background .2s ease',
                  }}
                >
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[t.bg, t.accent, t.ink].map((c, i) => (
                      <span
                        key={i}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: c,
                          border: `1px solid ${pdInkMix(12)}`,
                        }}
                      />
                    ))}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: PD.ink,
                      fontFamily: 'var(--pl-font-body)',
                      lineHeight: 1.2,
                    }}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>

          <span style={CONTROL_LABEL}>Type</span>
          <div
            style={{
              display: 'inline-flex',
              width: '100%',
              padding: 3,
              gap: 3,
              borderRadius: 999,
              border: `1px solid ${PD.line}`,
              background: PD.paper,
            }}
          >
            {[
              { on: true, label: 'Letterpress serif' },
              { on: false, label: 'Modern sans' },
            ].map((opt) => {
              const active = serif === opt.on;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSerif(opt.on)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 500,
                    fontFamily: 'var(--pl-font-body)',
                    background: active ? PD.ink : 'transparent',
                    color: active ? PD.paper : PD.inkSoft,
                    transition: 'background .2s ease, color .2s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — live device preview */}
        <div>
          <div
            className="pd-studio-device"
            style={{
              ...vars,
              background: 'var(--dv-bg)',
              color: 'var(--dv-ink)',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--dv-line)',
              boxShadow: `0 24px 60px -28px ${pdInkMix(30)}`,
            }}
          >
            {/* browser bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderBottom: '1px solid var(--dv-line)',
              }}
            >
              <span style={{ display: 'flex', gap: 5 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: 'var(--dv-line)',
                    }}
                  />
                ))}
              </span>
              <span
                style={{
                  ...MONO_STYLE,
                  fontSize: 10,
                  letterSpacing: '0.02em',
                  textTransform: 'none',
                  fontWeight: 500,
                  color: 'var(--dv-muted)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                pearloom.com/{slugifyNames(displayNames)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--dv-line)',
                  ...MONO_STYLE,
                  fontSize: 9,
                  color: 'var(--dv-muted)',
                }}
              >
                <Pearl size={6} />
                live
              </span>
            </div>

            {/* cover — real occasion photo under the live accent tint */}
            <div
              style={{
                position: 'relative',
                minHeight: 120,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 8,
                backgroundImage: `linear-gradient(135deg, color-mix(in oklab, var(--dv-accent) 55%, transparent), transparent), linear-gradient(0deg, rgba(20,16,8,0.32), rgba(20,16,8,0.32)), url(${U(OCC_IMG[occ], 900)})`,
                backgroundSize: 'cover, cover, cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'var(--dv-bg)',
              }}
            >
              <span
                style={{
                  ...MONO_STYLE,
                  fontSize: 9.5,
                  color: 'var(--dv-ink)',
                  opacity: 0.7,
                }}
              >
                {O.eyebrow}
              </span>
              <span
                style={{
                  fontFamily: 'var(--dv-display)',
                  fontSize: 'clamp(26px,3.4vw,38px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  color: 'var(--dv-ink)',
                }}
              >
                {p.two ? (
                  <>
                    {p.a} <span style={{ fontStyle: 'italic', color: 'var(--dv-accent)' }}>&amp;</span>{' '}
                    {p.b}
                  </>
                ) : (
                  p.a
                )}
              </span>
              <span style={{ width: 44, height: 2, background: 'var(--dv-accent)', borderRadius: 2 }} />
              <span
                style={{
                  ...MONO_STYLE,
                  fontSize: 9.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: 'var(--dv-muted)',
                }}
              >
                {O.meta[0]} · {O.meta[1]}
              </span>
            </div>

            {/* body */}
            <div
              style={{
                padding: '18px 22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                borderTop: '1px solid var(--dv-line)',
              }}
            >
              {/* Our story */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MiniLabel>Our story</MiniLabel>
                <span style={{ height: 6, width: '100%', borderRadius: 3, background: 'var(--dv-line)' }} />
                <span style={{ height: 6, width: '72%', borderRadius: 3, background: 'var(--dv-line)' }} />
              </div>

              {/* Schedule */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MiniLabel>Schedule</MiniLabel>
                {[
                  ['Ceremony', '4:00'],
                  ['Dinner', '7:00'],
                ].map(([evt, time]) => (
                  <span
                    key={evt}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: 7,
                      borderBottom: '1px solid var(--dv-line)',
                      fontSize: 12,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    <span style={{ color: 'var(--dv-ink)' }}>{evt}</span>
                    <span style={{ color: 'var(--dv-muted)' }}>{time}</span>
                  </span>
                ))}
              </div>

              {/* RSVP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MiniLabel>Will you come?</MiniLabel>
                <span style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Going', active: true },
                    { label: 'Maybe', active: false },
                    { label: 'No', active: false },
                  ].map((b) => (
                    <span
                      key={b.label}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 500,
                        fontFamily: 'var(--pl-font-body)',
                        background: b.active ? 'var(--dv-accent)' : 'transparent',
                        color: b.active ? 'var(--dv-bg)' : 'var(--dv-ink)',
                        border: b.active ? '1px solid var(--dv-accent)' : '1px solid var(--dv-line)',
                      }}
                    >
                      {b.label}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>

          {/* caption */}
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10,
              color: PD.inkSoft,
              opacity: 0.7,
              textTransform: 'none',
              letterSpacing: '0.02em',
              fontWeight: 500,
              marginTop: 12,
            }}
          >
            {theme.name} · {serif ? 'Letterpress serif' : 'Modern sans'}
          </div>

          {/* blocks panel */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 22,
              borderTop: `1px solid ${PD.line}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span style={{ ...MONO_STYLE, fontSize: 10, color: PD.inkSoft }}>
                The blocks a {O.chip.toLowerCase()} gets
              </span>
              <span
                style={{
                  ...MONO_STYLE,
                  fontSize: 10,
                  color: PD.olive,
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: `1px solid ${PD.line}`,
                }}
              >
                {blocks.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {blocks.map((b) => {
                const core = CORE_BLOCKS.includes(b);
                return (
                  <span
                    key={b}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontFamily: 'var(--pl-font-body)',
                      color: core ? PD.ink : PD.terra,
                      background: core
                        ? PD.paper2
                        : `color-mix(in oklab, ${PD.terra} 12%, transparent)`,
                      border: core
                        ? `1px solid ${PD.line}`
                        : `1px solid color-mix(in oklab, ${PD.terra} 30%, transparent)`,
                    }}
                  >
                    {b}
                  </span>
                );
              })}
            </div>
            <p
              style={{
                fontSize: 12,
                color: PD.inkSoft,
                opacity: 0.75,
                marginTop: 12,
                marginBottom: 0,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Core sections in ink, specialty blocks in accent. Pear picks the set that fits your
              day.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 880px) {
          :global(.pd-studio-grid) {
            grid-template-columns: 1fr !important;
          }
        }
        /* User-triggered palette / type switches animate the device
           and every themed child (fine under reduced motion). */
        :global(.pd-studio-device),
        :global(.pd-studio-device *) {
          transition: background 0.4s ease, color 0.4s ease, border-color 0.4s ease;
        }
      `}</style>
    </section>
  );
}

function MiniLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--dv-display)',
        fontSize: 14,
        letterSpacing: '-0.01em',
        color: 'var(--dv-ink)',
      }}
    >
      {children}
    </span>
  );
}
