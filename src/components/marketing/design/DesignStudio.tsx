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
  STUDIO_KITS,
  STUDIO_PAPERS,
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

// A control label that carries an inline count pill (Component kit · Paper).
const CONTROL_LABEL_ROW: CSSProperties = {
  ...CONTROL_LABEL,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const COUNT_BADGE: CSSProperties = {
  ...MONO_STYLE,
  fontSize: 9,
  letterSpacing: '0.1em',
  fontWeight: 600,
  color: PD.inkSoft,
  background: `color-mix(in oklab, ${PD.olive} 12%, transparent)`,
  padding: '1px 7px',
  borderRadius: 999,
  opacity: 1,
};

export function DesignStudio({ occ = 'wedding', names }: { occ?: OccasionKey; names?: string }) {
  const O = OCC[occ];
  const displayNames = names || O.ph;
  const p = parseNames(displayNames);

  const [theme, setTheme] = useState<StudioTheme>(STUDIO_THEMES[0]);
  const [kit, setKit] = useState('classic');
  const [paper, setPaper] = useState('linen');
  const [serif, setSerif] = useState(true);

  const kitName = STUDIO_KITS.find((k) => k.id === kit)?.name ?? 'Classic';
  const paperName = STUDIO_PAPERS.find((pp) => pp.id === paper)?.name ?? 'Linen';

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
          Every Pearloom site arrives fully drafted, then re-skins live. Pick a palette, a
          component kit, a paper and a typeface, and watch the whole thing re-ink — real
          components on real paper.
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

          {/* Component kit — re-frames the preview cards */}
          <span style={CONTROL_LABEL_ROW}>
            Component kit
            <span style={COUNT_BADGE}>{STUDIO_KITS.length}</span>
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              maxHeight: 132,
              overflowY: 'auto',
              padding: '2px 2px 4px',
              marginBottom: 26,
            }}
          >
            {STUDIO_KITS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={'kchip2' + (k.id === kit ? ' on' : '')}
                onClick={() => setKit(k.id)}
                aria-pressed={k.id === kit}
                title={k.blurb}
              >
                {k.name}
              </button>
            ))}
          </div>

          {/* Paper — re-grains the preview surface */}
          <span style={CONTROL_LABEL_ROW}>
            Paper
            <span style={COUNT_BADGE}>{STUDIO_PAPERS.length}</span>
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 26 }}>
            {STUDIO_PAPERS.map((pp) => (
              <button
                key={pp.id}
                type="button"
                className={'pchip' + (pp.id === paper ? ' on' : '')}
                onClick={() => setPaper(pp.id)}
                aria-pressed={pp.id === paper}
              >
                <span className={'pchip-sw sk-mat-' + pp.id} />
                {pp.name}
              </button>
            ))}
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
            className="pd-studio-device sk-device"
            data-kit={kit}
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

            {/* paper surface — carries the chosen texture under cover + body */}
            <div className={`sk-paper sk-mat-${paper}`}>
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
              <div className="sk-block" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MiniLabel>Our story</MiniLabel>
                <span style={{ height: 6, width: '100%', borderRadius: 3, background: 'var(--dv-line)' }} />
                <span style={{ height: 6, width: '72%', borderRadius: 3, background: 'var(--dv-line)' }} />
              </div>

              {/* Schedule */}
              <div className="sk-block" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              <div className="sk-block" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            {theme.name} · {kitName} kit · {paperName} paper
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

        /* ── Component-kit chips (STUDIO_KITS) ── */
        :global(.kchip2) {
          border: 1px solid var(--pd-line, #d8cfb8);
          background: var(--pd-paperCard, #fbf7ee);
          color: var(--pd-inkSoft, #3a332c);
          font-family: var(--pl-font-body);
          font-size: 12px;
          font-weight: 550;
          padding: 6px 11px;
          border-radius: 999px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        :global(.kchip2:hover) {
          border-color: var(--occ, var(--pd-olive, #5c6b3f));
          color: var(--pd-ink, #0e0d0b);
        }
        :global(.kchip2.on) {
          background: var(--pd-ink, #0e0d0b);
          color: var(--pd-paper, #f5efe2);
          border-color: var(--pd-ink, #0e0d0b);
        }

        /* ── Paper chips (STUDIO_PAPERS) ── */
        :global(.pchip) {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--pd-line, #d8cfb8);
          background: var(--pd-paperCard, #fbf7ee);
          color: var(--pd-inkSoft, #3a332c);
          font-family: var(--pl-font-body);
          font-size: 11.5px;
          font-weight: 550;
          padding: 5px 11px 5px 6px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease,
            box-shadow 0.15s ease;
        }
        :global(.pchip:hover) {
          border-color: var(--occ, var(--pd-olive, #5c6b3f));
        }
        :global(.pchip.on) {
          border-color: var(--pd-ink, #0e0d0b);
          color: var(--pd-ink, #0e0d0b);
          box-shadow: 0 0 0 1px var(--pd-ink, #0e0d0b);
        }
        :global(.pchip-sw) {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid var(--pd-line, #d8cfb8);
          background-color: var(--pd-paper, #f5efe2);
          flex-shrink: 0;
        }
        :global(.pchip-sw.sk-mat-velvet) {
          background-color: #2a2440;
        }

        /* ── Paper surface + component cards inside the device ── */
        :global(.sk-paper) {
          background-color: var(--dv-bg, #fff);
        }
        :global(.sk-block) {
          position: relative;
          background: color-mix(in oklab, var(--dv-bg) 90%, var(--dv-ink) 6%);
          border: 1px solid var(--dv-line);
          border-radius: 12px;
          padding: 15px 16px;
          transition: border-radius 0.35s ease, box-shadow 0.35s ease, background 0.35s ease,
            transform 0.35s ease, border-color 0.35s ease;
        }

        /* Per-kit card framing (ported from the design handoff). The two
           text-recolouring kits — marquee/chalkboard — intentionally fall
           back to classic here: the preview's copy is inline-styled, so
           their child-text overrides can't recolour it. */
        :global(.sk-device[data-kit='minimal'] .sk-block) {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--dv-line);
          border-radius: 0;
        }
        :global(.sk-device[data-kit='ticket'] .sk-block) {
          border: 1.5px dashed var(--dv-line);
          border-radius: 6px;
        }
        :global(.sk-device[data-kit='plate'] .sk-block) {
          border: none;
          border-radius: 1px;
          box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dv-ink) 40%, transparent),
            inset 0 0 0 4px var(--dv-bg), inset 0 0 0 5px color-mix(in oklab, var(--dv-ink) 20%, transparent);
        }
        :global(.sk-device[data-kit='scrapbook'] .sk-block) {
          border: none;
          border-radius: 2px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
          transform: rotate(-1.1deg);
        }
        :global(.sk-device[data-kit='index'] .sk-block) {
          border: none;
          border-left: 2px solid rgba(199, 80, 80, 0.55);
          border-radius: 2px;
          background-image: repeating-linear-gradient(
            180deg,
            transparent 0 18px,
            rgba(74, 118, 196, 0.13) 18px 19px
          );
        }
        :global(.sk-device[data-kit='arch'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-radius: 22px 22px 8px 8px;
        }
        :global(.sk-device[data-kit='stamp'] .sk-block) {
          border: 5px solid color-mix(in oklab, var(--dv-bg) 90%, var(--dv-ink) 4%);
          outline: 2px dotted color-mix(in oklab, var(--dv-ink) 30%, transparent);
          outline-offset: -9px;
          border-radius: 3px;
        }
        :global(.sk-device[data-kit='deco'] .sk-block) {
          border: none;
          border-radius: 1px;
          box-shadow: inset 0 0 0 1px var(--dv-accent), inset 0 0 0 4px var(--dv-bg),
            inset 0 0 0 5px color-mix(in oklab, var(--dv-accent) 55%, transparent);
        }
        :global(.sk-device[data-kit='gallery'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-radius: 2px;
          box-shadow: inset 0 0 0 7px var(--dv-bg), inset 0 0 0 8px var(--dv-line);
        }
        :global(.sk-device[data-kit='tasting'] .sk-block) {
          border: none;
          border-top: 1px solid var(--dv-accent);
          border-bottom: 1px solid var(--dv-accent);
          border-radius: 0;
          background: transparent;
        }
        :global(.sk-device[data-kit='glass'] .sk-block) {
          background: color-mix(in oklab, var(--dv-bg) 55%, transparent);
          border: 1px solid color-mix(in oklab, #fff 35%, var(--dv-line));
          border-radius: 14px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 8px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(4px);
        }
        :global(.sk-device[data-kit='boarding'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-left: 6px solid var(--dv-accent);
          border-radius: 6px;
        }
        :global(.sk-device[data-kit='nursery'] .sk-block) {
          border: none;
          border-radius: 18px;
          background: color-mix(in oklab, var(--dv-accent) 12%, var(--dv-bg));
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
        }
        :global(.sk-device[data-kit='kraft'] .sk-block) {
          border: 1px dashed color-mix(in oklab, var(--dv-ink) 35%, transparent);
          border-radius: 3px;
          background: color-mix(in oklab, #c9a876 26%, var(--dv-bg));
        }
        :global(.sk-device[data-kit='memoriam'] .sk-block) {
          border: 1px solid var(--dv-ink);
          border-radius: 0;
        }
        :global(.sk-device[data-kit='certificate'] .sk-block) {
          border: none;
          border-radius: 2px;
          box-shadow: inset 0 0 0 2px var(--dv-accent), inset 0 0 0 5px var(--dv-bg),
            inset 0 0 0 6px color-mix(in oklab, var(--dv-accent) 40%, transparent);
        }
        :global(.sk-device[data-kit='luggage'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-radius: 10px;
          background: color-mix(in oklab, #c9a876 22%, var(--dv-bg));
        }
        :global(.sk-device[data-kit='luggage'] .sk-block::before) {
          content: '';
          position: absolute;
          top: 8px;
          left: 10px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          border: 1.5px solid var(--dv-line);
        }
        :global(.sk-device[data-kit='linenpress'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-radius: 3px;
          box-shadow: inset 0 0 0 4px var(--dv-bg), inset 0 0 0 5px var(--dv-line);
        }
        :global(.sk-device[data-kit='waxseal'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-radius: 6px;
        }
        :global(.sk-device[data-kit='waxseal'] .sk-block::before) {
          content: '';
          position: absolute;
          top: -6px;
          right: 12px;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--dv-accent);
          box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.3);
        }
        :global(.sk-device[data-kit='pennant'] .sk-block) {
          border: 1px solid var(--dv-line);
          border-radius: 6px 6px 0 0;
        }
        :global(.sk-device[data-kit='pennant'] .sk-block::after) {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -5px;
          height: 6px;
          background: radial-gradient(
              circle at 6px -3px,
              transparent 6px,
              var(--dv-line) 6px 6.5px,
              transparent 7px
            )
            0 0 / 12px 6px repeat-x;
        }
        :global(.sk-device[data-kit='embossed'] .sk-block) {
          border: none;
          border-radius: 6px;
          box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.55),
            inset -1px -1px 2px rgba(0, 0, 0, 0.12);
        }

        /* ── Paper textures (STUDIO_PAPERS · shared by swatch + surface) ── */
        :global(.sk-mat-linen) {
          background-image: repeating-linear-gradient(0deg, rgba(92, 80, 55, 0.09) 0 1px, transparent 1px 5px),
            repeating-linear-gradient(90deg, rgba(92, 80, 55, 0.09) 0 1px, transparent 1px 5px);
          background-size: 5px 5px;
        }
        :global(.sk-mat-paper) {
          background-image: radial-gradient(rgba(92, 80, 55, 0.11) 0.5px, transparent 0.7px);
          background-size: 6px 6px;
        }
        :global(.sk-mat-cotton) {
          background-image: repeating-linear-gradient(0deg, rgba(92, 80, 55, 0.06) 0 1px, transparent 1px 7px),
            repeating-linear-gradient(90deg, rgba(92, 80, 55, 0.06) 0 1px, transparent 1px 7px);
          background-size: 7px 7px;
        }
        :global(.sk-mat-watercolor) {
          background-image: radial-gradient(circle at 25% 20%, rgba(150, 120, 90, 0.11), transparent 45%),
            radial-gradient(circle at 75% 65%, rgba(110, 140, 110, 0.11), transparent 42%);
        }
        :global(.sk-mat-velvet) {
          background-image: linear-gradient(120deg, rgba(255, 255, 255, 0.06), transparent 42%),
            radial-gradient(circle at 70% 25%, rgba(0, 0, 0, 0.1), transparent 55%);
        }
        :global(.sk-mat-canvas) {
          background-image: repeating-linear-gradient(0deg, rgba(92, 80, 55, 0.1) 0 1px, transparent 1px 3px),
            repeating-linear-gradient(90deg, rgba(92, 80, 55, 0.1) 0 1px, transparent 1px 3px);
          background-size: 3px 3px;
        }
        :global(.sk-mat-kraft) {
          background-color: color-mix(in oklab, #c9a876 24%, var(--dv-bg));
          background-image: radial-gradient(rgba(92, 60, 30, 0.1) 0.5px, transparent 0.7px);
          background-size: 5px 5px;
        }
        :global(.sk-mat-vellum) {
          background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 60%);
        }
        :global(.sk-mat-letterpress) {
          box-shadow: inset 0 0 26px rgba(92, 70, 40, 0.1);
        }
        :global(.sk-mat-newsprint) {
          background-image: radial-gradient(rgba(40, 40, 40, 0.15) 0.6px, transparent 0.8px);
          background-size: 4px 4px;
        }
        :global(.sk-mat-marble) {
          background-image: linear-gradient(115deg, transparent 42%, rgba(120, 120, 120, 0.14) 43%, transparent 45%),
            linear-gradient(158deg, transparent 60%, rgba(120, 120, 120, 0.1) 61%, transparent 63%);
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
