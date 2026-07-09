/* =========================================================================
   PEARLOOM — SECTION EDITORS (rich rail content)
   A premium, per-section editing experience for the right rail. Flagship:
   the Travel section's map-style venue/hotel search (mocked Google Places —
   star ratings, amenities, price, distance, photos). Export SectionEditor.
   ========================================================================= */

const { useState: useSfState } = React;

/* ---------- shared field primitives ---------- */
function FGroup({ label, hint, children, action }) {
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
function FInput({ value, onChange, placeholder, icon }) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && <Icon name={icon} size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}/>}
      <input value={value} onChange={(e) => onChange && onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: icon ? '10px 12px 10px 32px' : '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)', outline: 'none' }}/>
    </div>
  );
}
function FToggle({ label, sub, on, set }) {
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
function Stars({ r, size = 11 }) {
  const full = Math.round(r);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => <Icon key={i} name="star" size={size} color={i <= full ? 'var(--gold)' : 'var(--cream-3)'}/>)}
    </span>
  );
}
function AddCard({ label, onClick }) {
  return (
    <button onClick={onClick} className="lift" style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
      <Icon name="plus" size={13} color="var(--ink-soft)"/> {label}
    </button>
  );
}
function PearChip({ children }) {
  return (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', cursor: 'pointer' }}>
      <Pear size={13} tone="sage" shadow={false}/> {children}
    </button>
  );
}

