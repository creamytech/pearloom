'use client';

// ─────────────────────────────────────────────────────────────
// KitPicker — component design-language axis, independent of
// Edition. Port of the prototype's KitPick (themes.jsx ~line 690)
// + the full 9-kit registry from shared/kits.jsx (lines 20-30).
//
// Nine kits, each restyles repeating components:
//   classic    theme-native cards & rules (default)
//   ticket     perforated stubs, dashed tear-lines, mono times
//   plate      engraved frames, double rules, Roman counter
//   scrapbook  taped, tilted cards & handwritten tags
//   index      ruled index cards, red margin & tab times
//   minimal    borderless rows, hairlines, oversized numerals
//   arch       arched-top cards, soft domes, arched divider halo
//   stamp      postage-frame cards, dotted outlines, postmark dots
//   deco       gold triple-inset frames, rotated gold diamonds
//
// Phase-4 follow-up: per-kit SECTION renderers in ThemedSiteRenderer
// (KSchedule/KDetails/KFaq/KGallery) that change BOTH style and
// arrangement. For now: kit drives CSS via [data-pl-kit] on the
// .pl8-guest root + per-kit overrides for cards / dividers /
// chips in pearloom.css.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import { lookDefaultsFor } from '@/lib/event-os/event-types';

type KitId = NonNullable<StoryManifest['kitId']>;

interface KitSpec {
  id: KitId;
  label: string;
  blurb: string;
  /** Tiny inline-SVG preview — 80×48 strip suggesting the kit. */
  Preview: () => React.ReactElement;
}

/* ── Per-kit preview thumbnails ──
   Each preview is a stripped-down card or row that suggests the
   kit's visual identity. Pure inline SVG — no assets, no fetch. */

function ClassicPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      <rect x="10" y="14" width="60" height="20" rx="3" fill="#FFFFFF" stroke="#D8CFB8" strokeWidth="0.6" />
      <rect x="14" y="18" width="22" height="2.5" fill="#5C6B3F" />
      <rect x="14" y="24" width="34" height="2" fill="#6F6557" opacity="0.6" />
    </svg>
  );
}

function TicketPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      {/* Dashed stub */}
      <rect x="8" y="14" width="64" height="20" rx="3" fill="#FFFFFF" stroke="#3A332C" strokeWidth="0.5" strokeDasharray="2 1.5" />
      <line x1="26" y1="14" x2="26" y2="34" stroke="#3A332C" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      {/* Pinhole dots top + bottom */}
      <circle cx="26" cy="14" r="1.2" fill="#FBF7EE" stroke="#3A332C" strokeWidth="0.3" />
      <circle cx="26" cy="34" r="1.2" fill="#FBF7EE" stroke="#3A332C" strokeWidth="0.3" />
      <text x="12" y="26" fontSize="6" fontFamily="ui-monospace, monospace" fontWeight="700" fill="#5C6B3F">4:30</text>
      <text x="30" y="24" fontSize="5" fontFamily="ui-sans-serif" fill="#0E0D0B">Ceremony</text>
    </svg>
  );
}

function PlatePreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      {/* Double-rule engraved frame */}
      <rect x="8" y="12" width="64" height="24" fill="none" stroke="#0E0D0B" strokeWidth="0.4" />
      <rect x="10" y="14" width="60" height="20" fill="none" stroke="#0E0D0B" strokeWidth="0.6" />
      <text x="14" y="27" fontSize="8" fontFamily="serif" fontStyle="italic" fontWeight="600" fill="#5C6B3F">II</text>
      <line x1="22" y1="25" x2="56" y2="25" stroke="#3A332C" strokeWidth="0.2" strokeDasharray="0.5 1" />
      <text x="58" y="27" fontSize="6" fontFamily="serif" fontWeight="500" fill="#0E0D0B">5:30</text>
    </svg>
  );
}

function ScrapbookPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#F5EFE2" />
      {/* Tilted polaroid */}
      <g transform="rotate(-3 40 26)">
        <rect x="14" y="12" width="52" height="28" fill="#FFFDF7" stroke="#D8CFB8" strokeWidth="0.4" />
        {/* Tape strip */}
        <rect x="33" y="9" width="14" height="4" fill="#C4A96A" opacity="0.65" />
      </g>
      <text x="22" y="28" fontSize="9" fontFamily="cursive" fontStyle="italic" fill="#5C6B3F" transform="rotate(-3 40 26)">4:30</text>
      <text x="22" y="36" fontSize="5" fontFamily="cursive" fill="#0E0D0B" transform="rotate(-3 40 26)">ceremony</text>
    </svg>
  );
}

function IndexPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      <rect x="10" y="12" width="60" height="24" fill="#FFFFFF" />
      {/* Red margin */}
      <line x1="14" y1="12" x2="14" y2="36" stroke="#C75050" strokeWidth="0.8" opacity="0.6" />
      {/* Blue rule lines */}
      <line x1="10" y1="19" x2="70" y2="19" stroke="#4A76C4" strokeWidth="0.3" opacity="0.4" />
      <line x1="10" y1="26" x2="70" y2="26" stroke="#4A76C4" strokeWidth="0.3" opacity="0.4" />
      <line x1="10" y1="33" x2="70" y2="33" stroke="#4A76C4" strokeWidth="0.3" opacity="0.4" />
      {/* Tab time */}
      <rect x="10" y="17" width="12" height="6" fill="#5C6B3F" />
      <text x="11" y="22" fontSize="4.5" fontFamily="ui-monospace, monospace" fontWeight="700" fill="#FBF7EE">4:30pm</text>
      <text x="24" y="22" fontSize="5" fontFamily="ui-sans-serif" fontWeight="600" fill="#0E0D0B">Ceremony</text>
    </svg>
  );
}

function MinimalPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      <text x="10" y="32" fontSize="20" fontFamily="serif" fontWeight="500" letterSpacing="-0.04em" fill="#0E0D0B">4:30</text>
      <text x="48" y="22" fontSize="5" fontFamily="ui-sans-serif" fontWeight="600" fill="#0E0D0B" textAnchor="start">Ceremony</text>
      <text x="48" y="28" fontSize="4" fontFamily="ui-sans-serif" fill="#6F6557" textAnchor="start">Olive grove</text>
      <line x1="10" y1="38" x2="70" y2="38" stroke="#D8CFB8" strokeWidth="0.5" />
    </svg>
  );
}

/* ── Arch preview ── (prototype lines 64, 90, 105)
   Top-arched card (24px 24px on top corners); hairline rule + a
   small arched dome at the center of the divider strip. */
function ArchPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      {/* Arched-top card: path with rounded top + softer bottom */}
      <path
        d="M 12 36 L 12 22 Q 12 12 28 12 L 52 12 Q 68 12 68 22 L 68 36 Q 68 38 66 38 L 14 38 Q 12 38 12 36 Z"
        fill="#FFFFFF"
        stroke="#D8CFB8"
        strokeWidth="0.6"
      />
      {/* Divider line with arched dome */}
      <line x1="12" y1="42" x2="34" y2="42" stroke="#D8CFB8" strokeWidth="0.5" />
      <path d="M 34 42 Q 40 36 46 42" fill="none" stroke="#5C6B3F" strokeWidth="0.6" />
      <line x1="46" y1="42" x2="68" y2="42" stroke="#D8CFB8" strokeWidth="0.5" />
      {/* Stub title */}
      <text x="16" y="22" fontSize="6" fontFamily="serif" fontWeight="600" fill="#5C6B3F">4:30</text>
      <text x="16" y="29" fontSize="4.5" fontFamily="ui-sans-serif" fill="#0E0D0B">Ceremony</text>
    </svg>
  );
}

/* ── Stamp preview ── (prototype lines 66-67, 91, 106)
   Postage-stamp framed card: 5px border + 2px dotted outline
   offset -9px, plus a dotted divider with a circular postmark. */
function StampPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      {/* Outer mat (the 5px solid frame) */}
      <rect x="10" y="10" width="60" height="28" fill="#FBF7EE" />
      {/* Inner card */}
      <rect x="13" y="13" width="54" height="22" fill="#FFFFFF" />
      {/* Dotted outline at outlineOffset:-9 ≈ inset 3 from inner */}
      <rect
        x="14.5"
        y="14.5"
        width="51"
        height="19"
        fill="none"
        stroke="#3A332C"
        strokeWidth="0.45"
        strokeDasharray="0.9 0.9"
        opacity="0.65"
      />
      {/* Postmark pin on divider */}
      <line x1="10" y1="44" x2="36" y2="44" stroke="#D8CFB8" strokeWidth="0.6" strokeDasharray="1.4 1.4" />
      <circle cx="40" cy="44" r="2" fill="none" stroke="#5C6B3F" strokeWidth="0.6" />
      <line x1="44" y1="44" x2="70" y2="44" stroke="#D8CFB8" strokeWidth="0.6" strokeDasharray="1.4 1.4" />
      <text x="18" y="22" fontSize="5" fontFamily="ui-sans-serif" fontWeight="600" fill="#0E0D0B">Ceremony</text>
      <text x="18" y="29" fontSize="4" fontFamily="ui-sans-serif" fill="#6F6557">Olive grove</text>
    </svg>
  );
}

/* ── Deco preview ── (prototype lines 69-70, 92, 107)
   Gold triple-inset frame card + 3 rotated gold diamonds at the
   divider center, with gold rule on either side. */
function DecoPreview() {
  return (
    <svg viewBox="0 0 80 48" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="80" height="48" fill="#FBF7EE" />
      {/* Triple-inset gold frame card (square corners) */}
      <rect x="12" y="10" width="56" height="22" fill="#FFFFFF" />
      <rect x="12" y="10" width="56" height="22" fill="none" stroke="#B8935A" strokeWidth="0.45" />
      <rect x="14.5" y="12.5" width="51" height="17" fill="none" stroke="#D8B475" strokeWidth="0.35" opacity="0.7" />
      {/* Gold rule + 3 rotated diamonds at center */}
      <line x1="10" y1="40" x2="32" y2="40" stroke="#B8935A" strokeWidth="0.55" />
      <g transform="translate(36 40) rotate(45)">
        <rect x="-1.2" y="-1.2" width="2.4" height="2.4" fill="none" stroke="#B8935A" strokeWidth="0.45" />
      </g>
      <g transform="translate(40 40) rotate(45)">
        <rect x="-1.2" y="-1.2" width="2.4" height="2.4" fill="none" stroke="#B8935A" strokeWidth="0.45" />
      </g>
      <g transform="translate(44 40) rotate(45)">
        <rect x="-1.2" y="-1.2" width="2.4" height="2.4" fill="none" stroke="#B8935A" strokeWidth="0.45" />
      </g>
      <line x1="48" y1="40" x2="70" y2="40" stroke="#B8935A" strokeWidth="0.55" />
      <text x="16" y="20" fontSize="4" fontFamily="ui-sans-serif" fontWeight="700" letterSpacing="0.18em" fill="#0E0D0B">CEREMONY</text>
      <text x="16" y="27" fontSize="4" fontFamily="serif" fill="#6F6557">Half past four</text>
    </svg>
  );
}

