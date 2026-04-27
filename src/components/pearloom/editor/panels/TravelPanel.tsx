'use client';

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelGroup, PanelSection, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { PlaceAutocomplete } from './PlaceAutocomplete';

type Hotel = {
  id: string;
  name: string;
  distance?: string;
  price?: string;
  description?: string;
  bookingUrl?: string;
  /** Photo URL from Google Places when the host picks a real
   *  hotel — used by the renderer to show a thumbnail instead of
   *  the moon-icon placeholder. */
  photoUrl?: string;
  /** Comma-separated amenities pulled from Place Details. */
  amenities?: string;
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
        priceLevel?: string;
        amenities?: string;
        distanceText?: string;
        photoUrl?: string;
        blurb?: string;
      };
    };
    const h = data.hotel;
    if (!h) throw new Error('empty');
    return {
      id,
      name: h.name || fallback.name,
      // Description prefers Claude's blurb; falls back to amenities,
      // then to the place's address so the row never reads as empty.
      description: h.blurb || h.amenities || h.address || fallback.address,
      bookingUrl: h.websiteUri ?? '',
      distance: h.distanceText ?? '',
      price: h.priceLevel ?? '',
      photoUrl: h.photoUrl,
      amenities: h.amenities,
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
        websiteUri?: string; phone?: string; rating?: number;
        photoUrl?: string; blurb?: string;
      }>;
    };
    const now = Date.now();
    const next: Hotel[] = (data.hotels ?? []).map((h, i) => ({
      id: `htl-real-${now.toString(36)}-${i}`,
      name: h.name,
      description: h.blurb || h.address,
      price: h.priceLevel,
      distance: h.distanceText,
      bookingUrl: h.websiteUri,
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
  return ((manifest as unknown as { travel?: { hotels?: Hotel[] } }).travel?.hotels ?? []) as Hotel[];
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

  function setTravel(patch: { hotels?: Hotel[]; intro?: string; blockCode?: string }) {
    // Write to BOTH the legacy shape (manifest.travel) used by older
    // consumers AND the canonical shape (manifest.travelInfo) that the
    // v8 canvas reads. Without this second write hotels added here
    // never rendered on the site — the canvas only reads travelInfo.
    const existingLegacy = (manifest as unknown as { travel?: Record<string, unknown> }).travel ?? {};
    const nextLegacy = { ...existingLegacy, ...patch };

    // Project Hotel[] → HotelBlock[] for the renderer.
    const hotelsForRender = patch.hotels
      ? patch.hotels.map((h) => ({
          name: h.name,
          address: h.distance ?? '',
          bookingUrl: h.bookingUrl,
          groupRate: h.price,
          notes: h.description,
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
              <SortableRowCard handle={handle} onDelete={() => setTravel({ hotels: hotels.filter((_, idx) => idx !== i) })}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Name" help="Type to search Google Places — picking re-fills distance + blurb.">
                    <HotelRowName
                      manifest={manifest}
                      hotel={h}
                      onText={(name) => updateHotel(i, { name })}
                      onPick={(enriched) => updateHotel(i, enriched)}
                    />
                  </Field>
                  <Field label="Distance">
                    <TextInput
                      value={h.distance ?? ''}
                      onChange={(e) => updateHotel(i, { distance: e.target.value })}
                      placeholder="10 min drive"
                    />
                  </Field>
                  <Field label="Price">
                    <TextInput
                      value={h.price ?? ''}
                      onChange={(e) => updateHotel(i, { price: e.target.value })}
                      placeholder="$189/night"
                    />
                  </Field>
                  <Field label="Booking URL">
                    <TextInput
                      value={h.bookingUrl ?? ''}
                      onChange={(e) => updateHotel(i, { bookingUrl: e.target.value })}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
                <Field label="Short description">
                  <TextArea
                    rows={2}
                    value={h.description ?? ''}
                    onChange={(e) => updateHotel(i, { description: e.target.value })}
                    placeholder="Six rooms, a library, a very good porch."
                  />
                </Field>
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>
    </PanelGroup>
  );
}
