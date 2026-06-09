'use client';

// ──────────────────────────────────────────────────────────────
// Shared sub-components used by hero variants. Keeps each variant
// component focused on its layout while inline editing + the AI
// rewrite affordances stay consistent across all 5.
// ──────────────────────────────────────────────────────────────

import { forwardRef, useEffect, useRef, useState } from 'react';
import { EditableText } from '@/components/pearloom/editor/canvas/EditableText';
import { HoverToolbar } from '@/components/pearloom/editor/canvas/HoverToolbar';
import { HeroFieldPopover } from '@/components/pearloom/editor/canvas/HeroFieldPopover';
import { Icon } from '@/components/pearloom/motifs';
import { CalendarAddButton, SaveContactButton } from '@/components/pearloom/site/GuestKit';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';
import type { SiteOccasion } from '@/lib/site-urls';
import type { EditionId } from '@/lib/site-editions/types';
import type { HeroVariantProps } from './types';
import type { StoryManifest } from '@/types';

// ──────────────────────────────────────────────────────────────
// Edition-driven photo fallback gradient.
//
// When a hero variant has NO cover photo, we render a coherent
// Edition-themed gradient instead of the flat tonal placeholder.
// Editions carry rich palette identity (warm cream→peach→olive for
// Almanac, midnight→ink→gold for Cinema, etc.) — wasting that on a
// generic placeholder is a missed opportunity.
//
// `heroFallbackGradient(manifest)` reads manifest.edition AND falls
// through resolveEdition()'s recommendation chain (occasion → voice
// → DEFAULT_EDITION_ID) so wizard-generated sites without explicit
// edition still get a palette-coherent gradient.
//
// Returns:
//   background — a 3-stop linear-gradient CSS string ready to drop
//                into a style attr's `background` field
//   className  — 'pl-hero-grad-drift' for the subtle hue-rotate
//                drift; honours prefers-reduced-motion via the
//                keyframe rule in pearloom.css
//   editionId  — the resolved id so consumers can tag data attrs
//                if they need per-Edition CSS tweaks downstream
// ──────────────────────────────────────────────────────────────
type HeroFallbackGradient = {
  background: string;
  className: string;
  editionId: EditionId;
};

/* Per-Edition 3-stop gradient recipes. Each pulls colors that match
   the Edition's recommendedTheme so the fallback feels like the same
   editorial object the rest of the site is wearing. Angles vary so no
   two Editions read identically when a host clicks through them with
   no photo set. */
const EDITION_GRADIENTS: Record<EditionId, string> = {
  // Almanac → warm cream → peach → olive sage. Mirrors the pressed
  // garden palette (cream paper, lavender wash, sage primary) with
  // a peach midpoint that lifts the page when no photo grounds it.
  almanac:
    'linear-gradient(135deg, #F5EFE2 0%, #F4D9C2 48%, #8B9C5A 100%)',
  // Cinema → midnight velvet → ink → candlelight gold. Reads as a
  // half-lit theatre curtain when the host hasn't supplied a photo.
  cinema:
    'linear-gradient(145deg, #1A1B2E 0%, #0E0D0B 55%, #C9A24B 100%)',
  // Postcard Box → tuscan cream → soft peach → watercolor sage.
  // Lifts off the cream-deep gauze the polaroid stack normally sits on.
  'postcard-box':
    'linear-gradient(125deg, #FBF6EC 0%, #F4E3D3 50%, #C2693E 100%)',
  // Linen Folder → sun-bleached linen → gold hairline → deep navy.
  // Hotel-stationery formality — sweep ends in the Aegean ink.
  'linen-folder':
    'linear-gradient(155deg, #F5F1E8 0%, #D9C089 48%, #283D4E 100%)',
  // Quiet → flat matte cream → soft warm grey → near-black ink.
  // No saturation; reads as a sheet of editorial paper folded under
  // a single shadow band. Honors the "design steps back" promise.
  quiet:
    'linear-gradient(180deg, #F4F3EF 0%, #D6D3CB 55%, #0E0D0B 100%)',
  // Coastal → deckled cream → sea-glass sky → warm sand. Replaces
  // the harbor-light photo with the sky/sand band itself.
  coastal:
    'linear-gradient(130deg, #EAE5D7 0%, #B6CFDC 50%, #C9A877 100%)',
};

