'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panels/TravelMapSearch.tsx
//
// Ported from ClaudeDesign/pages/section-fields.jsx (VenueSearch,
// lines 69–159) — the prototype's flagship section-editor card:
// a faux Google Maps strip with color-coded pins, a search input,
// and rich dropdown result cards that drop into the hotel block
// on click.
//
// Wires to the real Google Places API via two routes:
//   • POST /api/places/search  — debounced text search (250ms)
//   • POST /api/places/details — single-place enrichment on pick
//
// If GOOGLE_PLACES_API_KEY is missing or upstream fails, the
// routes return { fallback: true } and we degrade to a curated
// MOCK_PLACES dataset so the editor card still functions as a
// visual demo for hosts who haven't picked a venue yet.
//
// Add-to-block flow:
//   1. Host types into the search input.
//   2. Debounced fetch hits /api/places/search; results render
//      in a dropdown card stack — thumbnail + name + stars +
//      location + amenity strip + [+] add button.
//   3. Click any result → POST /api/places/details to hydrate
//      photo/phone/website, fires onAdd(hotel) with a fully-shaped
//      Hotel record.
//   4. Search clears + dropdown closes (matches prototype).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../motifs';

// Match TravelPanel's local Hotel shape — keep imports loose so
// this file can move without circular import noise.
export interface MapSearchHotel {
  id: string;
  name: string;
  address?: string;
  distance?: string;
  price?: string;
  description?: string;
  bookingUrl?: string;
  photoUrl?: string;
  amenities?: string;
  rating?: number;
  ratingCount?: number;
}

interface MockPlace {
  name: string;
  kind: 'Hotel' | 'Venue';
  city: string;
  rating: number;
  reviews: number;
  price: string;          // '$$' | '$$$' | '$$$$'
  distance: string;       // human label
  tone: 'peach' | 'sage' | 'lavender' | 'warm';
  amenities: string[];    // chip labels
  blurb: string;
}

// Curated 12-entry FALLBACK dataset — used only when the Places
// API is unavailable (missing key or upstream error). Real Places
// search is the canonical path; this keeps the editor card usable
// in dev/offline.
const MOCK_PLACES: MockPlace[] = [
  // Santorini (prototype-aligned)
  { name: 'Cosmos Suites', kind: 'Hotel', city: 'Santorini', rating: 4.8, reviews: 412, price: '$$$', distance: '8-min walk', tone: 'warm', amenities: ['Pool', 'Breakfast', 'Caldera view'], blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.' },
  { name: 'Andronis Boutique', kind: 'Hotel', city: 'Santorini', rating: 4.9, reviews: 286, price: '$$$$', distance: '12-min walk', tone: 'lavender', amenities: ['Spa', 'Infinity pool', 'Fine dining'], blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite for weddings.' },
  { name: 'Aria Suites', kind: 'Hotel', city: 'Santorini', rating: 4.6, reviews: 198, price: '$$', distance: '6-min walk', tone: 'sage', amenities: ['Pool', 'Free parking', 'Pet friendly'], blurb: 'Cycladic-style rooms a short stroll from the venue — great mid-range value.' },
  // NYC
  { name: 'The Bowery Hotel', kind: 'Hotel', city: 'New York', rating: 4.7, reviews: 1820, price: '$$$', distance: '0.4 mi', tone: 'peach', amenities: ['Restaurant', 'Bar', 'Pet friendly'], blurb: 'A downtown Manhattan classic — Persian rugs, leather chairs, a quiet garden out back.' },
  { name: 'Ace Hotel Brooklyn', kind: 'Hotel', city: 'New York', rating: 4.5, reviews: 942, price: '$$', distance: '1.1 mi', tone: 'sage', amenities: ['Gym', 'Breakfast', 'Wi-Fi'], blurb: 'Industrial-luxe Brooklyn rooms with a record player in every suite.' },
  // LA
  { name: 'The Hoxton Downtown', kind: 'Hotel', city: 'Los Angeles', rating: 4.6, reviews: 670, price: '$$', distance: '0.8 mi', tone: 'peach', amenities: ['Rooftop pool', 'Bar', 'Breakfast'], blurb: 'A converted bank building with cactus-lined rooftop and a great mezcal list.' },
  { name: 'Chateau Marmont', kind: 'Hotel', city: 'Los Angeles', rating: 4.4, reviews: 1530, price: '$$$$', distance: '2.3 mi', tone: 'lavender', amenities: ['Spa', 'Pool', 'Fine dining'], blurb: 'Sunset Boulevard\'s discreet old-Hollywood hideaway — bungalows, garden, legacy.' },
  // Lake Como
  { name: 'Villa d\'Este', kind: 'Hotel', city: 'Lake Como', rating: 4.9, reviews: 612, price: '$$$$', distance: '5-min boat', tone: 'lavender', amenities: ['Lakefront', 'Spa', 'Tennis'], blurb: 'Sixteenth-century lakefront palace — terraced gardens, formal dining, full lake views.' },
  { name: 'Grand Hotel Tremezzo', kind: 'Hotel', city: 'Lake Como', rating: 4.8, reviews: 488, price: '$$$', distance: '8-min drive', tone: 'sage', amenities: ['Pool', 'Lakefront', 'Spa'], blurb: 'Art Nouveau Italian grande dame across the water from Bellagio.' },
  // Paris
  { name: 'Hotel Costes', kind: 'Hotel', city: 'Paris', rating: 4.6, reviews: 720, price: '$$$$', distance: '0.5 mi', tone: 'peach', amenities: ['Spa', 'Restaurant', 'Bar'], blurb: '1st-arrondissement legend — velvet, candlelight, the original playlist.' },
  // Tulum
  { name: 'Be Tulum', kind: 'Hotel', city: 'Tulum', rating: 4.7, reviews: 1240, price: '$$$', distance: 'Beachfront', tone: 'warm', amenities: ['Beach access', 'Pool', 'Spa'], blurb: 'Jungle-and-beach hideaway — open-air rooms, mezcal bar, sea-salt everywhere.' },
  // Joshua Tree
  { name: 'Joshua Tree House', kind: 'Hotel', city: 'Joshua Tree', rating: 4.8, reviews: 320, price: '$$', distance: '15-min drive', tone: 'sage', amenities: ['Pool', 'Stargazing', 'Wi-Fi'], blurb: 'Three minimalist desert homesteads on five acres of cholla and starlight.' },
];

// Shape returned by /api/places/search — matches the route's
// SearchResult interface. Kept local to avoid cross-module
// imports across the api/components boundary.
interface PlacesSearchResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  location?: { lat: number; lng: number };
}

interface PlacesDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  phone?: string;
  website?: string;
  openingHours?: string[];
  photoUrls?: string[];
  photoUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  location?: { lat: number; lng: number };
  editorialSummary?: string;
}

