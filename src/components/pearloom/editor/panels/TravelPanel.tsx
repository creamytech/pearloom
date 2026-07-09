'use client';

/* eslint-disable no-restricted-syntax */
/* Real Google Places-backed travel section editor.

   Host types into the search box → debounced POST /api/places/search
   with the venue lat/lng (when known) as the locality bias → results
   show in a dropdown. Click a result → POST /api/places/details to
   get the full record (photos, opening hours, phone, website) → write
   a HotelBlock onto manifest.travelInfo.hotels[].

   Existing manifest.travelInfo.hotels[] entries render as a removable
   list above the search; "Getting there" (manifest.travelInfo.directions)
   stays at the bottom. */

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest, HotelBlock, TravelInfo } from '@/types';
import { Icon } from '../../motifs';
import {
  FGroup,
  FInput,
  FSuggest,
  FToggleStandalone,
  PearChip,
  SectionPanelShell,
  SectionVisibilityFooter,
  Stars,
  useCopyOverride,
  useSectionHidden,
} from './_section-atoms';
import { pearErrorMessage } from '../../redesign/PearAssist';
import { moveItem, ReorderHandle } from './_reorder';
import { travelDirectionsSuggestions, smartContext } from './_suggestions';

/* Place-search result shape from /api/places/search/route.ts. */
interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  location?: { lat: number; lng: number };
}

