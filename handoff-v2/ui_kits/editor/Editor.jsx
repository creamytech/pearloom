/* global React */
// Pearloom site EDITOR — faithful recreation of EditorRedesign.
// Built on the PRODUCT CHROME tokens (--cream / --card / --ink /
// --line + sage = saved, peach = active/working, lavender = italic).
// Four-zone grid: topbar · left section rail · canvas · property rail.
(() => {
const { PearloomGlyph, Button, Pearl, WeaveLoader } = window.PearloomDesignSystem_55118c;

const SECTIONS = [
  { id: 'hero', label: 'Opening', icon: '⌂', desc: 'Names, date, cover photo', req: true },
  { id: 'story', label: 'Our story', icon: '❧', desc: '2 chapters' },
  { id: 'details', label: 'Details', icon: '✦', desc: 'Dress code, kids, FAQ-lite' },
  { id: 'schedule', label: 'Schedule', icon: '◷', desc: '4 moments' },
  { id: 'travel', label: 'Travel', icon: '✈', desc: 'Hotels, transit, tips' },
  { id: 'registry', label: 'Registry', icon: '❖', desc: 'Linked stores', attn: true },
  { id: 'gallery', label: 'Gallery', icon: '◎', desc: 'No photos yet', attn: true },
  { id: 'rsvp', label: 'RSVP', icon: '✉', desc: 'Closes Aug 10', req: true },
  { id: 'faq', label: 'FAQ', icon: '✢', desc: '3 answered' },
];
const TOOLS = [
  { id: 'guests', label: 'Guests', icon: '☞', desc: 'Your guest list' },
  { id: 'share', label: 'Share', icon: '∞', desc: 'Link, QR, preview' },
  { id: 'dayof', label: 'Day-of', icon: '✦', desc: 'Live broadcasts' },
];

function Editor() {
  const [active, setActive] = React.useState('hero');
  const [tab, setTab] = React.useState('sections');
  const [mode, setMode] = React.useState('edit');
  const [pearOpen, setPearOpen] = React.useState(false);
  const preview = mode === 'preview';
  const showTheme = tab === 'theme';

  // ── Topbar ──
  const Topbar = (
    <header className="ed-top" style={{ gridArea: 'top', background: 'var(--cream)', borderBottom: '1px solid var(--line-soft)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 16, height: 56, zIndex: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, fontSize: 12.5, color: 'var(--ink-soft)' }}>
        <span style={{ opacity: 0.6 }}>‹</span>
        <PearloomGlyph size={20} />
        <span>Dashboard</span>
      </div>
      <div className="ed-modepills" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--card)', borderRadius: 999, border: '1px solid var(--line-soft)' }}>
          {[['edit', 'Edit', '✎'], ['preview', 'Preview', '◉'], ['mobile', 'Mobile', '▢']].map(([id, l, ic]) => {
            const on = mode === id;
            return <button key={id} onClick={() => setMode(id)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink-soft)', border: 0, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>{ic} {l}</button>;
          })}
        </div>
      </div>
      {/* golden-thread chip */}
      <div className="ed-coverchip" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 11px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line-soft)', color: 'var(--ink-soft)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} /> Add your cover photo
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* save state — sage dot */}
        <div className="ed-savestate" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)' }} /> Saved 12:30
        </div>
        <div className="ed-savestate" style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
        <button onClick={() => setPearOpen(!pearOpen)} className="ed-btn ed-hide-sm" style={{ background: pearOpen ? 'var(--peach-bg)' : 'var(--card)', borderColor: pearOpen ? 'transparent' : 'var(--line)', color: pearOpen ? 'var(--peach-ink)' : 'var(--ink)' }}>
          <PearloomGlyph size={14} /> Ask Pear
        </button>
        <button className="ed-btn ed-hide-sm" onClick={() => setTab('theme')}>◑ Theme</button>
        <button className="pl-pearl-ed" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, border: '1px solid var(--pl-gold-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', color: 'var(--pl-ink)', background: 'linear-gradient(135deg,#F4ECD8 0%,#E8C77A 32%,#D9A89E 58%,#B8C96B 82%,#F4ECD8 100%)' }}>Publish ↑</button>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--pl-gradient-olive)', display: 'grid', placeItems: 'center', color: 'var(--cream)', fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 12, border: '1px solid var(--line)' }}>M</div>
      </div>
    </header>
  );

  // ── Left section rail ──
  const LeftRail = (
    <aside className="ed-left" style={{ gridArea: 'left', borderRight: '1px solid var(--line-soft)', background: 'var(--cream-2)', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
      <div style={{ padding: 12, background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12 }}>
        <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 5 }}>
          <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', marginRight: 6, verticalAlign: 'middle' }} />Wedding
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>Mira &amp; Jun</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginBottom: 8 }}>⊕ pearloom.com/wedding/mira-and-jun</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--cream-3)', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: '72%', height: '100%', background: 'var(--sage)' }} /></div>
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontWeight: 600 }}>72%</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line-soft)' }}>
        {['sections', 'pages', 'theme'].map((t) => {
          const on = tab === t;
          return <button key={t} onClick={() => { setTab(t); if (t === 'theme') setActive(null); else if (!active) setActive('hero'); }} style={{ flex: 1, padding: 6, borderRadius: 6, fontSize: 11, fontWeight: 600, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink-soft)', border: 0, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'var(--font-ui)' }}>{t}</button>;
        })}
      </div>
      {tab === 'sections' ? (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Page sections</span><span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>drag to reorder</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map((s) => {
              const on = s.id === active;
              return (
                <div key={s.id} onClick={() => setActive(s.id)} style={{ display: 'grid', gridTemplateColumns: '12px 22px 1fr 14px', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer' }}>
                  <span style={{ opacity: on ? 0.5 : 0.3, fontSize: 9, letterSpacing: 1 }}>⠿</span>
                  <span style={{ fontFamily: 'var(--pl-font-display)', fontSize: 13, opacity: on ? 1 : 0.7 }}>{s.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{s.label}{s.attn ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--peach-ink)' }} /> : null}</div>
                    <div style={{ fontSize: 10.5, opacity: on ? 0.7 : 0.55, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
                  </div>
                  {s.req ? <span style={{ fontSize: 10, opacity: on ? 0.8 : 0.5 }}>⚿</span> : <span />}
                </div>
              );
            })}
            <button style={{ marginTop: 4, padding: '8px 10px', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6, border: '1px dashed var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>+ Add section</button>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>Tools</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TOOLS.map((s) => {
              const on = s.id === active;
              return (
                <div key={s.id} onClick={() => setActive(s.id)} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--pl-font-display)', fontSize: 13, opacity: on ? 1 : 0.7 }}>{s.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 10.5, opacity: on ? 0.7 : 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ padding: '12px 13px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.55, display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--peach-ink)' }}>✦</span>
          <span>{tab === 'theme' ? 'Theme controls are open in the panel on the right — palette, type, layout, texture.' : 'Flip to magazine mode and arrange your pages here.'}</span>
        </div>
      )}
    </aside>
  );

  // ── Canvas (mini published site) ──
  const sel = active && ['hero', 'story', 'schedule', 'gallery', 'rsvp'].includes(active);
  const frame = (id, children, label) => {
    const on = active === id && !preview;
    return (
      <div style={{ position: 'relative', outline: on ? '2px solid var(--peach-ink)' : '2px solid transparent', outlineOffset: -2, borderRadius: 4, transition: 'outline-color var(--pl-dur-quick)' }}>
        {on ? <span style={{ position: 'absolute', top: 0, left: 0, transform: 'translateY(-100%)', background: 'var(--peach-ink)', color: 'var(--cream)', fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px 4px 0 0' }}>{label}</span> : null}
        {children}
      </div>
    );
  };
  const Canvas = (
    <div className="ed-canvas" style={{ gridArea: 'canvas', background: 'var(--cream-3)', overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', position: 'relative' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(61,74,31,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px', opacity: 0.5 }} />
      <div style={{ width: 'min(720px, 100%)', maxWidth: '100%', background: 'var(--paper)', borderRadius: 14, boxShadow: 'var(--shadow-md)', border: '1px solid var(--card-ring)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* mini nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '1px solid var(--line-soft)' }}>
          <span style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)' }}>M &amp; J</span>
          <span style={{ display: 'inline-flex', gap: 16, fontSize: 11.5, color: 'var(--ink-soft)' }}><span>Story</span><span>Day</span><span>Travel</span><span style={{ color: 'var(--sage-deep)', fontWeight: 600 }}>RSVP</span></span>
        </div>
        {/* hero */}
        {frame('hero', (
          <div style={{ padding: '40px 28px 32px', textAlign: 'center', background: 'var(--cream-2)' }}>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 12 }}>Pressed by Pear · Sept 6, 2026</div>
            <div className="pl-letterpress" style={{ fontFamily: 'var(--pl-font-display)', fontSize: 42, lineHeight: 1.0, fontWeight: 400, letterSpacing: '-0.03em', color: 'var(--ink)', fontVariationSettings: '"opsz" 144, "SOFT" 50' }}>Mira &amp; Jun</div>
            <div className="pl8-display-italic" style={{ fontSize: 18, margin: '14px 0 0', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>are getting married</div>
          </div>
        ), 'Opening')}
        {/* story */}
        {frame('story', (
          <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 120px', gap: 18, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Our story</div>
              <div style={{ fontFamily: 'var(--pl-font-display)', fontSize: 24, color: 'var(--ink)', margin: '6px 0' }}>A very long table</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}>Two families, one Saturday in Point Reyes. Come hungry, stay late.</p>
            </div>
            <div style={{ height: 120, borderRadius: 8, background: 'var(--cream-3) url(../../assets/imagery/vase-linen-still.png) center/cover' }} />
          </div>
        ), 'Our story')}
        {/* schedule */}
        {frame('schedule', (
          <div style={{ padding: '24px 28px', background: 'var(--cream-2)', borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 12 }}>The run of the day</div>
            {[['4:00', 'Arrive & gather'], ['5:00', 'The vows'], ['6:30', 'Supper & toasts']].map(([t, l]) => (
              <div key={t} style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '7px 0' }}>
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 12, color: 'var(--sage-deep)', width: 50 }}>{t}</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{l}</span>
              </div>
            ))}
          </div>
        ), 'Schedule')}
        {/* rsvp */}
        {frame('rsvp', (
          <div style={{ padding: '28px', textAlign: 'center', borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ fontFamily: 'var(--pl-font-display)', fontSize: 28, color: 'var(--ink)' }}>Kindly reply</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '6px 0 14px' }}>by <em className="pl8-display-italic" style={{ fontSize: 14 }}>August 10th</em></div>
            <span style={{ display: 'inline-flex', padding: '9px 20px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 13, fontWeight: 600 }}>Press RSVP →</span>
          </div>
        ), 'RSVP')}
      </div>
      {preview ? <div style={{ position: 'absolute', top: 16, right: 24, padding: '6px 12px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 11.5, fontWeight: 600 }}>◉ Preview — chrome hidden</div> : null}
    </div>
  );

  // ── Right rail: property panel OR theme rail ──
  const RightRail = showTheme || !active ? <ThemeRail /> : <PropertyPanel active={active} />;

  return (
    <div className="ed-shell" style={{ height: '100%', display: 'grid', gridTemplateColumns: pearOpen ? '236px 1fr 320px 300px' : '236px 1fr 340px', gridTemplateRows: '56px 1fr', gridTemplateAreas: pearOpen ? '"top top top top" "left canvas right pear"' : '"top top top" "left canvas right"', background: 'var(--cream)', fontFamily: 'var(--font-ui)', color: 'var(--ink)', overflow: 'hidden' }}>
      {Topbar}
      {!preview ? LeftRail : null}
      {Canvas}
      {!preview ? (showTheme || !active ? <div className="ed-right" style={{ gridArea: 'right' }}><ThemeRail /></div> : <div className="ed-right" style={{ gridArea: 'right' }}><PropertyPanel active={active} /></div>) : null}
      {pearOpen && !preview ? <PearAside onClose={() => setPearOpen(false)} /> : null}
      <div className="ed-mobile-bar" style={{ display: 'none', gridArea: 'mbar', alignItems: 'center', justifyContent: 'space-around', gap: 4, padding: '8px 10px calc(8px + env(safe-area-inset-bottom))', background: 'var(--cream)', borderTop: '1px solid var(--line-soft)' }}>
        {[['sections', '❑', 'Sections'], ['theme', '◑', 'Theme'], ['preview', '◉', 'Preview'], ['pear', '✦', 'Pear']].map(function (it) {
          var on = (it[0] === 'sections' && tab === 'sections' && !showTheme) || (it[0] === 'theme' && showTheme) || (it[0] === 'preview' && preview) || (it[0] === 'pear' && pearOpen);
          return React.createElement('button', { key: it[0], onClick: function () { if (it[0] === 'sections') { setTab('sections'); setMode('edit'); } else if (it[0] === 'theme') { setTab('theme'); setMode('edit'); } else if (it[0] === 'preview') { setMode(preview ? 'edit' : 'preview'); } else { setPearOpen(!pearOpen); } }, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', border: 'none', background: 'transparent', cursor: 'pointer', color: on ? 'var(--peach-ink)' : 'var(--ink-muted)', fontFamily: 'var(--font-ui)' } },
            React.createElement('span', { style: { fontSize: 17, fontFamily: 'var(--pl-font-display)' } }, it[1]),
            React.createElement('span', { style: { fontSize: 10, fontWeight: 600 } }, it[2]));
        })}
      </div>
    </div>
  );
}

function RailShell({ title, eyebrow, children }) {
  return (
    <aside style={{ height: '100%', borderLeft: '1px solid var(--line-soft)', background: 'var(--cream-2)', overflow: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink)' }}>{eyebrow}</div>
        <div className="pl8-display-italic" style={{ fontSize: 22, marginTop: 2 }}>{title}</div>
      </div>
      {children}
    </aside>
  );
}
function Group({ label, children }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}
function Lbl({ children }) { return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{children}</div>; }
function In({ v }) { return <div style={{ padding: '9px 12px', background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', marginBottom: 12 }}>{v}</div>; }

const PANELS = {
  hero: { eyebrow: 'Editing · Opening', title: 'The first impression.' },
  story: { eyebrow: 'Editing · Our story', title: 'How you met.' },
  details: { eyebrow: 'Editing · Details', title: 'The fine print.' },
  schedule: { eyebrow: 'Editing · Schedule', title: 'The run of the day.' },
  travel: { eyebrow: 'Editing · Travel', title: 'Getting there.' },
  registry: { eyebrow: 'Editing · Registry', title: 'The wish list.' },
  gallery: { eyebrow: 'Editing · Gallery', title: 'The photo wall.' },
  rsvp: { eyebrow: 'Editing · RSVP', title: 'The reply form.' },
  faq: { eyebrow: 'Editing · FAQ', title: 'Guest questions.' },
  guests: { eyebrow: 'Tool · Guests', title: 'Your guest list.' },
  share: { eyebrow: 'Tool · Share', title: 'Send it out.' },
  dayof: { eyebrow: 'Tool · Day-of', title: 'On the day.' },
};
function PropertyPanel({ active }) {
  const p = PANELS[active] || PANELS.hero;
  return (
    <RailShell eyebrow={p.eyebrow} title={p.title}>
      <Group label="Names">
        <Lbl>Partner one</Lbl><In v="Mira Vega" />
        <Lbl>Partner two</Lbl><In v="Jun Park" />
      </Group>
      <Group label="The day">
        <Lbl>Date</Lbl><In v="September 6, 2026" />
        <Lbl>Where</Lbl><In v="Point Reyes, CA" />
      </Group>
      <Group label="Cover photo">
        <div style={{ height: 96, borderRadius: 10, border: '1.5px dashed var(--line)', background: 'var(--paper)', display: 'grid', placeItems: 'center', color: 'var(--ink-muted)', fontSize: 12 }}>
          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--peach-ink)' }}>＋</span> Drop a photo, or ask Pear</span>
        </div>
      </Group>
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center', padding: '10px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid var(--peach-ink)', color: 'var(--peach-ink)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>✦ Ask Pear to write this</button>
    </RailShell>
  );
}

const THEMES = [
  { name: 'Garden', pal: ['#5C6B3F', '#D9A89E', '#FBF7EE'], on: true },
  { name: 'Santorini', pal: ['#2E6B8A', '#E8EEF1', '#D9C7A8'] },
  { name: 'Tuscan', pal: ['#B5613A', '#7A8B4A', '#E8DCB4'] },
  { name: 'Midnight', pal: ['#0D0B07', '#D4B373', '#A4B57A'] },
];
function ThemeRail() {
  const [sel, setSel] = React.useState('Garden');
  return (
    <RailShell eyebrow="Theme" title="Dress the page.">
      <Group label="Palette">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {THEMES.map((t) => {
            const on = sel === t.name;
            return (
              <button key={t.name} onClick={() => setSel(t.name)} style={{ padding: 0, borderRadius: 10, overflow: 'hidden', border: on ? '2px solid var(--peach-ink)' : '1px solid var(--line)', cursor: 'pointer', background: 'var(--paper)' }}>
                <div style={{ height: 38, display: 'flex' }}>{t.pal.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>
                <div style={{ padding: '6px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', textAlign: 'left' }}>{t.name}</div>
              </button>
            );
          })}
        </div>
      </Group>
      <Group label="Type">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--peach-ink)', background: 'var(--peach-bg)' }}><span style={{ fontFamily: 'var(--pl-font-display)', fontSize: 18, color: 'var(--ink)' }}>Fraunces</span> <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>· letterpress display</span></div>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)' }}><span style={{ fontFamily: 'var(--pl-font-body)', fontSize: 15, color: 'var(--ink)' }}>Geist</span> <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>· body</span></div>
        </div>
      </Group>
      <Group label="Paper texture">
        <div style={{ display: 'flex', gap: 8 }}>
          {['None', 'Grain', 'Linen'].map((x, i) => <div key={x} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, border: i === 1 ? '1.5px solid var(--peach-ink)' : '1px solid var(--line)', background: i === 1 ? 'var(--peach-bg)' : 'var(--paper)', color: i === 1 ? 'var(--peach-ink)' : 'var(--ink-soft)', cursor: 'pointer' }}>{x}</div>)}
        </div>
      </Group>
      <button style={{ padding: '10px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Open the Theme Shop</button>
    </RailShell>
  );
}

function PearAside({ onClose }) {
  return (
    <aside style={{ gridArea: 'pear', borderLeft: '1px solid var(--line-soft)', background: 'var(--cream-2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--card)' }}>
        <PearloomGlyph size={28} />
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Pear</div><div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>your design advisor</div></div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div style={{ alignSelf: 'flex-start', maxWidth: '90%', padding: '10px 14px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--line-soft)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>Your Opening looks lovely. Want me to draft a one-line welcome under your names, or find a warmer cover photo?</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Draft a welcome', 'Warmer photo', 'Tighten the story'].map((q) => <span key={q} style={{ fontSize: 11, padding: '5px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid var(--peach-2)', color: 'var(--peach-ink)', cursor: 'pointer' }}>{q}</span>)}
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--card)', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 12.5, color: 'var(--ink-muted)' }}>Ask Pear to change anything…</div>
        <span style={{ width: 36, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'var(--ink)', color: 'var(--cream)' }}>→</span>
      </div>
    </aside>
  );
}

window.Editor = Editor;
})();
