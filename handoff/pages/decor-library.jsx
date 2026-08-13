/* =========================================================================
   PEARLOOM DECOR LIBRARY — a beautiful, live-applying customization drawer.
   Browse & apply motifs, dividers, patterns; recolor & set density; generate
   a coordinated decor set from a few words; or start from a curated preset.
   Everything applies instantly to the site behind it (via setDecor).
   ========================================================================= */

const { useState: useDecorState } = React;

const DL_MOTIFS = [
  { id: 'olive', label: 'Olive Sprig' }, { id: 'bloom', label: 'Watercolor Bloom' }, { id: 'pressed', label: 'Pressed Flower' },
  { id: 'lemon', label: 'Lemon' }, { id: 'sun', label: 'Sun' }, { id: 'wheat', label: 'Wheat' },
  { id: 'fern', label: 'Fern' }, { id: 'shell', label: 'Shell' }, { id: 'citrus', label: 'Citrus' },
  { id: 'laurel', label: 'Laurel' }, { id: 'deco', label: 'Deco Fan' }, { id: 'palm', label: 'Palm' },
];
const DL_DIVIDERS = [
  { id: 'rule', label: 'Hairline' }, { id: 'sprig', label: 'Sprig' }, { id: 'brush', label: 'Brushstroke' },
  { id: 'dot', label: 'Dotted' }, { id: 'deckle', label: 'Deckle' },
];
const DL_PATTERNS = [
  { id: 'gingham', label: 'Gingham' }, { id: 'stripe', label: 'Pinstripe' }, { id: 'cabana', label: 'Cabana' },
  { id: 'diagonal', label: 'Diagonal' }, { id: 'dots', label: 'Polka' }, { id: 'grid', label: 'Grid' },
  { id: 'deco', label: 'Deco' }, { id: 'scallop', label: 'Scallop' }, { id: 'wave', label: 'Wave' },
  { id: 'confetti', label: 'Confetti' }, { id: 'terrazzo', label: 'Terrazzo' }, { id: 'celestial', label: 'Celestial' },
];
const DL_COLORS = [
  { id: '--t-accent', label: 'Accent' }, { id: '--t-accent-2', label: 'Soft' },
  { id: '--t-gold', label: 'Gold' }, { id: '--t-ink', label: 'Ink' }, { id: '--t-accent-ink', label: 'Deep' },
];
const DL_PRESETS = [
  { label: 'Olive & Hairline', d: { motif: 'olive', divider: 'sprig', pattern: 'none', color: '--t-accent', density: 'sparse' } },
  { label: 'Watercolor Garden', d: { motif: 'bloom', divider: 'brush', pattern: 'none', color: '--t-accent', density: 'generous' } },
  { label: 'Riviera Stripe', d: { motif: 'citrus', divider: 'rule', pattern: 'stripe', color: '--t-accent', density: 'sparse' } },
  { label: 'Deco Gold', d: { motif: 'deco', divider: 'rule', pattern: 'deco', color: '--t-gold', density: 'sparse' } },
  { label: 'Starlit Night', d: { motif: 'sun', divider: 'dot', pattern: 'celestial', color: '--t-gold', density: 'sparse' } },
  { label: 'Coastal Calm', d: { motif: 'shell', divider: 'deckle', pattern: 'scallop', color: '--t-accent', density: 'sparse' } },
  { label: 'Wildflower Press', d: { motif: 'pressed', divider: 'dot', pattern: 'dots', color: '--t-accent-2', density: 'generous' } },
  { label: 'Tuscan Sun', d: { motif: 'wheat', divider: 'brush', pattern: 'none', color: '--t-gold', density: 'sparse' } },
];

