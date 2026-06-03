'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx VenueSearch. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import {
  AddCard,
  FGroup,
  FInput,
  FToggleStandalone,
  PearChip,
  SectionPanelShell,
  Stars,
} from './_section-atoms';

interface Place {
  name: string;
  kind: 'Hotel' | 'Venue';
  rating: number;
  reviews: number;
  price: string;
  dist: string;
  tone: 'warm' | 'lavender' | 'sage' | 'peach';
  amenities: string[];
  blurb: string;
}

const SF_PLACES: Place[] = [
  { name: 'Cosmos Suites', kind: 'Hotel', rating: 4.8, reviews: 412, price: '$$$', dist: '8-min walk', tone: 'warm', amenities: ['Pool', 'Breakfast', 'Caldera view'], blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.' },
  { name: 'Andronis Boutique', kind: 'Hotel', rating: 4.9, reviews: 286, price: '$$$$', dist: '12-min walk', tone: 'lavender', amenities: ['Spa', 'Infinity pool', 'Fine dining'], blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite for weddings.' },
  { name: 'Aria Suites', kind: 'Hotel', rating: 4.6, reviews: 198, price: '$$', dist: '6-min walk', tone: 'sage', amenities: ['Pool', 'Free parking', 'Pet friendly'], blurb: 'Cycladic-style rooms a short stroll from the venue — great mid-range value.' },
  { name: 'Casa Chorro', kind: 'Venue', rating: 4.9, reviews: 0, price: '—', dist: 'The venue', tone: 'peach', amenities: ['Sea view', 'Garden', 'Catering'], blurb: 'Your ceremony & reception venue — a restored villa above the Aegean.' },
];

export function TravelPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  /* "Getting there" — wires to manifest.travelInfo.directions, the
     canonical field downstream renderers + emails read. The hotel
     block + map below remain local-state stubs (no manifest write)
     because the live hotels schema is HotelBlock[] (id + address +
     bookingUrl + photoUrls), not the demo Place shape. Wiring that
     would invalidate existing manifests — punted to a follow-up. */
  const directionsValue = manifest.travelInfo?.directions ?? '';
  const setDirections = (v: string) => onChange({
    ...manifest,
    travelInfo: {
      airports: manifest.travelInfo?.airports ?? [],
      hotels: manifest.travelInfo?.hotels ?? [],
      ...(manifest.travelInfo ?? {}),
      directions: v,
    },
  } as StoryManifest);
  const [q, setQ] = useState('');
  const [block, setBlock] = useState<Place[]>([SF_PLACES[0], SF_PLACES[2]]);
  const [open, setOpen] = useState(false);
  const results = SF_PLACES.filter((p) =>
    !block.find((b) => b.name === p.name) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.amenities.some((a) => a.toLowerCase().includes(q.toLowerCase())))
  );

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* map-style search */}
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <div style={{ position: 'relative', height: 96, background: 'linear-gradient(135deg, #dce6dd, #cdd9e0)', overflow: 'hidden' }}>
            {/* faux map */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px)' }} />
            <div style={{ position: 'absolute', top: 18, left: 26, width: 60, height: 8, background: 'rgba(124,155,176,0.5)', borderRadius: 4, transform: 'rotate(18deg)' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 40, width: 90, height: 8, background: 'rgba(124,155,176,0.5)', borderRadius: 4, transform: 'rotate(-12deg)' }} />
            {([
              [40, 30, 'peach'],
              [120, 56, 'sage'],
              [210, 34, 'lavender'],
            ] as [number, number, string][]).map(([x, y, t], i) => (
              <div key={i} style={{ position: 'absolute', left: x, top: y }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50% 50% 50% 0', background: `var(--${t}-2)`, transform: 'rotate(-45deg)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                  <Icon name={i === 0 ? 'heart-icon' : 'home'} size={11} color="#3D4A1F" style={{ transform: 'rotate(45deg)' }} />
                </span>
              </div>
            ))}
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9.5, fontWeight: 700, color: 'var(--ink-muted)', background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: 999 }}>Santorini, GR</div>
          </div>
          <div style={{ padding: 10, background: 'var(--card)', position: 'relative' }}>
            <FInput value={q} onChange={(v) => { setQ(v); setOpen(true); }} placeholder="Search hotels & venues near the wedding…" icon="search" />
            {open && results.length > 0 && (
              <div style={{ position: 'absolute', left: 10, right: 10, top: 52, zIndex: 20, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                {results.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setBlock([...block, p]); setOpen(false); setQ(''); }}
                    style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '9px 11px', textAlign: 'left', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: 'transparent', border: 'none' }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: `var(--${p.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={14} color="#3D4A1F" />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-muted)' }}>
                        <Stars r={p.rating} size={9} /> {p.rating} · {p.dist}
                      </span>
                    </span>
                    <Icon name="plus" size={14} color="var(--sage-deep)" />
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="sparkles" size={11} color="var(--gold)" /> Pear pulls ratings, photos & amenities automatically.
            </div>
          </div>
        </div>

        {/* hotel block */}
        <FGroup label={`Your hotel block · ${block.length}`} action={<PearChip>Suggest nearby</PearChip>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {block.map((p) => (
              <div key={p.name} style={{ borderRadius: 13, border: '1px solid var(--line)', background: 'var(--card)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 10, padding: 10 }}>
                  <div style={{ width: 58, height: 58, borderRadius: 9, background: `linear-gradient(140deg, var(--${p.tone}-2), var(--${p.tone}-bg))`, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                    <Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={18} color="#3D4A1F" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
                      <button onClick={() => setBlock(block.filter((b) => b.name !== p.name))} style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer' }}>
                        <Icon name="close" size={11} color="var(--ink-muted)" />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, fontSize: 11.5, color: 'var(--ink-soft)' }}>
                      {p.reviews > 0 ? (
                        <>
                          <Stars r={p.rating} size={10} /> <b style={{ color: 'var(--ink)' }}>{p.rating}</b> ({p.reviews}) · {p.price}
                        </>
                      ) : (
                        <span style={{ color: 'var(--peach-ink)', fontWeight: 700 }}>★ The venue</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Icon name="pin" size={10} /> {p.dist}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 10px 10px' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 7 }}>{p.blurb}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {p.amenities.map((a) => (
                      <span key={a} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 8px', borderRadius: 999 }}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <AddCard label="Add a hotel manually" onClick={() => {}} />
          </div>
        </FGroup>

        <FGroup label="Getting there">
          <FInput
            value={directionsValue}
            onChange={setDirections}
            placeholder="Fly into Santorini (JTR), 20 min by taxi"
          />
          <div style={{ height: 8 }} />
          <FToggleStandalone label="Show a shuttle schedule" sub="Pear can build it from your timeline" def={false} />
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default TravelPanel;
