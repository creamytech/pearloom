'use client';

// ──────────────────────────────────────────────────────────────
// Shared sub-components used by hero variants. Keeps each variant
// component focused on its layout while inline editing + the AI
// rewrite affordances stay consistent across all 5.
// ──────────────────────────────────────────────────────────────

import { forwardRef, useRef, useState } from 'react';
import { EditableText } from '@/components/pearloom/editor/canvas/EditableText';
import { HoverToolbar } from '@/components/pearloom/editor/canvas/HoverToolbar';
import { HeroFieldPopover } from '@/components/pearloom/editor/canvas/HeroFieldPopover';
import { Icon } from '@/components/pearloom/motifs';
import { CalendarAddButton, SaveContactButton } from '@/components/pearloom/site/GuestKit';
import type { HeroVariantProps } from './types';
import type { StoryManifest } from '@/types';

export function HeroKicker({ manifest, dateInfo, onEditField }: {
  manifest: StoryManifest;
  dateInfo: { weekday: string } | null;
  onEditField?: HeroVariantProps['onEditField'];
}) {
  const value = (manifest as unknown as { heroKicker?: string }).heroKicker
    ?? (dateInfo ? `together, ${dateInfo.weekday.toLowerCase()}` : 'save the date');
  return (
    <div
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

export function HeroNames({ n1, n2, onEditNames, scale = 1, color, italicColor }: {
  n1: string; n2: string;
  onEditNames?: (next: [string, string]) => void;
  scale?: number;
  color?: string;
  italicColor?: string;
}) {
  // cqw (container query width) reads the device-frame width in
  // the editor preview AND the viewport on the published site, so
  // names size correctly on both. Falls back to vw automatically
  // when no query container is in the ancestor chain.
  const main = `clamp(${Math.round(56 * scale)}px, ${14 * scale}cqw, ${Math.round(168 * scale)}px)`;
  const italic = `clamp(${Math.round(44 * scale)}px, ${10 * scale}cqw, ${Math.round(132 * scale)}px)`;
  return (
    <h1
      className="display pl8-hero-names"
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
      {n2 || onEditNames ? (
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
              <Icon name="calendar" size={16} color="var(--gold)" />
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
              <Icon name="pin" size={16} color="var(--gold)" />
              <span style={{ fontWeight: 600 }}>{venueLabel}</span>
            </div>
          )
        )}
      </div>
      {editMode && manifest && onEditField && openField && (
        <HeroFieldPopover
          anchor={openField === 'date' ? dateRef.current : venueRef.current}
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
        transition: 'background-color 160ms ease, border-color 160ms ease',
        opacity: placeholder ? 0.78 : 1,
        fontStyle: placeholder ? 'italic' : 'normal',
      }}
    >
      <Icon name={icon} size={16} color="var(--gold)" />
      <span>{label}</span>
    </button>
  );
});

export function HeroTagline({ manifest, onEditField, color }: {
  manifest: StoryManifest;
  onEditField?: HeroVariantProps['onEditField'];
  color?: string;
}) {
  const heroCopy = (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline
    ?? "We'd love you there. Come celebrate with us — the day will be better for it.";
  return (
    <div style={{ textAlign: 'center', maxWidth: 560, margin: '30px auto 36px' }}>
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
          style={{ fontSize: 17, lineHeight: 1.6, color: color ?? 'var(--ink-soft)', margin: 0 }}
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
          paddingBottom: 1, transition: 'border-color 200ms ease',
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
