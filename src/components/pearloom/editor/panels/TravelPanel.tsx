'use client';

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelGroup, PanelSection, SegmentedToggle, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import { stableHotelId } from '@/lib/hotel-id';
import { focusPanelRow } from './focus-row';

import { BadgesEditor } from './BadgesEditor';

// Hotels carry three auto-detected badges. The shared BadgesEditor
// is parametric over the auto-key set; we type the call site here
// so the legacy hotel union ('top' | 'closest' | 'value') keeps
// its semantic mapping to "Pear's pick / Closest / Best value".
type AutoBadgeKey = 'top' | 'closest' | 'value';

const AUTO_BADGE_LABELS: Record<AutoBadgeKey, string> = {
  top: "Pear's pick",
  closest: 'Closest',
  value: 'Best value',
};
// Mirrors the AMENITY_HINTS map in /api/hotels/enrich so a hotel
// pulled via "Find real hotels" and one picked via Search-by-name
// produce the same human-readable amenities line.
const AMENITY_LABELS: Record<string, string> = {
  spa: 'spa',
  restaurant: 'restaurant on-site',
  bar: 'bar',
  meal_takeaway: 'room service',
  gym: 'fitness centre',
  swimming_pool: 'pool',
  pool: 'pool',
  parking: 'parking',
  beach: 'beach access',
  resort_hotel: 'resort',
  bed_and_breakfast: 'breakfast included',
};
function deriveAmenities(types: string[]): string {
  const out: string[] = [];
  for (const t of types) {
    const v = AMENITY_LABELS[t];
    if (v && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 3).join(' · ');
}

type Hotel = {
  id: string;
  name: string;
  /** Real street address. Pre-filled when the host picks via
   *  search; renders under the rating row on the live site. */
  address?: string;
  distance?: string;
  price?: string;
  description?: string;
  bookingUrl?: string;
  /** Photo URL from Google Places when the host picks a real
   *  hotel — used by the renderer to show a thumbnail instead of
   *  the moon-icon placeholder. */
  photoUrl?: string;
  /** Up to 5 Google Places photos for the in-card carousel. */
  photoUrls?: string[];
  /** Lat/lng for the renderer's hotel-map mode (numbered pins
   *  beside the venue marker). Only set on hotels picked or
   *  fetched from Google Places — host-typed entries skip the
   *  map until they pick from autocomplete. */
  lat?: number;
  lng?: number;
  /** Comma-separated amenities pulled from Place Details. */
  amenities?: string;
  /** Star rating (0–5) from Google. Persisted on the manifest so
   *  the renderer can show "★ 4.6 · 218 reviews" without an
   *  extra API call. */
  rating?: number;
  /** Total Google review count behind that rating. */
  ratingCount?: number;
  /** Real nightly-rate range from Google (USD or local). When
   *  Google didn't publish one, the renderer falls back to a
   *  priceLevel-tiered estimate ("$$$ · ~$200-380/night est."). */
  priceRange?: { start?: number; end?: number; currency?: string };
  /** Host-authored badge overrides. Optional `hideAuto` array
   *  suppresses Pear's pick / Closest / Best value; `custom` is
   *  free-text chips ("Couple's pick", "Mom's favourite"). */
  badges?: {
    hideAuto?: Array<'top' | 'closest' | 'value'>;
    custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }>;
  };
};

