/* =========================================================================
   PEARLOOM COMPONENT KITS — a component design language, independent of the
   theme (palette/texture) and event (content). Each kit restyles the
   repeating components — dividers, cards, detail tiles, FAQ rows, registry
   chips and the SCHEDULE — into one coordinated personality.

     classic   · theme-native cards & rules (default)
     ticket    · perforated stubs, dashed tear-lines, monospace times
     plate     · engraved frames, double rules, Roman numerals
     scrapbook · taped, tilted cards & handwritten tags
     index     · ruled index cards, red margin & tab times
     minimal   · borderless rows, hairlines, oversized numerals

   A module-level "active kit" is set by ThemedSite at the top of render so
   the K-components don't need the kit threaded through every prop.

   Exports (window): KITS, setKit, getKit, KDivider, KCard, KChip, KSchedule
   ========================================================================= */

const KITS = [
  { id: 'classic',   label: 'Classic',   blurb: 'Theme-native cards & rules' },
  { id: 'ticket',    label: 'Ticket',    blurb: 'Perforated stubs · monospace' },
  { id: 'plate',     label: 'Plate',     blurb: 'Engraved frames · Roman' },
  { id: 'scrapbook', label: 'Scrapbook', blurb: 'Taped, tilted, handwritten' },
  { id: 'index',     label: 'Index',     blurb: 'Ruled cards · red margin' },
  { id: 'minimal',   label: 'Minimal',   blurb: 'Hairlines · big numerals' },
  { id: 'arch',      label: 'Arch',      blurb: 'Arched cards · soft domes' },
  { id: 'stamp',     label: 'Stamp',     blurb: 'Postage frames · postmarks' },
  { id: 'deco',      label: 'Deco',      blurb: 'Gold frames · geometric' },
];

let __kit = 'classic';
function setKit(id) { __kit = id || 'classic'; }
function getKit() { return __kit; }

const MONO = "'Courier New', ui-monospace, monospace";
function toRoman(n) {
  const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s = ''; for (const [v, sym] of map) { while (n >= v) { s += sym; n -= v; } } return s || 'I';
}

/* ---------- DIVIDER ---------- */
function KDivider({ look, width = 170, style = {} }) {
  const kit = getKit();
  const dec = (typeof getDecor !== 'undefined') ? getDecor() : {};
  if (dec.divider) return <TDivider look={dec.divider} width={width} style={style}/>;
  const wrap = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '0 auto', width, ...style };
  if (kit === 'ticket') return (
    <div style={wrap}><div style={{ flex: 1, borderTop: '2px dashed var(--t-line)' }}/><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--t-accent)' }}/><div style={{ flex: 1, borderTop: '2px dashed var(--t-line)' }}/></div>
  );
  if (kit === 'plate') return (
    <div style={wrap}><div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/><span style={{ width: 7, height: 7, transform: 'rotate(45deg)', border: '1px solid var(--t-accent-ink)' }}/><div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/></div>
  );
  if (kit === 'scrapbook') return (
    <div style={{ ...wrap }}><div style={{ width: 96, height: 17, background: 'color-mix(in oklab, var(--t-accent) 40%, transparent)', transform: 'rotate(-2.5deg)', boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}/></div>
  );
  if (kit === 'index') return (
    <div style={{ ...wrap, flexDirection: 'column', gap: 3 }}><div style={{ height: 1.5, width: '100%', background: 'rgba(74,118,196,0.45)' }}/><div style={{ height: 1.5, width: '100%', background: 'rgba(199,80,80,0.45)' }}/></div>
  );
  if (kit === 'minimal') return (
    <div style={{ ...wrap, width: 46 }}><div style={{ flex: 1, height: 2, background: 'var(--t-ink)' }}/></div>
  );
  if (kit === 'arch') return (
    <div style={wrap}><div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/><span style={{ width: 20, height: 10, borderRadius: '10px 10px 0 0', border: '1.5px solid var(--t-accent)', borderBottom: 'none' }}/><div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/></div>
  );
  if (kit === 'stamp') return (
    <div style={wrap}><div style={{ flex: 1, borderTop: '2px dotted var(--t-line)' }}/><span style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid var(--t-accent)' }}/><div style={{ flex: 1, borderTop: '2px dotted var(--t-line)' }}/></div>
  );
  if (kit === 'deco') return (
    <div style={wrap}><div style={{ flex: 1, height: 1, background: 'var(--t-gold)' }}/><span style={{ display: 'inline-flex', gap: 3 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, transform: 'rotate(45deg)', border: '1px solid var(--t-gold)' }}/>)}</span><div style={{ flex: 1, height: 1, background: 'var(--t-gold)' }}/></div>
  );
  return <TDivider look={look} width={width} style={style}/>;
}