export function heroFallbackGradient(manifest: StoryManifest): HeroFallbackGradient {
  const occasion = (manifest as unknown as { occasion?: string }).occasion as
    | SiteOccasion
    | undefined;
  const voice = occasion ? getEventType(occasion)?.voice : undefined;
  // resolveEdition() handles BOTH the explicit edition AND the
  // recommendation chain (occasion match → voice match →
  // DEFAULT_EDITION_ID). Wizard-generated sites without explicit
  // manifest.edition still get a coherent gradient.
  const edition = resolveEdition({
    edition: manifest.edition,
    occasion,
    voice,
  });
  const background =
    EDITION_GRADIENTS[edition.id] ?? EDITION_GRADIENTS.almanac;
  return {
    background,
    className: 'pl-hero-grad-drift',
    editionId: edition.id,
  };
}

export function HeroKicker({ manifest, dateInfo, onEditField }: {
  manifest: StoryManifest;
  dateInfo: { weekday: string } | null;
  onEditField?: HeroVariantProps['onEditField'];
}) {
  const value = (manifest as unknown as { heroKicker?: string }).heroKicker
    ?? (dateInfo ? `together, ${dateInfo.weekday.toLowerCase()}` : 'save the date');
  return (
    <div
      className="pl8-hero-kicker-anim"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginBottom: 22, color: 'var(--ink-soft)',
      }}
    >
      <span aria-hidden style={{ width: 48, height: 1, background: 'currentColor', opacity: 0.45 }} />
      <EditableText
        as="span"
        value={value}
        onSave={(next) =>
          onEditField?.((m) => ({
            ...(m as unknown as Record<string, unknown>),
            heroKicker: next,
          }) as unknown as StoryManifest)
        }
        placeholder="save the date"
        ariaLabel="Hero kicker"
        maxLength={60}
        style={{
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: 'italic', fontSize: 18, fontWeight: 400,
          letterSpacing: '0.01em', color: 'var(--ink)', lineHeight: 1.1,
          textAlign: 'center',
        }}
      />
      <span aria-hidden style={{ width: 48, height: 1, background: 'currentColor', opacity: 0.45 }} />
    </div>
  );
}

export function HeroNames({ n1, n2, solo = false, onEditNames, scale = 1, color, italicColor, letterpress = true }: {
  n1: string; n2: string;
  /** Solo-honoree site — render the single name only. Suppresses
   *  the 'and Partner' slot even in edit mode so a memorial canvas
   *  never invites a second name. */
  solo?: boolean;
  onEditNames?: (next: [string, string]) => void;
  scale?: number;
  color?: string;
  italicColor?: string;
  /** Apply BRAND.md §3's pl-letterpress treatment — glyphs pressed
   *  into the paper. Defaults true; pass false on dark/photo-bleed
   *  heroes where the inset shadow would muddy the type. */
  letterpress?: boolean;
}) {
  // cqw (container query width) reads the device-frame width in
  // the editor preview AND the viewport on the published site, so
  // names size correctly on both. Falls back to vw automatically
  // when no query container is in the ancestor chain.
  const main = `clamp(${Math.round(56 * scale)}px, ${14 * scale}cqw, ${Math.round(168 * scale)}px)`;
  const italic = `clamp(${Math.round(44 * scale)}px, ${10 * scale}cqw, ${Math.round(132 * scale)}px)`;
  return (
    <h1
      className={`display pl8-hero-names${letterpress ? ' pl-letterpress' : ''}`}
      style={{
        fontSize: main, lineHeight: 0.92, margin: 0,
        letterSpacing: '-0.02em', color,
      }}
    >
      <EditableText
        as="span"
        value={n1 || ''}
        onSave={(next) => onEditNames?.([next, n2])}
        placeholder="Your"
        ariaLabel="First host name"
        maxLength={80}
      />
      {!solo && (n2 || onEditNames) ? (
        <>
          {' '}
          <span
            className="display-italic"
            style={{ fontSize: italic, fontWeight: 400, color: italicColor ?? 'var(--ink-soft)' }}
          >
            and
          </span>{' '}
          <EditableText
            as="span"
            value={n2 || ''}
            onSave={(next) => onEditNames?.([n1, next])}
            placeholder="Partner"
            ariaLabel="Second host name"
            maxLength={80}
          />
        </>
      ) : null}
    </h1>
  );
}

