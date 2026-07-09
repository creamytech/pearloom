/* global React */
// Pearloom dashboard — Studio (invitation studio: live preview across
// channels, Pear's draft with a voice slider, palette, and a matching
// stationery suite) and The Reel (albums + guest-upload controls + the
// submission approval queue folded in).
(() => {
const { Card, Badge, Button, Eyebrow, Pearl, PearloomGlyph, Monogram } = window.PearloomDesignSystem_55118c;
const Icon = window.Icon;
const LockChip = window.LockChip;

const PALETTES = [
  { name: 'Pressed Garden', cols: ['#5C6B3F', '#D9A89E', '#FBF7EE', '#363F22'] },
  { name: 'First Light', cols: ['#C6703D', '#F0C9A8', '#FDFAF0', '#3A2A1E'] },
  { name: 'Editorial', cols: ['#18181B', '#C19A4B', '#FDFAF0', '#6F6557'] },
  { name: 'Midnight Velvet', cols: ['#0D0B07', '#D4B373', '#A4B57A', '#1A1610'] },
];
const OCCASIONS = ['Save-the-date', 'Wedding', 'Birthday', 'Anniversary', 'Memorial'];
const DRAFTS = {
  warm: 'A bright Saturday in Point Reyes — two families, one very long table. Come for the vows, stay for the dancing. Kindly reply by Aug 10.',
  formal: 'Together with their families, Mira Vega and Jun Park request the pleasure of your company at the celebration of their marriage. Point Reyes, the sixth of September. Kindly respond by the tenth of August.',
};
const SUITE = [
  { name: 'Menu card', i: 'ticket' }, { name: 'Table numbers', i: 'table' }, { name: 'Thank-you card', i: 'heart' }, { name: 'Program', i: 'image' },
];

function VoiceSlider({ label, a, b, val, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--ink-muted)', marginBottom: 6 }}><span>{a.toUpperCase()}</span><span>{b.toUpperCase()}</span></div>
      <input type="range" min="0" max="100" value={val} onChange={(e) => onChange(+e.target.value)} className="pl-native-control" style={{ width: '100%', accentColor: 'var(--accent-ink, var(--peach-ink))' }} />
    </div>
  );
}

function ChannelPreview({ channel, p, body }) {
  if (channel === 'email') {
    return (
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--cream-3)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>From <strong style={{ color: 'var(--ink)' }}>Mira &amp; Jun</strong> · via Pearloom</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>Save our date — September 6</div>
        </div>
        <div style={{ height: 110, background: `linear-gradient(135deg, ${p.cols[0]}, ${p.cols[3]})`, display: 'grid', placeItems: 'center' }}><Monogram left="M" right="J" frame="ring" size={52} ink={p.cols[2]} accent={p.cols[2]} paper="transparent" /></div>
        <div style={{ padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--ink)' }}>Mira & Jun</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)', fontFamily: 'var(--font-ui)', margin: '12px 0 18px' }}>{body}</div>
          <span style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 999, background: p.cols[0], color: p.cols[2], fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13 }}>Reply on our site</span>
        </div>
      </div>
    );
  }
  if (channel === 'text') {
    return (
      <div style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--line)', borderRadius: '18px 18px 18px 4px', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{body}</div>
          <div style={{ fontSize: 13, color: 'var(--accent-ink, var(--peach-ink))', marginTop: 8, fontFamily: 'var(--font-ui)', textDecoration: 'underline' }}>pearloom.com/mira-and-jun</div>
        </div>
        <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)', marginTop: 8, textAlign: 'center' }}>Delivered · as a text</div>
      </div>
    );
  }
  return (
    <div style={{ width: '100%', maxWidth: 420, aspectRatio: '5 / 7', background: p.cols[2], boxShadow: '0 24px 60px -28px rgba(40,28,12,0.45)', padding: 'clamp(24px,4vw,40px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 10, border: `1px solid ${p.cols[1]}`, pointerEvents: 'none' }} />
      <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.28em', color: p.cols[0], marginTop: 8 }}>SAVE THE DATE</div>
      <Monogram left="M" right="J" frame="ring" size={64} ink={p.cols[3]} accent={p.cols[0]} paper={p.cols[2]} style={{ margin: '20px 0 8px' }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4.4vw,42px)', fontStyle: 'italic', lineHeight: 1.05, color: p.cols[3], letterSpacing: '-0.01em' }}>Mira <span style={{ fontStyle: 'normal' }}>&</span> Jun</div>
      <div style={{ width: 36, height: 1, background: p.cols[1], margin: '16px 0' }} />
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: p.cols[3], opacity: 0.85, flex: 1 }}>{body}</div>
      <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, letterSpacing: '0.18em', color: p.cols[0], marginTop: 16 }}>06 · 09 · 2026</div>
    </div>
  );
}

