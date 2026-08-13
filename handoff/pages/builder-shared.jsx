/* =========================================================================
   PEARLOOM BUILDER — shared atoms used across all 3 editor variations
   ========================================================================= */

const { useState: useBS, useRef: useBR, useEffect: useBE } = React;

/* Shared device frame the preview lives inside.
   width prop drives the responsive frame: 'desktop' | 'tablet' | 'phone' */
function DeviceFrame({ device = 'desktop', children, scale = 1, label }) {
  const widths = { desktop: 1180, tablet: 820, phone: 390 };
  const w = widths[device];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-muted)',
      }}>{label || `${device} · ${w}px`}</div>
      <div style={{
        width: w, transform: `scale(${scale})`, transformOrigin: 'top center',
        background: 'var(--paper)',
        borderRadius: device === 'phone' ? 36 : device === 'tablet' ? 22 : 16,
        border: '1px solid var(--card-ring)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden', position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}

/* "Edit handles" overlay — the dotted hover ring + label tag that says
   what's editable. Kept here so all variations behave the same. */
function EditHandle({ label, color = 'var(--lavender-2)', children, locked, active, onClick, style = {} }) {
  return (
    <div onClick={onClick} style={{
      position: 'relative', cursor: locked ? 'default' : 'pointer',
      ...style,
    }} className="edit-handle">
      {children}
      <div className="edit-handle-ring" style={{
        position: 'absolute', inset: -4, borderRadius: 8,
        border: `1.5px ${active ? 'solid' : 'dashed'} ${color}`,
        opacity: active ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 160ms ease',
      }}/>
      {label && (
        <div className="edit-handle-tag" style={{
          position: 'absolute', top: -22, left: -4,
          padding: '2px 8px', borderRadius: 5,
          background: color, color: 'var(--ink)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
          opacity: active ? 1 : 0,
          transition: 'opacity 160ms ease',
          pointerEvents: 'none',
        }}>{label}</div>
      )}
    </div>
  );
}

/* Drag handle dots */
function GripDots({ color = 'var(--ink-muted)' }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16">
      {[0,1,2,3,4,5].map(i => (
        <circle key={i} cx={(i%2)*6+2} cy={Math.floor(i/2)*5+3} r="1.2" fill={color}/>
      ))}
    </svg>
  );
}

