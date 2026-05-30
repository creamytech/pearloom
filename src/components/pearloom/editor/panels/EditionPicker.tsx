'use client';

// ─────────────────────────────────────────────────────────────
// EditionPicker — the host-facing UX for the layout overhaul.
//
// Sits at the TOP of the Theme panel as the highest-altitude
// design decision. Five tiles in a 2-column grid. Clicking a
// tile writes manifest.edition; the renderer reads that field
// at read-time and adjusts hero variant + atmosphere defaults
// per the active Edition.
//
// Explicit per-block overrides win over Edition defaults, so
// switching Editions on an already-customized site never blows
// away the host's deliberate picks.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import { EDITIONS } from '@/lib/site-editions/editions';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';
import type { SiteOccasion } from '@/lib/site-urls';
import type { EditionDefinition, EditionId } from '@/lib/site-editions/types';

// ── Tile previews ────────────────────────────────────────────
// Each preview is a 240×100 SVG miniature suggesting the Edition's
// composition. Reads at a glance even at thumbnail size. Inline
// SVG keeps the component dependency-free.

function PreviewAlmanac() {
  return (
    <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="100" fill="#F5EFE2" />
      <text x="22" y="40" fontFamily="serif" fontSize="32" fontStyle="italic" fill="#0E0D0B">A</text>
      <line x1="58" y1="20" x2="218" y2="20" stroke="#B89244" strokeWidth="0.5" />
      <line x1="58" y1="34" x2="180" y2="34" stroke="#6F6557" strokeWidth="0.4" />
      <line x1="58" y1="42" x2="200" y2="42" stroke="#6F6557" strokeWidth="0.4" />
      <line x1="58" y1="50" x2="160" y2="50" stroke="#6F6557" strokeWidth="0.4" />
      <line x1="22" y1="68" x2="218" y2="68" stroke="#D8CFB8" strokeWidth="0.5" />
      <text x="22" y="86" fontFamily="serif" fontSize="9" fontStyle="italic" fill="#6F6557">II — The morning</text>
    </svg>
  );
}

function PreviewCinema() {
  return (
    <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="100" fill="#0E0D0B" />
      <rect x="0" y="14" width="240" height="72" fill="#3A332C" />
      <text x="120" y="56" textAnchor="middle" fontFamily="serif" fontSize="20" fontStyle="italic" fill="#FBF7EE">Anna · Liam</text>
      <text x="120" y="72" textAnchor="middle" fontFamily="sans-serif" fontSize="6" letterSpacing="2" fill="#FBF7EE" opacity="0.7">SCENE 02 · NEW YORK</text>
      <rect x="6" y="6" width="6" height="6" fill="#B89244" opacity="0.5" />
      <rect x="228" y="88" width="6" height="6" fill="#B89244" opacity="0.5" />
    </svg>
  );
}

function PreviewPostcard() {
  return (
    <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="100" fill="#EBE3D2" />
      <g transform="rotate(-4 60 50)">
        <rect x="14" y="20" width="80" height="60" fill="#FBF7EE" stroke="#B89244" strokeOpacity="0.3" />
        <rect x="22" y="28" width="64" height="36" fill="#C49A6F" opacity="0.6" />
      </g>
      <g transform="rotate(3 170 50)">
        <rect x="120" y="18" width="100" height="64" fill="#FBF7EE" stroke="#B89244" strokeOpacity="0.3" />
        <text x="170" y="50" textAnchor="middle" fontFamily="cursive" fontSize="14" fill="#6F6557">Day Two</text>
        <circle cx="208" cy="32" r="6" fill="#C6703D" opacity="0.7" />
      </g>
    </svg>
  );
}

function PreviewLinen() {
  return (
    <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="100" fill="#FBF7EE" />
      <rect x="20" y="20" width="76" height="60" fill="#D4A95D" opacity="0.4" />
      <line x1="110" y1="32" x2="220" y2="32" stroke="#B89244" strokeWidth="0.6" />
      <text x="165" y="48" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#0E0D0B">Anna · Liam</text>
      <text x="165" y="60" textAnchor="middle" fontFamily="sans-serif" fontSize="6" letterSpacing="2" fill="#6F6557">SEPT 12</text>
      <line x1="110" y1="68" x2="220" y2="68" stroke="#B89244" strokeWidth="0.6" />
      <circle cx="100" cy="92" r="1.5" fill="#B89244" />
      <text x="106" y="94" fontFamily="sans-serif" fontSize="5" letterSpacing="1.5" fill="#6F6557">PROGRAMME</text>
    </svg>
  );
}