function Studio() {
  const [pal, setPal] = React.useState(0);
  const [occ, setOcc] = React.useState(0);
  const [channel, setChannel] = React.useState('site');
  const [formal, setFormal] = React.useState(20);
  const [body, setBody] = React.useState(DRAFTS.warm);
  const p = PALETTES[pal];
  const setVoice = (v) => { setFormal(v); setBody(v > 55 ? DRAFTS.formal : DRAFTS.warm); };
  return (
    <main className="pd-studio-grid" style={{ padding: '0 clamp(20px,4vw,40px) 48px', maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'flex-start' }}>
      <Card padding={0} style={{ overflow: 'hidden', position: 'sticky', top: 86 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {[['site', 'Site card'], ['email', 'Email'], ['text', 'Text']].map(([k, l]) => (
            <button key={k} onClick={() => setChannel(k)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 999, background: channel === k ? 'var(--ink)' : 'transparent', color: channel === k ? 'var(--cream)' : 'var(--ink)', border: `1px solid ${channel === k ? 'var(--ink)' : 'var(--line)'}`, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{l}</button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ display: 'flex', gap: 6 }}>{p.cols.map((c, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid var(--line)' }} />)}</span>
        </div>
        <div style={{ padding: 'clamp(24px,4vw,48px)', display: 'grid', placeItems: 'center', background: channel === 'site' ? p.cols[2] : 'var(--cream-3)' }}>
          <ChannelPreview channel={channel} p={p} body={body} />
        </div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding={22}>
          <Eyebrow rule="none">Occasion</Eyebrow>
          <div className="pl-hscroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {OCCASIONS.map((o, i) => (
              <button key={o} onClick={() => setOcc(i)} style={{ padding: '7px 14px', fontSize: 12.5, borderRadius: 999, background: occ === i ? 'var(--ink)' : 'transparent', color: occ === i ? 'var(--cream)' : 'var(--ink)', border: `1px solid ${occ === i ? 'var(--ink)' : 'var(--line)'}`, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{o}</button>
            ))}
          </div>
        </Card>
        <Card padding={22}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <PearloomGlyph size={18} color="var(--lavender-ink)" />
            <Eyebrow rule="none" style={{ margin: 0 }}>Pear's draft</Eyebrow>
            <span style={{ flex: 1 }} />
            <Button variant="paper" size="sm">↻ Redraft</Button>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--cream-3)', fontSize: 13.5, lineHeight: 1.55, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink)', outline: 'none', resize: 'vertical', marginBottom: 14 }} />
          <VoiceSlider label="tone" a="Warm" b="Formal" val={formal} onChange={setVoice} />
          <VoiceSlider label="energy" a="Playful" b="Classic" val={62} onChange={() => {}} />
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>Slide and Pear rewrites in your voice — warm for a birthday, hushed for a memorial.</div>
        </Card>
        <Card padding={22}>
          <Eyebrow rule="none">Palette</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {PALETTES.map((pp, i) => (
              <button key={pp.name} onClick={() => setPal(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, background: pal === i ? 'var(--cream-3)' : 'transparent', border: `1px solid ${pal === i ? 'var(--accent-ink, var(--peach-ink))' : 'transparent'}`, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}>{pp.cols.map((c, j) => <span key={j} style={{ width: 16, height: 24, background: c }} />)}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{pp.name}</span>
                {pal === i ? <Icon name="check" size={14} color="var(--accent-ink, var(--peach-ink))" strokeWidth={2.4} /> : null}
              </button>
            ))}
          </div>
        </Card>
        <Card padding={22}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Eyebrow rule="none" style={{ margin: 0 }}>The matching suite</Eyebrow>
            <span style={{ flex: 1 }} />
            <LockChip label="Printed & mailed · atelier" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', margin: '0 0 12px', lineHeight: 1.5 }}>Same palette and type, carried across the day's paper.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SUITE.map((s) => (
              <button key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--cream-3)', border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ color: p.cols[0], display: 'inline-flex' }}><Icon name={s.i} size={15} /></span>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{s.name}</span>
                <Icon name="plus" size={13} color="var(--ink-muted)" />
              </button>
            ))}
          </div>
        </Card>
        <Button variant="pearl" size="md" style={{ width: '100%' }}>Set the type & send <Pearl size={9} /></Button>
      </div>
    </main>
  );
}

// ───────────────────────── The Reel ─────────────────────────
const PENDING = [
  { from: 'Amara', tone: 'var(--sage-tint)', cap: 'The rehearsal toast' },
  { from: 'Jonah', src: '../../assets/imagery/coffee-mug.png', cap: 'Morning of' },
  { from: 'Marisol', tone: 'var(--peach-bg)', cap: 'On the dance floor' },
];
const ALBUMS = [['all', 'All'], ['getting-ready', 'Getting ready'], ['ceremony', 'Ceremony'], ['party', 'The party'], ['guest', 'From guests']];
const PHOTOS = [
  { src: '../../assets/imagery/pear-photo.png', tag: 'guest', name: 'Mira & Jun', h: 220, cover: true },
  { tone: 'var(--sage-tint)', tag: 'ceremony', name: 'Point Reyes', h: 280 },
  { src: '../../assets/imagery/vase-linen-still.png', tag: 'getting-ready', name: 'The table', h: 240 },
  { tone: 'var(--peach-bg)', tag: 'party', name: 'First dance', h: 200 },
  { src: '../../assets/imagery/coffee-mug.png', tag: 'getting-ready', name: 'Morning of', h: 260 },
  { tone: 'var(--lavender-bg)', tag: 'guest', name: 'Maya at 30', h: 220 },
  { tone: 'var(--sage-tint)', tag: 'ceremony', name: 'Lark Hill', h: 300 },
  { tone: 'var(--peach-bg)', tag: 'party', name: 'The toasts', h: 240 },
];
function Gallery() {
  const [filter, setFilter] = React.useState('all');
  const [queue, setQueue] = React.useState(PENDING);
  const [openUp, setOpenUp] = React.useState(true);
  const shown = filter === 'all' ? PHOTOS : PHOTOS.filter((p) => p.tag === filter);
  const cols = 4;
  const split = Array.from({ length: cols }, () => []);
  shown.forEach((p, i) => split[i % cols].push(p));
  const counts = PHOTOS.reduce((a, p) => { a.all++; a[p.tag] = (a[p.tag] || 0) + 1; return a; }, { all: 0 });
  const drop = (i) => setQueue((q) => q.filter((_, j) => j !== i));
  return (
    <main style={{ padding: '0 clamp(20px,4vw,40px) 60px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', padding: '12px 18px', marginBottom: 20, borderRadius: 12, background: 'var(--cream-2)', border: '1px solid var(--line)' }}>
        {[['image', 'Guests add on the site', 'var(--sage)'], ['check', 'Your nod', 'var(--accent-ink, var(--peach-ink))'], ['sparkles', 'Live on the wall', 'var(--lavender-ink)']].map(([ic, l, c], i, a) => (
          <React.Fragment key={l}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--card)', color: c, border: `1px solid ${c}` }}><Icon name={ic} size={13} /></span>
              <span style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{l}</span>
            </span>
            {i < a.length - 1 ? <span style={{ flex: 1, minWidth: 24, margin: '0 12px', height: 0, borderTop: '2px dashed var(--line)' }} /> : null}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: openUp ? '1fr 280px' : '1fr', gap: 20, marginBottom: 24, alignItems: 'flex-start' }} className="pd-an-charts">
        {queue.length ? (
          <Card padding={20} style={{ border: '1px solid var(--gold-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--accent-ink, var(--peach-ink))' }}>AWAITING YOUR NOD</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--pl-gold)', color: 'var(--pl-ink)', borderRadius: 999, padding: '1px 8px' }}>{queue.length}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1, fontFamily: 'var(--font-ui)' }}>Guests added these. Approve what fits the wall.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14 }}>
              {queue.map((p, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--card)' }}>
                  <div style={{ height: 110, background: p.src ? `center/cover url(${p.src})` : p.tone, display: 'grid', placeItems: 'center' }}>{!p.src ? <PearloomGlyph size={28} color="var(--ink-soft)" /> : null}</div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}><strong>{p.from}</strong> · <span style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>{p.cap}</span></div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <Button variant="ink" size="sm" style={{ flex: 1 }} onClick={() => drop(i)}>Approve</Button>
                      <Button variant="paper" size="sm" onClick={() => drop(i)}>Hide</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card padding={40} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--sage-deep)' }}>All caught up.</div>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6, fontFamily: 'var(--font-ui)' }}>Nothing waiting. New guest photos land here.</div>
          </Card>
        )}
        {openUp ? (
          <Card padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Eyebrow rule="none" style={{ margin: 0 }}>Guests can add</Eyebrow>
              <button onClick={() => setOpenUp(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-muted)' }}><Icon name="chevron" size={14} /></button>
            </div>
            <div style={{ width: 92, height: 92, margin: '4px auto 12px', borderRadius: 12, background: 'var(--cream-3)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}><PearloomGlyph size={40} /></div>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)', textAlign: 'center', marginBottom: 12 }}>pearloom.com/mira-and-jun/add</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>Review before posting</span>
              <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--sage-deep)' }}>ON</span>
            </div>
            <Button variant="paper" size="sm" style={{ width: '100%', marginTop: 8 }}>Copy upload link</Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', lineHeight: 1.4 }}>Turn the Reel into a printed book <LockChip label="atelier" /></div>
          </Card>
        ) : null}
      </div>
      <div className="pl-hscroll" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {ALBUMS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 999, background: filter === k ? 'var(--ink)' : 'transparent', color: filter === k ? 'var(--cream)' : 'var(--ink)', border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500, whiteSpace: 'nowrap' }}>{l} · {counts[k] ?? counts.all}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }} className="pd-reel">
        {split.map((col, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {col.map((p, i) => (
              <div key={i} style={{ height: p.h, borderRadius: 14, overflow: 'hidden', position: 'relative', background: p.tone || 'var(--cream-3)', backgroundImage: p.src ? `url(${p.src})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--line)' }}>
                {!p.src ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.4 }}><PearloomGlyph size={36} /></div> : null}
                {p.cover ? <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 9px', borderRadius: 999, background: 'var(--pl-gold)', color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.12em' }}>COVER</div> : null}
                <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: '18px 12px 10px', background: 'linear-gradient(to top, rgba(24,24,27,0.7), transparent)', color: 'var(--pl-cream)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.1em', opacity: 0.85 }}>{p.tag.replace('-', ' ').toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13 }}>{p.name}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

window.Studio = Studio;
window.Gallery = Gallery;
})();
