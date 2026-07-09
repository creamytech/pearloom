'use client';

/* =========================================================================
   RsvpCeremony — the themed confirmation moment after a successful RSVP
   (Suite Phase 4, docs/SUITE-STRATEGY.md §5).

   Replaces the plain "✓ You're on the list!" success states in
   GuestRsvpModal and PresetRsvpForm with a small ceremony:

     1. The site's motif (manifest.motifKind → shared <Motif/> from
        MotifScatter) threads in with a short transform/opacity entrance.
     2. The monogram (shared <Monogram/>, manifest.monogram or
        names-derived, watermark variant) settles beneath it.
     3. Preset-aware copy — attending: "You're woven in." / declined:
        "We'll miss you — thank you for telling us." / memorial preset:
        "We'll hold a seat for you."
     4. A themed "Add to calendar" affordance (data: URI .ics via
        lib/calendar) when the event date exists, and a quiet
        "Back to the site" close when the host surface is a modal.

   PRESENTATION ONLY — this component renders after the POST to
   /api/rsvp has already succeeded; it never touches submit logic.

   Colors bind to the live --t-* vars the themed site root provides
   (with the prototype base vars + brand tokens as fallbacks), so the
   ceremony recolors with the couple's pack automatically. Motion is
   transform/opacity only and fully disabled under
   prefers-reduced-motion (content is visible immediately — the
   keyframes use `both` fill, and the reduced-motion block removes
   the animation entirely so the `from` state never paints).
   ========================================================================= */

import { useMemo } from 'react';
import type { StoryManifest } from '@/types';
import { Motif, type MotifKind } from './MotifScatter';
import { Monogram, type MonogramFrame } from './Monogram';
import { getTheme } from './themes';
import { generateICS } from '@/lib/calendar';
import { getEventType } from '@/lib/event-os/event-types';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';

export interface RsvpCeremonyProps {
  manifest: StoryManifest;
  /** Did at least one guest in the party say yes? */
  attending: boolean;
  /** RSVP preset id — drives the memorial copy variant. */
  preset?: string;
  /** When present, renders the quiet "Back to the site" close
   *  (modal surfaces). Inline forms omit it. */
  onClose?: () => void;
}

const EASE = 'var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))';

const CEREMONY_CSS = `
@keyframes pl-cere-thread {
  from { opacity: 0; transform: translateY(10px) scale(0.86); }
  to   { opacity: 1; transform: none; }
}
@keyframes pl-cere-settle {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
@keyframes pl-cere-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.pl-cere-motif { animation: pl-cere-thread var(--pl-dur-slow, 480ms) ${EASE} both; }
.pl-cere-mono  { animation: pl-cere-settle var(--pl-dur-slow, 480ms) ${EASE} 160ms both; }
.pl-cere-copy  { animation: pl-cere-rise var(--pl-dur-slow, 480ms) ${EASE} 320ms both; }
@media (prefers-reduced-motion: reduce) {
  .pl-cere-motif, .pl-cere-mono, .pl-cere-copy { animation: none; }
}
`;

/* Best-effort names line for the monogram + calendar title when the
   host hasn't configured manifest.monogram — mirrors the derivation
   /g/[token] and lib/suite/theme.ts already use. */
function namesLine(manifest: StoryManifest): string {
  const loose = manifest as unknown as Record<string, unknown>;
  const names = loose.names as [string, string] | undefined;
  const fromNames = Array.isArray(names) ? names.filter(Boolean).join(' & ') : '';
  if (fromNames) return fromNames;
  const [rawA, rawB] = (manifest.coupleId ?? '').split(/[-_]/);
  const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  return [cap(rawA), cap(rawB)].filter(Boolean).join(' & ');
}

