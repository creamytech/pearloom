'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '@/components/pearloom/motifs';

function FGroup({ label, hint, children, action }: { label: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</label>
        {action}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
function FInput({ value, onChange, placeholder, icon }: { value: string; onChange?: (v: string) => void; placeholder?: string; icon?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && <Icon name={icon} size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' } as CSSProperties}/>}
      <input value={value} onChange={(e) => onChange && onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: icon ? '10px 12px 10px 32px' : '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)', outline: 'none' }}/>
    </div>
  );
}
function FToggle({ label, sub, on, set }: { label: string; sub?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <button onClick={() => set(!on)} style={{ width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer' }}>
        <span style={{ position: 'absolute', top: 2.5, left: on ? 18.5 : 2.5, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}/>
      </button>
    </div>
  );
}
function FToggleStandalone({ label, sub, def }: { label: string; sub?: string; def?: boolean }) {
  const [on, set] = useState(!!def);
  return <FToggle label={label} sub={sub} on={on} set={set}/>;
}
function Stars({ r, size = 11 }: { r: number; size?: number }) {
  const full = Math.round(r);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} color={i <= full ? 'var(--gold)' : 'var(--cream-3)'}/>)}
    </span>
  );
}
function AddCard({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="lift" style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
      <Icon name="plus" size={13} color="var(--ink-soft)"/> {label}
    </button>
  );
}
function PearChip({ children }: { children: ReactNode }) {
  return (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', cursor: 'pointer' }}>
      <Pear size={13} tone="sage" shadow={false}/> {children}
    </button>
  );
}

type Place = { name: string; kind: string; rating: number; reviews: number; price: string; dist: string; tone: string; amenities: string[]; blurb: string };

