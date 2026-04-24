'use client';

import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelSection, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';

type Hotel = { id: string; name: string; distance?: string; price?: string; description?: string; bookingUrl?: string };

function HotelsAI({ manifest, onResult }: { manifest: StoryManifest; onResult: (h: Hotel[]) => void }) {
  const l = manifest.logistics ?? {};
  const canRun = !!(l.venue || l.venueAddress);
  const { state, error, run } = useAICall(async () => {
    const res = await fetch('/api/ai-hotels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venueAddress: l.venueAddress,
        venueCity: l.venue,
        eventDate: l.date,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't fetch hotels (${res.status})`);
    }
    const data = (await res.json()) as { hotels?: Array<{ name: string; description?: string; priceRange?: string; distance?: string; url?: string }> };
    const now = Date.now();
    const next: Hotel[] = (data.hotels ?? []).map((h, i) => ({
      id: `htl-ai-${now.toString(36)}-${i}`,
      name: h.name,
      description: h.description,
      price: h.priceRange,
      distance: h.distance,
      bookingUrl: h.url,
    }));
    if (!next.length) throw new Error('No hotels returned');
    onResult(next);
    return next;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AIHint>
        Pear scans your venue and picks 3–5 hotels guests will actually like. Add + edit them from here.
      </AIHint>
      <AISuggestButton
        label={canRun ? 'Suggest hotels near my venue' : 'Add a venue first'}
        runningLabel="Scouting hotels…"
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
    onChange({
      ...manifest,
      travel: { ...(manifest as unknown as { travel?: Record<string, unknown> }).travel, ...patch },
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
    <div>
      <PanelSection label="The venue" hint="Pulls from the hero section.">
        <Field label="Venue name">
          <TextInput
            value={logistics.venue ?? ''}
            onChange={(e) => onChange({ ...manifest, logistics: { ...logistics, venue: e.target.value || undefined } })}
            placeholder="The Wildflower Barn"
          />
        </Field>
        <Field label="Address" help="Used to render directions + the map.">
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
                  <Field label="Name">
                    <TextInput value={h.name} onChange={(e) => updateHotel(i, { name: e.target.value })} />
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
    </div>
  );
}