export function RsvpCeremony({ manifest, attending, preset, onClose }: RsvpCeremonyProps) {
  const loose = manifest as unknown as Record<string, unknown>;

  /* Motif — explicit host pick wins; theme-catalog motif is the
     fallback (each prototype theme prescribes one). */
  const themeId =
    (loose.themeId as string | undefined) ??
    (loose.theme as { id?: string } | undefined)?.id;
  const protoTheme = getTheme(themeId);
  const motifKind = ((loose.motifKind as MotifKind | undefined) ?? protoTheme.motif ?? 'none') as MotifKind;

  /* Monogram — manifest.monogram or names-derived. Solo honoree
     sites crest a single initial from the derived name; host-typed
     initials render verbatim. */
  const soloSite = isSoloSubject(manifest);
  const explicitMono =
    (manifest.monogram?.initials && manifest.monogram.initials.trim()) || '';
  const monoSource = explicitMono || namesLine(manifest) || (soloSite ? 'A' : 'A & B');
  const monoSolo = soloSite && !explicitMono;
  const monoFrame: MonogramFrame = (manifest.monogram?.frame as MonogramFrame) ?? 'ring';

  /* Copy — preset-aware, BRAND.md §7 voice. */
  const isMemorial = preset === 'memorial';
  const headline = attending
    ? isMemorial
      ? 'We’ll hold a seat for you.'
      : 'You’re woven in.'
    : 'We’ll miss you, thank you for telling us.';
  const body = attending
    ? 'Your reply is set. Any updates will land here first.'
    : 'The door stays open if plans change.';

  /* Add-to-calendar — data: URI .ics from the existing lib/calendar
     helper. Only when an event date exists and the guest is coming. */
  const calendarHref = useMemo(() => {
    const date = manifest.logistics?.date;
    if (!attending || !date) return null;
    const occasion = manifest.occasion ?? 'wedding';
    const eventLabel = getEventType(occasion)?.label ?? 'Celebration';
    const couple = namesLine(manifest);
    try {
      const ics = generateICS({
        title: couple ? `${couple}, ${eventLabel}` : eventLabel,
        date,
        time: manifest.logistics?.time || '12:00',
        venue: manifest.logistics?.venue ?? '',
        address: manifest.logistics?.venueAddress ?? '',
      });
      return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    } catch {
      return null;
    }
  }, [manifest, attending]);

  const ink = 'var(--t-ink, var(--ink, var(--pl-ink, #0E0D0B)))';
  const inkSoft = 'var(--t-ink-soft, var(--ink-soft, var(--pl-ink-soft, #3A332C)))';
  const gold = 'var(--t-gold, var(--gold, #C19A4B))';

  return (
    <div role="status" style={{ textAlign: 'center', position: 'relative' }}>
      <style>{CEREMONY_CSS}</style>

      {motifKind !== 'none' && (
        <div
          className="pl-cere-motif"
          aria-hidden="true"
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}
        >
          <Motif kind={motifKind} size={52} />
        </div>
      )}

      <div className="pl-cere-mono" style={{ display: 'flex', justifyContent: 'center' }}>
        <Monogram initials={monoSource} frame={monoFrame} size={96} withCard={false} solo={monoSolo} ariaHidden />
      </div>

      <div className="pl-cere-copy">
        {/* Gold hairline — the editorial signature above the headline. */}
        <div
          aria-hidden="true"
          style={{
            width: 120,
            height: 1,
            margin: '14px auto 16px',
            background: `linear-gradient(90deg, transparent, ${gold} 50%, transparent)`,
            opacity: 0.6,
          }}
        />
        <h2
          style={{
            fontFamily: 'var(--t-display, var(--font-display, var(--pl-font-display, Fraunces, Georgia, serif)))',
            fontStyle: 'italic',
            fontSize: 27,
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: '-0.015em',
            margin: '0 0 8px',
            color: ink,
          }}
        >
          {headline}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: inkSoft,
            maxWidth: 320,
            margin: '0 auto',
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 22,
          }}
        >
          {calendarHref && (
            <a
              href={calendarHref}
              download="event.ics"
              style={{
                padding: '11px 22px',
                borderRadius: 999,
                background: 'var(--t-rsvp, var(--t-accent, var(--pl-olive, #5C6B3F)))',
                color: 'var(--t-rsvp-ink, var(--t-paper, var(--pl-cream, #F5EFE2)))',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Add to calendar
            </a>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '11px 22px',
                borderRadius: 999,
                background: 'transparent',
                border: '1px solid var(--t-line, var(--line, rgba(14,13,11,0.16)))',
                color: ink,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                fontFamily: 'inherit',
              }}
            >
              Back to the site
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RsvpCeremony;