function PreviewQuiet() {
  return (
    <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="100" fill="#FBF7EE" />
      <line x1="100" y1="32" x2="140" y2="32" stroke="#6F6557" strokeWidth="0.3" />
      <text x="120" y="58" textAnchor="middle" fontFamily="serif" fontSize="16" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
      <line x1="100" y1="72" x2="140" y2="72" stroke="#6F6557" strokeWidth="0.3" />
    </svg>
  );
}

const PREVIEWS: Record<EditionId, () => React.ReactElement> = {
  almanac: PreviewAlmanac,
  cinema: PreviewCinema,
  'postcard-box': PreviewPostcard,
  'linen-folder': PreviewLinen,
  quiet: PreviewQuiet,
};

// ── Component ────────────────────────────────────────────────

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function EditionPicker({ manifest, onChange }: Props) {
  // Resolve current Edition for active-tile highlight. If host
  // hasn't picked explicitly, the recommended fallback gets the
  // highlight — same visual outcome as the renderer will produce.
  const occasion = (manifest as unknown as { occasion?: string }).occasion as
    | SiteOccasion
    | undefined;
  const voice = occasion ? getEventType(occasion)?.voice : undefined;
  const active = useMemo(
    () => resolveEdition({ edition: manifest.edition, occasion, voice }),
    [manifest.edition, occasion, voice],
  );

  function pick(ed: EditionDefinition) {
    if (ed.id === manifest.edition) return;
    // Picking an Edition must produce a visible change. The
    // renderer's "explicit > Edition default" precedence means
    // existing sites (which have manifest.blockVariants.hero
    // and manifest.atmosphere set by the wizard or template
    // applier) wouldn't budge on edition swap. Stamp the
    // Edition's hero variant + atmosphere preset directly so
    // the canvas reflects the pick immediately.
    //
    // Hosts who explicitly customized either after picking an
    // Edition can repeat that customization — switching
    // Editions is the act of saying "give me the bundled set
    // again". We don't preserve old hero/atmosphere because
    // they were almost certainly the previous Edition's defaults
    // (Pear's pick, not a deliberate host override).
    const next = {
      ...manifest,
      edition: ed.id,
      blockVariants: {
        ...((manifest as unknown as { blockVariants?: Record<string, { style?: string }> }).blockVariants ?? {}),
        hero: { style: ed.heroVariantId },
      },
      atmosphere: {
        ...((manifest as unknown as { atmosphere?: { kind?: string; intensity?: string; accent?: string } }).atmosphere ?? {}),
        kind: ed.atmospherePreset.kind ?? (manifest as unknown as { atmosphere?: { kind?: string } }).atmosphere?.kind,
        intensity: ed.atmospherePreset.intensity,
      },
    };
    onChange(next as StoryManifest);
  }

  return (
    <PanelSection
      label="Edition"
      hint="One pick sets the whole layout — hero, dividers, type, atmosphere. Override anything below."
      defaultOpen
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {EDITIONS.map((ed) => {
          const on = active.id === ed.id;
          const Preview = PREVIEWS[ed.id];
          const isRecommended = !manifest.edition && on;
          return (
            <button
              key={ed.id}
              type="button"
              onClick={() => pick(ed)}
              aria-pressed={on}
              title={ed.description}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 8,
                borderRadius: 12,
                background: on ? 'var(--sage-tint, #E3E6C8)' : 'var(--card, #FBF7EE)',
                border: on
                  ? '1.5px solid var(--sage-deep, #6d7d3f)'
                  : '1px solid var(--line, rgba(14,13,11,0.14))',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-ui)',
                transition: 'background 160ms ease, border-color 160ms ease, transform 160ms ease',
              }}
              onMouseEnter={(e) => {
                if (on) return;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '12 / 5',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                  background: 'var(--cream-2, #FBF7EE)',
                }}
              >
                <Preview />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: on ? 'var(--sage-deep, #3D4A1F)' : 'var(--ink)',
                    }}
                  >
                    {ed.label}
                  </span>
                  {isRecommended && (
                    <span
                      style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink, #C6703D)',
                      }}
                    >
                      ★ Recommended
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-muted, #6F6557)',
                    lineHeight: 1.4,
                  }}
                >
                  {ed.tagline}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p
        style={{
          margin: '12px 0 0',
          fontSize: 11,
          color: 'var(--ink-muted, #6F6557)',
          lineHeight: 1.5,
        }}
      >
        Editions set defaults only — any block style or palette you&apos;ve picked stays put when
        you switch.
      </p>
    </PanelSection>
  );
}