/* ===================== TRAVEL — map venue/hotel search ===================== */
const SF_PLACES = [
  { name: 'Cosmos Suites', kind: 'Hotel', rating: 4.8, reviews: 412, price: '$$$', dist: '8-min walk', tone: 'warm', amenities: ['Pool', 'Breakfast', 'Caldera view'], blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.' },
  { name: 'Andronis Boutique', kind: 'Hotel', rating: 4.9, reviews: 286, price: '$$$$', dist: '12-min walk', tone: 'lavender', amenities: ['Spa', 'Infinity pool', 'Fine dining'], blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite for weddings.' },
  { name: 'Aria Suites', kind: 'Hotel', rating: 4.6, reviews: 198, price: '$$', dist: '6-min walk', tone: 'sage', amenities: ['Pool', 'Free parking', 'Pet friendly'], blurb: 'Cycladic-style rooms a short stroll from the venue — great mid-range value.' },
  { name: 'Casa Chorro', kind: 'Venue', rating: 4.9, reviews: 0, price: '—', dist: 'The venue', tone: 'peach', amenities: ['Sea view', 'Garden', 'Catering'], blurb: 'Your ceremony & reception venue — a restored villa above the Aegean.' },
];

function VenueSearch() {
  const [q, setQ] = useSfState('');
  const [block, setBlock] = useSfState([SF_PLACES[0], SF_PLACES[2]]);
  const [open, setOpen] = useSfState(false);
  const results = SF_PLACES.filter(p => !block.find(b => b.name === p.name) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.amenities.some(a => a.toLowerCase().includes(q.toLowerCase()))));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* map-style search */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ position: 'relative', height: 96, background: 'linear-gradient(135deg, #dce6dd, #cdd9e0)', overflow: 'hidden' }}>
          {/* faux map */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(61,74,31,0.06) 0 1px, transparent 1px 22px)' }}/>
          <div style={{ position: 'absolute', top: 18, left: 26, width: 60, height: 8, background: 'rgba(124,155,176,0.5)', borderRadius: 4, transform: 'rotate(18deg)' }}/>
          <div style={{ position: 'absolute', bottom: 20, right: 40, width: 90, height: 8, background: 'rgba(124,155,176,0.5)', borderRadius: 4, transform: 'rotate(-12deg)' }}/>
          {[[40, 30, 'peach'], [120, 56, 'sage'], [210, 34, 'lavender']].map(([x, y, t], i) => (
            <div key={i} style={{ position: 'absolute', left: x, top: y }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50% 50% 50% 0', background: `var(--${t}-2)`, transform: 'rotate(-45deg)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                <Icon name={i === 0 ? 'heart-icon' : 'home'} size={11} color="#3D4A1F" style={{ transform: 'rotate(45deg)' }}/>
              </span>
            </div>
          ))}
          <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9.5, fontWeight: 700, color: 'var(--ink-muted)', background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: 999 }}>Santorini, GR</div>
        </div>
        <div style={{ padding: 10, background: 'var(--card)', position: 'relative' }}>
          <FInput value={q} onChange={(v) => { setQ(v); setOpen(true); }} placeholder="Search hotels & venues near the wedding…" icon="search"/>
          {open && results.length > 0 && (
            <div style={{ position: 'absolute', left: 10, right: 10, top: 52, zIndex: 20, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
              {results.map(p => (
                <button key={p.name} onClick={() => { setBlock([...block, p]); setOpen(false); setQ(''); }} style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '9px 11px', textAlign: 'left', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `var(--${p.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={14} color="#3D4A1F"/></span>
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
          {block.map((p, i) => (
            <div key={p.name} style={{ borderRadius: 13, border: '1px solid var(--line)', background: 'var(--card)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 10, padding: 10 }}>
                <div style={{ width: 58, height: 58, borderRadius: 9, background: `linear-gradient(140deg, var(--${p.tone}-2), var(--${p.tone}-bg))`, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                  <Icon name={p.kind === 'Venue' ? 'heart-icon' : 'home'} size={18} color="#3D4A1F"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
                    <button onClick={() => setBlock(block.filter(b => b.name !== p.name))} style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={11} color="var(--ink-muted)"/></button>
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
                  {p.amenities.map(a => <span key={a} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 8px', borderRadius: 999 }}>{a}</span>)}
                </div>
              </div>
            </div>
          ))}
          <AddCard label="Add a hotel manually" onClick={() => {}}/>
        </div>
      </FGroup>

      <FGroup label="Getting there">
        <FInput value="Fly into Santorini (JTR), 20 min by taxi" placeholder="Airport & transit notes"/>
        <div style={{ height: 8 }}/>
        <FToggleStandalone label="Show a shuttle schedule" sub="Pear can build it from your timeline" def={false}/>
      </FGroup>
    </div>
  );
}
function FToggleStandalone({ label, sub, def }) { const [on, set] = useSfState(!!def); return <FToggle label={label} sub={sub} on={on} set={set}/>; }

/* ===================== other sections ===================== */
function HeroEditor() {
  const [tag, setTag] = useSfState('together, finally');
  const [a, setA] = useSfState('Scott'); const [b, setB] = useSfState('Shauna');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FGroup label="Tagline" action={<PearChip>3 styles</PearChip>}><FInput value={tag} onChange={setTag} placeholder="A short line above the fold"/></FGroup>
      <FGroup label="Names">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 6, alignItems: 'center' }}>
          <FInput value={a} onChange={setA}/>
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>&amp;</div>
          <FInput value={b} onChange={setB}/>
        </div>
      </FGroup>
      <FGroup label="Date & venue">
        <FInput value="Monday, April 26, 2027" icon="calendar"/>
        <div style={{ height: 8 }}/>
        <FInput value="Casa Chorro · Santorini" icon="pin"/>
      </FGroup>
      <FGroup label="Cover photo" hint="Drag a hero image, or let Pear pick from your gallery.">
        <image-slot id="hero-cover-edit" shape="rect" radius="10" placeholder="Drop a cover photo" style={{ display: 'block', width: '100%', aspectRatio: '16/9', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)' }}></image-slot>
      </FGroup>
    </div>
  );
}
function StoryEditor() {
  const [body, setBody] = useSfState('We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza…');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FGroup label="Headline"><FInput value="How we got here"/></FGroup>
      <FGroup label="Your story" action={<PearChip>Draft for me</PearChip>}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}/>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {['Shorten', 'Warmer', 'Funnier', 'More poetic'].map(s => <button key={s} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>{s}</button>)}
        </div>
      </FGroup>
      <FGroup label="Highlight chips" hint="Little facts shown as pills.">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Together since 2017', 'Santorini, Greece', 'Aegean blue'].map(c => <span key={c} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--lavender-bg)', color: 'var(--lavender-ink)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>{c} <Icon name="close" size={9} color="var(--lavender-ink)"/></span>)}
          <button style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, border: '1px dashed var(--line)', color: 'var(--ink-soft)' }}>+ Add</button>
        </div>
      </FGroup>
    </div>
  );
}
function ScheduleEditor() {
  const rows = [{ t: '4:30 pm', l: 'Ceremony', s: 'Clifftop', tone: 'peach' }, { t: '5:30 pm', l: 'Cocktails', s: 'Caldera terrace', tone: 'lavender' }, { t: '7:00 pm', l: 'Dinner', s: 'Long table', tone: 'sage' }, { t: '9:00 pm', l: 'Dancing', s: 'Until late', tone: 'peach' }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FGroup label={`Timeline · ${rows.length} moments`} action={<PearChip>Build from notes</PearChip>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <Icon name="drag" size={14} color="var(--ink-muted)"/>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${r.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="clock" size={14} color="#3D4A1F"/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{r.t} · {r.s}</div>
              </div>
              <Icon name="more" size={14} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Add a moment"/>
        </div>
      </FGroup>
    </div>
  );
}
function DetailsEditor() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FGroup label="Dress code"><FInput value="Aegean formal — linen & light colors" icon="sparkles"/></FGroup>
      <FToggleStandalone label="Kids welcome" sub="Shown on the details card" def={false}/>
      <FToggleStandalone label="Adults-only evening" def={true}/>
      <FGroup label="Good-to-know cards" hint="Up to three quick facts.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Dress code', 'Aegean formal'], ['Parking', 'Valet on-site'], ['Weather', 'Warm evenings, ~22°C']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}><Icon name="sparkles" size={13} color="var(--ink-soft)"/></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{v}</div></div>
              <Icon name="more" size={13} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Add a detail"/>
        </div>
      </FGroup>
    </div>
  );
}
function RegistryEditor() {
  const stores = [{ n: 'Honeymoon fund', s: '62% funded', tone: 'peach' }, { n: 'Crate & Barrel', s: '14 items left', tone: 'sage' }, { n: 'Zola', s: 'Linked', tone: 'lavender' }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FGroup label="Intro line"><FInput value="Your presence is the gift — but if you insist…"/></FGroup>
      <FGroup label={`Linked registries · ${stores.length}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stores.map(st => (
            <div key={st.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${st.tone}-2)`, display: 'grid', placeItems: 'center' }}><Icon name="gift" size={14} color="#3D4A1F"/></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{st.n}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{st.s}</div></div>
              <Icon name="arrow-ur" size={13} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Link a registry"/>
        </div>
      </FGroup>
    </div>
  );
}
function GalleryEditor() {
  const tones = ['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FGroup label="Photos · 38" action={<PearChip>Auto-arrange</PearChip>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {tones.map((t, i) => <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, background: `linear-gradient(140deg, var(--${t}-2, var(--cream-3)), var(--cream-2))` }}/>)}
          <button style={{ aspectRatio: '1/1', borderRadius: 8, border: '1.5px dashed var(--line)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={16} color="var(--ink-soft)"/></button>
        </div>
      </FGroup>
      <FToggleStandalone label="Guest photo uploads" sub="Let guests add to a shared album" def={true}/>
    </div>
  );
}
function RsvpEditor() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FGroup label="Reply by"><FInput value="April 28, 2027" icon="calendar"/></FGroup>
      <FGroup label="Questions to ask">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FToggleStandalone label="Meal choice" sub="Chicken · Fish · Vegetarian" def={true}/>
          <FToggleStandalone label="Dietary restrictions" def={true}/>
          <FToggleStandalone label="Song request" def={true}/>
          <FToggleStandalone label="Plus-one" def={false}/>
          <AddCard label="Add a custom question"/>
        </div>
      </FGroup>
      <FGroup label="After they reply" hint="Pear can chase non-responders for you.">
        <PearChip>Set up reminder cadence</PearChip>
      </FGroup>
    </div>
  );
}
function FaqEditor() {
  const qs = ['What is the dress code?', 'Can I bring a guest?', 'Are children welcome?', 'Where should we stay?'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FGroup label={`Questions · ${qs.length}`} action={<PearChip>Suggest from data</PearChip>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {qs.map((qn, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <Icon name="drag" size={13} color="var(--ink-muted)"/>
              <span style={{ flex: 1, fontSize: 12.5 }}>{qn}</span>
              <Icon name="chev-down" size={13} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Add a question"/>
        </div>
      </FGroup>
    </div>
  );
}

function SectionEditor({ section }) {
  switch (section) {
    case 'hero': return <HeroEditor/>;
    case 'story': return <StoryEditor/>;
    case 'details': return <DetailsEditor/>;
    case 'schedule': return <ScheduleEditor/>;
    case 'travel': return <VenueSearch/>;
    case 'registry': return <RegistryEditor/>;
    case 'gallery': return <GalleryEditor/>;
    case 'rsvp': return <RsvpEditor/>;
    case 'faq': return <FaqEditor/>;
    default: return null;
  }
}

Object.assign(window, { SectionEditor });
