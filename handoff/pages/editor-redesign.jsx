/* =========================================================================
   PEARLOOM EDITOR — REDESIGNED, SHIPPABLE
   One consolidated direction. Replaces the 3-deep-rail current editor.

   Principles:
   - Outline-first navigation. Click a section in the left rail to jump and
     auto-select it. No nesting beyond two levels.
   - Inline canvas editing for what's obvious (text, photos, badges).
     Structured rail for what's not (layout, theme, RSVP behavior).
   - Pear is everywhere, contextually:
       * Sidebar tab opens a chat with project context
       * Per-field "ask Pear" hover handles
       * Floating dismissible bubble offers proactive nudges
   - Edit / Preview / Mobile toggle at top \u2014 chrome melts away in Preview.
   - Unify section count (8) with the screenshots: Hero / Story / Details /
     Schedule / Travel / Registry / Gallery / RSVP / FAQ.
   ========================================================================= */

const { useState: useEdState, useEffect: useEdEff, useRef: useEdRef, useMemo: useEdMemo } = React;

/* ---------- DATA ---------- */

const COUPLE = { a: 'Scott', b: 'Shauna', date: 'Apr 26, 2027', dateFull: 'Monday, April 26, 2027', venue: 'Casa Chorro', place: 'Santorini, Greece' };

const SECTIONS = [
  { id: 'hero',     label: 'Hero',     icon: 'home',          required: true,  desc: 'Names, date, cover photo' },
  { id: 'story',    label: 'Our story',icon: 'heart-icon',    desc: 'How you met' },
  { id: 'details',  label: 'Details',  icon: 'sparkles',      desc: 'Dress code, kids, FAQ-lite' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar',      desc: 'Day-of timeline' },
  { id: 'travel',   label: 'Travel',   icon: 'map',           desc: 'Hotels, transit, tips' },
  { id: 'registry', label: 'Registry', icon: 'gift',          desc: 'Linked stores' },
  { id: 'gallery',  label: 'Gallery',  icon: 'image',         desc: '38 photos' },
  { id: 'rsvp',     label: 'RSVP',     icon: 'mail',          required: true,  desc: '47 yes · 63 pending' },
  { id: 'faq',      label: 'FAQ',      icon: 'sparkles',      desc: '6 questions answered' },
];

const FIELDS_BY_SECTION = {
  hero: [
    { id: 'tagline', label: 'Tagline',          kind: 'text',    val: 'together, finally', placeholder: 'A short above-the-fold line' },
    { id: 'names',   label: 'Names',            kind: 'names',   a: 'Scott', amp: 'and', b: 'Shauna' },
    { id: 'date',    label: 'Date',             kind: 'date',    val: '2027-04-26' },
    { id: 'venue',   label: 'Venue',            kind: 'text',    val: 'Casa Chorro' },
    { id: 'cover',   label: 'Cover photo',      kind: 'photo' },
    { id: 'cta',     label: 'Primary button',   kind: 'cta',     text: 'RSVP by April 28', target: 'RSVP section' },
  ],
  story:    [{ id: 'headline', label: 'Headline', kind: 'text', val: 'How we got here' }, { id: 'body', label: 'Story', kind: 'long' }],
  details:  [{ id: 'dressCode', label: 'Dress code', kind: 'text', val: 'Garden formal' }, { id: 'kids', label: 'Kids welcome?', kind: 'toggle', val: false }],
  schedule: [{ id: 'events', label: 'Events', kind: 'list', count: 4 }],
  travel:   [{ id: 'hotels', label: 'Hotel block', kind: 'list', count: 2 }],
  registry: [{ id: 'stores', label: 'Linked stores', kind: 'list', count: 3 }],
  gallery:  [{ id: 'photos', label: 'Photos', kind: 'gallery', count: 38 }],
  rsvp:     [{ id: 'cutoff', label: 'RSVP deadline', kind: 'date', val: '2027-04-28' }, { id: 'meal', label: 'Ask about meal?', kind: 'toggle', val: true }, { id: 'song', label: 'Song requests?', kind: 'toggle', val: true }],
  faq:      [{ id: 'questions', label: 'Questions', kind: 'list', count: 6 }],
};

/* ---------- TOPBAR ---------- */

function EditorTopbar({ mode, setMode, savedAt, onPublish, pearOpen, setPearOpen, onOpenSettings }) {
  return (
    <header style={{
      gridArea: 'top',
      background: 'var(--cream)',
      borderBottom: '1px solid var(--line-soft)',
      padding: '0 16px',
      display: 'flex', alignItems: 'center', gap: 16,
      height: 56,
      position: 'relative', zIndex: 5,
    }}>
      {/* Left: logo + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 232 }}>
        <a href="Pearloom Home Redesign.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)' }}>
          <Icon name="chev-left" size={14}/>
          <Pear size={20} tone="sage" shadow={false}/>
          Dashboard
        </a>
      </div>

      {/* Center: device/mode toggle */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: 'var(--card)', borderRadius: 999,
          border: '1px solid var(--line-soft)',
        }}>
          {[
            { id: 'edit',    label: 'Edit',    icon: 'brush'   },
            { id: 'preview', label: 'Preview', icon: 'eye'     },
            { id: 'mobile',  label: 'Mobile',  icon: 'phone'   },
          ].map(m => {
            const on = mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '6px 14px', borderRadius: 999,
                fontSize: 12.5, fontWeight: 600,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'background 140ms ease',
              }}>
                <Icon name={m.icon} size={12} color={on ? 'var(--cream)' : 'var(--ink-soft)'}/>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: save state + share + publish */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-muted)' }}>
          <span style={{ width: 6, height: 6, background: 'var(--sage)', borderRadius: '50%' }}/>
          Saved {savedAt}
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }}/>
        <button onClick={() => setPearOpen(!pearOpen)} className="btn btn-outline btn-sm" style={{
          background: pearOpen ? 'var(--peach-bg)' : 'var(--card)',
          borderColor: pearOpen ? 'transparent' : 'var(--line)',
          color: pearOpen ? 'var(--peach-ink)' : 'var(--ink)',
        }}>
          <Pear size={14} tone="sage" shadow={false}/>
          Ask Pear
        </button>
        <button className="btn btn-outline btn-sm">
          <Icon name="share" size={12}/> Share
        </button>
        <button className="btn btn-primary btn-sm" onClick={onPublish}>
          Publish
          <Icon name="arrow-up" size={12} color="var(--cream)"/>
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }}/>
        {typeof UserAvatarButton !== 'undefined' && <UserAvatarButton onClick={onOpenSettings}/>}
      </div>
    </header>
  );
}

/* ---------- LEFT SIDEBAR — sections ---------- */

