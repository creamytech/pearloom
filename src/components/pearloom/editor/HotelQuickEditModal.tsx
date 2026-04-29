'use client';

// ─────────────────────────────────────────────────────────────
// HotelQuickEditModal — listens for `pearloom:hotel-quick-edit`
// events from the canvas and opens a paper-styled modal with:
//
//   • A scrollable left sidebar listing every hotel — clicking
//     a row swaps focus to that hotel inside the modal without
//     closing it. Acts like a tabbed editor.
//   • A wide right pane with the focused hotel's full editor:
//     name (Google Places search), address, photo URL, price,
//     distance, booking URL, description, badge editor.
//   • A search row at the very top — pick a Google Place and a
//     fully-enriched hotel slots in (and the modal selects it).
//
// Why a modal instead of just routing to the side panel: the
// inspector is fixed at ~380px wide, which crowds long fields
// like booking URLs and addresses. The modal opens to ~960px so
// the host has real space + can compare hotels in the sidebar.
//
// All writes route through the same setTravel pattern the panel
// uses so manifest.travel.hotels + manifest.travelInfo.hotels
// stay in lockstep — published canvas updates live on every edit.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, TextArea, TextInput } from './atoms';
import { BadgesEditor } from './panels/BadgesEditor';
import { PlaceAutocomplete } from './panels/PlaceAutocomplete';
import { Icon } from '../motifs';
import { stableHotelId } from '@/lib/hotel-id';
import { QuickEditModalShell } from './QuickEditModalShell';

interface HotelLike {
  id: string;
  name: string;
  address?: string;
  distance?: string;
  price?: string;
  description?: string;
  bookingUrl?: string;
  photoUrl?: string;
  photoUrls?: string[];
  rating?: number;
  ratingCount?: number;
  amenities?: string;
  lat?: number;
  lng?: number;
  badges?: {
    hideAuto?: Array<'top' | 'closest' | 'value'>;
    custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }>;
  };
}

const AUTO_BADGE_LABELS: Record<'top' | 'closest' | 'value', string> = {
  top: "Pear's pick",
  closest: 'Closest',
  value: 'Best value',
};

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Layout mode. 'modal' (default) opens centered with a backdrop;
   *  'panel' renders inline in its parent so the inspector can host
   *  the same UX without a centered overlay. Pilot for the
   *  modal-vs-panel consolidation question. */
  dock?: 'modal' | 'panel';
}