/* ---------- CARD CHROME ---------- */
function KCard({ look, children, style = {}, tilt }) {
  const kit = getKit();
  if (kit === 'classic') return <TCard look={look} style={style}>{children}</TCard>;
  const base = { position: 'relative', ...style };
  if (kit === 'ticket') return <div style={{ ...base, background: 'var(--t-card)', border: '1.5px dashed var(--t-line)', borderRadius: 6 }}>{children}</div>;
  if (kit === 'plate') return <div style={{ ...base, background: 'var(--t-card)', borderRadius: 1, boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--t-ink) 45%, transparent), inset 0 0 0 4px var(--t-card), inset 0 0 0 5px color-mix(in oklab, var(--t-ink) 22%, transparent)' }}>{children}</div>;
  if (kit === 'scrapbook') return (
    <div style={{ ...base, background: '#fffdf7', boxShadow: '0 10px 22px rgba(0,0,0,0.12)', borderRadius: 2, transform: `rotate(${tilt != null ? tilt : -1.3}deg)` }}>
      <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: 54, height: 17, background: 'color-mix(in oklab, var(--t-accent) 30%, transparent)', zIndex: 2 }}/>
      {children}
    </div>
  );
  if (kit === 'index') return <div style={{ ...base, background: 'var(--t-card)', borderRadius: 2, borderLeft: '2px solid rgba(199,80,80,0.5)', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 20px, rgba(74,118,196,0.12) 20px 21px)' }}>{children}</div>;
  if (kit === 'minimal') return <div style={{ ...base, background: 'transparent', borderBottom: '1px solid var(--t-line)', borderRadius: 0 }}>{children}</div>;
  if (kit === 'arch') return <div style={{ ...base, background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: '24px 24px var(--t-radius) var(--t-radius)', boxShadow: 'var(--t-shadow)' }}>{children}</div>;
  if (kit === 'stamp') return <div style={{ ...base, background: 'var(--t-card)', border: '5px solid var(--t-card)', outline: '2px dotted color-mix(in oklab, var(--t-ink) 34%, transparent)', outlineOffset: '-9px', borderRadius: 3, boxShadow: '0 5px 16px rgba(0,0,0,0.12)' }}>{children}</div>;
  if (kit === 'deco') return <div style={{ ...base, background: 'var(--t-card)', borderRadius: 1, boxShadow: 'inset 0 0 0 1px var(--t-gold), inset 0 0 0 4px var(--t-card), inset 0 0 0 5px color-mix(in oklab, var(--t-gold) 55%, transparent)' }}>{children}</div>;
  return <TCard look={look} style={style}>{children}</TCard>;
}

/* ---------- CHIP / BADGE ---------- */
function KChip({ children, look }) {
  const kit = getKit();
  const base = { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--t-ink)' };
  if (kit === 'ticket')   return <span style={{ ...base, padding: '12px 20px', border: '1.5px dashed var(--t-line)', borderRadius: 999, background: 'var(--t-card)', fontFamily: MONO, letterSpacing: '-0.02em' }}>{children}</span>;
  if (kit === 'plate')    return <span style={{ ...base, padding: '11px 22px', border: '1px solid var(--t-accent-ink)', borderRadius: 0, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11.5 }}>{children}</span>;
  if (kit === 'scrapbook')return <span style={{ ...base, padding: '11px 20px', background: '#fffdf7', boxShadow: '0 6px 14px rgba(0,0,0,0.1)', transform: 'rotate(-1.5deg)', borderRadius: 2 }}>{children}</span>;
  if (kit === 'index')    return <span style={{ ...base, padding: '11px 18px', background: 'var(--t-card)', borderLeft: '2px solid rgba(199,80,80,0.5)', borderRadius: 2 }}>{children}</span>;
  if (kit === 'minimal')  return <span style={{ ...base, padding: '8px 2px', borderBottom: '2px solid var(--t-ink)', borderRadius: 0 }}>{children}</span>;
  if (kit === 'arch')     return <span style={{ ...base, padding: '11px 20px', background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: '999px 999px 6px 6px' }}>{children}</span>;
  if (kit === 'stamp')    return <span style={{ ...base, padding: '10px 18px', background: 'var(--t-card)', border: '3px solid var(--t-card)', outline: '1.5px dotted color-mix(in oklab, var(--t-ink) 34%, transparent)', outlineOffset: '-6px', borderRadius: 2 }}>{children}</span>;
  if (kit === 'deco')     return <span style={{ ...base, padding: '10px 20px', background: 'var(--t-card)', borderRadius: 0, boxShadow: 'inset 0 0 0 1px var(--t-gold)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11.5 }}>{children}</span>;
  return <TCard look={look} style={{ padding: '13px 22px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</TCard>;
}

/* ---------- SCHEDULE (the signature component) ---------- */
function KSchedule({ rows = [], variant = 'cards', look }) {
  const kit = getKit();
  const dsp = { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)' };

  if (kit === 'ticket') {
    return (
      <div style={{ maxWidth: 640, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '116px 1fr', background: 'var(--t-card)', border: '1.5px dashed var(--t-line)', borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ padding: '16px 10px', textAlign: 'center', borderRight: '2px dashed var(--t-line)', fontFamily: MONO }}>
              <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--t-accent-ink)' }}>{r.t}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>{r.m}</div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.l}</div>
              {r.s && <div style={{ fontSize: 12.5, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>}
            </div>
            <span style={{ position: 'absolute', left: 110, top: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--t-section)' }}/>
            <span style={{ position: 'absolute', left: 110, bottom: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--t-section)' }}/>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'plate') {
    return (
      <div style={{ maxWidth: 560, marginInline: 'auto' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', alignItems: 'baseline', gap: 16, padding: '16px 4px', borderBottom: i < rows.length - 1 ? '1px solid var(--t-line)' : 'none' }}>
            <span style={{ ...dsp, fontSize: 20, color: 'var(--t-accent-ink)', fontStyle: 'italic' }}>{toRoman(i + 1)}</span>
            <div><span style={{ fontSize: 16, fontWeight: 600 }}>{r.l}</span>{r.s && <span style={{ fontSize: 13, color: 'var(--t-ink-muted)' }}> — {r.s}</span>}</div>
            <span style={{ ...dsp, fontSize: 18, letterSpacing: '0.02em' }}>{r.t}<span style={{ fontSize: 11, marginLeft: 2, color: 'var(--t-ink-muted)' }}>{r.m}</span></span>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'scrapbook') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rows.length, 4)},1fr)`, gap: 18, maxWidth: 880, marginInline: 'auto', paddingTop: 8 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ position: 'relative', background: '#fffdf7', boxShadow: '0 10px 22px rgba(0,0,0,0.12)', borderRadius: 2, padding: '20px 14px 16px', textAlign: 'center', transform: `rotate(${(i % 2 ? 1.6 : -1.6)}deg)` }}>
            <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%) rotate(-4deg)', width: 50, height: 16, background: 'color-mix(in oklab, var(--t-accent) 32%, transparent)' }}/>
            <div style={{ fontFamily: 'var(--t-script)', fontSize: 30, color: 'var(--t-accent-ink)', lineHeight: 1 }}>{r.t}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{r.l}</div>
            {r.s && <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'index') {
    return (
      <div style={{ maxWidth: 640, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ position: 'relative', background: 'var(--t-card)', borderRadius: 2, borderLeft: '2px solid rgba(199,80,80,0.55)', padding: '14px 16px 14px 64px', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 21px, rgba(74,118,196,0.10) 21px 22px)' }}>
            <div style={{ position: 'absolute', left: 0, top: 12, padding: '3px 8px', background: 'var(--t-accent)', color: 'var(--t-paper)', fontFamily: MONO, fontSize: 12, fontWeight: 700, borderRadius: '0 4px 4px 0' }}>{r.t}{r.m}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{r.l}</div>
            {r.s && <div style={{ fontSize: 12.5, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'minimal') {
    return (
      <div style={{ maxWidth: 620, marginInline: 'auto' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 22, alignItems: 'baseline', padding: '20px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--t-line)' : 'none' }}>
            <span style={{ ...dsp, fontSize: 38, lineHeight: 0.9, letterSpacing: '-0.03em' }}>{r.t}</span>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 16, fontWeight: 600 }}>{r.l}</div>{r.s && <div style={{ fontSize: 13, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'arch' || kit === 'stamp' || kit === 'deco') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rows.length, 4)},1fr)`, gap: 14, maxWidth: 900, marginInline: 'auto' }}>
        {rows.map((s, i) => (
          <KCard key={i} look={look} style={{ padding: '20px 14px', textAlign: 'center' }}>
            <div style={{ ...dsp, fontSize: 26, color: 'var(--t-accent-ink)', lineHeight: 1 }}>{s.t}<span style={{ fontSize: 12, marginLeft: 3, color: 'var(--t-ink-muted)' }}>{s.m}</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{s.l}</div>
            {s.s && <div style={{ fontSize: 12, color: 'var(--t-ink-muted)', marginTop: 2 }}>{s.s}</div>}
          </KCard>
        ))}
      </div>
    );
  }
  // classic
  if (variant === 'list') {
    return (
      <div style={{ maxWidth: 620, marginInline: 'auto', display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 18, alignItems: 'baseline', padding: '16px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--t-line-soft)' : 'none' }}>
            <div style={{ ...dsp, fontSize: 24, color: 'var(--t-accent-ink)' }}>{r.t}<span style={{ fontSize: 11, marginLeft: 3, color: 'var(--t-ink-muted)' }}>{r.m}</span></div>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>{r.l}</div>{r.s && <div style={{ fontSize: 13, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rows.length, 4)},1fr)`, gap: 14, maxWidth: 900, marginInline: 'auto' }}>
      {rows.map((s, i) => (
        <TCard key={i} look={look} style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ ...dsp, fontSize: 26, color: 'var(--t-accent-ink)', lineHeight: 1 }}>{s.t}<span style={{ fontSize: 12, marginLeft: 3, color: 'var(--t-ink-muted)' }}>{s.m}</span></div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{s.l}</div>
          {s.s && <div style={{ fontSize: 12, color: 'var(--t-ink-muted)', marginTop: 2 }}>{s.s}</div>}
        </TCard>
      ))}
    </div>
  );
}

/* ---------- DETAILS (arrangement varies per kit) ---------- */
function KDetails({ items = [], look }) {
  const kit = getKit();
  const dsp = { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)' };
  if (kit === 'plate') {
    return (
      <div style={{ maxWidth: 560, marginInline: 'auto' }}>
        {items.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '15px 4px', borderBottom: i < items.length - 1 ? '1px solid var(--t-line)' : 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', minWidth: 96 }}>{d.l}</span>
            <span style={{ flex: 1, borderBottom: '1px dotted var(--t-line)', transform: 'translateY(-4px)' }}/>
            <span style={{ ...dsp, fontSize: 18, textAlign: 'right' }}>{d.v}<span style={{ display: 'block', fontFamily: 'var(--t-body)', fontWeight: 400, fontSize: 12, color: 'var(--t-ink-muted)' }}>{d.s}</span></span>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'ticket') {
    return (
      <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gridTemplateColumns: `repeat(${items.length},1fr)`, background: 'var(--t-card)', border: '1.5px dashed var(--t-line)', borderRadius: 8, overflow: 'hidden' }}>
        {items.map((d, i) => (
          <div key={i} style={{ padding: '18px 14px', textAlign: 'center', borderRight: i < items.length - 1 ? '2px dashed var(--t-line)' : 'none' }}>
            <Icon name={d.icon} size={17} color="var(--t-accent-ink)"/>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', margin: '8px 0 3px' }}>{d.l}</div>
            <div style={{ ...dsp, fontSize: 18 }}>{d.v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{d.s}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'scrapbook') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 8 }}>
        {items.map((d, i) => (
          <div key={i} style={{ width: 168, position: 'relative', background: '#fffdf7', boxShadow: '0 10px 22px rgba(0,0,0,0.12)', borderRadius: 2, padding: '20px 16px 16px', transform: `rotate(${[-2.5, 1.8, -1.2, 2.4][i % 4]}deg)`, marginTop: i % 2 ? 14 : 0 }}>
            <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%) rotate(-4deg)', width: 48, height: 16, background: 'color-mix(in oklab, var(--t-accent) 32%, transparent)' }}/>
            <Icon name={d.icon} size={18} color="var(--t-accent-ink)"/>
            <div style={{ fontFamily: 'var(--t-script)', fontSize: 20, color: 'var(--t-accent-ink)', marginTop: 6 }}>{d.l}</div>
            <div style={{ ...dsp, fontSize: 18, marginTop: 2 }}>{d.v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{d.s}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'index') {
    return (
      <div style={{ maxWidth: 600, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--t-card)', borderRadius: 2, borderLeft: '2px solid rgba(199,80,80,0.55)', padding: '14px 18px', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 20px, rgba(74,118,196,0.10) 20px 21px)' }}>
            <Icon name={d.icon} size={18} color="var(--t-accent-ink)"/>
            <div style={{ minWidth: 96, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>{d.l}</div>
            <div style={{ flex: 1 }}><span style={{ ...dsp, fontSize: 18 }}>{d.v}</span> <span style={{ fontSize: 12.5, color: 'var(--t-ink-soft)' }}>{d.s}</span></div>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'minimal') {
    return (
      <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gridTemplateColumns: `repeat(${items.length},1fr)` }}>
        {items.map((d, i) => (
          <div key={i} style={{ padding: '4px 22px', borderLeft: i ? '1px solid var(--t-line)' : 'none', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 8 }}>{d.l}</div>
            <div style={{ ...dsp, fontSize: 26, lineHeight: 1.05 }}>{d.v}</div>
            <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', marginTop: 6 }}>{d.s}</div>
          </div>
        ))}
      </div>
    );
  }
  // classic — tile grid
  if (kit === 'arch' || kit === 'stamp' || kit === 'deco') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 3)},1fr)`, gap: 16, maxWidth: 800, marginInline: 'auto' }}>
        {items.map((d, i) => (
          <KCard key={i} look={look} style={{ padding: 20, textAlign: kit === 'deco' ? 'center' : 'left' }}>
            <div style={{ width: 38, height: 38, borderRadius: kit === 'arch' ? '12px 12px 4px 4px' : kit === 'deco' ? 0 : 8, background: 'var(--t-accent-bg)', display: 'grid', placeItems: 'center', marginBottom: 12, marginInline: kit === 'deco' ? 'auto' : 0 }}>
              <Icon name={d.icon} size={18} color="var(--t-accent-ink)"/>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 4 }}>{d.l}</div>
            <div style={{ ...dsp, fontSize: 20 }}>{d.v}</div>
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 3 }}>{d.s}</div>
          </KCard>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 3)},1fr)`, gap: 16, maxWidth: 800, marginInline: 'auto' }}>
      {items.map(d => (
        <TCard key={d.l} look={look} style={{ padding: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: look === 'flat' ? 0 : 10, background: 'var(--t-accent-bg)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <Icon name={d.icon} size={18} color="var(--t-accent-ink)"/>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 4 }}>{d.l}</div>
          <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20 }}>{d.v}</div>
          <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 3 }}>{d.s}</div>
        </TCard>
      ))}
    </div>
  );
}

/* ---------- FAQ (arrangement varies per kit) ---------- */
function KFaq({ qs = [], look }) {
  const kit = getKit();
  const dsp = { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)' };
  if (kit === 'plate') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {qs.map((q, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '16px 4px', borderBottom: i < qs.length - 1 ? '1px solid var(--t-line)' : 'none' }}>
            <span style={{ ...dsp, fontStyle: 'italic', fontSize: 18, color: 'var(--t-accent-ink)' }}>{toRoman(i + 1)}</span>
            <span style={{ flex: 1, fontSize: 15 }}>{q}</span>
            <Icon name="chev-down" size={14} color="var(--t-ink-muted)"/>
          </div>
        ))}
      </div>
    );
  }
  if (kit === 'minimal') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {qs.map((q, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'baseline', padding: '18px 0', borderBottom: '1px solid var(--t-line)' }}>
            <span style={{ ...dsp, fontSize: 24, color: 'var(--t-ink-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 16 }}>{q}</span>
          </div>
        ))}
      </div>
    );
  }
  // ticket / index / scrapbook / classic — KCard rows (chrome differs by kit)
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
      {qs.map((q, i) => (
        <KCard key={i} look={look} tilt={i % 2 ? 0.8 : -0.8} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>{q}</span>
          <Icon name="chev-down" size={14} color="var(--t-ink-muted)"/>
        </KCard>
      ))}
    </div>
  );
}

Object.assign(window, { KITS, setKit, getKit, KDivider, KCard, KChip, KSchedule, KDetails, KFaq });