export function HeroDateVenue({ dateInfo, venue, color, manifest, onEditField }: {
  dateInfo: { pretty: string; weekday: string } | null;
  venue: string;
  color?: string;
  /** Manifest + patcher are passed through in edit mode so each
   *  pill becomes a clickable popover trigger. When unset, the
   *  pills render as plain spans (published-site path). */
  manifest?: StoryManifest;
  onEditField?: HeroVariantProps['onEditField'];
}) {
  const editMode = !!onEditField;
  const [openField, setOpenField] = useState<'date' | 'venue' | null>(null);
  const dateRef = useRef<HTMLButtonElement | null>(null);
  const venueRef = useRef<HTMLButtonElement | null>(null);
  // Anchor for the popover lives in state so render doesn't read
  // .current (react-hooks/refs). Sync on openField transitions.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (openField === 'date') setAnchor(dateRef.current);
    else if (openField === 'venue') setAnchor(venueRef.current);
    else setAnchor(null);
  }, [openField]);
  const placeholderDate = !dateInfo && editMode;
  const placeholderVenue = !venue && editMode;

  if (!dateInfo && !venue && !editMode) return null;

  const dateLabel = dateInfo
    ? `${dateInfo.weekday}, ${dateInfo.pretty}`
    : 'Add a date';
  const venueLabel = venue || 'Add a venue';

  return (
    <>
      <div
        style={{
          textAlign: 'center', marginTop: 28,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 18, flexWrap: 'wrap', color: color ?? 'var(--ink)',
        }}
      >
        {(dateInfo || editMode) && (
          editMode ? (
            <HeroFieldPill
              ref={dateRef}
              icon="calendar"
              label={dateLabel}
              placeholder={placeholderDate}
              onClick={() => setOpenField((f) => (f === 'date' ? null : 'date'))}
              ariaLabel="Edit date and time"
              color={color}
            />
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              {/* Icon tint follows theme accent (--pl-olive) so the
                  date pill matches the host's palette instead of
                  always rendering in brand gold. */}
              <Icon name="calendar" size={16} color="var(--pl-olive, var(--gold))" />
              <span style={{ fontWeight: 600 }}>{dateLabel}</span>
            </div>
          )
        )}
        {(dateInfo || (editMode && !placeholderDate)) && (venue || (editMode && !placeholderVenue)) && (
          <span aria-hidden style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.45 }} />
        )}
        {(venue || editMode) && (
          editMode ? (
            <HeroFieldPill
              ref={venueRef}
              icon="pin"
              label={venueLabel}
              placeholder={placeholderVenue}
              onClick={() => setOpenField((f) => (f === 'venue' ? null : 'venue'))}
              ariaLabel="Edit venue"
              color={color}
            />
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Icon name="pin" size={16} color="var(--pl-olive, var(--gold))" />
              <span style={{ fontWeight: 600 }}>{venueLabel}</span>
            </div>
          )
        )}
      </div>
      {editMode && manifest && onEditField && openField && (
        <HeroFieldPopover
          anchor={anchor}
          field={openField}
          manifest={manifest}
          onEditField={onEditField}
          onClose={() => setOpenField(null)}
        />
      )}
    </>
  );
}

// forwardRef keeps the trigger element exposed to the popover for
// anchor positioning (getBoundingClientRect on the pill). Hover
// reveals a dashed peach ring + soft cream wash so hosts know it's
// editable; placeholder copy ("Add a date") shows when empty.
const HeroFieldPill = forwardRef<HTMLButtonElement, {
  icon: 'calendar' | 'pin';
  label: string;
  placeholder?: boolean;
  onClick: () => void;
  ariaLabel: string;
  color?: string;
}>(function HeroFieldPill({ icon, label, placeholder, onClick, ariaLabel, color }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={ariaLabel}
      className="pl8-hero-field-pill"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: 15, fontWeight: 600,
        color: color ?? 'inherit',
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px dashed transparent',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background-color var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
        opacity: placeholder ? 0.78 : 1,
        fontStyle: placeholder ? 'italic' : 'normal',
      }}
    >
      <Icon name={icon} size={16} color="var(--pl-olive, var(--gold))" />
      <span>{label}</span>
    </button>
  );
});

