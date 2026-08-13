/* global React */
// Pearloom dashboard — shared enhancements: an animated count-up for
// display numbers, and the ⌘K command palette wired to navigation.
(() => {
const Icon = window.Icon;
const { useState, useEffect, useRef } = React;

// ── Count-up — eases a display number from 0 on mount ──
function CountUp({ value, dur = 950, format }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setN(value); return; }
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(value * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return React.createElement(React.Fragment, null, format ? format(n) : Math.round(n).toLocaleString());
}

// ── ⌘K command palette ──
const CMDS = [
  { k: 'home', l: 'Home', i: 'home', hint: 'The cockpit', kind: 'Go to' },
  { k: 'sites', l: 'My sites', i: 'layout', hint: 'Your loom', kind: 'Go to' },
  { k: 'guests', l: 'Guests', i: 'users', hint: 'Roster · messages · seating', kind: 'Go to' },
  { k: 'studio', l: 'Studio', i: 'sparkles', hint: 'Design the invitation', kind: 'Go to' },
  { k: 'gallery', l: 'The Reel', i: 'image', hint: 'The photo wall', kind: 'Go to' },
  { k: 'registry', l: 'Registry', i: 'gift', hint: 'Gifts & thank-yous', kind: 'Go to' },
  { k: 'analytics', l: 'Analytics', i: 'bars', hint: 'Quietly read', kind: 'Go to' },
  { k: 'guests', l: 'Nudge the quiet guests', i: 'send', hint: 'Pear drafts it', kind: 'Action' },
  { k: 'guests', l: 'Add a guest', i: 'plus', hint: 'Roster', kind: 'Action' },
  { k: 'registry', l: 'Draft thank-you notes', i: 'heart', hint: 'Pear writes them', kind: 'Action' },
  { k: 'gallery', l: 'Approve guest photos', i: 'check', hint: '3 waiting', kind: 'Action' },
  { k: 'studio', l: 'Redraft the invite with Pear', i: 'sparkles', hint: 'In your voice', kind: 'Action' },
];

function CommandPalette({ onNav }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);
  const results = CMDS.filter((c) => !q || (c.l + c.hint + c.kind).toLowerCase().includes(q.toLowerCase()));
  const pick = (c) => { if (c) { onNav(c.k); setOpen(false); } };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[sel]); }
  };
  if (!open) return null;
  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(14,13,11,0.36)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh', animation: 'pl-fade-q 160ms ease both' }}>
      <div onClick={(e) => e.stopPropagation()} className="pl-glass-surface pl-cmd" style={{ width: 'min(560px, 92vw)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', animation: 'pl-cmd-in 220ms var(--pl-ease-emphasis) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--accent-ink, var(--peach-ink))', display: 'inline-flex' }}><Icon name="search" size={18} /></span>
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKeyDown} placeholder="Ask Pear, or jump to a block…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink)' }} />
          <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-muted)', padding: '3px 7px', background: 'var(--cream-3)', borderRadius: 5 }}>ESC</span>
        </div>
        <div style={{ maxHeight: '46vh', overflowY: 'auto', padding: 8 }}>
          {results.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-muted)' }}>Nothing matches. Try another word.</div>
          ) : results.map((c, i) => (
            <button key={c.l} onMouseEnter={() => setSel(i)} onClick={() => pick(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px', borderRadius: 10, border: 'none', background: sel === i ? 'var(--cream-2)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: sel === i ? 'var(--accent-bg, var(--peach-bg))' : 'var(--cream-3)', color: sel === i ? 'var(--accent-ink, var(--peach-ink))' : 'var(--ink-soft)' }}><Icon name={c.i} size={15} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{c.l}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{c.hint}</span>
              </span>
              <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>{c.kind}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderTop: '1px solid var(--line)', fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>
          <span>↑↓ move</span><span>↵ open</span><span style={{ flex: 1 }} /><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>woven by Pear</span>
        </div>
      </div>
    </div>
  );
}

window.CountUp = CountUp;
window.CommandPalette = CommandPalette;
})();