interface Props {
  onAdd: (h: MapSearchHotel) => void;
  /** When set, the search bar header reads "near [city]" instead
   *  of the generic "near the wedding" — gives the host context
   *  that results are real Places near their venue. */
  venueCity?: string;
  /** Optional venue coords — biases search results geographically
   *  via locationBias on the Places searchText call. */
  venueLat?: number;
  venueLng?: number;
}

// Map Google priceLevel enum → $ ladder used by the prototype.
function priceFromLevel(level?: string): string {
  switch (level) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
      return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$$$$';
    default:
      return '';
  }
}

// Tone for the result-card thumbnail — derived from place types
// so a spa hotel reads lavender, a bed_and_breakfast reads sage,
// etc. Keeps the visual variety the mock dataset had.
function toneFromTypes(types?: string[]): 'peach' | 'sage' | 'lavender' | 'warm' {
  if (!types || types.length === 0) return 'peach';
  if (types.includes('resort_hotel') || types.includes('spa')) return 'lavender';
  if (types.includes('bed_and_breakfast') || types.includes('inn')) return 'sage';
  if (types.includes('lodging') || types.includes('hotel')) return 'peach';
  return 'warm';
}

// Pretty short-name from a Google formatted_address — usually
// "City, State, Country" — pull the city for the result row.
function cityFromAddress(addr: string): string {
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
  return parts[0] ?? addr;
}