// Enrich a Place pick into a full Hotel row: amenities, distance
// from the venue, Claude blurb, photo. Falls back to address-only
// if the enrich call fails so a network blip doesn't lose the
// pick. Returns the Hotel fields plus the enrich's photoUrl which
// the row renderer reads.
async function enrichPickedHotel(
  placeId: string,
  fallback: { name: string; address: string },
  ctx: { venueLat?: number; venueLng?: number; venueCity?: string; eventDate?: string },
): Promise<Hotel> {
  const id = `htl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  try {
    const res = await fetch('/api/hotels/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId,
        venueLat: ctx.venueLat,
        venueLng: ctx.venueLng,
        venueCity: ctx.venueCity,
        eventDate: ctx.eventDate,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      hotel?: {
        name: string;
        address: string;
        websiteUri?: string;
        rating?: number;
        ratingCount?: number;
        priceLevel?: string;
        priceRange?: { start?: number; end?: number; currency?: string };
        amenities?: string;
        distanceText?: string;
        photoUrl?: string;
        photoUrls?: string[];
        lat?: number;
        lng?: number;
        blurb?: string;
      };
    };
    const h = data.hotel;
    if (!h) throw new Error('empty');
    return {
      id,
      name: h.name || fallback.name,
      address: h.address || fallback.address,
      // Description prefers Claude's blurb; falls back to amenities,
      // then empty (we store address separately now).
      description: h.blurb || h.amenities || '',
      bookingUrl: h.websiteUri ?? '',
      distance: h.distanceText ?? '',
      price: h.priceLevel ?? '',
      priceRange: h.priceRange,
      photoUrl: h.photoUrl,
      photoUrls: h.photoUrls,
      amenities: h.amenities,
      rating: h.rating,
      ratingCount: h.ratingCount,
      lat: h.lat,
      lng: h.lng,
    };
  } catch {
    return {
      id,
      name: fallback.name,
      description: fallback.address,
      bookingUrl: '',
    };
  }
}

// HotelRowName — the Name field inside an existing hotel row.
// Picking from autocomplete re-enriches every field except Price
// (which the host typically curates) so a vague row "Cedar Inn"
// becomes a fully-populated entry with one tap. Free typing is
// preserved for hosts who want to keep a custom hand-edited row.
function HotelRowName({
  manifest,
  hotel,
  onText,
  onPick,
}: {
  manifest: StoryManifest;
  hotel: Hotel;
  onText: (name: string) => void;
  onPick: (patch: Partial<Hotel>) => void;
}) {
  const [enriching, setEnriching] = useState(false);
  const l = manifest.logistics ?? {};
  const venueNear = l.venueLat && l.venueLng ? { lat: l.venueLat, lng: l.venueLng } : null;
  return (
    <div style={{ position: 'relative' }}>
      <PlaceAutocomplete
        kind="hotel"
        placeholder="Hotel name"
        value={hotel.name}
        onChangeText={onText}
        near={venueNear}
        nearLabel="Near venue"
        onSelect={async (place) => {
          setEnriching(true);
          const enriched = await enrichPickedHotel(
            place.id,
            { name: place.name, address: place.address },
            { venueLat: l.venueLat, venueLng: l.venueLng, venueCity: l.venue, eventDate: l.date },
          );
          // Merge into the existing row — keep its id (so reorder
          // history doesn't shuffle), keep manual price (rare for
          // Google to return real nightly rate), but replace the
          // rest with enriched values.
          onPick({
            name: enriched.name,
            description: enriched.description,
            distance: enriched.distance,
            bookingUrl: enriched.bookingUrl,
            photoUrl: enriched.photoUrl,
            amenities: enriched.amenities,
          });
          setEnriching(false);
        }}
      />
      {enriching && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            fontSize: 10.5,
            fontWeight: 600,
            color: 'var(--peach-ink, #C6703D)',
            zIndex: 70,
          }}
        >
          Pear is updating this row…
        </div>
      )}
    </div>
  );
}

// One-shot hotel-add via Places autocomplete. Search bias snaps
// to the *venue's* lat/lng so a host planning a Santorini wedding
// from NYC sees Santorini hotels instead of Manhattan ones. On
// pick we call /api/hotels/enrich to populate amenities, distance
// from venue, and a Claude blurb in one go.
function HotelSearchRow({ manifest, onAdd }: { manifest: StoryManifest; onAdd: (h: Hotel) => void }) {
  const [query, setQuery] = useState('');
  const [enriching, setEnriching] = useState(false);
  const l = manifest.logistics ?? {};
  const venueNear = l.venueLat && l.venueLng ? { lat: l.venueLat, lng: l.venueLng } : null;
  return (
    <div style={{ position: 'relative' }}>
      <PlaceAutocomplete
        kind="hotel"
        placeholder={venueNear ? 'Search hotels near your venue' : 'Marriott, Cedar Inn, Airbnb…'}
        value={query}
        onChangeText={setQuery}
        near={venueNear}
        nearLabel="Near venue"
        onSelect={async (place) => {
          setEnriching(true);
          const enriched = await enrichPickedHotel(
            place.id,
            { name: place.name, address: place.address },
            { venueLat: l.venueLat, venueLng: l.venueLng, venueCity: l.venue, eventDate: l.date },
          );
          onAdd(enriched);
          setQuery('');
          setEnriching(false);
        }}
      />
      {enriching && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            padding: '8px 12px',
            background: 'var(--peach-bg, rgba(198,112,61,0.08))',
            color: 'var(--peach-ink, #C6703D)',
            border: '1px solid rgba(198,112,61,0.18)',
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 600,
            zIndex: 70,
          }}
        >
          Pear is fetching the blurb + amenities…
        </div>
      )}
    </div>
  );
}

function HotelsAI({ manifest, onResult }: { manifest: StoryManifest; onResult: (h: Hotel[]) => void }) {
  const l = manifest.logistics ?? {};
  // We can run with EITHER cached coords from the venue pick OR a
  // venue address that can be geocoded server-side. Coords are the
  // happy path — they skip the geocode step that was failing on
  // terse venue strings like "fira" with no city.
  const canRun = !!(l.venueLat && l.venueLng) || !!(l.venue || l.venueAddress);
  const { state, error, run } = useAICall(async () => {
    const res = await fetch('/api/hotels/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Cached coords win — when present, the route bypasses
        // geocoding entirely (was the failure mode behind the
        // "Could not geocode the venue" error on terse names).
        lat: l.venueLat,
        lng: l.venueLng,
        venueAddress: l.venueAddress,
        venueCity: l.venue,
        eventDate: l.date,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't fetch hotels (${res.status})`);
    }
    const data = (await res.json()) as {
      hotels?: Array<{
        id: string; name: string; address: string;
        distanceText?: string; priceLevel?: string;
        priceRange?: { start?: number; end?: number; currency?: string };
        websiteUri?: string; phone?: string; rating?: number;
        ratingCount?: number; photoUrl?: string; photoUrls?: string[];
        blurb?: string; types?: string[]; editorialSummary?: string;
      }>;
    };
    const now = Date.now();
    const next: Hotel[] = (data.hotels ?? []).map((h, i) => ({
      id: `htl-real-${now.toString(36)}-${i}`,
      name: h.name,
      address: h.address,
      description: h.blurb || h.editorialSummary || '',
      price: h.priceLevel,
      priceRange: h.priceRange,
      distance: h.distanceText,
      bookingUrl: h.websiteUri,
      rating: h.rating,
      ratingCount: h.ratingCount,
      photoUrl: h.photoUrl,
      photoUrls: h.photoUrls,
      lat: (h as { lat?: number }).lat,
      lng: (h as { lng?: number }).lng,
      // Build a short amenities line from the types array. Same
      // mapping as /api/hotels/enrich's summariseAmenities so a
      // hotel populated via "Find real hotels" reads consistently
      // with one populated via Search-by-name.
      amenities: deriveAmenities(h.types ?? []),
    }));
    if (!next.length) throw new Error('No hotels found near the venue');
    onResult(next);
    return next;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AIHint>
        Pear pulls real hotels near your venue (Google Places) and Claude writes a one-line blurb for each. Add + edit from the rows below.
      </AIHint>
      <AISuggestButton
        label={canRun ? 'Find real hotels near my venue' : 'Add a venue first'}
        runningLabel="Scanning Google Places…"
        state={canRun ? state : 'idle'}
        onClick={() => canRun && void run()}
        error={error ?? undefined}
      />
    </div>
  );
}

