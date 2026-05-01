'use client';

// ─────────────────────────────────────────────────────────────
// HeroFieldPopover — canvas-side inline editor for the hero's
// date + venue strip. Hosts click the date pill or venue pill on
// the canvas → a v8 popover floats from the trigger with the
// matching editor (date+time+timezone, or venue search).
//
// Avoids touching every hero variant individually (Postcard,
// PhotoFirst, Split, Carousel, Minimal): the pills live in the
// shared HeroDateVenue/PhotoFirst-overlay components, so adding
// editing here covers all 5 variants in one shot.
//
// Patches flow back via onEditField. The popover handles its own
// outside-click + Escape close. Two intents share the same
// surface so we only ship one popover layer:
//
//   field='date'  → DatePicker + TimePicker + timezone select +
//                   RSVP-deadline DatePicker
//   field='venue' → PlaceAutocomplete (writes name + address +
//                   placeId + lat/lng in one shot)
// ─────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StoryManifest } from '@/types';
import { DatePicker, TimePicker } from '../v8-forms';
import { PlaceAutocomplete } from '../panels/PlaceAutocomplete';

type HeroField = 'date' | 'venue';

interface Props {
  anchor: HTMLElement | null;
  field: HeroField;
  manifest: StoryManifest;
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
  onClose: () => void;
}

export function HeroFieldPopover({ anchor, field, manifest, onEditField, onClose }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; flipped: boolean }>({ top: 0, left: 0, flipped: false });
  const popRef = useRef<HTMLDivElement>(null);

  // DOM-measurement-driven positioning. useLayoutEffect is the
  // React-recommended hook for this; the lint rule is over-strict.
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const popH = field === 'venue' ? 360 : 460;
    const popW = field === 'venue' ? 360 : 340;
    const flip = r.bottom + popH > window.innerHeight - 16;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos({
      top: flip ? r.top - 8 : r.bottom + 8,
      left: Math.max(16, Math.min(r.left + r.width / 2 - popW / 2, window.innerWidth - popW - 16)),
      flipped: flip,
    });
  }, [anchor, field]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onDocClick(e: MouseEvent) {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target as Node)) return;
      if (anchor && anchor.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [anchor, onClose]);

  if (!anchor || typeof document === 'undefined') return null;

  // Pull date/time apart from the combined `logistics.date` value.
  // The wizard stores it as either 'YYYY-MM-DD' (date-only) or
  // 'YYYY-MM-DDTHH:MM' (with time). We split for the pickers so
  // each operates on its own slice.
  const rawDate = manifest.logistics?.date ?? '';
  const dateOnly = rawDate.slice(0, 10);
  const timeOnly =
    rawDate.length >= 16 && rawDate[10] === 'T'
      ? rawDate.slice(11, 16)
      : (manifest.logistics?.time ?? '');
  const tz = manifest.logistics?.timezone ?? '';
  const rsvpDeadline = (manifest.logistics?.rsvpDeadline ?? '').slice(0, 10);

  function setLogistics(next: Partial<NonNullable<StoryManifest['logistics']>>) {
    onEditField((m) => ({
      ...m,
      logistics: { ...(m.logistics ?? {}), ...next },
    }));
  }

  function setDate(iso: string) {
    if (!iso) return setLogistics({ date: undefined });
    // Preserve any existing time slice.
    const merged = timeOnly ? `${iso}T${timeOnly}` : iso;
    setLogistics({ date: merged });
  }
  function setTime(hhmm: string) {
    setLogistics({ time: hhmm || undefined });
    // Also fold time into the combined date so renderer formatters
    // that read manifest.logistics.date pick it up without needing
    // to fall back to .time separately.
    const base = dateOnly || rawDate.slice(0, 10);
    if (base) setLogistics({ date: hhmm ? `${base}T${hhmm}` : base });
  }
  function setTz(next: string) { setLogistics({ timezone: next || undefined }); }
  function setRsvpDeadline(iso: string) { setLogistics({ rsvpDeadline: iso || undefined }); }

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      aria-label={field === 'date' ? 'Edit date' : 'Edit venue'}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: field === 'venue' ? 360 : 340,
        zIndex: 9100,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
        borderRadius: 14,
        boxShadow: '0 24px 56px rgba(14,13,11,0.18)',
        padding: 16,
        transform: pos.flipped ? 'translateY(-100%)' : 'none',
        animation: 'pl8-hero-pop-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <div
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)',
          marginBottom: 12,
        }}
      >
        {field === 'date' ? 'When' : 'Where'}
      </div>

      {field === 'date' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FieldLabel>Date</FieldLabel>
          <DatePicker
            value={dateOnly}
            onChange={setDate}
            placeholder="Pick a date"
            ariaLabel="Event date"
          />
          <FieldLabel>Time</FieldLabel>
          <TimePicker
            value={timeOnly}
            onChange={setTime}
            hour12
            ariaLabel="Event time"
          />
          <FieldLabel>Timezone</FieldLabel>
          <input
            type="text"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder="America/Los_Angeles"
            aria-label="Event timezone"
            spellCheck={false}
            style={inputStyle}
          />
          <div style={{ height: 1, background: 'var(--line, rgba(61,74,31,0.10))', margin: '4px 0' }} />
          <FieldLabel>RSVP deadline</FieldLabel>
          <DatePicker
            value={rsvpDeadline}
            onChange={setRsvpDeadline}
            placeholder="Optional"
            ariaLabel="RSVP deadline"
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FieldLabel>Venue</FieldLabel>
          <PlaceAutocomplete
            kind="venue"
            placeholder="Search a venue (e.g. Wildflower Barn)"
            value={manifest.logistics?.venue ?? ''}
            onChangeText={(v) => setLogistics({ venue: v || undefined })}
            onSelect={(place) => {
              setLogistics({
                venue: place.name || undefined,
                venueAddress: place.address || undefined,
                venuePlaceId: place.id || undefined,
                venueLat: place.lat,
                venueLng: place.lng,
              });
            }}
          />
          <FieldLabel>Address</FieldLabel>
          <input
            type="text"
            value={manifest.logistics?.venueAddress ?? ''}
            onChange={(e) => setLogistics({ venueAddress: e.target.value || undefined })}
            placeholder="4721 Meadow Ln, Hillsboro, OR"
            aria-label="Venue address"
            style={inputStyle}
          />
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
            Picking from the search list fills the address and coordinates
            in one shot — hotel + map + travel sections all use them.
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes pl8-hero-pop-in {
          from { opacity: 0; transform: ${pos.flipped ? 'translateY(-100%) translateY(8px)' : 'translateY(-8px)'}; }
          to   { opacity: 1; transform: ${pos.flipped ? 'translateY(-100%)' : 'translateY(0)'}; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--ink-muted)',
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--card, #fff)',
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  borderRadius: 10,
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 160ms ease',
};