function decorFromWords(text) {
  const t = (text || '').toLowerCase();
  const has = (...w) => w.some(x => t.includes(x));
  let motif = 'olive', pattern = 'none', divider = 'sprig', color = '--t-accent', density = 'sparse';
  if (has('olive', 'greek', 'mediterran', 'tuscan')) { motif = 'olive'; divider = 'sprig'; }
  else if (has('water', 'paint', 'bloom', 'rose', 'peony', 'floral', 'flower')) { motif = 'bloom'; divider = 'brush'; density = 'generous'; }
  else if (has('wild', 'press', 'garden', 'meadow')) { motif = 'pressed'; divider = 'dot'; density = 'generous'; }
  else if (has('lemon', 'citrus', 'orange', 'amalfi')) { motif = 'citrus'; pattern = 'stripe'; }
  else if (has('sun', 'summer', 'golden', 'bright')) { motif = 'sun'; color = '--t-gold'; }
  else if (has('wheat', 'rustic', 'harvest', 'field')) { motif = 'wheat'; color = '--t-gold'; }
  else if (has('fern', 'eucalypt', 'green', 'botanic')) { motif = 'fern'; }
  else if (has('shell', 'beach', 'coast', 'sea', 'ocean', 'nautical')) { motif = 'shell'; pattern = 'scallop'; divider = 'deckle'; }
  else if (has('laurel', 'classic', 'roman', 'marble')) { motif = 'laurel'; divider = 'rule'; }
  else if (has('deco', 'gatsby', 'geometric', 'art deco')) { motif = 'deco'; pattern = 'deco'; color = '--t-gold'; }
  else if (has('palm', 'tropical', 'springs')) { motif = 'palm'; pattern = 'stripe'; }
  else if (has('star', 'night', 'celestial', 'moon')) { motif = 'sun'; pattern = 'celestial'; color = '--t-gold'; divider = 'dot'; }
  if (has('gingham', 'picnic')) pattern = 'gingham';
  if (has('confetti', 'party', 'fun')) pattern = 'confetti';
  if (has('terrazzo', 'speckle')) pattern = 'terrazzo';
  if (has('stripe', 'cabana')) pattern = 'stripe';
  if (has('gold')) color = '--t-gold';
  if (has('subtle', 'minimal', 'simple')) { density = 'sparse'; pattern = 'none'; }
  if (has('lots', 'generous', 'rich', 'maximal')) density = 'generous';
  return { motif, pattern, divider, color, density };
}

/* ---- small themed tile that paints in the current theme ---- */
function ThemedTile({ theme, color, children, style = {}, onClick, active, padding = 14 }) {
  const root = { ...themeRootStyle({ vars: theme.vars }, 'comfortable'), '--t-motif': color || 'var(--t-accent)',
    position: 'relative', background: 'var(--t-section)', borderRadius: 12, overflow: 'hidden',
    display: 'grid', placeItems: 'center', minHeight: 78, padding, cursor: 'pointer',
    outline: active ? '2.5px solid var(--lavender-2)' : '1px solid var(--line-soft)', outlineOffset: active ? -1 : 0, ...style };
  return (
    <button onClick={onClick} className="lift" style={root}>
      {children}
      {active && <span style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--lavender-2)', display: 'grid', placeItems: 'center', zIndex: 3 }}><Icon name="check" size={11} color="#3D4A1F"/></span>}
    </button>
  );
}

function TabBtn({ on, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 4px', borderRadius: 10, cursor: 'pointer',
      background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>
      <Icon name={icon} size={16} color={on ? 'var(--cream)' : 'var(--ink-soft)'}/>
      <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function GalleryLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '4px 2px 10px' }}>{children}</div>;
}