function getHotels(manifest: StoryManifest): Hotel[] {
  const raw = ((manifest as unknown as { travel?: { hotels?: Hotel[] } }).travel?.hotels ?? []) as Hotel[];
  // Defensive id rehydration. Legacy manifests + a brief window
  // where the canvas's onReorder wrote back HotelBlock-shape that
  // stripped `id` left some records id-less. Without an id, the
  // panel's findIndex resolved every row to index 0 — badge edits
  // landed on hotel #0 regardless of which row the host clicked,
  // and dnd-kit treated all rows as a single "active" item so the
  // whole list rendered at 35% opacity. Mint a content-stable id
  // here in-memory; the next setTravel persists it to the manifest.
  return raw.map((h, i) => ({ ...h, id: h.id || stableHotelId(h, i) }));
}

function getTravelMeta(manifest: StoryManifest) {
  return ((manifest as unknown as { travel?: { intro?: string; blockCode?: string } }).travel ?? {}) as {
    intro?: string;
    blockCode?: string;
  };
}

export function TravelPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const hotels = getHotels(manifest);
  const meta = getTravelMeta(manifest);
  const logistics = manifest.logistics ?? {};

  // Listen for canvas → panel focus jumps. The site renderer
  // emits `pearloom:focus-hotel-row` with { hotelId } when a host
  // clicks a hotel card on the canvas; we find the matching
  // [data-pl-hotel-row-id] in the panel, scroll it into view, and
  // flash a peach ring around it for 1.6s.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onFocus(e: Event) {
      const hid = (e as CustomEvent<{ hotelId?: string }>).detail?.hotelId;
      if (!hid) return;
      // Shared helper handles section auto-expand + scroll + flash.
      focusPanelRow(`[data-pl-hotel-row-id="${CSS.escape(hid)}"]`);
    }
    window.addEventListener('pearloom:focus-hotel-row', onFocus);
    return () => window.removeEventListener('pearloom:focus-hotel-row', onFocus);
  }, []);

  function setTravel(patch: { hotels?: Hotel[]; intro?: string; blockCode?: string }) {
    // Write to BOTH the legacy shape (manifest.travel) used by older
    // consumers AND the canonical shape (manifest.travelInfo) that the
    // v8 canvas reads. Without this second write hotels added here
    // never rendered on the site — the canvas only reads travelInfo.
    const existingLegacy = (manifest as unknown as { travel?: Record<string, unknown> }).travel ?? {};
    // Re-hydrate any missing ids on the panel-shape Hotel[] before
    // we write — keeps `manifest.travel.hotels` id-bearing so the
    // panel's own re-renders can findIndex by id reliably.
    const patchWithIds = patch.hotels
      ? { ...patch, hotels: patch.hotels.map((h, i) => ({ ...h, id: h.id || stableHotelId(h, i) })) }
      : patch;
    const nextLegacy = { ...existingLegacy, ...patchWithIds };

    // Project Hotel[] → HotelBlock[] for the renderer. Carry every
    // rich field so the live card can render photo + stars +
    // amenities + distance + booking CTA without re-fetching from
    // Google. The legacy `notes` channel duplicates description so
    // older renderers still read something useful.
    const hotelsForRender = patchWithIds.hotels
      ? patchWithIds.hotels.map((h, i) => ({
          // Carry the panel's stable id through — the renderer
          // and panel both key off this same id for click-to-focus,
          // drag-reorder, and per-hotel badge writes. Legacy records
          // without an id get a content-stable hash so the same
          // hotel resolves to the same id across renders.
          id: h.id || stableHotelId(h, i),
          name: h.name,
          address: h.address ?? '',
          bookingUrl: h.bookingUrl,
          groupRate: h.price,
          notes: h.description,
          photoUrl: h.photoUrl,
          photoUrls: h.photoUrls,
          lat: h.lat,
          lng: h.lng,
          rating: h.rating,
          ratingCount: h.ratingCount,
          amenities: h.amenities,
          distance: h.distance,
          priceLevel: h.price,
          priceRange: h.priceRange,
          description: h.description,
          badges: h.badges,
        }))
      : undefined;

    const existingInfo = manifest.travelInfo ?? { airports: [], hotels: [] };
    const nextInfo = {
      ...existingInfo,
      airports: existingInfo.airports ?? [],
      hotels: hotelsForRender ?? existingInfo.hotels ?? [],
    };

    onChange({
      ...manifest,
      travel: nextLegacy,
      travelInfo: nextInfo,
    } as unknown as StoryManifest);
  }

  function updateHotel(idx: number, patch: Partial<Hotel>) {
    setTravel({ hotels: hotels.map((h, i) => (i === idx ? { ...h, ...patch } : h)) });
  }

  function addHotel() {
    setTravel({
      hotels: [
        ...hotels,
        {
          id: `htl-${Date.now().toString(36)}`,
          name: 'Cedar Inn',
          distance: '10 min drive',
          price: '$189/night',
          description: 'Breakfast is real good.',
          bookingUrl: '',
        },
      ],
    });
  }

  return (
    <PanelGroup>
      <PanelSection label="The venue" hint="Pulls from the hero section.">
        <Field label="Venue" help="Search by name — picks fill the address + lat/lng for the map.">
          <PlaceAutocomplete
            kind="venue"
            placeholder="Search for a venue"
            value={logistics.venue ?? ''}
            onChangeText={(v) =>
              onChange({ ...manifest, logistics: { ...logistics, venue: v || undefined } })
            }
            onSelect={(place) =>
              onChange({
                ...manifest,
                logistics: {
                  ...logistics,
                  venue: place.name || undefined,
                  venueAddress: place.address || undefined,
                  venuePlaceId: place.id || undefined,
                  venueLat: place.lat,
                  venueLng: place.lng,
                },
              })
            }
          />
        </Field>
        <Field label="Address" help="Used to render directions + the map. Auto-fills from venue search.">
          <TextInput
            value={logistics.venueAddress ?? ''}
            onChange={(e) =>
              onChange({ ...manifest, logistics: { ...logistics, venueAddress: e.target.value || undefined } })
            }
            placeholder="4721 Meadow Ln, Hillsboro, OR 97123"
          />
        </Field>
        <Field label="Venue intro">
          <TextArea
            rows={3}
            value={meta.intro ?? ''}
            onChange={(e) => setTravel({ intro: e.target.value })}
            placeholder="A restored 1920s dairy barn tucked in the Tualatin hills, forty minutes west of downtown."
          />
        </Field>
      </PanelSection>

      <PanelSection
        label="Places to stay"
        hint="Drag to reorder. Guests get rooms + a booking link if you add one."
        action={hotels.length > 0 ? <AddRowButton label="Add hotel" onClick={addHotel} /> : null}
      >
        <Field
          label="Display"
          help="Photo cards show real Google photos. Icon cards are cleaner and editorial."
        >
          <SegmentedToggle<'photo' | 'icon' | 'map'>
            value={(manifest.travelInfo?.hotelDisplay as 'photo' | 'icon' | 'map' | undefined) ?? 'photo'}
            onChange={(v) =>
              onChange({
                ...manifest,
                travelInfo: {
                  ...(manifest.travelInfo ?? { airports: [], hotels: [] }),
                  hotelDisplay: v,
                },
              } as unknown as StoryManifest)
            }
            options={[
              { value: 'photo', label: 'Photo cards' },
              { value: 'icon', label: 'Icon cards' },
              { value: 'map', label: 'Map' },
            ]}
          />
        </Field>
        <Field
          label="Highlights"
          help="Auto-tag the top option, the closest, and the best value. Off for minimalist sites."
        >
          <SegmentedToggle<'on' | 'off'>
            value={(manifest.travelInfo?.hotelBadges ?? true) ? 'on' : 'off'}
            onChange={(v) =>
              onChange({
                ...manifest,
                travelInfo: {
                  ...(manifest.travelInfo ?? { airports: [], hotels: [] }),
                  hotelBadges: v === 'on',
                },
              } as unknown as StoryManifest)
            }
            options={[
              { value: 'on', label: 'Show' },
              { value: 'off', label: 'Hide' },
            ]}
          />
        </Field>
        <Field label="Group block code" help="Optional — if you negotiated a rate, drop the code here.">
          <TextInput
            value={meta.blockCode ?? ''}
            onChange={(e) => setTravel({ blockCode: e.target.value })}
            placeholder="ALEXJAMIE"
          />
        </Field>
        <Field
          label="Search a hotel by name"
          help={
            (logistics.venueLat && logistics.venueLng)
              ? 'Real Google Places search, biased to your venue. Pear fetches a blurb + amenities + distance on pick.'
              : 'Real Google Places search. Pick a venue first so results bias to the right city.'
          }
        >
          <HotelSearchRow manifest={manifest} onAdd={(h) => setTravel({ hotels: [...hotels, h] })} />
        </Field>
        <HotelsAI manifest={manifest} onResult={(suggestions) => setTravel({ hotels: [...hotels, ...suggestions] })} />

        <SortableList
          items={hotels}
          onReorder={(next) => setTravel({ hotels: next })}
          emptyState={
            <EmptyBlockState
              icon="moon"
              title="No hotels listed yet"
              body="Pick 2–3 nearby spots — it makes the day smoother for out-of-towners."
              action={<AddRowButton label="Add first hotel" onClick={addHotel} />}
            />
          }
          renderItem={(h, { handle }) => {
            const i = hotels.findIndex((x) => x.id === h.id);
            return (
              <SortableRowCard
                handle={handle}
                onDelete={() => setTravel({ hotels: hotels.filter((_, idx) => idx !== i) })}
                rootProps={{ 'data-pl-hotel-row-id': h.id }}
              >
                {/* Name spans full width — it's the primary edit
                    surface and was getting truncated to a 50%
                    column on narrow inspector widths. Distance +
                    Price share a row underneath since they're
                    short. Booking URL + Address keep their own
                    rows because URLs/addresses are long. */}
                <Field
                  label="Name"
                  help="Type to search Google Places — picking re-fills distance + blurb."
                >
                  <HotelRowName
                    manifest={manifest}
                    hotel={h}
                    onText={(name) => updateHotel(i, { name })}
                    onPick={(enriched) => updateHotel(i, enriched)}
                  />
                </Field>
                {(h.rating || h.amenities) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      padding: '4px 0 8px',
                      fontSize: 11,
                      color: 'var(--ink-soft)',
                    }}
                  >
                    {typeof h.rating === 'number' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '3px 8px',
                          background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                          color: 'var(--peach-ink, #C6703D)',
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      >
                        ★ {h.rating.toFixed(1)}
                        {h.ratingCount ? ` · ${h.ratingCount.toLocaleString()} reviews` : ''}
                      </span>
                    )}
                    {h.amenities && (
                      <span style={{ alignSelf: 'center', fontSize: 10.5 }}>{h.amenities}</span>
                    )}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Distance">
                    <TextInput
                      value={h.distance ?? ''}
                      onChange={(e) => updateHotel(i, { distance: e.target.value })}
                      placeholder="0.4 mi · ~1 min"
                    />
                  </Field>
                  <Field label="Price">
                    <TextInput
                      value={h.price ?? ''}
                      onChange={(e) => updateHotel(i, { price: e.target.value })}
                      placeholder="$189/night"
                    />
                  </Field>
                </div>
                <Field label="Booking URL">
                  <TextInput
                    value={h.bookingUrl ?? ''}
                    onChange={(e) => updateHotel(i, { bookingUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Address">
                  <TextInput
                    value={h.address ?? ''}
                    onChange={(e) => updateHotel(i, { address: e.target.value })}
                    placeholder="100 Las Olas Blvd, Fort Lauderdale, FL"
                  />
                </Field>
                <Field label="Short description">
                  <TextArea
                    rows={2}
                    value={h.description ?? ''}
                    onChange={(e) => updateHotel(i, { description: e.target.value })}
                    placeholder="Six rooms, a library, a very good porch."
                  />
                </Field>
                <BadgesEditor<AutoBadgeKey>
                  badges={h.badges ?? {}}
                  onChange={(next) => updateHotel(i, { badges: next })}
                  autoLabels={AUTO_BADGE_LABELS}
                  placeholder="Couple's pick, Mom's favourite, Pet-friendly..."
                />
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>

      <PanelSection
        label="Airports"
        hint="Search to add. Pear computes drive time from the venue and tags the closest one."
      >
        <AirportsField manifest={manifest} onChange={onChange} />
      </PanelSection>
    </PanelGroup>
  );
}

// ── AirportsField ──────────────────────────────────────────
// Stores AirportEntry[] on travelInfo.airports. Each pick uses
// PlaceAutocomplete with kind='airport' biased to the venue's
// lat/lng so a host typing "LAX" near a Greek venue still
// resolves to the right airport. On pick we compute the
// venue→airport distance + drive-time hint client-side via
// haversine + 2.8min/mi.
function AirportsField({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const l = manifest.logistics ?? {};
  const venueNear = l.venueLat && l.venueLng ? { lat: l.venueLat, lng: l.venueLng } : null;
  const airportsRaw = manifest.travelInfo?.airports ?? [];
  // Normalize: legacy strings → { name: string }.
  const airports = airportsRaw.map((a) =>
    typeof a === 'string' ? { id: `airport-legacy-${a.replace(/\W/g, '-')}`, name: a } : a,
  );
  const [query, setQuery] = useState('');

  function persist(next: typeof airports) {
    const cur = manifest.travelInfo ?? { airports: [], hotels: [] };
    onChange({
      ...manifest,
      travelInfo: { ...cur, airports: next },
    } as unknown as StoryManifest);
  }

  function addAirport(p: { id: string; name: string; address: string; lat?: number; lng?: number; websiteUri?: string }) {
    // Drive time hint — same formula as the hotel route.
    let distance = '';
    if (typeof l.venueLat === 'number' && typeof l.venueLng === 'number' && typeof p.lat === 'number' && typeof p.lng === 'number') {
      const R = 6371000;
      const phi1 = (l.venueLat * Math.PI) / 180;
      const phi2 = (p.lat * Math.PI) / 180;
      const dPhi = ((p.lat - l.venueLat) * Math.PI) / 180;
      const dLambda = ((p.lng - l.venueLng) * Math.PI) / 180;
      const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
      const meters = 2 * R * Math.asin(Math.sqrt(a));
      const miles = meters / 1609.344;
      const driveMin = Math.max(1, Math.round(miles * 2.8));
      if (miles < 0.5) distance = `${miles.toFixed(2)} mi · ~${driveMin} min drive`;
      else if (miles < 10) distance = `${miles.toFixed(1)} mi · ~${driveMin} min drive`;
      else distance = `${Math.round(miles)} mi · ~${driveMin} min drive`;
    }
    // Try to extract a 3-letter IATA code from the parenthetical
    // suffix Google often returns ("Los Angeles International (LAX)").
    const codeMatch = /\(([A-Z]{3})\)/.exec(p.name);
    const entry = {
      id: `airport-${Date.now().toString(36)}`,
      name: p.name,
      code: codeMatch?.[1],
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      distance,
      websiteUri: p.websiteUri,
    };
    persist([...airports, entry]);
    setQuery('');
  }

  function removeAirport(id: string | undefined) {
    if (!id) return;
    persist(airports.filter((a) => a.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PlaceAutocomplete
        kind="airport"
        placeholder={venueNear ? 'Search airports near your venue' : 'JFK, LAX, Dublin Airport…'}
        value={query}
        onChangeText={setQuery}
        near={venueNear}
        nearLabel="Near venue"
        onSelect={(place) => addAirport(place)}
      />
      {airports.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {airports.map((a) => (
            <li
              key={a.id ?? a.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {a.name}
                  {a.code && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--peach-ink, #C6703D)', marginLeft: 6, letterSpacing: '0.06em' }}>
                      {a.code}
                    </span>
                  )}
                </div>
                {a.distance && (
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{a.distance}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAirport(a.id)}
                aria-label={`Remove ${a.name}`}
                style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: 'transparent', border: 'none',
                  color: 'var(--ink-soft)', cursor: 'pointer',
                  fontSize: 14, lineHeight: 1,
                }}
              >×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
