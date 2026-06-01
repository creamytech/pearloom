'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panels/PlaceAutocomplete.tsx
//
// v8-styled Google Places autocomplete input. Used by HeroPanel +
// TravelPanel for the venue/address fields and by the hotel-add
// row for picking a real lodging by name.
//
// Two intent flavours:
//   kind="venue" — open-ended search across all place types
//   kind="hotel" — scoped to lodging
//
// Geolocation (one-time prompt) is requested on first focus so the
// `near=lat,lng` query param can bias Google's ranking toward
// what's actually close. If the host denies, we fall back to plain
// text-match results — the input still works, just without the
// "closest first" sort.
//
// On select, the picked place flows back to the parent via
// onSelect with the full PlaceDetails (name + address + lat/lng +
// website + phone + types). Parents typically write all of these
// onto manifest.logistics.* in a single onChange call.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../motifs';

export interface PlaceDetails {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  websiteUri?: string;
  phone?: string;
  types?: string[];
}

interface Prediction {
  id: string;
  displayName: string;
  formattedAddress: string;
}

interface Props {
  value: string;
  onChangeText: (next: string) => void;
  onSelect: (place: PlaceDetails) => void;
  /** 'venue' (open-ended), 'hotel' (lodging-only), 'airport'
   *  (airports-only). */
  kind?: 'venue' | 'hotel' | 'airport';
  placeholder?: string;
  id?: string;
  /** Disable the autocomplete dropdown but keep the textbox
   *  editable — useful when a parent wants to surface the
   *  control without firing search calls. */
  searchDisabled?: boolean;
  /** Explicit location bias overriding the geolocation default.
   *  Hotel pickers pass the *venue's* lat/lng so a host planning
   *  a Santorini wedding from NYC sees Santorini hotels — not
   *  random Manhattan ones. When set, geolocation isn't asked. */
  near?: { lat: number; lng: number } | null;
  /** Label shown next to the "near you" pill — defaults to "Near
   *  you" but parents that bias to the venue can pass "Near venue". */
  nearLabel?: string;
}