const KITS: KitSpec[] = [
  { id: 'classic',   label: 'Classic',   blurb: 'Theme-native cards & rules',  Preview: ClassicPreview },
  { id: 'ticket',    label: 'Ticket',    blurb: 'Perforated stubs · monospace', Preview: TicketPreview },
  { id: 'plate',     label: 'Plate',     blurb: 'Engraved frames · Roman',      Preview: PlatePreview },
  { id: 'scrapbook', label: 'Scrapbook', blurb: 'Taped, tilted, handwritten',   Preview: ScrapbookPreview },
  { id: 'index',     label: 'Index',     blurb: 'Ruled cards · red margin',     Preview: IndexPreview },
  { id: 'minimal',   label: 'Minimal',   blurb: 'Hairlines · big numerals',     Preview: MinimalPreview },
  { id: 'arch',      label: 'Arch',      blurb: 'Arched cards · soft domes',    Preview: ArchPreview },
  { id: 'stamp',     label: 'Stamp',     blurb: 'Postage frames · postmarks',   Preview: StampPreview },
  { id: 'deco',      label: 'Deco',      blurb: 'Gold frames · geometric',      Preview: DecoPreview },
];

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function KitPicker({ manifest, onChange }: Props) {
  /* Three-state highlight:
       - explicitPick: a kit the host explicitly chose (manifest.kitId)
       - eventDefault: the kit the renderer falls back to when no
         explicit pick exists (per lookDefaultsFor)
       - active: whichever is being rendered RIGHT NOW
     The active tile gets the dark-ink fill. The event-default tile
     gets a small "Match event" peach pill when no explicit pick
     exists so the host knows what they're actually getting. */
  const explicitPick = manifest.kitId;
  const eventDefault: KitId = lookDefaultsFor(manifest.occasion).kitId;
  const active: KitId = explicitPick ?? eventDefault;

  function pick(id: KitId) {
    if (id === active && id === explicitPick) return;
    onChange({ ...manifest, kitId: id });
  }
  /* "Reset to match event" — clears the explicit pick so the
     fallback kicks back in. Mirrors the LookEnginePanel's
     "Match event" voice option but for kit. */
  function resetToEventDefault() {
    if (!explicitPick) return;
    const next = { ...manifest } as StoryManifest;
    delete (next as { kitId?: KitId }).kitId;
    onChange(next);
  }

  return (
    <PanelSection
      label="Component kit"
      hint={
        explicitPick
          ? `How cards, dividers, schedule & badges are drawn. Independent of Edition — try any combination.`
          : `Matched to your event default (${eventDefault}). Pick any kit to override.`
      }
      defaultOpen
    >
      {explicitPick && (
        <button
          type="button"
          onClick={resetToEventDefault}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--peach-bg, rgba(198,112,61,0.10))',
            border: '1px solid rgba(198,112,61,0.28)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--peach-ink, #C6703D)',
            cursor: 'pointer',
            marginBottom: 10,
          }}
          title={`Drop the explicit kit pick so this event's default (${eventDefault}) applies again.`}
        >
          <span aria-hidden>↺</span>
          Match event ({eventDefault})
        </button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {KITS.map((k) => {
          const on = active === k.id;
          const isEventDefault = k.id === eventDefault && !explicitPick;
          const Preview = k.Preview;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => pick(k.id)}
              aria-pressed={on}
              title={k.blurb}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 7,
                borderRadius: 10,
                background: on ? 'var(--ink, #0E0D0B)' : 'var(--card, #FBF7EE)',
                border: on
                  ? '2px solid var(--ink, #0E0D0B)'
                  : '1px solid var(--line, rgba(14,13,11,0.14))',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-ui)',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '10 / 6',
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                  background: 'var(--cream-2, #EBE3D2)',
                  position: 'relative',
                }}
              >
                <Preview />
                {isEventDefault && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'var(--peach-bg, rgba(198,112,61,0.18))',
                      color: 'var(--peach-ink, #C6703D)',
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                    }}
                    title="This event's default kit — applied automatically until you pick another."
                  >
                    ★ Match
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: on ? 'var(--cream, #F5EFE2)' : 'var(--ink, #0E0D0B)',
                  }}
                >
                  {k.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: on ? 'rgba(248,241,228,0.72)' : 'var(--ink-muted, #6F6557)',
                    lineHeight: 1.35,
                  }}
                >
                  {k.blurb}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
