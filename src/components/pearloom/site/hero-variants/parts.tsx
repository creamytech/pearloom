'use client';

// ──────────────────────────────────────────────────────────────
// Shared sub-components used by hero variants. Keeps each variant
// component focused on its layout while inline editing + the AI
// rewrite affordances stay consistent across all 5.
// ──────────────────────────────────────────────────────────────

import { EditableText } from '@/components/pearloom/editor/canvas/EditableText';
import { HoverToolbar } from '@/components/pearloom/editor/canvas/HoverToolbar';
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
  const main = `clamp(${Math.round(80 * scale)}px, ${14 * scale}vw, ${Math.round(168 * scale)}px)`;
  const italic = `clamp(${Math.round(60 * scale)}px, ${10 * scale}vw, ${Math.round(132 * scale)}px)`;
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

export function HeroDateVenue({ dateInfo, venue, color }: {
  dateInfo: { pretty: string; weekday: string } | null;
  venue: string;
  color?: string;
}) {
  if (!dateInfo && !venue) return null;
  return (
    <div
      style={{
        textAlign: 'center', marginTop: 28,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 18, flexWrap: 'wrap', color: color ?? 'var(--ink)',
      }}
    >
      {dateInfo && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
          <Icon name="calendar" size={16} color="var(--gold)" />
          <span style={{ fontWeight: 600 }}>{dateInfo.weekday}, {dateInfo.pretty}</span>
        </div>
      )}
      {dateInfo && venue && (
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.45 }} />
      )}
      {venue && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
          <Icon name="pin" size={16} color="var(--gold)" />
          <span style={{ fontWeight: 600 }}>{venue}</span>
        </div>
      )}
    </div>
  );
}

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