function DecorLibrary({ theme, decor = {}, setDecor, resetDecor, subject, onClose }) {
  const [tab, setTab] = useDecorState('motifs');
  const [text, setText] = useDecorState('');
  const [gen, setGen] = useDecorState(null);
  const color = decor.color || 'var(--t-accent)';
  const dColorVal = (id) => theme.vars[id] || 'var(--t-accent)';

  const runGen = (q) => { const query = q != null ? q : text; const d = decorFromWords(query); setDecor(d); setGen(d); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(40,40,30,0.18)', pointerEvents: 'auto' }}/>
      <aside style={{ position: 'relative', width: 'min(460px, 94vw)', background: 'var(--card)', boxShadow: '-16px 0 46px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', animation: 'dl-in 300ms cubic-bezier(0.16,1,0.3,1)' }}>
        <style>{`@keyframes dl-in{from{transform:translateX(28px);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center' }}><Icon name="sparkles" size={16} color="var(--lavender-ink)"/></span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Decor Library</h3>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={15} color="var(--ink-soft)"/></button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, padding: 4, background: 'var(--cream-2)', borderRadius: 12 }}>
            <TabBtn on={tab === 'motifs'} onClick={() => setTab('motifs')} icon="leaf" label="Motifs"/>
            <TabBtn on={tab === 'dividers'} onClick={() => setTab('dividers')} icon="minus" label="Dividers"/>
            <TabBtn on={tab === 'patterns'} onClick={() => setTab('patterns')} icon="grid" label="Patterns"/>
            <TabBtn on={tab === 'monogram'} onClick={() => setTab('monogram')} icon="heart-icon" label="Monogram"/>
            <TabBtn on={tab === 'generate'} onClick={() => setTab('generate')} icon="wand" label="Generate"/>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          {tab === 'motifs' && (
            <>
              <GalleryLabel>Motif art — tap to place around your sections</GalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <ThemedTile theme={theme} color={color} active={decor.motif === 'none'} onClick={() => setDecor({ motif: 'none' })}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', fontWeight: 600 }}>None</span>
                </ThemedTile>
                {DL_MOTIFS.map(m => (
                  <ThemedTile key={m.id} theme={theme} color={color} active={decor.motif === m.id} onClick={() => setDecor({ motif: m.id })}>
                    <Motif kind={m.id} size={52}/>
                  </ThemedTile>
                ))}
              </div>

              <GalleryLabel>Motif color</GalleryLabel>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                {DL_COLORS.map(c => {
                  const on = (decor.color || '--t-accent') === c.id || decor.color === `var(${c.id})`;
                  return <button key={c.id} onClick={() => setDecor({ color: `var(${c.id})` })} title={c.label} className="lift" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: dColorVal(c.id), boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)', border: on ? '2.5px solid var(--ink)' : '2.5px solid transparent' }}/>
                    <span style={{ fontSize: 9.5, color: 'var(--ink-muted)' }}>{c.label}</span>
                  </button>;
                })}
              </div>

              <GalleryLabel>Amount</GalleryLabel>
              <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--cream-2)', borderRadius: 9, width: 'fit-content' }}>
                {[{ id: 'sparse', l: 'Subtle' }, { id: 'generous', l: 'Generous' }].map(d => {
                  const on = (decor.density || 'sparse') === d.id;
                  return <button key={d.id} onClick={() => setDecor({ density: d.id })} style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>{d.l}</button>;
                })}
              </div>
            </>
          )}

          {tab === 'dividers' && (
            <>
              <GalleryLabel>Section dividers — tap to apply everywhere</GalleryLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setDecor({ divider: null })} className="lift" style={{ padding: '12px 14px', borderRadius: 11, background: 'var(--cream-2)', border: !decor.divider ? '2px solid var(--ink)' : '1px solid var(--line)', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>Use the kit&rsquo;s default divider</button>
                {DL_DIVIDERS.map(d => (
                  <ThemedTile key={d.id} theme={theme} color={color} active={decor.divider === d.id} onClick={() => setDecor({ divider: d.id })} style={{ minHeight: 64, background: 'var(--t-paper)' }} padding="16px 22px">
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><TDivider look={d.id} width={150}/></span>
                      <span style={{ position: 'absolute', left: 14, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>{d.label}</span>
                    </div>
                  </ThemedTile>
                ))}
              </div>
            </>
          )}

          {tab === 'patterns' && (
            <>
              <GalleryLabel>Background prints — tap to apply behind sections</GalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <ThemedTile theme={theme} color={color} active={!decor.pattern || decor.pattern === 'none'} onClick={() => setDecor({ pattern: 'none' })}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', fontWeight: 600 }}>None</span>
                </ThemedTile>
                {DL_PATTERNS.map(p => (
                  <ThemedTile key={p.id} theme={theme} color={color} active={decor.pattern === p.id} onClick={() => setDecor({ pattern: p.id })} style={{ background: theme.dark ? 'var(--t-section)' : 'var(--t-paper)' }} padding="0">
                    <div style={{ position: 'relative', width: '100%', height: 78, overflow: 'hidden', borderRadius: 12 }}>
                      <PatternLayer pattern={p.id} intensity={1.25}/>
                      <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t-ink-soft)', zIndex: 2 }}>{p.label}</span>
                    </div>
                  </ThemedTile>
                ))}
              </div>
            </>
          )}

          {tab === 'monogram' && (
            <MonogramTab theme={theme} subject={subject} color={color}/>
          )}

          {tab === 'generate' && (
            <>
              <GalleryLabel>Describe the feeling — Pear styles the decor</GalleryLabel>
              <div style={{ borderRadius: 14, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
                <div style={{ padding: 13, background: 'var(--card)' }}>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="e.g. coastal & breezy with shells, or art-deco gold geometry"
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45, outline: 'none' }}/>
                  <button onClick={() => runGen()} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 9 }}>
                    <Icon name="sparkles" size={13} color="var(--cream)"/> Style my decor
                  </button>
                  {gen && (
                    <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 9, background: 'var(--sage-tint)', fontSize: 11.5, color: 'var(--sage-deep)', display: 'flex', gap: 7 }}>
                      <Icon name="check" size={13} color="var(--sage-deep)" style={{ flexShrink: 0, marginTop: 1 }}/>
                      <span>Applied <b>{gen.motif}</b> motifs, a <b>{gen.divider}</b> divider{gen.pattern !== 'none' ? <> and a <b>{gen.pattern}</b> print</> : ''}.</span>
                    </div>
                  )}
                </div>
              </div>

              <GalleryLabel>Or start from a preset</GalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {DL_PRESETS.map(p => (
                  <button key={p.label} onClick={() => { setDecor(p.d); setGen(p.d); }} className="lift" style={{ textAlign: 'left', padding: 0, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--line-soft)', cursor: 'pointer', background: 'var(--card)' }}>
                    <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), '--t-motif': `var(${p.d.color})`, position: 'relative', height: 58, background: 'var(--t-section)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                      <PatternLayer pattern={p.d.pattern} intensity={1.1}/>
                      {p.d.motif !== 'none' && <div style={{ position: 'relative', zIndex: 2 }}><Motif kind={p.d.motif} size={34}/></div>}
                    </div>
                    <div style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>{p.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={resetDecor} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="close" size={13} color="var(--ink-soft)"/> Reset decor</button>
          <button onClick={onClose} className="btn btn-primary btn-sm">Done</button>
        </div>
      </aside>
    </div>
  );
}

/* ---- Monogram / crest generator ---- */
function MonogramTab({ theme, subject, color }) {
  const parts = (subject || 'A & B').replace('&', ' ').split(/\s+/).filter(Boolean);
  const initA = (parts[0] || 'A')[0].toUpperCase();
  const initB = (parts[1] || parts[2] || 'B')[0].toUpperCase();
  const [frame, setFrame] = useDecorState('laurel');
  const [amp, setAmp] = useDecorState(true);
  const frames = [{ id: 'none', l: 'Plain' }, { id: 'circle', l: 'Ring' }, { id: 'diamond', l: 'Diamond' }, { id: 'laurel', l: 'Laurel' }];
  const Crest = ({ big }) => {
    const s = big ? 1 : 0.5;
    return (
      <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), '--t-motif': color, position: 'relative', width: big ? 190 : 120, height: big ? 190 : 120, display: 'grid', placeItems: 'center', background: 'var(--t-paper)', borderRadius: 14, border: '1px solid var(--t-line)' }}>
        {frame === 'circle' && <span style={{ position: 'absolute', width: 150 * s, height: 150 * s, borderRadius: '50%', border: '1.5px solid var(--t-accent)' }}/>}
        {frame === 'diamond' && <span style={{ position: 'absolute', width: 132 * s, height: 132 * s, transform: 'rotate(45deg)', border: '1.5px solid var(--t-accent)' }}/>}
        {frame === 'laurel' && <div style={{ position: 'absolute', opacity: 0.9, transform: 'scale(' + (big ? 2.05 : 1.3) + ')' }}><LaurelMotif size={80}/></div>}
        <div style={{ position: 'relative', fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', color: 'var(--t-ink)', fontSize: big ? 64 : 40, lineHeight: 1, letterSpacing: '0.02em' }}>
          {initA}<span style={{ fontStyle: 'italic', color: 'var(--t-accent-ink)', margin: '0 0.04em' }}>{amp ? '&' : ' '}</span>{initB}
        </div>
      </div>
    );
  };
  return (
    <>
      <GalleryLabel>Your monogram</GalleryLabel>
      <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 14px' }}><Crest big/></div>
      <GalleryLabel>Frame</GalleryLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
        {frames.map(f => (
          <button key={f.id} onClick={() => setFrame(f.id)} className="lift" style={{ padding: '8px 4px 6px', borderRadius: 10, background: frame === f.id ? 'var(--ink)' : 'var(--cream-2)', color: frame === f.id ? 'var(--cream)' : 'var(--ink-soft)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{f.l}</button>
        ))}
      </div>
      <GalleryLabel>Joiner</GalleryLabel>
      <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--cream-2)', borderRadius: 9, width: 'fit-content' }}>
        {[{ v: true, l: 'A & B' }, { v: false, l: 'A B' }].map(o => (
          <button key={String(o.v)} onClick={() => setAmp(o.v)} style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: amp === o.v ? 'var(--ink)' : 'transparent', color: amp === o.v ? 'var(--cream)' : 'var(--ink-soft)' }}>{o.l}</button>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '11px 13px', borderRadius: 11, background: 'var(--peach-bg)', fontSize: 11.5, color: 'var(--peach-ink)', display: 'flex', gap: 8 }}>
        <Pear size={20} tone="sage" shadow={false} style={{ flexShrink: 0 }}/>
        <span>Your monogram updates with the couple&rsquo;s names &amp; theme. Use it on stationery, the hero, or as a watermark.</span>
      </div>
    </>
  );
}

Object.assign(window, { DecorLibrary });