export function HeroTagline({ manifest, onEditField, color }: {
  manifest: StoryManifest;
  onEditField?: HeroVariantProps['onEditField'];
  color?: string;
}) {
  const heroCopyFull = (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline
    ?? "We'd love you there. Come celebrate with us — the day will be better for it.";
  /* Prototype hero tagline is one short italic line ("together,
     at last") — Pearloom's poetry.heroTagline can be a 2-3
     sentence welcome paragraph. Display only the FIRST sentence
     for prototype parity. Edit mode shows the full text so the
     host can still write a longer welcome that surfaces elsewhere
     (the full heroCopy still mounts in the RSVP intro / share
     card / other surfaces). */
  const editMode = !!onEditField;
  const firstSentence = heroCopyFull.split(/[.!?]\s/, 2)[0];
  const heroCopy = editMode ? heroCopyFull : (
    firstSentence.length < 120 ? firstSentence : heroCopyFull
  );
  return (
    <div style={{ textAlign: 'center', maxWidth: 560, margin: '20px auto 24px' }}>
      <HoverToolbar
        context="hero tagline"
        value={heroCopy}
        onResult={(next) =>
          onEditField?.((m) => ({
            ...m,
            poetry: {
              heroTagline: next,
              closingLine: m.poetry?.closingLine ?? '',
              rsvpIntro: m.poetry?.rsvpIntro ?? '',
              welcomeStatement: m.poetry?.welcomeStatement,
              milestones: m.poetry?.milestones,
            },
          }))
        }
      >
        <EditableText
          as="p"
          value={heroCopy}
          onSave={(next) =>
            onEditField?.((m) => ({
              ...m,
              poetry: {
                heroTagline: next,
                closingLine: m.poetry?.closingLine ?? '',
                rsvpIntro: m.poetry?.rsvpIntro ?? '',
                welcomeStatement: m.poetry?.welcomeStatement,
                milestones: m.poetry?.milestones,
              },
            }))
          }
          placeholder="Add a warm hero tagline…"
          ariaLabel="Hero tagline"
          multiline
          maxLength={280}
          style={{
            /* Prototype tagline is italic Fraunces 19px ink-soft —
               not a body paragraph. Smaller + italic so it reads
               as a one-line dropped above the headline. */
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 19,
            lineHeight: 1.4,
            color: color ?? 'var(--ink-soft)',
            margin: 0,
            fontWeight: 400,
          }}
        />
      </HoverToolbar>
    </div>
  );
}

export function HeroPrimaryCta({ deadlineStr }: { deadlineStr: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <a
        href="#rsvp"
        className="btn btn-primary pl8-btn-sheen"
        style={{ padding: '14px 28px', fontSize: 15 }}
      >
        {deadlineStr ? `RSVP by ${deadlineStr}` : 'RSVP'}
        <Icon name="arrow-right" size={14} />
      </a>
    </div>
  );
}

export function HeroLinkTray({ siteSlug, manifest, names }: {
  siteSlug?: string;
  manifest: StoryManifest;
  names: [string, string];
}) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
        alignItems: 'center', gap: 10, marginTop: 18,
        fontSize: 13, color: 'var(--ink-soft)',
      }}
    >
      <a
        href="#our-story"
        style={{
          color: 'var(--ink)', textDecoration: 'none',
          borderBottom: '1px solid rgba(61,74,31,0.25)',
          paddingBottom: 1, transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(61,74,31,0.25)'; }}
      >
        Read our story
      </a>
      <span aria-hidden style={{ color: 'var(--ink-muted)', opacity: 0.6 }}>·</span>
      <CalendarAddButton domain={siteSlug ?? ''} manifest={manifest} variant="link" />
      <span aria-hidden style={{ color: 'var(--ink-muted)', opacity: 0.6 }}>·</span>
      <SaveContactButton domain={siteSlug ?? ''} manifest={manifest} names={names} variant="link" />
    </div>
  );
}