export function PlaceAutocomplete({
  value,
  onChangeText,
  onSelect,
  kind = 'venue',
  placeholder,
  id,
  searchDisabled,
  near: nearOverride,
  nearLabel,
}: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [geoNear, setGeoNear] = useState<string | null>(null);
  // Tracks whether the host has actually engaged with the input.
  // Without this, mounting the panel with a pre-filled venue
  // (e.g. "The Wildflower Barn") triggers the debounced search on
  // first render and pops the dropdown unprompted — which surprised
  // hosts who clicked a hotel card on the canvas and saw a venue
  // search dropdown they never asked for. Only the user's own
  // typing or focus gestures should ever open the popover.
  const [engaged, setEngaged] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Effective bias point: explicit override (typically the venue's
  // lat/lng for hotel search) wins over user-geolocation. The pill
  // label tracks which one is in use so the host sees "Near venue"
  // vs "Near you" — same control, different reference frame.
  const effectiveNear: string | null =
    nearOverride
      ? `${nearOverride.lat.toFixed(5)},${nearOverride.lng.toFixed(5)}`
      : geoNear;
  const effectiveNearLabel: string =
    nearOverride ? (nearLabel ?? 'Near venue') : (nearLabel ?? 'Near you');

  // ── Geolocation, one-shot ─────────────────────────────────
  // Only asked when there's no explicit override. Triggers on the
  // first focus event since unfocused background requests are
  // likely to be denied without context.
  const askedGeo = useRef(false);
  const requestGeo = useCallback(() => {
    if (nearOverride || askedGeo.current) return;
    askedGeo.current = true;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoNear(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`);
      },
      () => {
        // User denied; quietly continue without bias.
      },
      { timeout: 5000, maximumAge: 5 * 60_000 },
    );
  }, [nearOverride]);

  // ── Debounced search ──────────────────────────────────────
  useEffect(() => {
    if (searchDisabled) return;
    // Don't search until the host has actually focused / typed in
    // this input — pre-filled values shouldn't open the dropdown.
    if (!engaged) return;
    const q = value.trim();
    if (q.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q, type: 'autocomplete' });
        if (effectiveNear) params.set('near', effectiveNear);
        if (kind === 'hotel' || kind === 'airport') params.set('kind', kind);
        const res = await fetch(`/api/venue/search?${params.toString()}`, { cache: 'no-store' });
        const data = (await res.json()) as { predictions?: Prediction[] };
        setPredictions(data.predictions ?? []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        setPredictions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [value, effectiveNear, kind, searchDisabled, engaged]);

  // ── Outside-click closes the popover ──────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ── Pick a prediction → fetch details → flow up. ──────────
  const pick = useCallback(async (p: Prediction) => {
    setOpen(false);
    onChangeText(p.displayName);
    try {
      const res = await fetch(
        `/api/venue/search?placeId=${encodeURIComponent(p.id)}&type=details`,
        { cache: 'no-store' },
      );
      const data = (await res.json()) as { place?: { id?: string; displayName?: string; formattedAddress?: string; location?: { lat?: number; lng?: number }; websiteUri?: string; internationalPhoneNumber?: string; types?: string[] } };
      const place = data.place;
      onSelect({
        id: place?.id ?? p.id,
        name: place?.displayName ?? p.displayName,
        address: place?.formattedAddress ?? p.formattedAddress,
        lat: place?.location?.lat,
        lng: place?.location?.lng,
        websiteUri: place?.websiteUri,
        phone: place?.internationalPhoneNumber,
        types: place?.types,
      });
    } catch {
      onSelect({
        id: p.id,
        name: p.displayName,
        address: p.formattedAddress,
      });
    }
  }, [onChangeText, onSelect]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(predictions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      void pick(predictions[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
          boxShadow: open ? '0 0 0 3px rgba(198,112,61,0.10)' : undefined,
          borderColor: open ? 'var(--peach-ink, #C6703D)' : 'var(--line)',
        }}
      >
        <span style={{ display: 'inline-flex', color: 'var(--ink-muted)' }}>
          <Icon name={searching ? 'sparkles' : (kind === 'hotel' ? 'moon' : kind === 'airport' ? 'compass' : 'pin')} size={13} />
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          // WAI-ARIA combobox 1.2 pattern: input is the combobox,
          // the popped-up <ul> is the listbox, aria-controls binds
          // them, aria-activedescendant tells screen readers which
          // option the arrow keys are pointing at without moving
          // DOM focus off the input.
          role="combobox"
          aria-expanded={open && predictions.length > 0}
          aria-controls={open && predictions.length > 0 ? `${id}-listbox` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIdx >= 0 && predictions[activeIdx]
            ? `${id}-opt-${activeIdx}` : undefined}
          value={value}
          onChange={(e) => { setEngaged(true); onChangeText(e.target.value); }}
          onFocus={() => {
            setEngaged(true);
            requestGeo();
            if (predictions.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
            color: 'var(--ink)',
            minWidth: 0,
          }}
        />
        {effectiveNear && (
          <span
            title={nearOverride
              ? 'Sorted by closest to your venue'
              : 'Sorted by closest to your location'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              background: 'rgba(198,112,61,0.10)',
              padding: '2px 6px',
              borderRadius: 999,
            }}
          >
            <Icon name="compass" size={9} /> {effectiveNearLabel}
          </span>
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={kind === 'hotel' ? 'Hotel suggestions' : kind === 'airport' ? 'Airport suggestions' : 'Place suggestions'}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 60,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: 'var(--paper)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(14,13,11,0.20)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {predictions.map((p, i) => {
            const on = activeIdx === i;
            return (
              <li
                key={p.id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={on}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => { e.preventDefault(); void pick(p); }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: on ? 'var(--cream-2)' : 'transparent',
                  transition: 'background var(--pl-dur-instant) var(--pl-ease-out)',
                }}
              >
                <Icon name={kind === 'hotel' ? 'moon' : kind === 'airport' ? 'compass' : 'pin'} size={12} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--ink)',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--ink-soft)',
                      marginTop: 2,
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.formattedAddress}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && !searching && value.trim().length >= 2 && predictions.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 60,
            padding: '10px 14px',
            background: 'var(--paper)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(14,13,11,0.20)',
            fontSize: 12,
            color: 'var(--ink-soft)',
          }}
        >
          No {kind === 'hotel' ? 'hotels' : 'places'} matched &quot;{value}&quot;. Type more, or drop the address in directly.
        </div>
      )}
    </div>
  );
}