/* Place-details shape from /api/places/details/route.ts. */
interface PlaceDetails {
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

/* Derive a comma-separated amenities line from Places `types[]`.
   Google returns slugs like `spa`, `lodging`, `restaurant` — we
   show the human-friendly subset that's likely to read like an
   amenity. Order matches the slug-list precedence. */
const TYPE_TO_AMENITY: Record<string, string> = {
  spa: 'Spa',
  swimming_pool: 'Pool',
  restaurant: 'Restaurant',
  bar: 'Bar',
  gym: 'Gym',
  parking: 'Parking',
  beach: 'Beach',
  fitness_center: 'Fitness',
  meal_takeaway: 'Takeout',
  meal_delivery: 'Delivery',
  pet_friendly: 'Pet-friendly',
};
function amenitiesFromTypes(types?: string[]): string | undefined {
  if (!Array.isArray(types) || types.length === 0) return undefined;
  const seen = new Set<string>();
  const pretty: string[] = [];
  for (const t of types) {
    const a = TYPE_TO_AMENITY[t];
    if (a && !seen.has(a)) {
      seen.add(a);
      pretty.push(a);
    }
  }
  if (pretty.length === 0) return undefined;
  return pretty.slice(0, 5).join(' · ');
}

/* Build a HotelBlock from a /places/details payload. Anything the
   details endpoint doesn't supply is left undefined so the renderer's
   fallback chain takes over. */
function detailsToHotel(d: PlaceDetails): HotelBlock {
  return {
    id: d.placeId,
    name: d.name,
    address: d.formattedAddress,
    bookingUrl: d.website,
    photoUrl: d.photoUrl,
    photoUrls: d.photoUrls,
    lat: d.location?.lat,
    lng: d.location?.lng,
    rating: d.rating,
    ratingCount: d.userRatingCount,
    priceLevel: d.priceLevel,
    amenities: amenitiesFromTypes(d.types),
    description: d.editorialSummary,
    notes: undefined,
  };
}

/* Stable id for a HotelBlock that may have been authored manually
   without a placeId. Used as the React key + delete predicate. */
function hotelKey(h: HotelBlock, fallbackIndex: number): string {
  return h.id || `${h.name}|${h.address}|${fallbackIndex}`;
}

export function TravelPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'travel');
  const hotels: HotelBlock[] = manifest.travelInfo?.hotels ?? [];
  const directions = manifest.travelInfo?.directions ?? '';
  const [travelEyebrow, setTravelEyebrow] = useCopyOverride(manifest, onChange, 'travelEyebrow');
  const venueAddress = manifest.logistics?.venue ?? '';

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Persist a travelInfo patch back to the manifest. Keeps unrelated
     travelInfo fields (airports, transit, etc.) intact. */
  function patchTravel(patch: Partial<TravelInfo>) {
    const next = {
      ...manifest,
      travelInfo: {
        airports: manifest.travelInfo?.airports ?? [],
        hotels: manifest.travelInfo?.hotels ?? [],
        ...(manifest.travelInfo ?? {}),
        ...patch,
      },
    } as StoryManifest;
    onChange(next);
  }

  const setDirections = (v: string) => patchTravel({ directions: v });

  /* Debounced search — wait 280ms after the last keystroke before
     hitting the API so the host can finish typing without burning
     a quota on every keystroke. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => { void runSearch(q); }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function runSearch(query: string) {
    setSearching(true); setErr(null);
    try {
      const body: { query: string; near?: { lat: number; lng: number } } = { query };
      /* Bias results around the venue when we have lat/lng. PlaceAutocomplete
         caches these onto manifest.logistics.venueLat/Lng when the host
         picks a venue; without them the search is global, which is fine
         but less precise. */
      const lat = manifest.logistics?.venueLat;
      const lng = manifest.logistics?.venueLng;
      if (typeof lat === 'number' && typeof lng === 'number') body.near = { lat, lng };
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[travel] place search failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'The search didn’t come back, try again?');
      }
      const data = await res.json() as { results?: SearchResult[]; fallback?: boolean };
      setResults(Array.isArray(data.results) ? data.results : []);
      setOpen(true);
    } catch (e) {
      console.error('[travel] place search error:', e);
      setErr(pearErrorMessage(e, 'The search didn’t come back, try again?'));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addHotel(r: SearchResult) {
    if (adding) return;
    setAdding(r.placeId); setErr(null);
    try {
      const res = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: r.placeId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[travel] place details failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Couldn’t add that hotel, try again?');
      }
      const data = await res.json() as { details?: PlaceDetails | null; fallback?: boolean };
      /* Fallback to the cheap search-result shape when details fails —
         the host still gets a hotel block, just without photos/website. */
      const hotel: HotelBlock = data.details
        ? detailsToHotel(data.details)
        : {
            id: r.placeId,
            name: r.name,
            address: r.address,
            rating: r.rating,
            ratingCount: r.userRatingCount,
            priceLevel: r.priceLevel,
            lat: r.location?.lat,
            lng: r.location?.lng,
            amenities: amenitiesFromTypes(r.types),
          };
      const next = [...hotels];
      /* Replace existing entry with the same placeId so re-adding a
         hotel refreshes its data instead of duplicating it. */
      const existingIdx = next.findIndex((h) => h.id && h.id === hotel.id);
      if (existingIdx >= 0) next[existingIdx] = hotel;
      else next.push(hotel);
      patchTravel({ hotels: next });
      setQ('');
      setResults([]);
      setOpen(false);
    } catch (e) {
      console.error('[travel] add hotel error:', e);
      setErr(pearErrorMessage(e, 'Couldn’t add that hotel, try again?'));
    } finally {
      setAdding(null);
    }
  }

  function removeHotel(key: string) {
    const next = hotels.filter((h, i) => hotelKey(h, i) !== key);
    patchTravel({ hotels: next });
  }

  /** Per-stay field writer — booking link, group code, guest note. */
  function updateHotel(key: string, patch: Partial<HotelBlock>) {
    patchTravel({ hotels: hotels.map((h, i) => (hotelKey(h, i) === key ? { ...h, ...patch } : h)) });
  }

  const placeholder = venueAddress
    ? `Hotels near ${venueAddress.split(',')[0].trim()}…`
    : 'Search hotels & venues…';

  /* One-tap hotel finder — only when we have venue coordinates to
     bias the search (PlaceAutocomplete caches venueLat/Lng onto
     manifest.logistics when the host picks a venue) AND the host
     hasn't added any hotels yet. Setting q runs the exact same
     debounced search flow as typing — a visible affordance, never
     an auto-fired network call on mount. */
  const venueLat = manifest.logistics?.venueLat;
  const venueLng = manifest.logistics?.venueLng;
  const hasVenueCoords = typeof venueLat === 'number' && typeof venueLng === 'number';
  const venueShort = venueAddress ? venueAddress.split(',')[0].trim() : '';
  const showHotelFinder = hasVenueCoords && hotels.length === 0 && !q.trim();

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── Zip VenueSearch layout (section-fields.jsx L76-160):
              map-style search · Your hotel block · N · Getting there.
              Production keeps the REAL Google Places search in the
              search slot (never the faux map). The production-only
              eyebrow override lives tucked under "More" below so the
              default order is 1:1. */}
        {/* Real Places search */}
        <FGroup label="Find hotels & venues" action={<PearChip>Powered by Google</PearChip>}>
          {showHotelFinder && (
            <button
              type="button"
              onClick={() => { setQ('hotels'); setOpen(true); }}
              disabled={searching}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 999,
                background: 'var(--peach-bg)',
                border: '1px solid rgba(198,112,61,0.22)',
                fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)',
                cursor: searching ? 'wait' : 'pointer',
              }}
            >
              <Icon name="search" size={11} color="var(--peach-ink)" />
              Find hotels near {venueShort || 'the venue'}
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <FInput
              value={q}
              onChange={(v) => { setQ(v); setOpen(true); }}
              placeholder={placeholder}
              icon="search"
            />
            {searching && (
              <div style={{ position: 'absolute', right: 12, top: 13, fontSize: 11, fontWeight: 600, color: 'var(--peach-ink)' }}>
                Searching…
              </div>
            )}
            {open && results.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 42, zIndex: 20, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
                {results.map((r) => {
                  const inBlock = hotels.some((h) => h.id === r.placeId);
                  const isAdding = adding === r.placeId;
                  return (
                    <button
                      key={r.placeId}
                      onClick={() => !inBlock && !isAdding && addHotel(r)}
                      disabled={inBlock || isAdding}
                      style={{
                        width: '100%', display: 'flex', gap: 10, alignItems: 'center',
                        padding: '10px 12px', textAlign: 'left',
                        borderBottom: '1px solid var(--line-soft)',
                        cursor: inBlock ? 'default' : isAdding ? 'wait' : 'pointer',
                        background: inBlock ? 'var(--cream-2)' : 'transparent',
                        border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        opacity: inBlock ? 0.65 : 1,
                      }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--sage-bg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name="home" size={14} color="var(--sage-deep)" />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-muted)' }}>
                          {typeof r.rating === 'number' && <><Stars r={r.rating} size={9} /> {r.rating.toFixed(1)}{r.userRatingCount ? ` (${r.userRatingCount})` : ''}</>}
                          {r.priceLevel && <> · {r.priceLevel}</>}
                        </span>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.address}
                        </span>
                      </span>
                      <Icon
                        name={inBlock ? 'check' : isAdding ? 'sparkles' : 'plus'}
                        size={14}
                        color={inBlock ? 'var(--sage-deep)' : 'var(--peach-ink)'}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {err && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11.5, color: '#7A2D2D' }}>
              {err}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="sparkles" size={11} color="var(--gold)" /> Ratings, photos &amp; amenities come from Google Places.
          </div>
        </FGroup>

        {/* Hotel block list — reads from manifest.travelInfo.hotels[] */}
        <FGroup label={`Your hotel block · ${hotels.length}`}>
          {hotels.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', background: 'var(--cream-2)', borderRadius: 11, fontSize: 12.5, color: 'var(--ink-muted)' }}>
              No hotels added yet. Search above to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {hotels.map((h, i) => {
                const key = hotelKey(h, i);
                return (
                  <div key={key} style={{ borderRadius: 13, border: '1px solid var(--line)', background: 'var(--card)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 10, padding: 10 }}>
                      {h.photoUrl ? (
                        <div style={{ width: 58, height: 58, borderRadius: 9, background: `var(--cream-2) center / cover no-repeat url("${h.photoUrl.replace(/"/g, '%22')}")`, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 58, height: 58, borderRadius: 9, background: 'linear-gradient(140deg, var(--sage-bg), var(--peach-bg))', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                          <Icon name="home" size={18} color="var(--sage-deep)" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {/* First hotel = the lead card in every
                                travel layout — order is a real pick. */}
                            <ReorderHandle
                              index={i}
                              count={hotels.length}
                              label={h.name || 'hotel'}
                              onMove={(from, to) => {
                                const next = moveItem(hotels, from, to);
                                if (next !== hotels) patchTravel({ hotels: next });
                              }}
                            />
                            <button
                              onClick={() => removeHotel(key)}
                              aria-label={`Remove ${h.name}`}
                              style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                            >
                              <Icon name="close" size={11} color="var(--ink-muted)" />
                            </button>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          {typeof h.rating === 'number' && (
                            <>
                              <Stars r={h.rating} size={10} /> <b style={{ color: 'var(--ink)' }}>{h.rating.toFixed(1)}</b>
                              {h.ratingCount ? <span style={{ color: 'var(--ink-muted)' }}>({h.ratingCount})</span> : null}
                            </>
                          )}
                          {h.priceLevel && <span style={{ color: 'var(--ink-muted)' }}>· {h.priceLevel}</span>}
                        </div>
                        {h.address && (
                          <div style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            <Icon name="pin" size={10} /> {h.address}
                          </div>
                        )}
                      </div>
                    </div>
                    {(h.amenities || h.description) && (
                      <div style={{ padding: '0 10px 10px' }}>
                        {h.description && (
                          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: h.amenities ? 7 : 0 }}>
                            {h.description}
                          </div>
                        )}
                        {h.amenities && (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {h.amenities.split(/[·,]/).map((a) => a.trim()).filter(Boolean).map((a) => (
                              <span key={a} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 8px', borderRadius: 999 }}>{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Stay details — the fields guests actually need
                        (host request 2026-06-13): a real Book-now
                        button, the room-block code, a note in the
                        host's words. Open by default when the host
                        already filled something in. */}
                    <details
                      open={Boolean(h.bookingUrl || h.groupRate)}
                      style={{ borderTop: '1px solid var(--line-soft)' }}
                    >
                      <summary style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>
                        Booking & details {h.bookingUrl || h.groupRate ? '· set' : ''}
                      </summary>
                      <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <FInput
                          value={h.bookingUrl ?? ''}
                          onChange={(v) => updateHotel(key, { bookingUrl: v || undefined })}
                          placeholder="Booking link, adds a Book now button"
                          type="url"
                        />
                        <FInput
                          value={h.groupRate ?? ''}
                          onChange={(v) => updateHotel(key, { groupRate: v || undefined })}
                          placeholder="Group code, e.g. SCOTT2026 (tap-to-copy chip)"
                        />
                        <FInput
                          value={h.description ?? ''}
                          onChange={(v) => updateHotel(key, { description: v || undefined })}
                          placeholder="A note for guests, '10 min walk, mention our block'"
                        />
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </FGroup>

        <FGroup label="Getting there">
          {(() => {
            const sug = travelDirectionsSuggestions(smartContext(manifest));
            return (
              <FSuggest
                value={directions}
                onChange={setDirections}
                placeholder="Fly into Santorini (JTR), 20 min by taxi"
                options={sug.options}
                hint={sug.hint}
              />
            );
          })()}
          <div style={{ height: 8 }} />
          <ShuttleToggle manifest={manifest} onChange={onChange} />
        </FGroup>

        <details className="pl-panel-more">
          <summary
            style={{
              cursor: 'pointer', listStyle: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}
          >
            <Icon name="chev-down" size={12} /> More, eyebrow
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
              <FInput value={travelEyebrow} onChange={setTravelEyebrow} placeholder="Getting there" />
            </FGroup>
          </div>
        </details>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Travel" />
      </div>
    </SectionPanelShell>
  );
}

export default TravelPanel;

/* ─── ShuttleToggle ───────────────────────────────────────────
   Persists manifest.travelInfo.shuttle = { enabled, note } so the
   canvas can render a shuttle callout. When enabled, reveals a
   small free-text input for the host to add a custom shuttle
   note (e.g. "Pickup from the hotel lobby at 5:15 PM"). */

function ShuttleToggle({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const loose = manifest as unknown as { travelInfo?: { shuttle?: { enabled?: boolean; note?: string } } };
  const shuttle = loose.travelInfo?.shuttle ?? {};
  const enabled = !!shuttle.enabled;
  const note = shuttle.note ?? '';
  const patch = (next: { enabled?: boolean; note?: string }) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    travelInfo: {
      ...(manifest.travelInfo ?? {}),
      shuttle: { ...shuttle, ...next },
    },
  } as unknown as StoryManifest);
  return (
    <>
      <FToggleStandalone
        label="Show a shuttle schedule"
        sub={enabled ? 'A shuttle callout appears under the hotel list.' : 'Pear can build it from your timeline'}
        def={enabled}
        onChange={(v) => patch({ enabled: v })}
      />
      {enabled && (
        <div style={{ marginTop: 6 }}>
          <FInput
            value={note}
            onChange={(v) => patch({ note: v })}
            icon="clock"
            placeholder="Pickup from the hotel lobby at 5:15 PM"
          />
        </div>
      )}
    </>
  );
}
