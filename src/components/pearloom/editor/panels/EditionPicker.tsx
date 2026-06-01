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

/* Coastal Ink preview — deckled cream paper, navy hairline rule,
   sea-glass tint accent. */
function PreviewCoastal() {
  return (
    <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="100" fill="#EAE5D7" />
      <rect x="10" y="10" width="220" height="80" fill="#F4F0E4" stroke="#1F3A4D" strokeWidth="0.4" strokeDasharray="2 1.5" />
      <line x1="100" y1="32" x2="140" y2="32" stroke="#2C5E7A" strokeWidth="0.4" />
      <text x="120" y="58" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="600" fill="#1F3A4D">Anna · Liam</text>
      <line x1="100" y1="72" x2="140" y2="72" stroke="#2C5E7A" strokeWidth="0.4" />
    </svg>
  );
}

const PREVIEWS: Record<EditionId, () => React.ReactElement> = {
  almanac: PreviewAlmanac,
  cinema: PreviewCinema,
  'postcard-box': PreviewPostcard,
  'linen-folder': PreviewLinen,
  quiet: PreviewQuiet,
  coastal: PreviewCoastal,
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
    // Picking an Edition stamps EVERY layout dimension at once so
    // the whole site reshapes — hero variant, story layout, per-
    // section card style (radius/shadow/border/padding/shape/
    // spacing/align), block order, and atmosphere preset. Each
    // Edition is a cohesive artifact; switching to one means
    // adopting the bundle.
    //
    // Hosts can still tweak any single field after — switching
    // Editions later reapplies the bundle.
    const existingBlockVariants = (manifest as unknown as {
      blockVariants?: Record<string, { style?: string }>;
    }).blockVariants ?? {};
    const existingBlockStyles = (manifest as unknown as {
      blockStyles?: Record<string, Record<string, unknown>>;
    }).blockStyles ?? {};
    const existingAtmosphere = (manifest as unknown as {
      atmosphere?: { kind?: string; intensity?: string; accent?: string };
    }).atmosphere ?? {};

    // Merge per-section blockStyles: Edition's prescriptions
    // overlay onto whatever the host already has for that
    // section. Sections the Edition doesn't mention stay
    // untouched.
    const mergedBlockStyles = { ...existingBlockStyles };
    for (const [sectionKey, edStyle] of Object.entries(ed.blockStyles ?? {})) {
      mergedBlockStyles[sectionKey] = {
        ...(mergedBlockStyles[sectionKey] ?? {}),
        ...edStyle,
      };
    }

    /* Theme stamp — palette + fonts + card radius. This is what
       makes picking an Edition VISUALLY transform the site (paper
       goes dark for Cinema, italic Cormorant for Linen Folder,
       pillow radii for Postcard Box). Without this stamp, Editions
       only changed layout chrome on the host's existing palette,
       which is exactly the "Editions don't actually change the
       site" complaint that motivated this whole arc.

       Merge strategy: Edition's recommendedTheme.colors REPLACES
       the existing theme.colors entirely (an Edition is a
       cohesive palette — partial overlays would produce
       Frankenstein looks like Cinema's dark paper with Almanac's
       olive ink). Same for fonts. Existing per-key overrides the
       host set after picking the Edition still win — they get
       re-stamped only on the NEXT Edition pick.

       Hosts who pick a palette in the Palette grid after picking
       an Edition see their palette pick win because applyPalette
       in ThemePanel.tsx writes theme.colors directly. Picking a
       different Edition later re-stamps the new Edition's theme. */
    const existingTheme = (manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {};
    const nextTheme: Record<string, unknown> = { ...existingTheme };
    if (ed.recommendedTheme?.colors) nextTheme.colors = { ...ed.recommendedTheme.colors };
    if (ed.recommendedTheme?.fonts) nextTheme.fonts = { ...ed.recommendedTheme.fonts };
    if (ed.recommendedTheme?.cardRadius) nextTheme.cardRadius = ed.recommendedTheme.cardRadius;

    const next = {
      ...manifest,
      edition: ed.id,
      // Hero variant
      blockVariants: {
        ...existingBlockVariants,
        hero: { style: ed.heroVariantId },
      },
      // Story layout (legacy field the renderer reads via resolveStoryLayout)
      storyLayout: ed.storyLayoutId,
      // Per-section card + spacing + text-align overrides
      blockStyles: mergedBlockStyles,
      // Atmosphere preset
      atmosphere: {
        ...existingAtmosphere,
        kind: ed.atmospherePreset.kind ?? existingAtmosphere.kind,
        intensity: ed.atmospherePreset.intensity,
      },
      // Section ordering — Edition picks the rhythm
      blockOrder: ed.blockOrder,
      // FULL theme stamp — palette + fonts + card radius
      theme: nextTheme,
    };
    onChange(next as unknown as StoryManifest);
  }

  /* Prototype display order — visual rhythm of the picker per the
     theme-pack screenshot:
       Row 1: Santorini Linen, Pressed Garden
       Row 2: Tuscan Watercolor, Midnight Velvet
       Row 3: Coastal Ink, Modern Editorial
     EDITIONS array order in editions.ts is logical (almanac first
     by convention) — we reorder here for the picker without
     touching the canonical list. */
  const PROTOTYPE_ORDER: Array<typeof EDITIONS[number]['id']> = [
    'linen-folder',   // Santorini Linen
    'almanac',        // Pressed Garden
    'postcard-box',   // Tuscan Watercolor
    'cinema',         // Midnight Velvet
    'coastal',        // Coastal Ink
    'quiet',          // Modern Editorial
  ];
  const sortedEditions = [...EDITIONS].sort(
    (a, b) => PROTOTYPE_ORDER.indexOf(a.id) - PROTOTYPE_ORDER.indexOf(b.id),
  );
  /* "RECOMMENDED FOR …" eyebrow — matches the prototype's section
     header. Uses the active occasion's display label. */
  const occasionLabel = (manifest.occasion ?? 'wedding').replace(/-/g, ' ');

  return (
    <PanelSection
      label={`Recommended for ${occasionLabel}`}
      hint="One pick sets the whole theme — palette, fonts, radii, atmosphere."
      defaultOpen
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {sortedEditions.map((ed) => {
          const on = active.id === ed.id;
          const Preview = PREVIEWS[ed.id];
          /* PICK badge — appears on every Edition that's recommended
             for the current occasion. Matches the prototype where
             3 tiles get the badge for weddings (Santorini Linen,
             Pressed Garden, Tuscan Watercolor) and 1 for memorials
             (Modern Editorial), etc. Multi-recommended is correct:
             several Editions can suit one occasion. */
          const isRecommended = ed.recommendedFor.includes(
            manifest.occasion ?? 'wedding',
          );
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
              {/* Prototype theme-pack card preview — "Aa" letterform
                  in the Edition's display font + italic "and"
                  beneath. Reads as a tiny type sample, not a layout
                  diagram (more like Apple/Adobe font picker). */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '12 / 7',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                  background: ed.recommendedTheme?.colors?.background ?? 'var(--cream-2, #FBF7EE)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: ed.recommendedTheme?.fonts?.heading ? `"${ed.recommendedTheme.fonts.heading}", Georgia, serif` : 'var(--font-display, Fraunces, serif)',
                    fontSize: 26,
                    fontWeight: ed.recommendedTheme?.displayWeight ?? 600,
                    color: ed.recommendedTheme?.colors?.foreground ?? 'var(--ink)',
                    lineHeight: 1,
                  }}
                >
                  Aa
                </span>
                <span
                  style={{
                    fontFamily: ed.recommendedTheme?.fonts?.heading ? `"${ed.recommendedTheme.fonts.heading}", Georgia, serif` : 'var(--font-display, Fraunces, serif)',
                    fontStyle: 'italic',
                    fontSize: 11,
                    fontWeight: 400,
                    color: ed.recommendedTheme?.colors?.accent ?? 'var(--peach-ink)',
                    marginTop: 2,
                    opacity: 0.7,
                  }}
                >
                  and
                </span>
                {/* PICK badge — recommended state */}
                {isRecommended && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.85)',
                      color: 'var(--ink, #0E0D0B)',
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ★ PICK
                  </span>
                )}
              </div>
              {/* Hidden Preview kept available for backward compat —
                  hosts who liked the layout diagram can re-enable it
                  in the panel via a toggle (future work). */}
              <div style={{ display: 'none' }}>
                <Preview />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: on ? 'var(--sage-deep, #3D4A1F)' : 'var(--ink)',
                  }}
                >
                  {ed.label}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: 'var(--ink-muted, #6F6557)',
                    lineHeight: 1.4,
                  }}
                >
                  {ed.tagline}
                </span>
                {/* 4-swatch palette dots — prototype's signature */}
                {ed.recommendedTheme?.colors && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    {[
                      ed.recommendedTheme.colors.accent,
                      ed.recommendedTheme.colors.foreground,
                      (ed.recommendedTheme as { cardShadow?: string }).cardShadow?.includes('gold')
                        ? '#B8935A'
                        : ed.recommendedTheme.colors.accentLight,
                      ed.recommendedTheme.colors.background,
                    ]
                      .filter((c): c is string => Boolean(c))
                      .map((c, i) => (
                        <span
                          key={i}
                          aria-hidden
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                          }}
                        />
                      ))}
                  </div>
                )}
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