export function TravelMapSearch({ onAdd, venueCity, venueLat, venueLng }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<PlacesSearchResult[] | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [searching, setSearching] = useState(false);

  // Track the active fetch so a stale response from a slow
  // earlier query can't overwrite a newer one's results.
  const fetchSeqRef = useRef(0);

  // Mock-fallback filter — same generous match as before so a
  // host typing "pool" / "santorini" / "marriott" still surfaces
  // something useful in offline/dev mode.
  const mockResults = useMemo(() => {
    if (!q) return MOCK_PLACES.slice(0, 5);
    const needle = q.toLowerCase();
    return MOCK_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.city.toLowerCase().includes(needle) ||
        p.amenities.some((a) => a.toLowerCase().includes(needle)),
    ).slice(0, 6);
  }, [q]);

  // Debounced Places search — 250ms after the last keystroke.
  // Anything shorter than 2 chars is treated as empty.
  // Note: the `< 2 chars` branch lives inside the timeout so we
  // don't trip react-hooks/set-state-in-effect with a synchronous
  // setState on every keystroke.
  useEffect(() => {
    const seq = ++fetchSeqRef.current;
    const tooShort = !q || q.trim().length < 2;
    const timer = window.setTimeout(async () => {
      if (tooShort) {
        if (seq !== fetchSeqRef.current) return;
        setApiResults(null);
        setUsingFallback(false);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const near = (typeof venueLat === 'number' && typeof venueLng === 'number')
          ? { lat: venueLat, lng: venueLng }
          : undefined;
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q.trim(), near }),
        });
        if (seq !== fetchSeqRef.current) return; // stale
        if (!res.ok) {
          setApiResults(null);
          setUsingFallback(true);
          setSearching(false);
          return;
        }
        const data = await res.json() as { results?: PlacesSearchResult[]; fallback?: boolean };
        if (seq !== fetchSeqRef.current) return;
        if (data.fallback) {
          setApiResults(null);
          setUsingFallback(true);
        } else {
          setApiResults(data.results ?? []);
          setUsingFallback(false);
        }
        setSearching(false);
      } catch {
        if (seq !== fetchSeqRef.current) return;
        setApiResults(null);
        setUsingFallback(true);
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, venueLat, venueLng]);

  // Use real API results when present; otherwise fall back to
  // the curated mock dataset (no key, network error, or empty
  // query under 2 chars).
  const realResults: PlacesSearchResult[] | null = apiResults && apiResults.length > 0 ? apiResults : null;
  const showingMock = !realResults;

  const handleAddReal = useCallback(
    async (p: PlacesSearchResult) => {
      // Fire-and-forget enrich call — pulls phone/website/photo
      // before dispatching onAdd. If enrich fails we still add
      // the hotel with whatever search returned.
      let details: PlacesDetails | null = null;
      try {
        const res = await fetch('/api/places/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: p.placeId }),
        });
        if (res.ok) {
          const data = await res.json() as { details?: PlacesDetails | null };
          details = data.details ?? null;
        }
      } catch {
        details = null;
      }

      const price = priceFromLevel(details?.priceLevel ?? p.priceLevel);
      const hotel: MapSearchHotel = {
        id: `htl-places-${p.placeId}`,
        name: details?.name ?? p.name,
        address: details?.formattedAddress ?? p.address,
        distance: cityFromAddress(details?.formattedAddress ?? p.address),
        price,
        description: details?.editorialSummary ?? '',
        bookingUrl: details?.website ?? '',
        photoUrl: details?.photoUrl,
        amenities: '',
        rating: details?.rating ?? p.rating,
        ratingCount: details?.userRatingCount ?? p.userRatingCount,
      };
      onAdd(hotel);
      setJustAdded(hotel.name);
      setQ('');
      setOpen(false);
      window.setTimeout(() => setJustAdded(null), 900);
    },
    [onAdd],
  );

  const handleAddMock = useCallback(
    (p: MockPlace) => {
      const hotel: MapSearchHotel = {
        id: `htl-map-${Date.now().toString(36)}`,
        name: p.name,
        address: `${p.city}`,
        distance: p.distance,
        price: p.price,
        description: p.blurb,
        bookingUrl: '',
        amenities: p.amenities.join(' · '),
        rating: p.rating,
        ratingCount: p.reviews,
      };
      onAdd(hotel);
      setJustAdded(p.name);
      setQ('');
      setOpen(false);
      window.setTimeout(() => setJustAdded(null), 900);
    },
    [onAdd],
  );

  const cityLabel = venueCity ?? 'the wedding';

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--line, rgba(14,13,11,0.12))',
        marginBottom: 12,
        position: 'relative',
      }}
    >
      {/* ── Faux map strip — gradient base + grid hatching +
          three color-coded pins. Pure CSS, no map tile fetches.
          Real Places API drives the actual hotel pick. ── */}
      <div
        style={{
          position: 'relative',
          height: 96,
          background: 'linear-gradient(135deg, #dce6dd, #cdd9e0)',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px)',
          }}
        />
        {/* Faux roads */}
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: 26,
            width: 60,
            height: 8,
            background: 'rgba(124,155,176,0.5)',
            borderRadius: 4,
            transform: 'rotate(18deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 40,
            width: 90,
            height: 8,
            background: 'rgba(124,155,176,0.5)',
            borderRadius: 4,
            transform: 'rotate(-12deg)',
          }}
        />
        {/* Three teardrop pins — matching prototype palette */}
        {(
          [
            { x: 40, y: 30, tone: 'peach', icon: 'heart-icon' as const },
            { x: 120, y: 56, tone: 'sage', icon: 'home' as const },
            { x: 210, y: 34, tone: 'lavender', icon: 'home' as const },
          ]
        ).map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.x, top: p.y }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 22,
                height: 22,
                borderRadius: '50% 50% 50% 0',
                background: `var(--${p.tone}-2, rgba(198,112,61,0.22))`,
                transform: 'rotate(-45deg)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              }}
            >
              <Icon name={p.icon} size={11} color="#3D4A1F" style={{ transform: 'rotate(45deg)' }} />
            </span>
          </div>
        ))}
        {/* City label pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 10,
            fontSize: 9.5,
            fontWeight: 700,
            color: 'var(--ink-muted, #6F6557)',
            background: 'rgba(255,255,255,0.7)',
            padding: '2px 7px',
            borderRadius: 999,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {venueCity ?? 'Map preview'}
        </div>
      </div>

      {/* ── Search bar + dropdown results ── */}
      <div style={{ padding: 10, background: 'var(--card, #FBF7EE)', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Icon
            name="search"
            size={13}
            color="var(--ink-muted, #6F6557)"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay close so a result click lands first.
              window.setTimeout(() => setOpen(false), 180);
            }}
            placeholder={`Search hotels & venues near ${cityLabel}…`}
            style={{
              width: '100%',
              padding: '10px 12px 10px 32px',
              borderRadius: 10,
              border: '1px solid var(--line, rgba(14,13,11,0.12))',
              background: 'var(--cream-2, #EBE3D2)',
              fontSize: 13,
              color: 'var(--ink, #0E0D0B)',
              outline: 'none',
            }}
          />
        </div>

        {open && (showingMock ? mockResults.length > 0 : (realResults?.length ?? 0) > 0) && (
          <div
            role="listbox"
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              top: 52,
              zIndex: 20,
              background: 'var(--card, #FBF7EE)',
              border: '1px solid var(--line, rgba(14,13,11,0.12))',
              borderRadius: 12,
              boxShadow: '0 14px 32px rgba(14,13,11,0.12), 0 4px 10px rgba(14,13,11,0.06)',
              overflow: 'hidden',
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {!showingMock && realResults!.map((p) => {
              const tone = toneFromTypes(p.types);
              const isVenue = !(p.types ?? []).some((t) => /hotel|lodging|bed_and_breakfast|inn|resort/.test(t));
              const price = priceFromLevel(p.priceLevel);
              const city = cityFromAddress(p.address);
              return (
                <button
                  key={p.placeId}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddReal(p)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    padding: '9px 11px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                    background: 'transparent',
                    border: 'none',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'var(--cream-2, rgba(245,239,226,0.6))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `var(--${tone}-2, rgba(198,112,61,0.22))`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={isVenue ? 'heart-icon' : 'home'} size={14} color="#3D4A1F" />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ink, #0E0D0B)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        color: 'var(--ink-muted, #6F6557)',
                        marginTop: 1,
                      }}
                    >
                      {typeof p.rating === 'number' && (
                        <>
                          <StarsInline rating={p.rating} />
                          <span>{p.rating.toFixed(1)}</span>
                          <span>·</span>
                        </>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {city}
                      </span>
                      {price && (
                        <>
                          <span>·</span>
                          <span>{price}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <Icon name="plus" size={14} color="var(--sage-deep, #5C6B3F)" />
                </button>
              );
            })}

            {showingMock && mockResults.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAddMock(p)}
                style={{
                  width: '100%',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '9px 11px',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                  background: 'transparent',
                  border: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'var(--cream-2, rgba(245,239,226,0.6))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: `var(--${p.tone}-2, rgba(198,112,61,0.22))`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={14} color="#3D4A1F" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink, #0E0D0B)',
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      color: 'var(--ink-muted, #6F6557)',
                      marginTop: 1,
                    }}
                  >
                    <StarsInline rating={p.rating} />
                    <span>
                      {p.rating.toFixed(1)} · {p.distance} · {p.price}
                    </span>
                  </span>
                </span>
                <Icon name="plus" size={14} color="var(--sage-deep, #5C6B3F)" />
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: 10.5,
            color: 'var(--ink-muted, #6F6557)',
            marginTop: 7,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Icon name="sparkles" size={11} color="var(--gold, #C19A4B)" />
          {searching
            ? 'Searching Google Places…'
            : usingFallback
              ? 'Showing demo results — set GOOGLE_PLACES_API_KEY for live search.'
              : 'Pear pulls ratings, photos & amenities from Google Places.'}
        </div>

        {justAdded && (
          <div
            aria-live="polite"
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--sage-deep, #5C6B3F)',
              background: 'var(--sage-tint, rgba(92,107,63,0.12))',
              border: '1px solid rgba(92,107,63,0.22)',
              padding: '4px 10px',
              borderRadius: 999,
              letterSpacing: '0.02em',
            }}
          >
            ✓ Added “{justAdded}”
          </div>
        )}
      </div>
    </div>
  );
}

// Inline 5-star strip — same look as prototype's <Stars/> but
// scoped to this file so it doesn't pollute the global atoms.
function StarsInline({ rating, size = 9 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          color={i <= full ? 'var(--gold, #C19A4B)' : 'var(--cream-3, #D8CFB8)'}
        />
      ))}
    </span>
  );
}
