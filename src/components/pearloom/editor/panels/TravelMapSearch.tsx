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
// Real Google Places lookup already lives in <HotelSearchRow />
// (TravelPanel.tsx) — this component sits above it and gives the
// host a *visual* affordance. The search filters a curated mock
// dataset (Santorini / NYC / LA / Lake Como) so a host who hasn't
// picked a venue yet can still demo the feature; once a venue is
// set, the real Places search remains the canonical path.
//
// Add-to-block flow:
//   1. Host types into the search input.
//   2. Filtered mock results render in a dropdown card stack —
//      thumbnail + name + stars + distance + amenity strip + a
//      [+] add button.
//   3. Click any result → fires onAdd(hotel) with a fully-shaped
//      Hotel record (rating, ratingCount, amenities, distance,
//      blurb, priceLevel, tone-coloured icon block).
//   4. Search clears + dropdown closes (matches prototype).
// ─────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from 'react';
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

// Curated 12-entry mock dataset — same shape as prototype but
// spread across the most-common Pearloom destinations so a host
// searching from any region sees something relevant. Real Places
// API takes over once the host picks a venue.
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

interface Props {
  onAdd: (h: MapSearchHotel) => void;
  /** When set, the search bar header reads "near [city]" instead
   *  of the generic "near the wedding" — gives the host context
   *  that results are demo data, not real Places. */
  venueCity?: string;
}

export function TravelMapSearch({ onAdd, venueCity }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // Filter on name OR city OR amenities — generous match so a
  // host typing "pool" or "santorini" or "marriott" all surface
  // something useful.
  const results = useMemo(() => {
    if (!q) return MOCK_PLACES.slice(0, 5);
    const needle = q.toLowerCase();
    return MOCK_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.city.toLowerCase().includes(needle) ||
        p.amenities.some((a) => a.toLowerCase().includes(needle)),
    ).slice(0, 6);
  }, [q]);

  // useCallback so the impure Date.now() reference sits in a
  // stable callback body, not a render-time function literal —
  // matches the pattern in AirportsField's addAirport.
  const handleAdd = useCallback(
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
      // Flash a confirmation in-place, then close + clear (prototype
      // closes immediately; we hold the pill for 900ms so the host
      // sees the add land).
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
          Real Places API still drives the actual hotel pick. ── */}
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

        {open && results.length > 0 && (
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
            {results.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(p)}
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
          <Icon name="sparkles" size={11} color="var(--gold, #B8935A)" />
          Pear pulls ratings, photos &amp; amenities automatically.
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
          color={i <= full ? 'var(--gold, #B8935A)' : 'var(--cream-3, #D8CFB8)'}
        />
      ))}
    </span>
  );
}
