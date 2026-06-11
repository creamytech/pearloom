'use client';

/* ─────────────────────────────────────────────────────────────
   WizardLookPreviews — "How it could look", on the Review step.

   Three LIVE miniature sites (the ThreePressings pattern: a real
   ThemedSite render scaled into a small window) built from the
   host's own answers — names, date, venue, occasion — each wearing
   a candidate look. The manifests come from the SAME bridge
   generation uses (applyWizardLook + themeVarsFromPalette), so
   what the host taps here is exactly what the weave will wear.

   Candidates: the host's current palette pick first, then Pear's
   smart palettes, then preset palettes as filler. Tapping a tile
   writes the pick back through the wizard's normal palette state
   (the parent passes the same setter the palette step uses).

   Render cost: three ThemedSite mounts. Deferred one frame behind
   a paper placeholder so the Review step paints instantly; the
   minis are aria-hidden + pointer-events:none (the button is the
   interactive surface).
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { applyWizardLook } from '@/lib/site-look/wizard-look';

export interface LookCandidate {
  id: string;
  label: string;
  colors: string[];
  /** Smart-palette picks carry a paired ornament. */
  motifKind?: string;
  motifLayout?: string;
  /** True when this came from Pear's smart palettes (the pick
   *  keeps the ornament); presets clear it — mirrors the palette
   *  step's two click handlers exactly. */
  smart: boolean;
}

const SITE_W = 1100;           // ThemedSite desktop layout width
const WINDOW_H = 172;          // hero crop height per tile

function buildPreviewManifest(
  c: LookCandidate,
  opts: { occasion?: string; eventDate?: string; venue?: string; layoutFormat?: string },
): StoryManifest {
  const base = {
    occasion: opts.occasion,
    logistics: { date: opts.eventDate, venue: opts.venue },
  } as unknown as StoryManifest;
  return applyWizardLook(base, {
    selectedPaletteColors: c.colors,
    occasion: opts.occasion,
    layoutFormat: opts.layoutFormat,
    motifKind: c.motifKind,
    motifLayout: c.motifLayout,
  });
}

export function WizardLookPreviews({
  names,
  occasion,
  eventDate,
  venue,
  layoutFormat,
  candidates,
  selectedId,
  onPick,
}: {
  names: [string, string];
  occasion?: string;
  eventDate?: string;
  venue?: string;
  layoutFormat?: string;
  candidates: LookCandidate[];
  selectedId: string;
  onPick: (c: LookCandidate) => void;
}) {
  /* One-frame deferral — the Review step paints its summary rows
     immediately; the three full-site renders land right after. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const manifests = useMemo(
    () => candidates.map((c) => buildPreviewManifest(c, { occasion, eventDate, venue, layoutFormat })),
    [candidates, occasion, eventDate, venue, layoutFormat],
  );

  if (candidates.length === 0) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--ink-muted)',
          marginBottom: 4,
        }}
      >
        How it could look
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
        Three pressings from your answers — tap the one that feels right. You can re-dye everything in the editor.
      </div>
      <div className="wlp-grid">
        {candidates.map((c, i) => {
          const on = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(c)}
              style={{
                padding: 0,
                borderRadius: 14,
                overflow: 'hidden',
                border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                background: 'var(--card)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'inherit',
                boxShadow: on ? 'var(--shadow)' : 'none',
                transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: WINDOW_H,
                  overflow: 'hidden',
                  background: c.colors[0] ?? 'var(--cream-2)',
                }}
              >
                {ready ? (
                  /* containerSize wrapper — scale a full desktop
                     render into the tile. cqw units inside the site
                     resolve against this 1100px inner box. */
                  <MiniSite manifest={manifests[i]} names={names} />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'grid', placeItems: 'center',
                      fontSize: 11, color: 'var(--ink-muted)',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}
                  >
                    Pressing…
                  </div>
                )}
                {/* hover/selected scrim keeps the tap target obvious
                    without dimming the artwork */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute', inset: 0,
                    boxShadow: on ? 'inset 0 0 0 1px var(--card)' : 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <span
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px',
                  borderTop: '1px solid var(--line-soft)',
                  fontSize: 12, fontWeight: 600,
                  color: on ? 'var(--ink)' : 'var(--ink-soft)',
                }}
              >
                <span aria-hidden style={{ display: 'inline-flex', gap: 3 }}>
                  {c.colors.slice(0, 4).map((hex, j) => (
                    <span key={j} style={{ width: 10, height: 10, borderRadius: 999, background: hex, border: '1px solid var(--line-soft)' }} />
                  ))}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                {on && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--sage-deep)', flexShrink: 0 }}>✓ Yours</span>}
              </span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .wlp-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 720px) {
          .wlp-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/* One miniature — the real renderer at desktop width, scaled to
   fill the tile (ThreePressings' Mini pattern, hero-cropped). */
function MiniSite({ manifest, names }: { manifest: StoryManifest; names: [string, string] }) {
  const [tileW, setTileW] = useState(0);
  const scale = tileW > 0 ? tileW / SITE_W : 0;
  return (
    <div
      aria-hidden
      ref={(el) => {
        if (el && el.clientWidth && el.clientWidth !== tileW) setTileW(el.clientWidth);
      }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {scale > 0 && (
        <div
          style={{
            width: SITE_W,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            containerType: 'inline-size',
            containerName: 'pl-site',
          }}
        >
          <ThemedSite manifest={manifest} names={names} />
        </div>
      )}
    </div>
  );
}