function SectionRail({ active, setActive, completion, items, title }) {
  const [reorderingIdx, setReorderingIdx] = useEdState(null);
  const list = items || SECTIONS;
  return (
    <aside style={{
      gridArea: 'left',
      background: 'var(--cream-2)',
      borderRight: '1px solid var(--line-soft)',
      padding: '14px 12px',
      display: 'flex', flexDirection: 'column', gap: 12,
      overflow: 'auto',
    }}>
      {/* Site card */}
      <div style={{
        padding: 12, background: 'var(--card)',
        border: '1px solid var(--line-soft)', borderRadius: 12,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
          {title || `${COUPLE.a} & ${COUPLE.b}`}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Icon name="globe" size={10}/>
          pearloom.com/scott-and-shauna
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--cream-3)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${completion}%`, height: '100%', background: 'var(--sage)' }}/>
          </div>
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontWeight: 600 }}>{completion}%</span>
        </div>
      </div>

      {/* Pages tabs */}
      <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line-soft)' }}>
        {[{ l: 'Sections' }, { l: 'Pages' }, { l: 'Theme' }].map((t) => {
          const on = t.l === 'Theme' ? active == null : t.l === 'Sections' ? active != null : false;
          return (
            <button key={t.l} onClick={() => { if (t.l === 'Theme') setActive(null); else if (t.l === 'Sections') setActive('hero'); }} style={{
              flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--cream)' : 'var(--ink-soft)',
            }}>{t.l}</button>
          );
        })}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span>Page sections</span>
        <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: 10.5 }}>drag to reorder</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {list.map((s, i) => {
          const on = s.id === active;
          return (
            <div key={s.id}
              draggable
              onDragStart={() => setReorderingIdx(i)}
              onDragEnd={() => setReorderingIdx(null)}
              onClick={() => setActive(s.id)}
              className="lift"
              style={{
                display: 'grid',
                gridTemplateColumns: '12px 22px 1fr 14px',
                gap: 8, alignItems: 'center',
                padding: '8px 10px', borderRadius: 8,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                cursor: 'pointer',
                opacity: reorderingIdx === i ? 0.5 : 1,
                transition: 'background 140ms ease',
              }}>
              <span style={{ opacity: on ? 0.5 : 0.3, display: 'inline-flex' }}>
                <GripDots color={on ? 'var(--cream)' : 'var(--ink-muted)'}/>
              </span>
              <Icon name={s.icon} size={13} color={on ? 'var(--cream)' : 'var(--ink-soft)'}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 10.5, opacity: on ? 0.7 : 0.55, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
              </div>
              {s.required && <Icon name="lock" size={10} color={on ? 'var(--cream)' : 'var(--ink-muted)'}/>}
            </div>
          );
        })}
        <button style={{
          marginTop: 4, padding: '8px 10px', borderRadius: 8,
          fontSize: 11.5, color: 'var(--ink-muted)',
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px dashed var(--line)', background: 'transparent',
        }}>
          <Icon name="plus" size={11}/> Add section
        </button>
      </div>
    </aside>
  );
}

/* ---------- CANVAS — full event-site preview ---------- */

function Canvas({ active, setActive, hover, setHover, mode, theme, density, textureIntensity, motifsOn, voice, layouts, palette, photosOn, eventId, siteLayout, kitId, decor }) {
  const isMobile = mode === 'mobile';
  const isPreview = mode === 'preview';

  return (
    <div style={{
      gridArea: 'canvas',
      background: 'var(--cream-3)',
      overflow: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '24px 0' : '28px 24px',
      position: 'relative',
    }}>
      {/* paper grid backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(61,74,31,0.08) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        opacity: 0.5,
      }}/>

      <div style={{
        width: isMobile ? 390 : 1100,
        background: 'var(--paper)',
        borderRadius: isMobile ? 36 : 14,
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--card-ring)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={() => setActive(null)}
      >
        <ThemedSite
          active={active}
          hover={hover}
          setActive={setActive}
          setHover={setHover}
          editable={!isPreview}
          theme={theme}
          density={density}
          textureIntensity={textureIntensity}
          motifsOn={motifsOn}
          voice={voice}
          layouts={layouts}
          palette={palette}
          photosOn={photosOn}
          eventId={eventId}
          siteLayout={siteLayout}
          kitId={kitId}
          decor={decor}
        />
      </div>

      {/* Floating Pear bubble (proactive helper) */}
      {!isPreview && <FloatingPearBubble active={active}/>}

      {/* Mode hint */}
      {isPreview && (
        <div style={{
          position: 'absolute', top: 16, right: 24,
          padding: '6px 12px', borderRadius: 999,
          background: 'var(--ink)', color: 'var(--cream)',
          fontSize: 11.5, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          boxShadow: 'var(--shadow)',
        }}>
          <Icon name="eye" size={11} color="var(--cream)"/>
          Preview \u2014 chrome hidden
        </div>
      )}
    </div>
  );
}

/* ---------- FULL EVENT SITE in editor ---------- */

function FullSite({ active, hover, setActive, setHover, editable, accent, density, fontPair }) {
  const accentBg = {
    lavender: 'var(--lavender-bg)',
    peach:    'var(--peach-bg)',
    sage:     'var(--sage-tint)',
    cream:    'var(--cream-2)',
  }[accent];

  const padScale = { cozy: 0.7, comfortable: 1, spacious: 1.3 }[density];

  // Ensure font pair affects display headings
  const headFont = fontPair === 'modern' ? "'Inter', sans-serif" : 'var(--font-display)';

  return (
    <div onMouseLeave={() => setHover(null)} style={{ background: 'var(--paper)' }}>
      {/* Sub-nav */}
      <SectionFrame id="nav" label="Site nav" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable} hideHandle>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18, padding: '14px 32px',
          fontSize: 12.5, color: 'var(--ink-soft)',
          borderBottom: '1px solid var(--line-soft)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pear size={22} tone="sage" shadow={false}/>
            <span className="display-italic" style={{ fontSize: 16, color: 'var(--ink)' }}>{COUPLE.a} &amp; {COUPLE.b}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 18, opacity: 0.85 }}>
            {['Story','Details','Schedule','Travel','Registry','Gallery'].map(l => <span key={l}>{l}</span>)}
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 11.5, fontWeight: 600 }}>RSVP</span>
        </div>
      </SectionFrame>

      {/* Hero */}
      <SectionFrame id="hero" label="Hero" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ position: 'relative', textAlign: 'center', padding: `${56*padScale}px 32px ${48*padScale}px`, background: accentBg, overflow: 'hidden' }}>
          <Blob tone={accent} size={360} opacity={0.5} style={{ position: 'absolute', top: -80, left: -80 }}/>
          <Blob tone="peach" size={280} opacity={0.5} style={{ position: 'absolute', bottom: -60, right: -40 }}/>
          <Squiggle variant={1} width={180} stroke="var(--gold-line)" style={{ position: 'absolute', top: 60, right: 80, opacity: 0.6, transform: 'rotate(-8deg)' }}/>

          <div style={{ position: 'relative' }}>
            <InlineText editable={editable} field="tagline" className="display-italic" style={{ fontSize: 18, color: 'var(--ink-soft)' }}>together, finally</InlineText>
            <h1 style={{ fontFamily: headFont, fontSize: 84, lineHeight: 0.95, margin: '14px 0 0', letterSpacing: '-0.02em', fontWeight: 600 }}>
              <InlineText editable={editable} field="name-a" inline>{COUPLE.a}</InlineText>
              <span className="display-italic" style={{ fontSize: 64, color: 'var(--ink-soft)', margin: '0 12px' }}>and</span>
              <InlineText editable={editable} field="name-b" inline>{COUPLE.b}</InlineText>
            </h1>
            <div style={{ marginTop: 22, fontSize: 14, color: 'var(--ink-soft)', display: 'flex', gap: 22, justifyContent: 'center' }}>
              <InlineText editable={editable} field="date" inline><Icon name="calendar" size={13}/> {COUPLE.dateFull}</InlineText>
              <InlineText editable={editable} field="venue" inline><Icon name="pin" size={13}/> {COUPLE.venue} · {COUPLE.place}</InlineText>
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <span style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 13, fontWeight: 600 }}>RSVP by April 28 →</span>
              <span style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600 }}>Read our story</span>
            </div>
            <PhotoStrip editable={editable}/>
          </div>
        </div>
      </SectionFrame>

      {/* Story */}
      <SectionFrame id="story" label="Our story" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44*padScale}px 80px`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center' }}>
          <PhotoPlaceholder tone="warm" aspect="4/5" style={{ borderRadius: 12 }}/>
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>OUR STORY</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: 0, lineHeight: 1, fontWeight: 600 }}>
              <InlineText editable={editable} field="story-headline">How we got here</InlineText>
            </h2>
            <p style={{ marginTop: 16, fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6, textWrap: 'pretty' }}>
              <InlineText editable={editable} field="story-body" multiline inline>
                Two strangers on a Tuesday, an argument about whether olives belong on pizza, and a long walk that turned into ten years. We can&apos;t imagine a wedding without you in it \u2014 and we couldn&apos;t imagine our story without each other.
              </InlineText>
            </p>
          </div>
        </div>
      </SectionFrame>

      {/* Details */}
      <SectionFrame id="details" label="Details" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${36*padScale}px 32px`, background: 'var(--cream-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 760, marginInline: 'auto' }}>
            {[
              { icon: 'sparkles', l: 'Dress code',     v: 'Garden formal' },
              { icon: 'users',    l: 'Kids welcome',   v: 'Ages 10 +' },
              { icon: 'gift',     l: 'Gifts',          v: 'Your presence is enough' },
            ].map(d => (
              <div key={d.l} style={{ background: 'var(--card)', borderRadius: 12, padding: 18, border: '1px solid var(--line-soft)' }}>
                <Icon name={d.icon} size={18} color="var(--gold)"/>
                <div className="eyebrow" style={{ marginTop: 10, marginBottom: 4 }}>{d.l}</div>
                <div style={{ fontFamily: headFont, fontSize: 18, fontWeight: 600 }}>{d.v}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Schedule */}
      <SectionFrame id="schedule" label="Schedule" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44*padScale}px 32px` }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="eyebrow">THE DAY · APRIL 26</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: '6px 0 0', lineHeight: 1, fontWeight: 600 }}>The day, in moments</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 880, marginInline: 'auto' }}>
            {[
              { t: '4:30 pm', l: 'Ceremony',  s: 'Olive grove' },
              { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
              { t: '7:00 pm', l: 'Dinner',    s: 'Long table' },
              { t: '9:00 pm', l: 'Dancing',   s: 'Until late' },
            ].map(s => (
              <div key={s.t} style={{ padding: 16, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line-soft)', textAlign: 'center' }}>
                <div style={{ fontFamily: headFont, fontSize: 20, fontWeight: 600 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Travel */}
      <SectionFrame id="travel" label="Travel" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44*padScale}px 32px`, background: accentBg }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>GETTING THERE</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: '6px 0 0', fontWeight: 600 }}>Where to stay</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, maxWidth: 760, marginInline: 'auto' }}>
            {[
              { name: 'Cosmos Suites', sub: '8-min walk · room block code SS27', tone: 'warm' },
              { name: 'Andronis Boutique', sub: '12-min walk · cliffside', tone: 'lavender' },
            ].map(h => (
              <div key={h.name} style={{ background: 'var(--card)', borderRadius: 12, padding: 14, display: 'flex', gap: 14, border: '1px solid var(--line-soft)' }}>
                <div style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <PhotoPlaceholder tone={h.tone} aspect="1/1"/>
                </div>
                <div>
                  <div style={{ fontFamily: headFont, fontSize: 18, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4 }}>{h.sub}</div>
                  <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px', borderRadius: 999, background: 'var(--cream-2)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>Book →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Registry */}
      <SectionFrame id="registry" label="Registry" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44*padScale}px 32px`, textAlign: 'center' }}>
          <div className="eyebrow">REGISTRY</div>
          <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 14px', fontWeight: 600 }}>Your presence is the gift</h2>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 22px' }}>
            If you&rsquo;d like to celebrate further, we&rsquo;ve put a few things together.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {['Honeyfund','Crate &amp; Barrel','Zola'].map(s => (
              <span key={s} style={{ padding: '12px 22px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: s + ' \u2197' }}/>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Gallery */}
      <SectionFrame id="gallery" label="Gallery" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${36*padScale}px 32px`, background: 'var(--cream-2)' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow">GALLERY</div>
            <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 0', fontWeight: 600 }}>A few favorites</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 920, marginInline: 'auto' }}>
            {['warm','sage','dusk','peach','lavender','cream','warm','sage','dusk','peach','lavender','cream'].map((t, i) => (
              <PhotoPlaceholder key={i} tone={t} aspect="1/1" style={{ borderRadius: 8 }}/>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* RSVP */}
      <SectionFrame id="rsvp" label="RSVP" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${56*padScale}px 32px`, textAlign: 'center', background: 'var(--ink)', color: 'var(--cream)' }}>
          <div className="eyebrow" style={{ color: 'rgba(248,241,228,0.6)' }}>RSVP BY APRIL 28</div>
          <h2 style={{ fontFamily: headFont, fontSize: 44, margin: '8px 0 6px', color: 'var(--cream)', fontWeight: 600 }}>Save your seat</h2>
          <div style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 18 }}>It takes about 90 seconds. Pear will follow up if anyone forgets.</div>
          <span style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: 'var(--cream)', color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>Reply now \u2192</span>
        </div>
      </SectionFrame>

      {/* FAQ */}
      <SectionFrame id="faq" label="FAQ" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44*padScale}px 32px` }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow">QUESTIONS &amp; ANSWERS</div>
            <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 0', fontWeight: 600 }}>The little things</h2>
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'What\u2019s the dress code, really?',
              'Can I bring a plus-one?',
              'Are kids welcome at the ceremony?',
              'Where should I stay in Santorini?',
            ].map((q, i) => (
              <div key={i} style={{ padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5 }}>{q}</span>
                <Icon name="chev-down" size={13} color="var(--ink-muted)"/>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>
    </div>
  );
}

/* Section frame — handles selection chrome */
function SectionFrame({ id, label, children, active, hover, setActive, setHover, editable, hideHandle }) {
  const isActive = active === id;
  const isHover  = hover === id && !isActive;

  return (
    <div
      onMouseEnter={() => setHover(id)}
      onClick={(e) => { if (!editable) return; e.stopPropagation(); setActive(id); }}
      style={{
        position: 'relative',
        cursor: editable ? 'pointer' : 'default',
      }}
    >
      {children}
      {editable && (
        <>
          <div style={{
            position: 'absolute', inset: 4, borderRadius: 6,
            outline: isActive ? '2px solid var(--lavender-2)' : isHover ? '1.5px dashed var(--lavender-2)' : 'none',
            outlineOffset: -2, pointerEvents: 'none',
          }}/>
          {(isActive || isHover) && !hideHandle && (
            <div style={{
              position: 'absolute', top: 8, left: 12,
              padding: '4px 10px', borderRadius: 6,
              background: isActive ? 'var(--lavender-2)' : 'rgba(196,181,217,0.85)',
              color: 'var(--ink)',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              zIndex: 2,
              boxShadow: isActive ? '0 4px 12px rgba(61,74,31,0.15)' : 'none',
            }}>
              <GripDots color="var(--ink)"/>
              {label}
              {isActive && (
                <>
                  <span style={{ width: 1, height: 10, background: 'rgba(61,74,31,0.3)', margin: '0 2px' }}/>
                  <Icon name="copy"      size={10}/>
                  <Icon name="more"      size={10}/>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Inline editable text */
function InlineText({ editable, field, children, multiline, inline, className, style }) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={className} style={{
      ...style,
      display: inline ? 'inline' : style?.display,
      borderBottom: editable ? '1px dashed transparent' : 'none',
      cursor: editable ? 'text' : 'inherit',
      transition: 'border-color 140ms ease, background 140ms ease',
    }}
    onMouseEnter={(e) => { if (editable) e.currentTarget.style.borderBottomColor = 'rgba(196,181,217,0.6)'; }}
    onMouseLeave={(e) => { if (editable) e.currentTarget.style.borderBottomColor = 'transparent'; }}
    >
      {children}
    </Tag>
  );
}

/* Tiny photo strip in hero — just decoration */
function PhotoStrip({ editable }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28 }}>
      {['warm','sage','peach','lavender','dusk'].map((t, i) => (
        <div key={i} style={{
          width: 56, height: 56, borderRadius: '50%',
          overflow: 'hidden', border: '3px solid var(--paper)',
          boxShadow: '0 2px 8px rgba(61,74,31,0.15)',
          transform: `rotate(${(i-2)*3}deg) translateY(${Math.abs(i-2)*-2}px)`,
        }}>
          <PhotoPlaceholder tone={t} aspect="1/1"/>
        </div>
      ))}
    </div>
  );
}

/* ---------- RIGHT RAIL — contextual ---------- */

/* Mini diagram of a layout variant */
function LayoutGlyph({ variant, on }) {
  const c = on ? 'var(--ink)' : 'var(--ink-muted)';
  const sets = {
    centered:  [[10,5,20,3],[8,11,24,3],[14,21,12,5]],
    split:     [[2,4,16,22],[22,6,16,4],[22,13,14,4],[22,20,10,5]],
    minimal:   [[2,5,22,4],[2,12,16,3],[2,22,12,5]],
    sidebyside:[[2,5,16,20],[22,7,16,3],[22,13,14,3],[22,19,10,3]],
    stacked:   [[6,3,28,10],[10,16,20,3],[14,22,12,3]],
    quote:     [[5,8,30,3],[8,14,24,3],[12,20,16,3]],
    cards:     [[2,9,8,12],[12,9,8,12],[22,9,8,12],[32,9,6,12]],
    list:      [[2,6,36,4],[2,13,36,4],[2,20,36,4]],
    grid:      [[2,5,10,9],[14,5,10,9],[26,5,12,9],[2,16,10,9],[14,16,10,9],[26,16,12,9]],
    mosaic:    [[2,4,16,21],[20,4,18,9],[20,15,8,10],[30,15,8,10]],
    strip:     [[2,8,9,14],[13,8,9,14],[24,8,9,14],[35,8,3,14]],
    fullbleed: [[2,2,36,26],[10,11,20,4],[14,18,12,3]],
    typographic:[[8,3,24,7],[14,12,12,6],[10,21,20,4]],
    postcard:  [[4,4,32,22],[12,9,16,4],[14,16,12,3]],
    timeline:  [[3,4,3,22],[9,5,22,3],[9,12,18,3],[9,19,20,3]],
    zigzag:    [[2,4,16,10],[20,5,16,8],[22,16,16,10],[2,17,16,8]],
    letter:    [[5,4,30,22],[10,9,20,3],[10,15,16,3],[22,21,10,3]],
    tiles:     [[2,9,10,12],[15,9,10,12],[28,9,10,12]],
    iconrow:   [[5,8,6,6],[17,8,6,6],[29,8,6,6],[4,16,8,3],[16,16,8,3],[28,16,8,3]],
    accordion: [[2,6,36,4],[2,13,36,4],[2,20,36,4]],
    bento:     [[2,5,22,10],[26,5,12,10],[2,17,12,8],[16,17,22,8]],
    stepper:   [[4,8,6,6],[17,8,6,6],[30,8,6,6],[10,11,7,2],[23,11,7,2]],
    numbered:  [[2,5,7,7],[12,6,26,4],[2,15,7,7],[12,16,26,4]],
    map:       [[2,3,36,11],[2,16,17,11],[21,16,17,11]],
    rows:      [[2,4,36,7],[2,13,36,7],[2,22,36,6]],
    table:     [[2,5,20,4],[26,5,5,4],[33,5,5,4],[2,12,20,4],[26,12,5,4],[33,12,5,4]],
    carousel:  [[2,6,14,18],[18,6,14,18],[34,6,8,18]],
    chips:     [[5,11,9,5],[17,11,9,5],[29,11,8,5]],
    progress:  [[7,5,26,12],[10,19,20,3],[10,9,20,3]],
    logowall:  [[3,5,10,9],[15,5,10,9],[27,5,10,9],[3,16,10,9],[15,16,10,9],[27,16,10,9]],
    masonry:   [[2,4,8,14],[12,4,8,9],[22,4,8,18],[12,15,8,11],[32,4,6,11]],
    slideshow: [[2,3,36,14],[2,19,8,7],[12,19,8,7],[22,19,8,7],[32,19,6,7]],
    polaroid:  [[3,5,11,13],[16,7,11,13],[28,4,9,13]],
    banner:    [[2,9,24,5],[30,9,8,5]],
    twocol:    [[2,5,16,4],[2,11,14,3],[22,5,16,4],[22,11,14,3]],
  };
  const rects = sets[variant] || sets.centered;
  return (
    <svg width="40" height="30" viewBox="0 0 40 30" style={{ flexShrink: 0, borderRadius: 4, background: 'var(--cream-2)' }} aria-hidden="true">
      {rects.map((r,i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="1.5" fill={c} opacity={on ? 0.9 : 0.5}/>)}
    </svg>
  );
}

function PropertyRail({ active, layouts, setLayout, setActive }) {
  const section = SECTIONS.find(s => s.id === active);
  const [tab, setTab] = useEdState('content');
  const variants = (typeof LAYOUTS !== 'undefined' && LAYOUTS[active]) || null;
  const curVariant = (layouts && layouts[active]) || (variants && variants[0].id);

  const fields = FIELDS_BY_SECTION[active] || [];

  return (
    <aside style={{
      gridArea: 'right', background: 'var(--card)',
      borderLeft: '1px solid var(--line-soft)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="eyebrow" style={{ color: 'var(--lavender-ink)', marginBottom: 4 }}>EDITING SECTION</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0, fontWeight: 600 }}>{section.label}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button title="Hide section" style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}><Icon name="eye-off" size={13} color="var(--ink-soft)"/></button>
            <button title="Section options" style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}><Icon name="more" size={13} color="var(--ink-soft)"/></button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{section.desc}</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--cream-2)', borderRadius: 8, marginTop: 12 }}>
          {[
            { id: 'content', label: 'Content', icon: 'text' },
            { id: 'layout',  label: 'Layout',  icon: 'layout' },
            { id: 'style',   label: 'Style',   icon: 'palette' },
          ].map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '7px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center',
              }}>
                <Icon name={t.icon} size={11} color={on ? 'var(--cream)' : 'var(--ink-soft)'}/>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {tab === 'content' && (typeof SectionEditor !== 'undefined' ? <SectionEditor section={active}/> : fields.map(f => <Field key={f.id} field={f}/>))}

        {tab === 'layout' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{section.label} layout</div>
            {variants ? variants.map(v => {
              const on = v.id === curVariant;
              return (
                <button key={v.id} onClick={() => setLayout(active, v.id)} className="lift" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  background: on ? 'var(--cream-2)' : 'var(--card)',
                  border: on ? '2px solid var(--ink)' : '1px solid var(--line)', cursor: 'pointer',
                }}>
                  <LayoutGlyph section={active} variant={v.id} on={on}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{v.label}</div>
                  </div>
                  {on && <Icon name="check" size={14} color="var(--ink)"/>}
                </button>
              );
            }) : (
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', padding: '10px 0', lineHeight: 1.5 }}>
                This section has one refined layout in every theme. Try a different theme pack for a fresh treatment.
              </div>
            )}
          </div>
        )}

        {tab === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Styling is theme-wide</div>
            <p style={{ margin: 0 }}>Colors, type, texture and component looks come from your <b>theme pack</b> so every section stays consistent.</p>
            <button onClick={() => setActive && setActive(null)} className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>
              <Icon name="palette" size={13}/> Open theme packs
            </button>
          </div>
        )}

        {/* Pear assist for this section */}
        {tab === 'content' && (
        <div style={{
          padding: 14, background: 'var(--peach-bg)', borderRadius: 12,
          marginTop: 6,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <Pear size={22} tone="sage" sparkle shadow={false}/>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)' }}>Pear can help</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(active === 'hero'
              ? ['Rewrite tagline in 3 styles', 'Suggest a cover photo from gallery', 'Translate to Greek']
              : active === 'story'
              ? ['Write a draft from your story', 'Make it 30% shorter', 'Punch up the ending']
              : active === 'rsvp'
              ? ['Draft the reminder cadence', 'Add allergy field', 'Smart follow-up wording']
              : ['Rewrite this section', 'Suggest a layout variant', 'Pick a complementary photo']
            ).map((s, i) => (
              <button key={i} style={{
                padding: '7px 10px', borderRadius: 8,
                background: 'var(--card)', border: '1px solid rgba(198,112,61,0.2)',
                fontSize: 12, color: 'var(--ink)',
                textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{s}</span>
                <Icon name="arrow-right" size={11} color="var(--peach-ink)"/>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </aside>
  );
}

function RailGroup({ title, subtitle, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function RailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-soft)', minWidth: 92, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {label}
      </span>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{children}</div>
    </div>
  );
}

/* Field renderer — kind switches between input types */
function Field({ field }) {
  const [val, setVal] = useEdState(field.val ?? '');
  const [askPear, setAskPear] = useEdState(false);

  const labelRow = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{field.label}</span>
      <button onClick={() => setAskPear(!askPear)}
        title={`Ask Pear about ${field.label.toLowerCase()}`}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: askPear ? 'var(--peach-bg)' : 'transparent',
          display: 'grid', placeItems: 'center',
          opacity: askPear ? 1 : 0.55,
          transition: 'all 140ms ease',
      }}>
        <Pear size={12} tone="sage" shadow={false}/>
      </button>
    </div>
  );

  const fieldEl = (() => {
    if (field.kind === 'text') {
      return (
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={field.placeholder}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)',
            outline: 'none',
          }}/>
      );
    }
    if (field.kind === 'long') {
      return (
        <textarea defaultValue="Two strangers on a Tuesday, an argument about whether olives belong on pizza, and a long walk that turned into ten years."
          rows={4}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--line)', resize: 'vertical',
            background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5,
            outline: 'none', fontFamily: 'inherit',
          }}/>
      );
    }
    if (field.kind === 'names') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
          <input defaultValue={field.a} style={inputStyle}/>
          <input defaultValue={field.amp} style={{ ...inputStyle, width: 50, textAlign: 'center', fontStyle: 'italic' }}/>
          <input defaultValue={field.b} style={inputStyle}/>
        </div>
      );
    }
    if (field.kind === 'date') {
      return (
        <input type="date" defaultValue={field.val} style={{ ...inputStyle, width: '100%' }}/>
      );
    }
    if (field.kind === 'photo') {
      return (
        <div style={{
          padding: 10, borderRadius: 10,
          border: '1px dashed var(--line)',
          background: 'var(--cream-2)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <PhotoPlaceholder tone="warm" style={{ width: 48, height: 48, borderRadius: 6 }} aspect="1/1"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>scott-and-shauna-hero.jpg</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>2400 \u00d7 1600 \u00b7 416 KB</div>
          </div>
          <button style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--card)', border: '1px solid var(--line)' }}>Replace</button>
        </div>
      );
    }
    if (field.kind === 'cta') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input defaultValue={field.text} style={inputStyle}/>
          <select defaultValue={field.target} style={{ ...inputStyle, paddingRight: 28 }}>
            <option>RSVP section</option>
            <option>Read story (anchor)</option>
            <option>External link</option>
          </select>
        </div>
      );
    }
    if (field.kind === 'toggle') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{field.val ? 'Yes' : 'No'}</span>
          <span style={{
            width: 36, height: 20, borderRadius: 999,
            background: field.val ? 'var(--sage)' : 'var(--cream-3)',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: field.val ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 160ms ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}/>
          </span>
        </div>
      );
    }
    if (field.kind === 'list') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--cream-2)' }}>
          <span style={{ fontSize: 12.5 }}>{field.count} items</span>
          <button style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: 'var(--card)', border: '1px solid var(--line)' }}>Manage \u2192</button>
        </div>
      );
    }
    if (field.kind === 'gallery') {
      return (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 6 }}>
            {['warm','sage','dusk','peach','lavender','cream','warm','sage'].map((t, i) => (
              <PhotoPlaceholder key={i} tone={t} aspect="1/1" style={{ borderRadius: 4 }}/>
            ))}
          </div>
          <button style={{ width: '100%', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--cream-2)', border: '1px dashed var(--line)' }}>+ Upload more</button>
        </div>
      );
    }
    return null;
  })();

  return (
    <div>
      {labelRow}
      {fieldEl}
      {askPear && (
        <div style={{
          marginTop: 8, padding: '10px 12px',
          background: 'var(--peach-bg)', borderRadius: 8,
          fontSize: 12, color: 'var(--peach-ink)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <Pear size={16} tone="sage" sparkle shadow={false} style={{ flexShrink: 0, marginTop: 1 }}/>
          <div>
            <strong>Try:</strong> &ldquo;Make it warmer,&rdquo; &ldquo;Make it shorter,&rdquo; &ldquo;Match a romance-novel tone.&rdquo;
            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['Shorter', 'Warmer', 'More poetic'].map(c => (
                <span key={c} style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--card)', fontSize: 10.5, fontWeight: 600 }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)',
  outline: 'none',
};

/* ---------- FLOATING PEAR BUBBLE ---------- */

function FloatingPearBubble({ active }) {
  const [open, setOpen] = useEdState(false);
  const [dismissed, setDismissed] = useEdState(false);

  if (dismissed) return null;

  // Contextual nudge based on active section
  const nudges = {
    hero: 'Your tagline is doing a lot of work. Want me to try 3 alternatives?',
    rsvp: 'You haven\u2019t set a reminder cadence yet. I drafted one \u2014 want to review?',
    gallery: '38 photos! I can pick the 12 strongest for the homepage strip.',
    null: 'I noticed Shauna edited the schedule \u2014 want me to rebalance the timeline?',
  };
  const nudge = nudges[active] || nudges['null'];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'absolute', bottom: 24, right: 24,
        padding: '10px 14px 10px 10px', borderRadius: 999,
        background: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', gap: 10,
        zIndex: 20,
      }}>
        <Pear size={28} tone="sage" sparkle shadow={false}/>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Pear has a thought</span>
        <span style={{ width: 7, height: 7, background: 'var(--peach-ink)', borderRadius: '50%' }} className="pulse-dot"/>
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: 24, right: 24,
      width: 320,
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 16,
      boxShadow: 'var(--shadow-lg)',
      zIndex: 20,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pear size={22} tone="sage" sparkle shadow={false}/>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Pear</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', padding: '1px 6px', borderRadius: 999, background: 'var(--cream-2)' }}>watching</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setOpen(false)} style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
            <Icon name="minus" size={13} color="var(--ink-soft)"/>
          </button>
          <button onClick={() => setDismissed(true)} style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
            <Icon name="close" size={13} color="var(--ink-soft)"/>
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, marginBottom: 10 }}>
          {nudge}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>Yes, try it</button>
          <button className="btn btn-outline btn-sm" style={{ fontSize: 12 }}>Not now</button>
        </div>
        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <input placeholder="Or ask something else…" style={{
            width: '100%', padding: '8px 12px', borderRadius: 999,
            border: '1px solid var(--line)', background: 'var(--cream-2)',
            fontSize: 12, outline: 'none',
          }}/>
        </div>
      </div>
    </div>
  );
}

/* ---------- TWEAKS PANEL (developer-side toggles) ---------- */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "edit",
  "active": null,
  "eventId": "wedding",
  "themeId": "santorini",
  "siteLayout": "stacked",
  "kitId": "classic",
  "density": "comfortable",
  "textureIntensity": 1,
  "motifsOn": true,
  "voice": "classic",
  "layouts": {},
  "palette": null,
  "photosOn": false,
  "decor": {},
  "decorOpen": false,
  "pearOpen": false
}/*EDITMODE-END*/;

/* ---------- APP ---------- */

function EditorRedesignApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [hover, setHover] = useEdState(null);

  const setMode    = (v) => setTweak('mode', v);
  const setActive  = (v) => setTweak('active', v);
  const setEventId = (v) => {
    const e = (typeof getEvent !== 'undefined') ? getEvent(v) : null;
    if (e && typeof eventDefaults !== 'undefined') {
      const d = eventDefaults(e);
      setTweak({ eventId: v, themeId: d.themeId, kitId: d.kitId, siteLayout: d.siteLayout, voice: d.voice, motifsOn: d.motifsOn, textureIntensity: d.intensity });
    } else setTweak('eventId', v);
  };
  const shuffleLook = () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const themes = (typeof THEMES !== 'undefined' ? THEMES : []).map(t => t.id);
    const kits = (typeof KITS !== 'undefined' ? KITS : []).map(k => k.id);
    setTweak({
      themeId: themes.length ? pick(themes) : tweaks.themeId,
      kitId: kits.length ? pick(kits) : 'classic',
      siteLayout: pick(['stacked', 'boxed', 'split']),
      textureIntensity: pick([0.6, 1, 1.3]),
      voice: pick(['classic', 'playful', 'poetic']),
    });
  };
  const setThemeId = (v) => setTweak('themeId', v);
  const setSiteLayout = (v) => setTweak('siteLayout', v);
  const setKitId = (v) => setTweak('kitId', v);
  const setDensity = (v) => setTweak('density', v);
  const setTextureIntensity = (v) => setTweak('textureIntensity', v);
  const setMotifsOn  = (v) => setTweak('motifsOn', v);
  const setVoice   = (v) => setTweak('voice', v);
  const setPhotosOn= (v) => setTweak('photosOn', v);
  const setPalette = (v) => setTweak('palette', v);
  const setLayout  = (section, variant) => setTweak('layouts', { ...(tweaks.layouts || {}), [section]: variant });
  const setPearOpen= (v) => setTweak('pearOpen', v);
  const [settingsOpen, setSettingsOpen] = useEdState(false);
  const [publishOpen, setPublishOpen] = useEdState(false);
  const [shopOpen, setShopOpen] = useEdState(false);
  const [cmdOpen, setCmdOpen] = useEdState(false);
  useEdEff(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setCmdOpen(o => !o); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  const [tryingId, setTryingId] = useEdState(null);
  const applyShopPack = (pack) => { setTweak({ palette: pack.vars, kitId: pack.kit, decor: { ...(tweaks.decor || {}), motif: pack.motif } }); setTryingId(pack.id); };
  const setDecor   = (patch) => setTweak('decor', { ...(tweaks.decor || {}), ...patch });
  const resetDecor = () => setTweak('decor', {});
  const setDecorOpen = (v) => setTweak('decorOpen', v);
  const applyGenerated = (cfg) => setTweak({
    eventId: cfg.eventId, themeId: cfg.themeId, voice: cfg.voice, density: cfg.density,
    textureIntensity: cfg.intensity, motifsOn: cfg.motifsOn,
    kitId: cfg.kitId || tweaks.kitId, siteLayout: cfg.siteLayout || tweaks.siteLayout,
  });

  const theme = getTheme(tweaks.themeId);
  const ev = (typeof getEvent !== 'undefined') ? getEvent(tweaks.eventId) : null;
  const railItems = (ev && typeof railSections !== 'undefined') ? railSections(ev, tweaks.voice) : null;
  const railTitle = ev ? (ev.subject === 'couple' ? `${ev.subj.a} & ${ev.subj.b}` : ev.subj.title) : null;
  const completion = 73; // Mock site-completeness percent

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: tweaks.pearOpen ? '256px 1fr 360px 320px' : '256px 1fr 360px',
      gridTemplateRows: '56px 1fr',
      gridTemplateAreas: tweaks.pearOpen
        ? '"top top top top" "left canvas right pear"'
        : '"top top top" "left canvas right"',
      background: 'var(--cream)',
      fontFamily: 'var(--font-ui)',
      color: 'var(--ink)',
    }}>
      <EditorTopbar
        mode={tweaks.mode}
        setMode={setMode}
        savedAt="just now"
        onPublish={() => setPublishOpen(true)}
        pearOpen={tweaks.pearOpen}
        setPearOpen={setPearOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {tweaks.mode === 'preview' ? (
        // In preview: keep left rail (so they can navigate) but blank the right rail
        <>
          <SectionRail active={tweaks.active} setActive={setActive} completion={completion} items={railItems} title={railTitle}/>
          <Canvas
            active={null}
            setActive={() => {}}
            hover={null} setHover={() => {}}
            mode={tweaks.mode}
            theme={theme}
            density={tweaks.density}
            textureIntensity={tweaks.textureIntensity}
            motifsOn={tweaks.motifsOn}
            voice={tweaks.voice}
            layouts={tweaks.layouts}
            palette={tweaks.palette}
            photosOn={tweaks.photosOn}
            eventId={tweaks.eventId}
            siteLayout={tweaks.siteLayout}
            kitId={tweaks.kitId}
            decor={tweaks.decor}
          />
          <aside style={{ gridArea: 'right', background: 'var(--card)', borderLeft: '1px solid var(--line-soft)', padding: 20 }}>
            <div className="eyebrow">PREVIEW MODE</div>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)' }}>
              This is what guests see. Click <strong>Edit</strong> to make changes.
            </p>
          </aside>
        </>
      ) : (
        <>
          <SectionRail active={tweaks.active} setActive={setActive} completion={completion} items={railItems} title={railTitle}/>
          <Canvas
            active={tweaks.active}
            setActive={setActive}
            hover={hover} setHover={setHover}
            mode={tweaks.mode}
            theme={theme}
            density={tweaks.density}
            textureIntensity={tweaks.textureIntensity}
            motifsOn={tweaks.motifsOn}
            voice={tweaks.voice}
            layouts={tweaks.layouts}
            palette={tweaks.palette}
            photosOn={tweaks.photosOn}
            eventId={tweaks.eventId}
            siteLayout={tweaks.siteLayout}
            kitId={tweaks.kitId}
            decor={tweaks.decor}
          />
          {tweaks.active ? (
            <PropertyRail active={tweaks.active} setActive={setActive} layouts={tweaks.layouts} setLayout={setLayout}/>
          ) : (
            <ThemePicker
              themeId={tweaks.themeId} setThemeId={setThemeId}
              eventId={tweaks.eventId} setEventId={setEventId}
              onShuffle={shuffleLook}
              siteLayout={tweaks.siteLayout} setSiteLayout={setSiteLayout}
              kitId={tweaks.kitId} setKitId={setKitId}
              density={tweaks.density} setDensity={setDensity}
              textureIntensity={tweaks.textureIntensity} setTextureIntensity={setTextureIntensity}
              motifsOn={tweaks.motifsOn} setMotifsOn={setMotifsOn}
              voice={tweaks.voice} setVoice={setVoice}
              photosOn={tweaks.photosOn} setPhotosOn={setPhotosOn}
              palette={tweaks.palette} setPalette={setPalette}
              onGenerate={applyGenerated}
              onOpenDecor={() => setDecorOpen(true)}
              onOpenShop={() => setShopOpen(true)}
              decorActive={tweaks.decor && Object.keys(tweaks.decor).length > 0}
            />
          )}
        </>
      )}

      {tweaks.decorOpen && typeof DecorLibrary !== 'undefined' && (
        <DecorLibrary theme={theme} decor={tweaks.decor || {}} setDecor={setDecor} resetDecor={resetDecor}
          subject={railTitle} onClose={() => setDecorOpen(false)}/>
      )}

      {tweaks.pearOpen && (
        <PearChat onClose={() => setPearOpen(false)}/>
      )}

      {settingsOpen && typeof UserSettingsModal !== 'undefined' && (
        <UserSettingsModal onClose={() => setSettingsOpen(false)}/>
      )}

      {typeof PublishFlow !== 'undefined' && (
        <PublishFlow open={publishOpen} onClose={() => setPublishOpen(false)} themeId={tweaks.themeId}/>
      )}

      {typeof ThemeShop !== 'undefined' && (
        <ThemeShop open={shopOpen} onClose={() => setShopOpen(false)} onApply={applyShopPack} onTry={applyShopPack} tryingId={tryingId}/>
      )}

      {typeof CommandPalette !== 'undefined' && (
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={(() => {
          const cmds = [];
          (typeof SECTIONS !== 'undefined' ? SECTIONS : []).forEach(s => cmds.push({ id: 'sec-' + s.id, group: 'Go to section', label: s.label, hint: s.desc, icon: s.icon, run: () => setActive(s.id) }));
          (typeof THEMES !== 'undefined' ? THEMES : []).forEach(t => cmds.push({ id: 'th-' + t.id, group: 'Theme pack', label: t.name, hint: t.blurb, swatch: t.swatches[0], keywords: ['theme', t.id], run: () => setTweak({ themeId: t.id, palette: null }) }));
          (typeof KITS !== 'undefined' ? KITS : []).forEach(k => cmds.push({ id: 'kit-' + k.id, group: 'Component kit', label: k.label, hint: k.blurb, icon: 'grid', keywords: ['kit'], run: () => setKitId(k.id) }));
          [
            { label: 'Open Theme Shop', hint: '60+ premium packs', icon: 'sparkles', kw: ['buy','store','premium'], run: () => setShopOpen(true) },
            { label: 'Open Decor Library', hint: 'Motifs, dividers, patterns', icon: 'leaf', kw: ['decor','motif','pattern'], run: () => setDecorOpen(true) },
            { label: 'Publish site', hint: 'Go live & share', icon: 'arrow-up', kw: ['publish','share','live','domain'], run: () => setPublishOpen(true) },
            { label: 'Account & billing', hint: 'Settings, usage, plan', icon: 'user', kw: ['settings','account','subscription','credits'], run: () => setSettingsOpen(true) },
            { label: 'Shuffle the look', hint: 'Surprise me', icon: 'sparkles', kw: ['random','shuffle'], run: () => shuffleLook() },
            { label: 'Preview mode', hint: 'See it as guests do', icon: 'eye', kw: ['preview'], run: () => setMode('preview') },
            { label: 'Edit mode', icon: 'brush', kw: ['edit'], run: () => setMode('edit') },
            { label: 'Mobile preview', icon: 'phone', kw: ['mobile','phone'], run: () => setMode('mobile') },
            { label: 'Ask Pear', hint: 'Open the assistant', icon: 'sparkles', kw: ['ai','help','pear'], run: () => setPearOpen(true) },
          ].forEach((a, i) => cmds.push({ id: 'act-' + i, group: 'Actions', label: a.label, hint: a.hint, icon: a.icon, keywords: a.kw, run: a.run }));
          (typeof EVENTS !== 'undefined' ? EVENTS : []).forEach(ev => cmds.push({ id: 'ev-' + ev.id, group: 'Switch event type', label: ev.label, hint: ev.category, icon: ev.icon, keywords: ['event', ev.id], run: () => setEventId(ev.id) }));
          return cmds;
        })()}/>
      )}
    </div>
  );
}

/* Pear full chat panel (sidebar version) */
function PearChat({ onClose }) {
  return (
    <aside style={{
      gridArea: 'pear',
      background: 'var(--card)',
      borderLeft: '1px solid var(--line-soft)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={28} tone="sage" sparkle shadow={false}/>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pear</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>knows your site</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
          <Icon name="close" size={13} color="var(--ink-soft)"/>
        </button>
      </div>

      <div style={{ flex: 1, padding: 18, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Bubble who="pear">Hi {COUPLE.a} \u2014 your site is looking lovely. A few things I noticed:</Bubble>
        <Bubble who="pear" muted>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Card icon="check"   tone="sage">Hero, Story, Schedule complete</Card>
            <Card icon="bell"    tone="peach">RSVP section has no reminder cadence yet</Card>
            <Card icon="image"   tone="lavender">Gallery has 38 photos \u2014 I can pick the strongest 12</Card>
          </div>
        </Bubble>
        <Bubble who="me">Make the tagline shorter</Bubble>
        <Bubble who="pear">Three options, in order of how much I&rsquo;d use them:</Bubble>
        <Bubble who="pear" muted>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Option label="finally."/>
            <Option label="ten years in."/>
            <Option label="no more Tuesdays apart."/>
          </div>
        </Bubble>
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['Suggest 3 hero layouts', 'Translate to Greek', 'Tighten Story', 'Fix RSVP cadence'].map(s => (
            <span key={s} style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--cream-2)', fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>{s}</span>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <input placeholder="Ask anything about your site…"
            style={{
              width: '100%', padding: '11px 44px 11px 14px', borderRadius: 999,
              background: 'var(--cream-2)', border: '1px solid var(--line)',
              fontSize: 13, outline: 'none',
            }}/>
          <button style={{ position: 'absolute', right: 4, top: 4, width: 32, height: 32, borderRadius: '50%', background: 'var(--ink)', display: 'grid', placeItems: 'center' }}>
            <Icon name="arrow-up" size={13} color="var(--cream)"/>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Bubble({ who, children, muted }) {
  const isPear = who === 'pear';
  return (
    <div style={{
      alignSelf: isPear ? 'flex-start' : 'flex-end',
      maxWidth: '90%',
      padding: muted ? 0 : '10px 14px',
      borderRadius: 14,
      borderBottomLeftRadius: isPear && !muted ? 4 : 14,
      borderBottomRightRadius: !isPear && !muted ? 4 : 14,
      background: muted ? 'transparent' : isPear ? 'var(--cream-2)' : 'var(--ink)',
      color: muted ? 'var(--ink)' : isPear ? 'var(--ink)' : 'var(--cream)',
      fontSize: 13, lineHeight: 1.5,
    }}>{children}</div>
  );
}

function Card({ icon, tone, children }) {
  const bg = tone === 'sage' ? 'var(--sage-tint)' : tone === 'peach' ? 'var(--peach-bg)' : 'var(--lavender-bg)';
  const fg = tone === 'sage' ? 'var(--sage-deep)' : tone === 'peach' ? 'var(--peach-ink)' : 'var(--lavender-ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: bg }}>
      <Icon name={icon} size={13} color={fg}/>
      <span style={{ fontSize: 12.5, color: fg, fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function Option({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'var(--cream-2)' }}>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{label}</span>
      <button style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 11, fontWeight: 700 }}>Apply</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<EditorRedesignApp/>);