export function HotelQuickEditModal({ manifest, onChange, dock = 'modal' }: Props) {
  const [openHotelId, setOpenHotelId] = useState<string | null>(null);

  // Listen for canvas → modal open requests.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ hotelId?: string }>).detail;
      if (!detail?.hotelId) return;
      setOpenHotelId(detail.hotelId);
    }
    window.addEventListener('pearloom:hotel-quick-edit', onOpen);
    return () => window.removeEventListener('pearloom:hotel-quick-edit', onOpen);
  }, []);

  // Escape to close, freeze body scroll while open.
  useEffect(() => {
    if (!openHotelId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenHotelId(null);
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openHotelId]);

  const hotels = useMemo<HotelLike[]>(() => {
    const raw = ((manifest as unknown as { travel?: { hotels?: HotelLike[] } }).travel?.hotels ?? []);
    // Same id-rehydration the panel does — defensive. Without it,
    // legacy hotels without an id all collide on findIndex.
    return raw.map((h, i) => ({ ...h, id: h.id || stableHotelId(h, i) }));
  }, [manifest]);

  const focused = hotels.find((h) => h.id === openHotelId) ?? hotels[0] ?? null;

  const setTravel = useCallback((nextHotels: HotelLike[]) => {
    const existingLegacy = (manifest as unknown as { travel?: Record<string, unknown> }).travel ?? {};
    const withIds = nextHotels.map((h, i) => ({ ...h, id: h.id || stableHotelId(h, i) }));
    const legacyTravel = { ...existingLegacy, hotels: withIds };
    const existingInfo = manifest.travelInfo ?? { airports: [], hotels: [] };
    // Project to the renderer shape too — same projection setTravel
    // uses in the panel so the canvas updates immediately.
    const hotelsForRender = withIds.map((h, i) => ({
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
      description: h.description,
      badges: h.badges,
    }));
    onChange({
      ...manifest,
      travel: legacyTravel,
      travelInfo: {
        ...existingInfo,
        airports: existingInfo.airports ?? [],
        hotels: hotelsForRender as typeof existingInfo.hotels,
      },
    } as unknown as StoryManifest);
  }, [manifest, onChange]);

  const updateHotel = useCallback((id: string, patch: Partial<HotelLike>) => {
    setTravel(hotels.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, [hotels, setTravel]);

  const removeHotel = useCallback((id: string) => {
    const idx = hotels.findIndex((h) => h.id === id);
    const next = hotels.filter((h) => h.id !== id);
    setTravel(next);
    // Switch focus to a neighbouring hotel so the modal stays
    // useful after a delete.
    if (next.length === 0) {
      setOpenHotelId(null);
      return;
    }
    const fallback = next[Math.min(idx, next.length - 1)];
    setOpenHotelId(fallback.id);
  }, [hotels, setTravel]);

  const addHotel = useCallback((h: HotelLike) => {
    const id = h.id || stableHotelId(h, hotels.length);
    setTravel([...hotels, { ...h, id }]);
    setOpenHotelId(id);
  }, [hotels, setTravel]);

  return (
    <QuickEditModalShell
      dock={dock}
      open={!!openHotelId && !!focused}
      title="Places to stay"
      focusedTitle={focused?.name || 'Untitled hotel'}
      items={hotels.map((h) => ({
        id: h.id,
        label: h.name || 'Untitled',
        sublabel: h.distance ?? h.address ?? '',
        photoUrl: h.photoUrl,
        icon: 'moon',
      }))}
      focusedId={focused?.id ?? null}
      onFocusChange={(id) => setOpenHotelId(id)}
      onReorder={(orderedIds) => {
        const byId = new Map(hotels.map((h) => [h.id, h]));
        const next = orderedIds.map((id) => byId.get(id)).filter((h): h is HotelLike => Boolean(h));
        // Keep any hotel that wasn't in the visible window — defensive.
        const seen = new Set(orderedIds);
        const tail = hotels.filter((h) => !seen.has(h.id));
        setTravel([...next, ...tail]);
      }}
      onBulkDelete={(ids) => {
        const idSet = new Set(ids);
        const next = hotels.filter((h) => !idSet.has(h.id));
        const snapshot = hotels;
        setTravel(next);
        // Drop the focused row to a survivor so the editor pane
        // doesn't render a stale hotel after a bulk wipe.
        if (next.length === 0) setOpenHotelId(null);
        else if (focused && idSet.has(focused.id)) setOpenHotelId(next[0].id);
        // Return the restore callback the shell will wire to the
        // undo toast — clicking Undo writes the snapshot back.
        return () => setTravel(snapshot);
      }}
      onBulkTag={(ids, badge) => {
        const idSet = new Set(ids);
        const next = hotels.map((h) => {
          if (!idSet.has(h.id)) return h;
          const cur = h.badges?.custom ?? [];
          return {
            ...h,
            badges: {
              ...(h.badges ?? {}),
              custom: [
                ...cur,
                {
                  id: `bdg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
                  label: badge.label,
                  tone: badge.tone,
                },
              ],
            },
          };
        });
        setTravel(next);
      }}
      onClose={() => setOpenHotelId(null)}
      searchSlot={
        <Field label="Add another hotel" help="Real Google Places search. Picking enriches the row with rating + amenities + distance from venue.">
          <ModalHotelSearch manifest={manifest} onAdd={addHotel} />
        </Field>
      }
      editorSlot={
        focused ? (
          <HotelEditor
            hotel={focused}
            manifest={manifest}
            onChange={(patch) => updateHotel(focused.id, patch)}
            onRemove={() => removeHotel(focused.id)}
          />
        ) : null
      }
    />
  );
}

function HotelEditor({
  hotel,
  manifest,
  onChange,
  onRemove,
}: {
  hotel: HotelLike;
  manifest: StoryManifest;
  onChange: (patch: Partial<HotelLike>) => void;
  onRemove: () => void;
}) {
  const venueLat = manifest.logistics?.venueLat;
  const venueLng = manifest.logistics?.venueLng;
  const venueNear = venueLat != null && venueLng != null ? { lat: venueLat, lng: venueLng } : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Meta strip: rating + amenities */}
      {(hotel.rating || hotel.amenities) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {typeof hotel.rating === 'number' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 9px',
                background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                color: 'var(--peach-ink, #C6703D)',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              ★ {hotel.rating.toFixed(1)}
              {hotel.ratingCount ? ` · ${hotel.ratingCount.toLocaleString()} reviews` : ''}
            </span>
          )}
          {hotel.amenities && (
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{hotel.amenities}</span>
          )}
        </div>
      )}

      <Field label="Photos" help="Drag a tile to reorder — the first one is the primary thumbnail. Tap × to remove, + to upload.">
        <HotelPhotoStrip
          photoUrl={hotel.photoUrl}
          photoUrls={hotel.photoUrls ?? []}
          onChange={(next) => {
            // The renderer reads `photoUrls[0]` for its carousel
            // and `photoUrl` for the legacy single-photo path; keep
            // both in sync so older renderers and the v8 card agree.
            onChange({ photoUrl: next[0], photoUrls: next });
          }}
        />
      </Field>

      <Field label="Name" help="Type to search Google Places — picking re-fills distance, blurb, photos.">
        <PlaceAutocomplete
          kind="hotel"
          value={hotel.name}
          onChangeText={(name) => onChange({ name })}
          onSelect={(place) => {
            onChange({
              name: place.name || hotel.name,
              address: place.address ?? hotel.address,
              lat: place.lat,
              lng: place.lng,
              bookingUrl: place.websiteUri ?? hotel.bookingUrl,
            });
          }}
          near={venueNear}
          nearLabel="Near venue"
          placeholder="Search hotels"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Distance">
          <TextInput
            value={hotel.distance ?? ''}
            onChange={(e) => onChange({ distance: e.target.value })}
            placeholder="0.4 mi · ~1 min"
          />
        </Field>
        <Field label="Price">
          <TextInput
            value={hotel.price ?? ''}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="$189/night"
          />
        </Field>
      </div>

      <Field label="Booking URL">
        <TextInput
          value={hotel.bookingUrl ?? ''}
          onChange={(e) => onChange({ bookingUrl: e.target.value })}
          placeholder="https://…"
        />
      </Field>

      <Field label="Address">
        <TextInput
          value={hotel.address ?? ''}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="100 Las Olas Blvd, Fort Lauderdale, FL"
        />
      </Field>

      <Field label="Short description">
        <TextArea
          rows={3}
          value={hotel.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Six rooms, a library, a very good porch."
        />
      </Field>

      <BadgesEditor<'top' | 'closest' | 'value'>
        badges={hotel.badges ?? {}}
        onChange={(next) => onChange({ badges: next as HotelLike['badges'] })}
        autoLabels={AUTO_BADGE_LABELS}
        placeholder="Couple's pick, Pet-friendly, Walk to venue…"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--line-soft)', marginTop: 6 }}>
        <button
          type="button"
          onClick={onRemove}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid rgba(122,45,45,0.25)',
            background: 'transparent',
            color: '#7A2D2D',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="close" size={11} />
          Remove this hotel
        </button>
      </div>
    </div>
  );
}

// Inline search row — same shape as the panel's HotelSearchRow,
// but lives inside the modal so a host can grow the list without
// closing it. Calls the same /api/hotels/enrich endpoint to
// hydrate amenities / distance / blurb / photos on pick.
function ModalHotelSearch({
  manifest,
  onAdd,
}: {
  manifest: StoryManifest;
  onAdd: (h: HotelLike) => void;
}) {
  const [busy, setBusy] = useState(false);
  const venueLat = manifest.logistics?.venueLat;
  const venueLng = manifest.logistics?.venueLng;
  const venueNear = venueLat != null && venueLng != null ? { lat: venueLat, lng: venueLng } : null;

  return (
    <PlaceAutocomplete
      kind="hotel"
      value=""
      onChangeText={() => {}}
      onSelect={async (place) => {
        if (busy) return;
        setBusy(true);
        try {
          const res = await fetch('/api/hotels/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              placeId: place.id,
              venueLat,
              venueLng,
              venueCity: manifest.logistics?.venue,
              eventDate: manifest.logistics?.date,
            }),
          });
          const data = res.ok ? (await res.json()) as { hotel?: Partial<HotelLike> & { distanceText?: string; priceLevel?: string; blurb?: string } } : null;
          const h = data?.hotel;
          onAdd({
            id: stableHotelId({ name: place.name, address: place.address }, 0),
            name: h?.name || place.name,
            address: h?.address || place.address,
            bookingUrl: h?.bookingUrl,
            description: h?.blurb || h?.description || '',
            distance: h?.distanceText ?? h?.distance,
            price: h?.priceLevel ?? h?.price,
            photoUrl: h?.photoUrl,
            photoUrls: h?.photoUrls,
            lat: h?.lat ?? place.lat,
            lng: h?.lng ?? place.lng,
            rating: h?.rating,
            ratingCount: h?.ratingCount,
            amenities: h?.amenities,
          });
        } finally {
          setBusy(false);
        }
      }}
      near={venueNear}
      nearLabel="Near venue"
      placeholder="Search a hotel by name…"
    />
  );
}

// HotelPhotoStrip — drag-to-reorder + remove + upload row of
// thumbnails. The first tile is the primary photo (used as
// hotel.photoUrl on the renderer card); the rest fill the in-card
// carousel guests can flip through. Up to 5 photos — extras get
// dropped on add.
function HotelPhotoStrip({
  photoUrl,
  photoUrls,
  onChange,
}: {
  photoUrl?: string;
  photoUrls: string[];
  onChange: (next: string[]) => void;
}) {
  // Merge legacy single photoUrl into the array if it's not already
  // there. Keeps the strip in sync with both shapes.
  const all = useMemo(() => {
    const list = [...photoUrls];
    if (photoUrl && !list.includes(photoUrl)) list.unshift(photoUrl);
    return list.slice(0, 5);
  }, [photoUrl, photoUrls]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const remove = useCallback((idx: number) => {
    const next = all.filter((_, i) => i !== idx);
    onChange(next);
  }, [all, onChange]);

  const reorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    const next = [...all];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }, [all, onChange]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            id: `hotel-${Date.now()}`,
            filename: file.name || 'hotel.jpg',
            mimeType: file.type || 'image/jpeg',
            base64,
            capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          }],
        }),
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = (await res.json()) as { photos?: Array<{ baseUrl?: string }> };
      const url = data.photos?.[0]?.baseUrl;
      if (!url) throw new Error('No URL returned');
      onChange([...all, url].slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setTimeout(() => setError(null), 2400);
    } finally {
      setUploading(false);
    }
  }, [all, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {all.map((url, i) => (
          <div
            key={`${url}-${i}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => {
              if (dragIdx == null) return;
              reorder(dragIdx, i);
              setDragIdx(null);
            }}
            onDragEnd={() => setDragIdx(null)}
            style={{
              position: 'relative',
              width: 96,
              height: 80,
              borderRadius: 10,
              background: `url(${url}) center/cover no-repeat var(--cream-2)`,
              border: i === 0
                ? '1.5px solid var(--peach-ink, #C6703D)'
                : '1px solid var(--line-soft)',
              cursor: 'grab',
              flexShrink: 0,
              opacity: dragIdx === i ? 0.4 : 1,
              transition: 'opacity 140ms ease',
            }}
            title={i === 0 ? 'Primary photo (drag to reorder)' : 'Drag to reorder'}
          >
            {i === 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  padding: '1px 6px',
                  background: 'var(--peach-ink, #C6703D)',
                  color: '#FFFFFF',
                  borderRadius: 999,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove photo"
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: 'rgba(14,13,11,0.78)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
        {all.length < 5 && (
          <label
            style={{
              width: 96,
              height: 80,
              borderRadius: 10,
              background: 'var(--cream-2, #F5EFE2)',
              border: '1.5px dashed var(--peach-ink, #C6703D)',
              color: 'var(--peach-ink, #C6703D)',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-ui)',
              textAlign: 'center',
              flexShrink: 0,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <Icon name={uploading ? 'sparkles' : 'plus'} size={14} />
            <span>{uploading ? 'Uploading…' : 'Add photo'}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <div
          role="alert"
          style={{
            fontSize: 11,
            color: '#7A2D2D',
            padding: '4px 8px',
            background: 'rgba(122,45,45,0.08)',
            border: '1px solid rgba(122,45,45,0.18)',
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