const SF_PLACES: Place[] = [
  { name: 'Cosmos Suites', kind: 'Hotel', rating: 4.8, reviews: 412, price: '$$$', dist: '8-min walk', tone: 'warm', amenities: ['Pool', 'Breakfast', 'Caldera view'], blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.' },
  { name: 'Andronis Boutique', kind: 'Hotel', rating: 4.9, reviews: 286, price: '$$$$', dist: '12-min walk', tone: 'lavender', amenities: ['Spa', 'Infinity pool', 'Fine dining'], blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite for weddings.' },
  { name: 'Aria Suites', kind: 'Hotel', rating: 4.6, reviews: 198, price: '$$', dist: '6-min walk', tone: 'sage', amenities: ['Pool', 'Free parking', 'Pet friendly'], blurb: 'Cycladic-style rooms a short stroll from the venue — great mid-range value.' },
  { name: 'Casa Chorro', kind: 'Venue', rating: 4.9, reviews: 0, price: '—', dist: 'The venue', tone: 'peach', amenities: ['Sea view', 'Garden', 'Catering'], blurb: 'Your ceremony & reception venue — a restored villa above the Aegean.' },
];

export function TravelPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  // Read travel hotels from manifest; map to prototype place shape so the layout is verbatim.
  const persisted = (manifest.travelInfo?.hotels ?? []) as any[];
  const persistedAsPlaces: Place[] = persisted.map((h) => ({
    name: (h.name as string) ?? '',
    kind: 'Hotel',
    rating: typeof h.rating === 'number' ? h.rating : 4.6,
    reviews: typeof h.reviewCount === 'number' ? h.reviewCount : 0,
    price: (h.price as string) ?? '$$',
    dist: (h.distance as string) ?? '',
    tone: 'sage',
    amenities: (h.amenities as string | undefined)?.split(/\s*[·,]\s*/).filter(Boolean) ?? ['Pool'],
    blurb: (h.description as string) ?? '',
  }));

  const [q, setQ] = useState('');
  const [block, setBlock] = useState<Place[]>(persistedAsPlaces.length > 0 ? persistedAsPlaces : [SF_PLACES[0], SF_PLACES[2]]);
  const [open, setOpen] = useState(false);
  const results = SF_PLACES.filter((p) => !block.find((b) => b.name === p.name) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.amenities.some((a) => a.toLowerCase().includes(q.toLowerCase()))));

  const writeBlock = (next: Place[]) => {
    setBlock(next);
    const hotels = next.filter((p) => p.kind === 'Hotel').map((p, i) => ({
      id: `hotel-${i}`,
      name: p.name,
      description: p.blurb,
      distance: p.dist,
      price: p.price,
      amenities: p.amenities.join(' · '),
      rating: p.rating,
      reviewCount: p.reviews,
    }));
    onChange({ ...manifest, travelInfo: { ...((manifest.travelInfo ?? {}) as any), hotels } as any });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* map-style search */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ position: 'relative', height: 96, background: 'linear-gradient(135deg, #dce6dd, #cdd9e0)', overflow: 'hidden' }}>
          {/* faux map */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px)' }}/>
          <div style={{ position: 'absolute', top: 18, left: 26, width: 60, height: 8, background: 'rgba(124,155,176,0.5)', borderRadius: 4, transform: 'rotate(18deg)' }}/>
          <div style={{ position: 'absolute', bottom: 20, right: 40, width: 90, height: 8, background: 'rgba(124,155,176,0.5)', borderRadius: 4, transform: 'rotate(-12deg)' }}/>
          {([[40, 30, 'peach'], [120, 56, 'sage'], [210, 34, 'lavender']] as Array<[number, number, string]>).map(([x, y, t], i) => (
            <div key={i} style={{ position: 'absolute', left: x, top: y }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50% 50% 50% 0', background: `var(--${t}-2)`, transform: 'rotate(-45deg)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' } as CSSProperties}>
                <Icon name={i === 0 ? 'heart-icon' : 'home'} size={11} color="#3D4A1F" style={{ transform: 'rotate(45deg)' } as CSSProperties}/>
              </span>
            </div>
          ))}
          <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9.5, fontWeight: 700, color: 'var(--ink-muted)', background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: 999 }}>Santorini, GR</div>
        </div>
        <div style={{ padding: 10, background: 'var(--card)', position: 'relative' }}>
          <FInput value={q} onChange={(v) => { setQ(v); setOpen(true); }} placeholder="Search hotels & venues near the wedding…" icon="search"/>
          {open && results.length > 0 && (
            <div style={{ position: 'absolute', left: 10, right: 10, top: 52, zIndex: 20, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
              {results.map((p) => (
                <button key={p.name} onClick={() => { writeBlock([...block, p]); setOpen(false); setQ(''); }} style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '9px 11px', textAlign: 'left', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `var(--${p.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 } as CSSProperties}><Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={14} color="#3D4A1F"/></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-muted)' }}><Stars r={p.rating} size={9}/> {p.rating} · {p.dist}</span>
                  </span>
                  <Icon name="plus" size={14} color="var(--sage-deep)"/>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="sparkles" size={11} color="var(--gold)"/> Pear pulls ratings, photos & amenities automatically.
          </div>
        </div>
      </div>

      {/* hotel block */}
      <FGroup label={`Your hotel block · ${block.length}`} action={<PearChip>Suggest nearby</PearChip>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {block.map((p) => (
            <div key={p.name} style={{ borderRadius: 13, border: '1px solid var(--line)', background: 'var(--card)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 10, padding: 10 }}>
                <div style={{ width: 58, height: 58, borderRadius: 9, background: `linear-gradient(140deg, var(--${p.tone}-2), var(--${p.tone}-bg))`, flexShrink: 0, display: 'grid', placeItems: 'center' } as CSSProperties}>
                  <Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={18} color="#3D4A1F"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
                    <button onClick={() => writeBlock(block.filter((b) => b.name !== p.name))} style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={11} color="var(--ink-muted)"/></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    {p.reviews > 0 ? <><Stars r={p.rating} size={10}/> <b style={{ color: 'var(--ink)' }}>{p.rating}</b> ({p.reviews}) · {p.price}</> : <span style={{ color: 'var(--peach-ink)', fontWeight: 700 }}>★ The venue</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Icon name="pin" size={10}/> {p.dist}</div>
                </div>
              </div>
              <div style={{ padding: '0 10px 10px' }}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 7 }}>{p.blurb}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {p.amenities.map((a) => <span key={a} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 8px', borderRadius: 999 }}>{a}</span>)}
                </div>
              </div>
            </div>
          ))}
          <AddCard label="Add a hotel manually" onClick={() => {}}/>
        </div>
      </FGroup>

      <FGroup label="Getting there">
        <FInput value={((manifest.travelInfo as any)?.intro as string) ?? 'Fly into Santorini (JTR), 20 min by taxi'} placeholder="Airport & transit notes"
          onChange={(v) => onChange({ ...manifest, travelInfo: { ...((manifest.travelInfo ?? {}) as any), intro: v } as any })}/>
        <div style={{ height: 8 }}/>
        <FToggleStandalone label="Show a shuttle schedule" sub="Pear can build it from your timeline" def={false}/>
      </FGroup>
    </div>
  );
}

export default TravelPanel;