/* The shared mini event-site preview — small enough to fit in any frame */
function MiniSite({ density = 'comfortable', motif = 'pears', accent = 'lavender', heroLayout = 'center', activeBlock, hoverBlock, onClickBlock, onHoverBlock, names = ['Scott', 'Shauna'], date = 'Monday, April 26, 2027', place = 'Santorini, Greece' }) {
  const accentBg = {
    lavender: 'var(--lavender-bg)',
    peach: 'var(--peach-bg)',
    sage: 'var(--sage-tint)',
    cream: 'var(--cream-2)',
  }[accent];

  const blocks = [
    { id: 'hero', label: 'Hero' },
    { id: 'story', label: 'Story' },
    { id: 'details', label: 'Details' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'rsvp', label: 'RSVP' },
  ];

  const padScale = { cozy: 0.7, comfortable: 1, spacious: 1.3 }[density];

  return (
    <div onMouseLeave={() => onHoverBlock?.(null)} style={{ background: 'var(--paper)' }}>
      {/* sub nav */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
        fontSize: 11.5, color: 'var(--ink-soft)',
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <Pear size={20} tone="sage" shadow={false}/>
        <span className="display-italic" style={{ fontSize: 14 }}>{names[0]} & {names[1]}</span>
        <span style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 14, opacity: 0.8 }}>
          {['Story','Details','Schedule','Travel','Registry','Gallery'].map(l => <span key={l}>{l}</span>)}
        </span>
        <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 10.5, fontWeight: 600 }}>RSVP</span>
      </div>

      {/* Hero */}
      <BlockWrap id="hero" label="Hero" active={activeBlock} hover={hoverBlock} onClick={onClickBlock} onHover={onHoverBlock}>
        <div style={{
          position: 'relative', textAlign: heroLayout === 'left' ? 'left' : 'center',
          padding: `${36*padScale}px 28px ${30*padScale}px`,
          background: accentBg,
          overflow: 'hidden',
        }}>
          <Blob tone={accent} size={240} opacity={0.7} style={{ position: 'absolute', top: -40, left: -40 }}/>
          <Blob tone="peach" size={200} opacity={0.5} style={{ position: 'absolute', bottom: -30, right: -20 }}/>
          {motif === 'pears' && <Squiggle variant={1} width={120} style={{ position: 'absolute', top: 36, right: heroLayout === 'left' ? 'auto' : 36, left: heroLayout === 'left' ? 36 : 'auto', opacity: 0.5 }}/>}

          <div style={{ position: 'relative' }}>
            <div className="display-italic" style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 6 }}>together, finally</div>
            <div className="display" style={{ fontSize: 56, lineHeight: 0.95, margin: 0 }}>
              {names[0]} <span className="display-italic" style={{ fontSize: 44, color: 'var(--ink-soft)' }}>and</span> {names[1]}
            </div>
            <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', gap: 14, justifyContent: heroLayout === 'left' ? 'flex-start' : 'center' }}>
              <span><Icon name="calendar" size={11}/> {date}</span>
              <span><Icon name="pin" size={11}/> {place}</span>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: heroLayout === 'left' ? 'flex-start' : 'center' }}>
              <span style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 11, fontWeight: 600 }}>RSVP →</span>
              <span style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 11, fontWeight: 600 }}>Read our story</span>
            </div>
          </div>
        </div>
      </BlockWrap>

      {/* Countdown */}
      <BlockWrap id="story" label="Our story" active={activeBlock} hover={hoverBlock} onClick={onClickBlock} onHover={onHoverBlock}>
        <div style={{ padding: `${20*padScale}px 28px`, display: 'flex', gap: 22, justifyContent: 'center' }}>
          {[{n:'365',l:'days'},{n:'08',l:'hrs'},{n:'38',l:'min'}].map(b => (
            <div key={b.l} style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 28 }}>{b.n}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{b.l}</div>
            </div>
          ))}
        </div>
      </BlockWrap>

      {/* Schedule */}
      <BlockWrap id="schedule" label="Schedule" active={activeBlock} hover={hoverBlock} onClick={onClickBlock} onHover={onHoverBlock}>
        <div style={{ padding: `${24*padScale}px 28px`, background: 'var(--cream-2)' }}>
          <div className="display" style={{ fontSize: 22, textAlign: 'center', marginBottom: 14 }}>The day, in moments</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { t:'4:30', l:'Ceremony' },
              { t:'5:30', l:'Cocktails' },
              { t:'7:00', l:'Dinner' },
              { t:'9:00', l:'Dancing' },
            ].map(s => (
              <div key={s.t} style={{ padding: 10, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line-soft)', textAlign: 'center' }}>
                <div className="display" style={{ fontSize: 16 }}>{s.t}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </BlockWrap>

      {/* Gallery */}
      <BlockWrap id="gallery" label="Gallery" active={activeBlock} hover={hoverBlock} onClick={onClickBlock} onHover={onHoverBlock}>
        <div style={{ padding: `${20*padScale}px 28px`, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
          {['warm','sage','dusk','peach','lavender'].map((t,i) => (
            <PhotoPlaceholder key={i} tone={t} aspect="1/1" style={{ borderRadius: 6 }}/>
          ))}
        </div>
      </BlockWrap>

      {/* RSVP */}
      <BlockWrap id="rsvp" label="RSVP" active={activeBlock} hover={hoverBlock} onClick={onClickBlock} onHover={onHoverBlock}>
        <div style={{ padding: `${22*padScale}px 28px`, textAlign: 'center', background: 'var(--ink)', color: 'var(--cream)' }}>
          <div className="display" style={{ fontSize: 22, color: 'var(--cream)' }}>Save your seat</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>RSVPs close March 22, 2027</div>
          <div style={{ marginTop: 10, padding: '8px 18px', display: 'inline-block', borderRadius: 999, background: 'var(--cream)', color: 'var(--ink)', fontSize: 11, fontWeight: 700 }}>Reply now →</div>
        </div>
      </BlockWrap>
    </div>
  );
}

/* Wrap each block in a hover ring + edit affordance.
   Different builders can pass different click handlers. */
function BlockWrap({ id, label, children, active, hover, onClick, onHover }) {
  const isActive = active === id;
  const isHover = hover === id;
  return (
    <div
      onMouseEnter={() => onHover?.(id)}
      onClick={(e) => { e.stopPropagation(); onClick?.(id); }}
      style={{ position: 'relative', cursor: 'pointer' }}
    >
      {children}
      {/* hover/active ring */}
      <div style={{
        position: 'absolute', inset: 4,
        borderRadius: 8,
        outline: isActive
          ? '2px solid var(--lavender-2)'
          : isHover ? '1.5px dashed var(--lavender-2)' : 'none',
        outlineOffset: -2,
        pointerEvents: 'none',
        transition: 'outline 160ms ease',
      }}/>
      {/* tag */}
      {(isActive || isHover) && (
        <div style={{
          position: 'absolute', top: 6, left: 8,
          padding: '3px 9px', borderRadius: 6,
          background: isActive ? 'var(--lavender-2)' : 'rgba(196,181,217,0.85)',
          color: 'var(--ink)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <GripDots color="var(--ink)"/>
          {label}
          {isActive && <Icon name="brush" size={11}/>}
        </div>
      )}
      {/* drop zone hint between blocks */}
      <div style={{
        position: 'absolute', left: 12, right: 12, bottom: -1, height: 0,
        borderTop: isHover ? '2px dashed var(--peach-2)' : 'none',
      }}/>
    </div>
  );
}

Object.assign(window, { DeviceFrame, EditHandle, GripDots, MiniSite, BlockWrap });
