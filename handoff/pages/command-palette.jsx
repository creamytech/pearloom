/* =========================================================================
   PEARLOOM — COMMAND PALETTE (⌘K / Ctrl+K)
   The connective tissue: jump to any section, theme, kit, event, or open any
   flow (Theme Shop, Decor, Publish, Settings) — fuzzy search + keyboard nav.
   Export CommandPalette({ open, onClose, commands }).
   ========================================================================= */

const { useState: useCmdState, useEffect: useCmdEff, useRef: useCmdRef, useMemo: useCmdMemo } = React;

function fuzzy(q, s) {
  q = q.toLowerCase(); s = s.toLowerCase();
  if (!q) return 1;
  if (s.includes(q)) return 2 - (s.indexOf(q) / 100);
  let i = 0; for (const ch of s) { if (ch === q[i]) i++; if (i === q.length) return 0.5; }
  return 0;
}

function CommandPalette({ open, onClose, commands }) {
  const [q, setQ] = useCmdState('');
  const [sel, setSel] = useCmdState(0);
  const inputRef = useCmdRef(null);
  const listRef = useCmdRef(null);

  useCmdEff(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 40); } }, [open]);

  const results = useCmdMemo(() => {
    const scored = (commands || []).map(c => ({ c, s: Math.max(fuzzy(q, c.label), fuzzy(q, c.group || '') * 0.4, ...(c.keywords || []).map(k => fuzzy(q, k) * 0.7)) })).filter(x => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.map(x => x.c).slice(0, 40);
  }, [q, commands]);

  useCmdEff(() => { setSel(0); }, [q]);

  const run = (c) => { if (!c) return; onClose(); setTimeout(() => c.run(), 0); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[sel]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  useCmdEff(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[sel];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [sel, open]);

  if (!open) return null;

  // group results
  const groups = [];
  const seen = {};
  results.forEach(c => { const g = c.group || 'Actions'; if (!seen[g]) { seen[g] = []; groups.push([g, seen[g]]); } seen[g].push(c); });

  let idx = -1;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(40,40,30,0.4)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh' }}>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={onKey} style={{ width: 'min(580px, 94vw)', background: 'var(--card)', borderRadius: 16, boxShadow: '0 30px 80px rgba(40,40,30,0.32)', overflow: 'hidden', border: '1px solid var(--line-soft)', animation: 'cmd-in 180ms cubic-bezier(0.16,1,0.3,1)' }}>
        <style>{`@keyframes cmd-in{from{transform:translateY(-8px) scale(0.99);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <Icon name="search" size={17} color="var(--ink-muted)"/>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sections, themes, actions…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15.5, outline: 'none', color: 'var(--ink)', fontFamily: 'inherit' }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', background: 'var(--cream-2)', padding: '3px 7px', borderRadius: 6 }}>ESC</span>
        </div>
        <div ref={listRef} style={{ maxHeight: '52vh', overflow: 'auto', padding: 8 }}>
          {results.length === 0 && <div style={{ padding: '34px 0', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13.5 }}><Pear size={36} tone="sage" shadow={false}/><div style={{ marginTop: 8 }}>No matches</div></div>}
          {groups.map(([g, items]) => (
            <div key={g}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', padding: '10px 12px 5px' }}>{g}</div>
              {items.map(c => {
                idx++; const i = idx; const on = i === sel;
                return (
                  <button key={c.id || c.label} onMouseEnter={() => setSel(i)} onClick={() => run(c)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, textAlign: 'left', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: on ? 'rgba(255,255,255,0.14)' : 'var(--cream-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {c.swatch ? <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.swatch }}/> : <Icon name={c.icon || 'arrow-right'} size={15} color={on ? 'var(--cream)' : 'var(--ink-soft)'}/>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{c.label}</span>
                      {c.hint && <span style={{ display: 'block', fontSize: 11.5, color: on ? 'rgba(248,241,228,0.7)' : 'var(--ink-muted)' }}>{c.hint}</span>}
                    </span>
                    {on && <Icon name="arrow-right" size={13} color="var(--cream)"/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '9px 16px', borderTop: '1px solid var(--line-soft)', fontSize: 11, color: 'var(--ink-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><b style={{ color: 'var(--ink-soft)' }}>↑↓</b> navigate</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><b style={{ color: 'var(--ink-soft)' }}>↵</b> select</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pear size={14} tone="sage" shadow={false}/> Pearloom</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandPalette });
