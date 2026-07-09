/* Pearloom — published-site renderer. Faithful port of the section
   blocks + atoms from src/components/pearloom/redesign/ThemedSite.tsx
   (published mode: edit chrome / InlineEdit removed). Every section
   reads var(--t-*) so it re-skins per theme. */
(function () {
  const h = React.createElement;

  /* ─── Icons — line set used across the renderer ─────────────── */
  const PATHS = {
    calendar: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM4 9h16M8 2v4M16 2v4',
    pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    'arrow-right': 'M5 12h14M13 6l6 6-6 6',
    'arrow-ur': 'M7 17 17 7M9 7h8v8',
    sparkles: 'M12 3l1.8 4.7L18 9l-4.2 1.3L12 15l-1.8-4.7L6 9l4.2-1.3L12 3Z',
    users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3 3 0 0 1 0 5.6',
    gift: 'M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M3 8h18v4H3V8ZM12 8v13M12 8S10.5 4 8 4a2 2 0 0 0 0 4h4ZM12 8s1.5-4 4-4a2 2 0 0 1 0 4h-4Z',
    'chev-down': 'M5 9l7 7 7-7',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
    camera: 'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    phone: 'M6 3h3l1.5 5L8 9.5a12 12 0 0 0 6 6l1.5-2.5L21 14v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z',
  };
  function Icon({ name, size = 16, color = 'currentColor' }) {
    if (name === 'star') {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { display: 'block' } },
        h('path', { d: 'M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 17l-5.3 2.9 1.2-6L3.4 9.8l6-.7L12 3.5Z', fill: color, stroke: 'none' }));
    }
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { display: 'block', flexShrink: 0 } },
      h('path', { d: PATHS[name] || PATHS.sparkles }));
  }

  /* ─── OliveSprig — for the 'sprig' divider ──────────────────── */
  function OliveSprig({ size = 42 }) {
    return h('svg', { width: size, height: size * 0.42, viewBox: '0 0 100 42', 'aria-hidden': true, style: { display: 'block' } },
      h('g', { fill: 'none', stroke: 'var(--t-accent)', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M2 21 C 30 21 64 21 96 21' }),
        [0.32, 0.52, 0.72].map((t, i) => h('g', { key: i },
          h('path', { d: `M${2 + t * 94} 21 q -7 -8 -15 -9` }),
          h('path', { d: `M${2 + t * 94} 21 q -7 8 -15 9` }))),
        h('circle', { cx: 96, cy: 21, r: 2, fill: 'var(--t-gold)', stroke: 'none' })));
  }

  /* ─── KDivider — handoff/shared/kits.jsx divider variants ───── */
  function KDivider({ look, width = 170, style = {} }) {
    const wrap = Object.assign({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '0 auto', width }, style);
    if (look === 'sprig') {
      return h('div', { className: 'pl-divider', style: wrap },
        h('span', { style: { display: 'inline-flex', transform: 'scaleX(-1)' } }, h(OliveSprig, { size: 42 })),
        h('span', { 'aria-hidden': true, style: { width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)', flexShrink: 0 } }),
        h(OliveSprig, { size: 42 }));
    }
    if (look === 'brush') {
      return h('div', { className: 'pl-divider', style: wrap }, h('div', { style: { width, height: 4, background: 'var(--t-accent)', borderRadius: 2, opacity: 0.6, transform: 'skewX(-12deg)' } }));
    }
    if (look === 'dot') {
      return h('div', { className: 'pl-divider', style: wrap },
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }),
        h('span', { style: { width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)' } }),
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }));
    }
    if (look === 'deckle') {
      const d = `M0 3 ${Array.from({ length: 14 }).map((_, i) => `L${(i * width) / 14 + width / 28} ${i % 2 ? 5 : 1}`).join(' ')} L${width} 3`;
      return h('div', { className: 'pl-divider', style: wrap }, h('svg', { width, height: 6, viewBox: `0 0 ${width} 6`, 'aria-hidden': true }, h('path', { d, stroke: 'var(--t-line)', strokeWidth: 1, fill: 'none' })));
    }
    if (look === 'laurel') {
      const branch = (flip) => h('svg', { width: 46, height: 22, viewBox: '0 0 46 22', 'aria-hidden': true, style: { display: 'block', transform: flip ? 'scaleX(-1)' : 'none' } },
        h('g', { fill: 'none', stroke: 'var(--t-accent)', strokeWidth: 1.3, strokeLinecap: 'round' },
          h('path', { d: 'M3 11 C 16 11 34 11 43 11' }),
          [0.3, 0.5, 0.7, 0.9].map((t, i) => h('path', { key: i, d: `M${3 + t * 40} 11 q 5 -6 11 -4`, fill: 'color-mix(in oklab, var(--t-accent) 18%, transparent)' })),
          [0.3, 0.5, 0.7, 0.9].map((t, i) => h('path', { key: 'b' + i, d: `M${3 + t * 40} 11 q 5 6 11 4`, fill: 'color-mix(in oklab, var(--t-accent) 18%, transparent)' }))));
      return h('div', { className: 'pl-divider', style: wrap }, branch(true),
        h('span', { 'aria-hidden': true, style: { width: 6, height: 6, borderRadius: '50%', background: 'var(--t-gold)', flexShrink: 0 } }), branch(false));
    }
    if (look === 'wave') {
      const seg = 22; const n = Math.max(4, Math.round(width / seg)); const w = n * seg;
      let d = 'M0 5'; for (let i = 0; i < n; i++) { const x = i * seg; d += ` Q ${x + seg / 4} 0 ${x + seg / 2} 5 T ${x + seg} 5`; }
      return h('div', { className: 'pl-divider', style: wrap }, h('svg', { width: w, height: 10, viewBox: `0 0 ${w} 10`, 'aria-hidden': true }, h('path', { d, fill: 'none', stroke: 'var(--t-accent)', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.7 })));
    }
    if (look === 'chevron') {
      return h('div', { className: 'pl-divider', style: Object.assign({}, wrap, { gap: 5 }) },
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-gold)' } }),
        Array.from({ length: 3 }).map((_, i) => h('span', { key: i, 'aria-hidden': true, style: { width: 7, height: 7, borderRight: '1.5px solid var(--t-gold)', borderBottom: '1.5px solid var(--t-gold)', transform: 'rotate(-45deg)', flexShrink: 0 } })),
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-gold)' } }));
    }
    if (look === 'ribbon') {
      return h('div', { className: 'pl-divider', style: wrap },
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }),
        h('svg', { width: 30, height: 18, viewBox: '0 0 30 18', 'aria-hidden': true, style: { flexShrink: 0 } },
          h('path', { d: 'M15 9 L4 2 Q1 1 2 4 L8 9 L2 14 Q1 17 4 16 Z M15 9 L26 2 Q29 1 28 4 L22 9 L28 14 Q29 17 26 16 Z', fill: 'color-mix(in oklab, var(--t-accent) 22%, transparent)', stroke: 'var(--t-accent)', strokeWidth: 1, strokeLinejoin: 'round' }),
          h('circle', { cx: 15, cy: 9, r: 2.4, fill: 'var(--t-gold)' })),
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }));
    }
    if (look === 'arc') {
      return h('div', { className: 'pl-divider', style: wrap },
        h('svg', { width, height: 12, viewBox: `0 0 ${width} 12`, 'aria-hidden': true },
          h('path', { d: `M6 10 Q ${width / 2} -4 ${width - 6} 10`, fill: 'none', stroke: 'var(--t-accent)', strokeWidth: 1.3, opacity: 0.65 }),
          h('circle', { cx: 6, cy: 10, r: 2.4, fill: 'var(--t-gold)' }),
          h('circle', { cx: width - 6, cy: 10, r: 2.4, fill: 'var(--t-gold)' })));
    }
    if (look === 'rays') {
      const rays = Array.from({ length: 9 }).map((_, i) => { const a = (-90 + (i - 4) * 18) * Math.PI / 180; const x1 = 30 + Math.cos(a) * 6, y1 = 22 + Math.sin(a) * 6, x2 = 30 + Math.cos(a) * 15, y2 = 22 + Math.sin(a) * 15; return h('line', { key: i, x1, y1, x2, y2, stroke: 'var(--t-gold)', strokeWidth: 1.4, strokeLinecap: 'round' }); });
      return h('div', { className: 'pl-divider', style: wrap },
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }),
        h('svg', { width: 60, height: 24, viewBox: '0 0 60 24', 'aria-hidden': true, style: { flexShrink: 0 } }, rays, h('circle', { cx: 30, cy: 22, r: 3, fill: 'var(--t-accent)' })),
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }));
    }
    if (look === 'diamond') {
      return h('div', { className: 'pl-divider', style: Object.assign({}, wrap, { gap: 7 }) },
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }),
        h('span', { 'aria-hidden': true, style: { width: 7, height: 7, background: 'var(--t-accent)', transform: 'rotate(45deg)', flexShrink: 0 } }),
        h('span', { 'aria-hidden': true, style: { width: 9, height: 9, border: '1.5px solid var(--t-gold)', transform: 'rotate(45deg)', flexShrink: 0 } }),
        h('span', { 'aria-hidden': true, style: { width: 7, height: 7, background: 'var(--t-accent)', transform: 'rotate(45deg)', flexShrink: 0 } }),
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }));
    }
    /* ── Animated dividers (Atelier) — carry a signature motion that
         plays only when premium + motion are on; static fallback else. ── */
    if (look === 'flow') {
      const rail = () => h('div', { style: { position: 'relative', flex: 1, height: 2, background: 'var(--t-line)', overflow: 'hidden', borderRadius: 2 } },
        h('span', { className: 'pl-da-gleam', 'aria-hidden': true, style: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%', background: 'linear-gradient(90deg, transparent, var(--t-gold), transparent)' } }));
      return h('div', { className: 'pl-divider pl-da pl-da-flow', style: wrap },
        rail(), h('span', { 'aria-hidden': true, style: { width: 7, height: 7, borderRadius: '50%', background: 'var(--t-gold)', flexShrink: 0 } }), rail());
    }
    if (look === 'grow-vine') {
      return h('div', { className: 'pl-divider pl-da pl-da-vine', style: wrap },
        h('span', { style: { display: 'inline-flex', transform: 'scaleX(-1)' } }, h(OliveSprig, { size: 46 })),
        h('span', { 'aria-hidden': true, style: { width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)', flexShrink: 0 } }),
        h(OliveSprig, { size: 46 }));
    }
    if (look === 'tide') {
      const seg = 22; const n = Math.max(4, Math.round(width / seg)); const w = n * seg;
      let d = 'M0 5'; for (let i = 0; i < n; i++) { const x = i * seg; d += ` Q ${x + seg / 4} 0 ${x + seg / 2} 5 T ${x + seg} 5`; }
      return h('div', { className: 'pl-divider pl-da pl-da-tide', style: wrap }, h('svg', { width: w, height: 10, viewBox: `0 0 ${w} 10`, 'aria-hidden': true }, h('path', { d, fill: 'none', stroke: 'var(--t-accent)', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.7 })));
    }
    if (look === 'twinkle') {
      return h('div', { className: 'pl-divider pl-da pl-da-twinkle', style: Object.assign({}, wrap, { gap: 9 }) },
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }),
        h('span', { className: 'pl-da-star', 'aria-hidden': true, style: { width: 9, height: 9, background: 'var(--t-gold)', transform: 'rotate(45deg)', flexShrink: 0 } }),
        h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }));
    }
    /* rule (editorial) + fallback */
    return h('div', { className: 'pl-divider', style: wrap },
      h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }),
      h('span', { style: { width: 4, height: 4, borderRadius: '50%', background: 'var(--t-gold)' } }),
      h('div', { style: { flex: 1, height: 1, background: 'var(--t-line)' } }));
  }

  /* ─── MotifMark — decorative botanical/geometric ornament ───── */
  function MotifMark({ motif, size = 28, style = {} }) {
    const G = { fill: 'none', stroke: 'var(--t-accent)', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
    const leaf = 'color-mix(in oklab, var(--t-accent) 16%, transparent)';
    const key = ({ olive: 'branch', sprig: 'branch', lavender: 'lavender', vine: 'branch', bloom: 'bloom', pressed: 'pressed', fern: 'fern', laurel: 'laurel', deco: 'deco', sun: 'sun', wave: 'wave', breeze: 'branch', sunbeam: 'sun', tide: 'wave', fireflies: 'fireflies', 'bloom-open': 'bloom' })[motif] || 'branch';
    const ANIM = { breeze: 1, sunbeam: 1, tide: 1, fireflies: 1, 'bloom-open': 1 };
    const cls = 'pl-motif pl-motif-' + key + (ANIM[motif] ? ' pl-ma pl-ma-' + motif : '');
    const svg = (kids) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, className: cls, style: Object.assign({ display: 'block' }, style) }, h('g', G, kids));
    if (key === 'branch') return svg([h('path', { key: 's', d: 'M12 22 C 12 16 12 9 12 3' }), [5, 9, 13].map((y, i) => h('g', { key: i }, h('path', { d: `M12 ${y} q -5 -1 -7 -5`, fill: leaf }), h('path', { d: `M12 ${y + 2} q 5 -1 7 -5`, fill: leaf })))]);
    if (key === 'lavender') return svg([h('path', { key: 's', d: 'M12 22 L12 9' }), [0, 1, 2, 3, 4].map((i) => h('g', { key: i }, h('circle', { cx: 12 - 2.4, cy: 4 + i * 2.6, r: 1.5, fill: leaf }), h('circle', { cx: 12 + 2.4, cy: 5 + i * 2.6, r: 1.5, fill: leaf }))), h('circle', { key: 't', cx: 12, cy: 3, r: 1.6, fill: 'var(--t-gold)', stroke: 'none' })]);
    if (key === 'bloom') return svg([[0, 72, 144, 216, 288].map((a, i) => h('ellipse', { key: i, cx: 12, cy: 6.5, rx: 2.6, ry: 5, fill: leaf, transform: `rotate(${a} 12 12)` })), h('circle', { key: 'c', cx: 12, cy: 12, r: 2.2, fill: 'var(--t-gold)', stroke: 'none' })]);
    if (key === 'pressed') return svg([h('path', { key: 's', d: 'M12 22 L12 8' }), h('path', { key: 'l1', d: 'M12 16 q -6 0 -8 -5', fill: leaf }), h('path', { key: 'l2', d: 'M12 13 q 6 0 8 -5', fill: leaf }), h('circle', { key: 'b', cx: 12, cy: 6, r: 2.6, fill: leaf }), h('circle', { key: 'd', cx: 12, cy: 6, r: 1, fill: 'var(--t-gold)', stroke: 'none' })]);
    if (key === 'fern') return svg([h('path', { key: 's', d: 'M12 22 C 11 15 11 8 13 3' }), [6, 9, 12, 15, 18].map((y, i) => h('g', { key: i }, h('path', { d: `M${12 - (i - 2) * 0.3} ${y} q -4 -2 -6 -5` }), h('path', { d: `M${12 - (i - 2) * 0.3} ${y} q 4 -2 6 -5` })))]);
    if (key === 'laurel') return svg([h('path', { key: 'a', d: 'M5 21 C 5 13 8 6 12 3' }), h('path', { key: 'b', d: 'M19 21 C 19 13 16 6 12 3' }), [0.3, 0.55, 0.8].map((t, i) => h('g', { key: i }, h('path', { d: `M${5 + t * 2} ${21 - t * 16} q -4 -1 -5 -4`, fill: leaf }), h('path', { d: `M${19 - t * 2} ${21 - t * 16} q 4 -1 5 -4`, fill: leaf })))]);
    if (key === 'deco') return svg([[0, 1, 2, 3, 4].map((i) => h('line', { key: i, x1: 12, y1: 21, x2: 12 + (i - 2) * 6, y2: 4 + Math.abs(i - 2) * 3, stroke: 'var(--t-gold)' })), h('path', { key: 'arc', d: 'M3 7 Q 12 -1 21 7', stroke: 'var(--t-gold)' }), h('circle', { key: 'c', cx: 12, cy: 21, r: 1.6, fill: 'var(--t-gold)', stroke: 'none' })]);
    if (key === 'sun') return svg([h('circle', { key: 'c', cx: 12, cy: 12, r: 4.2, fill: leaf }), Array.from({ length: 8 }).map((_, i) => { const a = i * 45 * Math.PI / 180; return h('line', { key: i, x1: 12 + Math.cos(a) * 7, y1: 12 + Math.sin(a) * 7, x2: 12 + Math.cos(a) * 10, y2: 12 + Math.sin(a) * 10, stroke: 'var(--t-gold)' }); })]);
    if (key === 'wave') return svg([h('path', { key: 'w1', d: 'M2 9 Q 6 5 10 9 T 18 9 T 22 9' }), h('path', { key: 'w2', d: 'M2 15 Q 6 11 10 15 T 18 15 T 22 15', opacity: 0.6 })]);
    if (key === 'fireflies') return svg([[[6, 9], [14, 6], [10, 14], [18, 13], [8, 17]].map(([x, y], i) => h('circle', { key: i, className: 'pl-ff pl-ff' + i, cx: x, cy: y, r: 1.7, fill: 'var(--t-gold)', stroke: 'none' }))]);
    return svg([h('circle', { cx: 12, cy: 12, r: 3, fill: leaf })]);
  }

  /* ─── PhotoPlaceholder — tone gradients (no photos yet) ─────── */
  const TONE_GRAD = {
    warm: 'linear-gradient(135deg,#E8C8A8,#D9A87E)',
    sage: 'linear-gradient(135deg,#CBD4B0,#A6B884)',
    dusk: 'linear-gradient(135deg,#B9A6C8,#8C7AA0)',
    peach: 'linear-gradient(135deg,#F0C8B8,#E0A088)',
    lavender: 'linear-gradient(135deg,#D4C4E4,#B0A0CE)',
    cream: 'linear-gradient(135deg,#F0E6D2,#E0D2B6)',
  };
  function PhotoPlaceholder({ tone = 'warm', aspect = '3/4', style = {} }) {
    return h('div', {
      style: Object.assign({
        aspectRatio: aspect === 'auto' ? undefined : aspect.replace('/', ' / '),
        height: aspect === 'auto' ? '100%' : undefined,
        width: '100%', background: TONE_GRAD[tone] || TONE_GRAD.warm,
        display: 'grid', placeItems: 'center', overflow: 'hidden',
      }, style),
    }, h('span', { style: { opacity: 0.45 } }, h(Icon, { name: 'camera', size: 24, color: 'rgba(255,255,255,0.9)' })));
  }

  /* ─── ImageSlot — a fillable photo well (drop / click to set) ─── */
  function ImageSlot({ ctx, slot, tone = 'warm', aspect = '3/4', style = {} }) {
    const { images = {}, onSlotClick, onSlotDrop, editMode } = ctx || {};
    const src = images[slot];
    const [over, setOver] = React.useState(false);
    const [hot, setHot] = React.useState(false);
    const ar = aspect === 'auto' ? undefined : aspect.replace('/', ' / ');
    const editable = editMode && !!onSlotClick;
    const show = editable && (over || hot || !src);
    return h('div', {
      onClick: editable ? () => onSlotClick(slot) : undefined,
      onMouseEnter: editable ? () => setHot(true) : undefined,
      onMouseLeave: editable ? () => { setHot(false); setOver(false); } : undefined,
      onDragOver: editable ? (e) => { e.preventDefault(); setOver(true); } : undefined,
      onDragLeave: editable ? () => setOver(false) : undefined,
      onDrop: editable ? (e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && onSlotDrop) onSlotDrop(slot, f); } : undefined,
      style: Object.assign({
        position: 'relative', aspectRatio: ar, height: aspect === 'auto' ? '100%' : undefined,
        width: '100%', background: src ? '#0e0d0b' : (TONE_GRAD[tone] || TONE_GRAD.warm),
        display: 'grid', placeItems: 'center', overflow: 'hidden', cursor: editable ? 'pointer' : 'default',
      }, style),
    },
      src
        ? h('img', { src, alt: '', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })
        : h('span', { style: { opacity: 0.45 } }, h(Icon, { name: 'camera', size: 24, color: 'rgba(255,255,255,0.9)' })),
      editable && h('div', { 'aria-hidden': true, 'data-pl-skip': true, style: {
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none',
        background: over ? 'rgba(92,107,63,0.34)' : 'transparent',
        boxShadow: over ? 'inset 0 0 0 2px #C19A4B' : (src ? 'inset 0 0 0 0 transparent' : 'inset 0 0 0 1.5px rgba(255,255,255,0.5)'),
        opacity: show ? 1 : 0, transition: 'opacity .14s, background .14s',
      } },
        h('span', { style: { fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: '#fff', background: 'rgba(20,14,8,0.58)', padding: '4px 10px', borderRadius: 999 } }, over ? 'Drop photo' : (src ? 'Replace' : 'Add photo'))));
  }

  function Stars({ r }) {
    return h('span', { style: { display: 'inline-flex', gap: 1 }, 'aria-hidden': true },
      [0, 1, 2, 3, 4].map((i) => h('span', { key: i, style: { opacity: i < Math.round(r) ? 1 : 0.3 } }, h(Icon, { name: 'star', size: 12, color: 'var(--t-gold)' }))));
  }

  /* ─── TButton ───────────────────────────────────────────────── */
  function TButton({ variant = 'primary', children, href, onClick, style = {} }) {
    const base = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 0, transition: 'all .18s', fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' };
    const visual = variant === 'primary' ? { background: 'var(--t-ink)', color: 'var(--t-paper)' }
      : variant === 'outline' ? { background: 'transparent', color: 'var(--t-ink)', border: '1px solid var(--t-line)' }
      : { background: 'transparent', color: 'var(--t-accent-ink)', padding: '10px 0' };
    return h('a', { href: href || '#', onClick, style: Object.assign({}, base, visual, style) }, children);
  }

  /* ─── TSectionHead ──────────────────────────────────────────── */
  function TSectionHead({ eyebrow, title, italic, divider = 'sprig', motif, density }) {
    const showMotif = motif && motif !== 'none' && density === 'generous';
    return h('div', { style: { textAlign: 'center', marginBottom: 26 } },
      showMotif && h('div', { 'aria-hidden': true, style: { display: 'flex', justifyContent: 'center', marginBottom: 10, opacity: 0.7 } }, h(MotifMark, { motif, size: 30 })),
      h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 10 } }, eyebrow),
      h('h2', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'clamp(26px, 7vw, 40px)', margin: 0, lineHeight: 1.0, letterSpacing: '-0.01em', color: 'var(--t-ink)', overflowWrap: 'break-word' } },
        title, italic && h('span', { style: { fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' } }, ' ' + italic)),
      divider && divider !== 'none' && h('div', { style: { marginTop: 14, display: 'flex', justifyContent: 'center' } }, h(KDivider, { look: divider, width: 170 })));
  }

  const metaRow = (C, center) => h('div', { style: { marginTop: 18, display: 'flex', gap: 22, justifyContent: center ? 'center' : 'flex-start', flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' } },
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 7 } }, h(Icon, { name: 'calendar', size: 14, color: 'var(--t-accent)' }), ' ', C.meta.date),
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 7 } }, h(Icon, { name: 'pin', size: 14, color: 'var(--t-accent)' }), ' ', C.meta.place));

  const nameLine = (C, isEditorial, sep) => h(React.Fragment, null,
    C.subject.a,
    C.subject.type === 'couple' && h('span', { style: { fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 } }, isEditorial ? '×' : (sep || 'and')),
    C.subject.type === 'couple' && C.subject.b);

  const ctaPair = (C, onRsvp) => h('div', { style: { marginTop: 20, display: 'flex', gap: 10, justifyContent: 'inherit', flexWrap: 'wrap' } },
    h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' })),
    h(TButton, { variant: 'outline', href: '#story' }, C.ctaSecondary));

  /* ─── HERO variants ─────────────────────────────────────────── */
  function HeroPhotos(ctx) {
    return h('div', { style: { marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, maxWidth: 940, marginInline: 'auto' } },
      ['warm', 'lavender', 'peach', 'sage'].map((t, i) => h('div', { key: i, style: { aspectRatio: '3 / 4', borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' } }, h(ImageSlot, { ctx, slot: 'hero-strip-' + i, tone: t, aspect: '3/4' }))));
  }
  function Hero({ ctx }) {
    const { C, variant, isEditorial, pad, onRsvp, dividerLook } = ctx;
    const eyebrow = h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 8 } }, C.lead);
    const tagline = C.tagline && h('div', { style: { fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', fontWeight: isEditorial ? 600 : 400, marginTop: 8 } }, C.tagline);
    const H1 = (sz) => h('h1', { className: 'pl8-hero-display', style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: sz, lineHeight: 0.96, margin: '12px 0 0', letterSpacing: isEditorial ? '-0.045em' : '-0.02em', color: 'var(--t-ink)', overflowWrap: 'break-word' } }, nameLine(C, isEditorial));

    if (variant === 'split') {
      return h('div', { className: 'pl8-hero-split', style: { position: 'relative', padding: `clamp(28px, 6vw, ${56 * pad}px) clamp(20px, 5vw, 56px)`, background: 'var(--t-section)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 'clamp(24px, 4vw, 44px)', alignItems: 'center' } },
        h('div', { style: { textAlign: 'left' } }, eyebrow, tagline, H1('clamp(32px, 9vw, calc(60px * var(--t-hero-scale)))'), metaRow(C, false), h('div', { style: { marginTop: 16 } }, h(KDivider, { look: dividerLook, width: 180, style: { marginLeft: 0 } })), h('div', { style: { marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' } }, h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' })), h(TButton, { variant: 'outline', href: '#story' }, C.ctaSecondary))),
        h('div', null, h(ImageSlot, { ctx, slot: 'hero-split', tone: 'warm', aspect: '3/4', style: { borderRadius: 'var(--t-radius)' } })));
    }
    if (variant === 'minimal') {
      return h('div', { style: { position: 'relative', padding: `${72 * pad}px 56px ${56 * pad}px`, background: 'var(--t-section)', overflow: 'hidden', textAlign: 'left' } },
        h('div', { style: { maxWidth: 840 } }, eyebrow, tagline, H1('clamp(38px, 11vw, calc(78px * var(--t-hero-scale)))'), metaRow(C, false), h('div', { style: { marginTop: 18 } }, h(KDivider, { look: dividerLook, width: 200, style: { marginLeft: 0 } })), h('div', { style: { marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' } }, h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' })), h(TButton, { variant: 'outline', href: '#story' }, C.ctaSecondary))));
    }
    if (variant === 'fullbleed') {
      return h('div', { style: { position: 'relative', minHeight: 460, display: 'grid', placeItems: 'center', textAlign: 'center', overflow: 'hidden' } },
        h('div', { style: { position: 'absolute', inset: 0 } }, h(ImageSlot, { ctx, slot: 'hero-bg', tone: 'dusk', aspect: 'auto', style: { height: '100%' } })),
        h('div', { 'aria-hidden': true, style: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.5))' } }),
        h('div', { style: { position: 'relative', color: '#fff', padding: '40px 24px' } },
          h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 8 } }, C.lead),
          h('h1', { className: 'pl8-hero-display', style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'clamp(38px, 11vw, calc(76px * var(--t-hero-scale)))', lineHeight: 0.96, margin: 0, color: '#fff', overflowWrap: 'break-word' } }, nameLine(C, isEditorial)),
          h('div', { style: { marginTop: 14, fontSize: 14.5, opacity: 0.92 } }, C.meta.date + ' · ' + C.meta.place),
          h('div', { style: { marginTop: 22 } }, h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' })))));
    }
    if (variant === 'typographic') {
      return h('div', { style: { position: 'relative', padding: `${78 * pad}px 48px ${60 * pad}px`, background: 'var(--t-section)', overflow: 'hidden', textAlign: 'center' } },
        eyebrow,
        h('h1', { className: 'pl8-hero-display', style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'clamp(48px, 16vw, calc(108px * var(--t-hero-scale)))', lineHeight: 0.86, margin: '6px 0', letterSpacing: '-0.03em', color: 'var(--t-ink)', overflowWrap: 'break-word' } },
          C.subject.a, C.subject.type === 'couple' && h(React.Fragment, null, h('br'), h('span', { style: { fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' } }, isEditorial ? '×' : '&'), h('br'), C.subject.b)),
        metaRow(C, true),
        h('div', { style: { marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } }, h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' }))));
    }
    if (variant === 'postcard') {
      return h('div', { style: { position: 'relative', padding: `${48 * pad}px clamp(16px, 5vw, 40px)`, background: 'color-mix(in oklab, var(--t-ink) 8%, var(--t-section))', overflow: 'hidden' } },
        h('div', { style: { maxWidth: 720, marginInline: 'auto', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)', border: '1px solid var(--t-line)', padding: `${40 * pad}px clamp(16px, 5vw, 40px)`, textAlign: 'center', position: 'relative' } },
          h('div', { 'aria-hidden': true, style: { position: 'absolute', inset: 10, border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius)', pointerEvents: 'none' } }),
          h('div', { style: { position: 'relative' } }, eyebrow, tagline, H1('clamp(32px, 9vw, calc(58px * var(--t-hero-scale)))'), metaRow(C, true), h('div', { style: { marginTop: 16, display: 'flex', justifyContent: 'center' } }, h(KDivider, { look: dividerLook, width: 180 })), h('div', { style: { marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } }, h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' })), h(TButton, { variant: 'outline', href: '#story' }, C.ctaSecondary)))));
    }
    /* default: centered */
    return h('div', { style: { position: 'relative', textAlign: 'center', padding: `${64 * pad}px 40px ${52 * pad}px`, background: 'var(--t-section)', overflow: 'hidden' } },
      ctx.motif && ctx.motif !== 'none' && h('div', { 'aria-hidden': true, style: { position: 'absolute', inset: 0, pointerEvents: 'none', opacity: ctx.motifDensity === 'generous' ? 0.1 : 0.06 } },
        h('div', { style: { position: 'absolute', top: 24, left: 26, transform: 'rotate(-12deg)' } }, h(MotifMark, { motif: ctx.motif, size: 96 })),
        h('div', { style: { position: 'absolute', bottom: 22, right: 28, transform: 'rotate(160deg)' } }, h(MotifMark, { motif: ctx.motif, size: 110 }))),
      h('div', { style: { position: 'relative', marginInline: 'auto' } },
        eyebrow, tagline, H1('clamp(38px, 11vw, calc(74px * var(--t-hero-scale)))'),
        metaRow(C, true),
        h('div', { style: { marginTop: 16, display: 'flex', justifyContent: 'center' } }, h(KDivider, { look: dividerLook, width: 200 })),
        h('div', { style: { marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } }, h(TButton, { variant: 'primary', href: '#rsvp', onClick: onRsvp }, C.cta, ' ', h(Icon, { name: 'arrow-right', size: 13, color: 'var(--t-paper)' })), h(TButton, { variant: 'outline', href: '#story' }, C.ctaSecondary)),
        HeroPhotos(ctx)));
  }

  /* ─── STORY variants ────────────────────────────────────────── */
  function Story({ ctx }) {
    const { C, storyVariant, isEditorial, pad, motif, dividerLook } = ctx;
    const s = C.story;
    if (storyVariant === 'stacked') {
      return h('div', { style: { padding: `${48 * pad}px clamp(20px, 6vw, 72px)`, textAlign: 'center', maxWidth: 760, marginInline: 'auto', background: 'var(--t-paper)' } },
        h('div', { style: { marginInline: 'auto', maxWidth: 520, marginBottom: 26 } }, h(ImageSlot, { ctx, slot: 'story-photo', tone: 'warm', aspect: '16/9', style: { borderRadius: 'var(--t-radius)' } })),
        h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 10 } }, s.eyebrow),
        h('h2', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, color: 'var(--t-ink)' } }, s.title, s.italic && h('span', { style: { fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' } }, ' ' + s.italic)),
        h('p', { style: { marginTop: 16, fontSize: 15, color: 'var(--t-ink-soft)', lineHeight: 1.65 } }, s.body));
    }
    if (storyVariant === 'quote') {
      return h('div', { style: { position: 'relative', padding: `${56 * pad}px clamp(20px, 6vw, 72px)`, textAlign: 'center', maxWidth: 880, marginInline: 'auto', background: 'var(--t-paper)' } },
        h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 16 } }, s.eyebrow),
        h('blockquote', { style: { fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontWeight: 'var(--t-display-wght)', fontSize: 28, lineHeight: 1.32, margin: 0, color: 'var(--t-ink)', letterSpacing: '-0.01em' } }, s.body),
        h('div', { style: { marginTop: 20, display: 'flex', justifyContent: 'center' } }, h(KDivider, { look: dividerLook, width: 160 })));
    }
    if (storyVariant === 'letter') {
      return h('div', { style: { position: 'relative', padding: `${52 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-section)' } },
        h('div', { style: { position: 'relative', maxWidth: 640, marginInline: 'auto', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)', border: '1px solid var(--t-line)', padding: '40px 46px', textAlign: 'center' } },
          h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 14 } }, s.eyebrow),
          h('p', { style: { fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink)', lineHeight: 1.6, textAlign: 'left' } }, s.body),
          h('div', { style: { fontFamily: 'var(--t-script)', fontSize: 30, color: 'var(--t-accent-ink)', marginTop: 14, textAlign: 'right' } }, C.subject.type === 'solo' ? C.subject.a : C.subject.a + ' & ' + C.subject.b)));
    }
    /* default sidebyside */
    return h('div', { className: 'pl8-story-sbs', style: { position: 'relative', padding: `${48 * pad}px clamp(20px, 6vw, 72px)`, display: 'grid', gridTemplateColumns: '0.85fr 1fr', gap: 'clamp(24px, 5vw, 44px)', alignItems: 'center', background: 'var(--t-paper)' } },
      h('div', { style: { position: 'relative' } }, h(ImageSlot, { ctx, slot: 'story-photo', tone: 'warm', aspect: '4/5' })),
      h('div', null,
        h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 10 } }, s.eyebrow),
        h('h2', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, letterSpacing: '-0.01em', color: 'var(--t-ink)' } }, [s.title, s.italic].filter(Boolean).join(' ')),
        h('div', { style: { marginTop: 16, fontSize: 15, color: 'var(--t-ink-soft)', lineHeight: 1.65 } }, s.body)));
  }

  /* ─── DETAILS (tiles) ───────────────────────────────────────── */
  function Details({ ctx }) {
    const { C, pad, dividerLook, layouts } = ctx;
    const lay = (layouts && layouts.details) || 'grid';
    const head = h(TSectionHead, { eyebrow: C.details.eyebrow, title: C.details.title, italic: C.details.italic, divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity });
    if (lay === 'list') {
      return h('div', { style: { position: 'relative', padding: `${44 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-section)' } }, head,
        h('div', { style: { maxWidth: 600, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 10 } },
          C.details.items.map((d, i) => h('div', { key: i, className: 'pl8-card pl8-detail-card', style: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--t-card)', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line-soft)' } },
            h(Icon, { name: d.icon, size: 18, color: 'var(--t-gold)' }),
            h('div', { style: { flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' } }, d.l),
            h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18, color: 'var(--t-ink)', textAlign: 'right' } }, d.v)))));
    }
    return h('div', { style: { position: 'relative', padding: `${44 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-section)' } }, head,
      h('div', { style: { position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, maxWidth: 760, marginInline: 'auto' } },
        C.details.items.map((d, i) => h('div', { key: i, className: 'pl8-card pl8-detail-card', style: { background: 'var(--t-card)', borderRadius: 'var(--t-radius)', padding: 18, border: '1px solid var(--t-line-soft)' } },
          h(Icon, { name: d.icon, size: 18, color: 'var(--t-gold)' }),
          h('div', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 10, marginBottom: 4 } }, d.l),
          h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18, color: 'var(--t-ink)' } }, d.v)))));
  }

  /* ─── SCHEDULE (cards) ──────────────────────────────────────── */
  function Schedule({ ctx }) {
    const { C, pad, dividerLook, layouts } = ctx;
    const lay = (layouts && layouts.schedule) || 'cards';
    const head = h(TSectionHead, { eyebrow: C.schedule.eyebrow, title: C.schedule.title, italic: C.schedule.italic, divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity });
    if (lay === 'timeline') {
      const rows = C.schedule.rows;
      return h('div', { style: { padding: `${48 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-paper)' } }, head,
        h('div', { style: { maxWidth: 600, marginInline: 'auto' } },
          rows.map((r, i) => h('div', { key: i, style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16 } },
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
              h('span', { 'aria-hidden': true, style: { width: 13, height: 13, borderRadius: '50%', background: 'var(--t-accent)', marginTop: 6, flexShrink: 0 } }),
              i < rows.length - 1 && h('span', { 'aria-hidden': true, style: { flex: 1, width: 2, background: 'var(--t-line)', marginTop: 4 } })),
            h('div', { className: 'pl8-card pl8-schedule-row', style: { background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 'var(--t-radius)', padding: '12px 16px', marginBottom: 14, textAlign: 'left' } },
              h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18, color: 'var(--t-ink)' } }, r.t),
              h('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--t-ink)', marginTop: 2 } }, r.l),
              h('div', { style: { fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 2 } }, r.s))))));
    }
    return h('div', { style: { padding: `${48 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-paper)' } }, head,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, maxWidth: 880, marginInline: 'auto' } },
        C.schedule.rows.map((r, i) => h('div', { key: i, className: 'pl8-card pl8-schedule-row', style: { padding: 16, background: 'var(--t-card)', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line-soft)', textAlign: 'center', position: 'relative' } },
          h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20, color: 'var(--t-ink)' } }, r.t),
          h('div', { style: { fontSize: 13, color: 'var(--t-ink)', marginTop: 4, fontWeight: 600 } }, r.l),
          h('div', { style: { fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 2 } }, r.s)))));
  }

  /* ─── TRAVEL (rows) ─────────────────────────────────────────── */
  function Travel({ ctx }) {
    const { C, pad, dividerLook, editMode } = ctx;
    const hotels = (C.travel && C.travel.hotels) || [];
    const place = (C.meta && C.meta.place) || 'your venue';
    return h('div', { style: { position: 'relative', padding: `${48 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-section)' } },
      h(TSectionHead, { eyebrow: C.travel.eyebrow, title: C.travel.title, italic: C.travel.italic, divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity }),
      h('div', { style: { position: 'relative', maxWidth: 820, marginInline: 'auto' } },
        hotels.length === 0
          ? h('div', { 'data-pl-skip': true, style: { textAlign: 'center', maxWidth: 460, margin: '0 auto', padding: '26px 24px', border: '1px dashed var(--t-line)', borderRadius: 'var(--t-radius-lg)', color: 'var(--t-ink-soft)' } },
              h('div', { style: { fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 19, color: 'var(--t-ink)', marginBottom: 6 } }, 'Where to stay'),
              h('div', { style: { fontSize: 13.5, lineHeight: 1.55 } }, editMode ? ('Pear is gathering a few stays near ' + place + ' \u2014 or add your own in the Travel panel.') : ('Lodging details for ' + place + ' are on the way.')))
          : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 } },
            hotels.map((hh, i) => h('div', { key: i, className: 'pl8-card pl8-hotel-row', style: { background: 'var(--t-card)', borderRadius: 'var(--t-radius-lg)', overflow: 'hidden', border: '1px solid var(--t-line-soft)', boxShadow: 'var(--t-shadow)', position: 'relative', display: 'flex', flexDirection: 'column' } },
              h('div', { style: { aspectRatio: '16 / 9' } }, h(ImageSlot, { ctx, slot: 'travel-' + i, tone: hh.tone || ['warm', 'sage', 'dusk', 'peach'][i % 4], aspect: '16/9' })),
              h('div', { style: { padding: 15, display: 'flex', flexDirection: 'column', flex: 1 } },
                h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20, color: 'var(--t-ink)' } }, hh.name),
                hh.area && h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12.5, color: 'var(--t-ink-soft)' } }, h(Icon, { name: 'pin', size: 12, color: 'var(--t-accent)' }), ' ', hh.area),
                hh.blurb && h('div', { style: { fontSize: 13, color: 'var(--t-ink-soft)', lineHeight: 1.5, margin: '9px 0 12px' } }, hh.blurb),
                hh.link && h('a', { href: hh.link, target: '_blank', rel: 'noopener', 'data-pl-skip': true, style: { marginTop: 'auto', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: 'var(--t-accent-bg)', color: 'var(--t-accent-ink)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' } }, 'View \u2197')))))));
  }

  /* ─── MAP (styled venue map + directions) ───────────────────── */
  function MapSection({ ctx }) {
    const { C, pad, dividerLook } = ctx;
    const place = (C.meta && C.meta.place) || '';
    const dirs = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place || 'venue');
    return h('div', { style: { position: 'relative', padding: `${48 * pad}px clamp(16px, 5vw, 40px)`, background: 'var(--t-paper)' } },
      h(TSectionHead, { eyebrow: C.travel ? 'Getting there' : 'Where', title: 'Find your', italic: 'way', divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity }),
      h('div', { style: { maxWidth: 720, marginInline: 'auto', borderRadius: 'var(--t-radius-lg)', overflow: 'hidden', border: '1px solid var(--t-line)', boxShadow: 'var(--t-shadow)', background: 'var(--t-card)' } },
        h('div', { 'data-pl-skip': true, style: { position: 'relative', height: 280, background: 'var(--t-section)', overflow: 'hidden' } },
          h('svg', { width: '100%', height: '100%', viewBox: '0 0 600 280', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': true, style: { position: 'absolute', inset: 0 } },
            h('rect', { x: 0, y: 0, width: 600, height: 280, fill: 'var(--t-section)' }),
            h('path', { d: 'M-20 200 C 120 150 180 250 320 200 S 540 150 640 190 L 640 300 L -20 300 Z', fill: 'color-mix(in oklab, var(--t-accent) 14%, transparent)' }),
            h('g', { fill: 'none', stroke: 'var(--t-line)', strokeWidth: 2 },
              h('path', { d: 'M-20 70 C 150 60 200 120 360 90 S 560 60 640 80' }),
              h('path', { d: 'M80 -10 C 70 80 140 140 110 290' }),
              h('path', { d: 'M420 -10 C 440 90 380 160 430 290' })),
            h('g', { stroke: 'color-mix(in oklab, var(--t-ink) 8%, transparent)', strokeWidth: 1 },
              Array.from({ length: 7 }).map((_, i) => h('line', { key: 'h' + i, x1: 0, y1: i * 44, x2: 600, y2: i * 44 })),
              Array.from({ length: 11 }).map((_, i) => h('line', { key: 'v' + i, x1: i * 60, y1: 0, x2: i * 60, y2: 280 })))),
          h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-100%)', textAlign: 'center' } },
            h('svg', { width: 40, height: 52, viewBox: '0 0 40 52', 'aria-hidden': true, style: { display: 'block', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))' } },
              h('path', { d: 'M20 2 C 9 2 2 11 2 21 C 2 34 20 50 20 50 C 20 50 38 34 38 21 C 38 11 31 2 20 2 Z', fill: 'var(--t-accent)', stroke: 'var(--t-paper)', strokeWidth: 2 }),
              h('circle', { cx: 20, cy: 20, r: 6, fill: 'var(--t-paper)' }))),
          h('span', { 'aria-hidden': true, style: { position: 'absolute', top: '50%', left: '50%', width: 24, height: 8, transform: 'translate(-50%,4px)', borderRadius: '50%', background: 'rgba(0,0,0,0.16)', filter: 'blur(2px)' } })),
        h('div', { style: { padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' } },
          h('div', null,
            h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20, color: 'var(--t-ink)' } }, C.mapVenue || (C.subject && (C.subject.a + (C.subject.type === 'couple' ? ' & ' + C.subject.b : '')) + '\u2019s celebration') || 'The venue'),
            place && h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 13, color: 'var(--t-ink-soft)' } }, h(Icon, { name: 'pin', size: 13, color: 'var(--t-accent)' }), ' ', place)),
          h('a', { href: dirs, target: '_blank', rel: 'noopener', 'data-pl-skip': true, style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 999, background: 'var(--t-rsvp)', color: 'var(--t-rsvp-ink)', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' } }, 'Get directions \u2197'))));
  }

  /* ─── REGISTRY (pills) ──────────────────────────────────────── */
  function Registry({ ctx }) {
    const { C, pad, dividerLook } = ctx;
    return h('div', { style: { padding: `${48 * pad}px clamp(16px, 5vw, 40px)`, textAlign: 'center', background: 'var(--t-paper)' } },
      h(TSectionHead, { eyebrow: C.registry.eyebrow, title: C.registry.title, italic: C.registry.italic, divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity }),
      h('div', { style: { fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 } }, C.registry.body),
      h('div', { style: { display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' } },
        C.registry.stores.map((sName, i) => h('span', { key: i, style: { padding: '12px 22px', borderRadius: 'var(--t-radius)', background: 'var(--t-card)', border: '1px solid var(--t-line)', fontSize: 13, fontWeight: 600, color: 'var(--t-ink)', display: 'inline-flex', alignItems: 'center', gap: 6 } },
          sName, h(Icon, { name: 'arrow-ur', size: 12, color: 'var(--t-accent-ink)' })))));
  }

  /* ─── GALLERY (grid) ────────────────────────────────────────── */
  function Gallery({ ctx }) {
    const { C, pad, dividerLook, layouts } = ctx;
    const lay = (layouts && layouts.gallery) || 'grid';
    const head = h(TSectionHead, { eyebrow: C.gallery.eyebrow, title: C.gallery.title, italic: C.gallery.italic, divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity });
    if (lay === 'strip') {
      return h('div', { style: { padding: `${36 * pad}px clamp(16px, 4vw, 32px)`, background: 'var(--t-section)' } }, head,
        h('div', { className: 'ed-scroll', style: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, maxWidth: 940, marginInline: 'auto' } },
          C.gallery.tones.map((t, i) => h('div', { key: i, style: { flex: '0 0 190px' } }, h(ImageSlot, { ctx, slot: 'gallery-' + i, tone: t, aspect: '4/5', style: { borderRadius: 8 } })))));
    }
    if (lay === 'mosaic') {
      return h('div', { style: { padding: `${36 * pad}px clamp(16px, 4vw, 32px)`, background: 'var(--t-section)' } }, head,
        h('div', { style: { columnCount: 3, columnGap: 8, maxWidth: 920, marginInline: 'auto' } },
          C.gallery.tones.map((t, i) => h('div', { key: i, style: { breakInside: 'avoid', marginBottom: 8 } }, h(ImageSlot, { ctx, slot: 'gallery-' + i, tone: t, aspect: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5', style: { borderRadius: 8 } })))));
    }
    return h('div', { style: { padding: `${36 * pad}px clamp(16px, 4vw, 32px)`, background: 'var(--t-section)' } }, head,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, maxWidth: 920, marginInline: 'auto' } },
        C.gallery.tones.map((t, i) => h(ImageSlot, { key: i, ctx, slot: 'gallery-' + i, tone: t, aspect: '1/1', style: { borderRadius: 8 } }))));
  }

  /* ─── RSVP (centered dark plate) ────────────────────────────── */
  function Rsvp({ ctx }) {
    const { C, pad, onRsvp } = ctx;
    return h('div', { className: 'pl8-rsvp-plate', style: { padding: `${56 * pad}px clamp(16px, 4vw, 32px)`, textAlign: 'center', background: 'var(--t-rsvp)', color: 'var(--t-rsvp-ink)' } },
      h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8, color: 'var(--t-rsvp-ink)' } }, C.rsvp.eyebrow),
      h('h2', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 44, margin: '8px 0 6px', color: 'var(--t-rsvp-ink)' } }, C.rsvp.title),
      h('div', { style: { fontSize: 13.5, opacity: 0.7, marginBottom: 18, color: 'var(--t-rsvp-ink)' } }, C.rsvp.body),
      h('button', { type: 'button', onClick: onRsvp, style: { display: 'inline-block', padding: '13px 30px', minHeight: 44, borderRadius: 999, border: 'none', background: 'var(--t-rsvp-ink)', color: 'var(--t-rsvp)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--t-body)' } }, C.cta + ' →'));
  }

  /* ─── FAQ (accordion) ───────────────────────────────────────── */
  function Faq({ ctx }) {
    const { C, pad, dividerLook } = ctx;
    const [open, setOpen] = React.useState(null);
    return h('div', { style: { padding: `${48 * pad}px clamp(16px, 4vw, 32px)`, background: 'var(--t-paper)' } },
      h(TSectionHead, { eyebrow: C.faq.eyebrow, title: C.faq.title, italic: C.faq.italic, divider: dividerLook, motif: ctx.motif, density: ctx.motifDensity }),
      h('div', { style: { maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 } },
        C.faq.qa.map((item, i) => {
          const isOpen = open === i;
          return h('div', { key: i, className: 'pl8-card pl8-faq-row', style: { background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 'var(--t-radius)', position: 'relative' } },
            h('div', { role: 'button', 'aria-expanded': isOpen, onClick: () => setOpen(isOpen ? null : i), style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'pointer' } },
              h('span', { style: { fontSize: 13.5, color: 'var(--t-ink)', flex: 1 } }, item.q),
              h('span', { style: { display: 'inline-flex', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 } }, h(Icon, { name: 'chev-down', size: 13, color: 'var(--t-ink-muted)' }))),
            isOpen && h('div', { style: { padding: '0 16px 12px' } }, h('div', { style: { fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.55 } }, item.a)));
        })));
  }

  /* ─── COUNTDOWN (cards) ─────────────────────────────────────── */
  function Countdown({ ctx }) {
    const { C, pad } = ctx;
    const target = Date.parse(C.dateISO);
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    if (!Number.isFinite(target)) return null;
    const diff = Math.max(0, target - now);
    const p = { d: Math.floor(diff / 86400000), h: Math.floor((diff / 3600000) % 24), m: Math.floor((diff / 60000) % 60), s: Math.floor((diff / 1000) % 60) };
    const cell = (n, l) => h('div', { className: 'pl8-countdown-cell', style: { textAlign: 'center', minWidth: 72, padding: '14px 12px' } },
      h('div', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'clamp(34px,6vw,52px)', color: 'var(--t-ink)', lineHeight: 1 } }, String(n).padStart(2, '0')),
      h('div', { style: { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 6 } }, l));
    return h('div', { 'data-pl-skip': true, style: { padding: `${48 * pad}px clamp(16px, 4vw, 32px)`, background: 'var(--t-paper)', textAlign: 'center' } },
      h('div', { style: { fontSize: 12, color: 'var(--t-ink-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 18 } }, 'The big day'),
      h('div', { style: { display: 'inline-flex', gap: 'clamp(10px,3vw,28px)', justifyContent: 'center', flexWrap: 'wrap' } }, cell(p.d, 'days'), cell(p.h, 'hours'), cell(p.m, 'minutes'), cell(p.s, 'seconds')));
  }

  /* ─── NAV — desktop layout variants ─────────────────────────── */
  function Nav({ ctx }) {
    const { C, navItems, onRsvp, activeId, navVariant } = ctx;
    const headline = C.subject.type === 'solo' ? C.subject.a : C.subject.a + ' & ' + C.subject.b;
    const v = navVariant || 'centered';
    const link = (it) => h('a', { key: it.id, href: '#' + it.id, style: { fontSize: 12.5, color: activeId === it.id ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)', fontFamily: 'var(--t-body)', textDecoration: 'none', borderBottom: activeId === it.id ? '1px solid var(--t-gold)' : '1px solid transparent', paddingBottom: 2 } }, it.label);
    const rsvpBtn = (style) => h('button', { type: 'button', onClick: onRsvp, style: Object.assign({ padding: '8px 16px', fontSize: 12.5, fontWeight: 600, color: 'var(--t-accent-ink)', background: 'var(--t-accent-bg)', border: '1px solid var(--t-accent)', borderRadius: 'var(--t-radius)', cursor: 'pointer', fontFamily: 'var(--t-body)' }, style || {}) }, 'RSVP');
    const wrap = { position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--t-line-soft)', background: 'var(--t-paper)', backdropFilter: 'saturate(140%) blur(6px)', WebkitBackdropFilter: 'saturate(140%) blur(6px)' };
    const mark = (sz, fs) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 10 } }, h(OliveSprig, { size: sz }), h('span', { style: { fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: fs, color: 'var(--t-ink)', lineHeight: 1 } }, headline));
    if (v === 'split') {
      return h('nav', { style: Object.assign({}, wrap, { display: 'flex', alignItems: 'center', gap: 24, padding: '14px 32px' }) },
        h('div', { style: { flexShrink: 0 } }, mark(24, 18)),
        h('div', { style: { flex: 1, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' } }, navItems.map(link)),
        rsvpBtn({ flexShrink: 0 }));
    }
    if (v === 'minimal') {
      return h('nav', { style: Object.assign({}, wrap, { padding: '14px 32px', textAlign: 'center' }) },
        h('div', { style: { display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 22, flexWrap: 'wrap' } },
          navItems.map(link),
          h('button', { type: 'button', onClick: onRsvp, style: { fontSize: 12, color: 'var(--t-accent-ink)', fontFamily: 'var(--t-body)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' } }, 'RSVP →')));
    }
    if (v === 'serif') {
      return h('nav', { style: Object.assign({}, wrap, { padding: '22px 40px', textAlign: 'center', borderBottom: '2px solid var(--t-accent)' }) },
        h('div', { style: { marginBottom: 12 } }, mark(30, 28)),
        h('div', { style: { display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' } }, navItems.map((it) => h('a', { key: it.id, href: '#' + it.id, style: { fontFamily: 'var(--t-mono, monospace)', fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: activeId === it.id ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)', textDecoration: 'none' } }, it.label))));
    }
    /* centered (default) */
    return h('nav', { style: Object.assign({}, wrap, { padding: '18px 36px 14px', textAlign: 'center', position: 'relative' }) },
      h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 12, justifyContent: 'center' } }, mark(30, 22)),
      h('div', { style: { display: 'flex', justifyContent: 'center', gap: 28, marginTop: 12, flexWrap: 'wrap' } }, navItems.map(link)),
      rsvpBtn({ position: 'absolute', right: 36, top: 18 }));
  }

  function Footer({ ctx }) {
    const { C, footerVariant } = ctx;
    const headline = C.subject.type === 'solo' ? C.subject.a : C.subject.a + ' & ' + C.subject.b;
    const v = footerVariant || 'signature';
    if (v === 'minimal') {
      return h('footer', { style: { padding: '26px 24px', textAlign: 'center', background: 'var(--t-paper)', borderTop: '1px solid var(--t-line-soft)', fontSize: 12, color: 'var(--t-ink-muted)' } },
        h('span', { style: { fontFamily: 'var(--t-display)', fontStyle: 'italic', color: 'var(--t-ink)', fontSize: 15 } }, headline), ' · ', C.meta.date, ' · Made with Pearloom');
    }
    if (v === 'columns') {
      return h('footer', { style: { padding: '36px 40px', background: 'var(--t-paper)', borderTop: '1px solid var(--t-line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18 } },
        h('div', null, h('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } }, h(OliveSprig, { size: 26 }), h('span', { style: { fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--t-ink)' } }, headline)), h('div', { style: { fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 6, letterSpacing: '0.06em' } }, C.meta.date + ' · ' + C.meta.place)),
        h('div', { style: { display: 'flex', gap: 22, flexWrap: 'wrap' } }, ctx.navItems.map((it) => h('a', { key: it.id, href: '#' + it.id, style: { fontSize: 12, color: 'var(--t-ink-soft)', textDecoration: 'none', fontFamily: 'var(--t-body)' } }, it.label))));
    }
    /* signature (default) */
    return h('footer', { style: { padding: '40px 24px 48px', textAlign: 'center', background: 'var(--t-paper)', borderTop: '1px solid var(--t-line-soft)' } },
      h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 } }, h(OliveSprig, { size: 28 })),
      h('div', { style: { fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--t-ink)' } }, headline),
      h('div', { style: { fontSize: 12, color: 'var(--t-ink-muted)', marginTop: 8, letterSpacing: '0.08em' } }, C.meta.date + ' · ' + C.meta.place),
      h('div', { style: { fontSize: 10.5, color: 'var(--t-ink-muted)', marginTop: 18, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 } }, 'Made with Pearloom'));
  }

  /* ─── buildCopy — default wedding content (classic voice) ───── */
  function buildCopy(names, meta) {
    return {
      subject: { type: 'couple', a: names[0], b: names[1] },
      lead: 'Save the date',
      tagline: 'together, at last',
      cta: 'RSVP', ctaSecondary: 'Learn more',
      meta, dateISO: meta.dateISO,
      story: {
        eyebrow: 'Our story', title: 'How we', italic: 'met',
        body: 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.',
      },
      details: { eyebrow: 'The fine print', title: 'Everything you', italic: 'should know', items: [
        { l: 'Dress code', v: 'Garden formal', icon: 'sparkles' },
        { l: 'Kids welcome', v: 'Ages 10 +', icon: 'users' },
        { l: 'Gifts', v: 'Your presence is enough', icon: 'gift' },
      ] },
      schedule: { eyebrow: 'The day', title: 'In', italic: 'moments', rows: [
        { t: '4:30 pm', l: 'Ceremony', s: 'Olive grove' },
        { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
        { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
        { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
      ] },
      travel: { eyebrow: 'Getting there', title: 'Where to', italic: 'stay', hotels: [
        { name: 'Cosmos Suites', price: '$$$', rating: 4.8, reviews: 412, dist: '8-min walk', tone: 'warm', blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.', amenities: ['Caldera view', 'Pool', 'Breakfast'] },
        { name: 'Andronis Boutique', price: '$$$$', rating: 4.9, reviews: 286, dist: '12-min walk', tone: 'lavender', blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.', amenities: ['Spa', 'Infinity pool', 'Fine dining'] },
      ] },
      registry: { eyebrow: 'Registry', title: 'Your presence is', italic: 'the gift', body: "If you'd like to celebrate further, we've put a few things together.", stores: ['Honeymoon fund', 'Crate & Barrel', 'Zola'] },
      gallery: { eyebrow: 'Gallery', title: 'A few', italic: 'favorites', tones: ['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream', 'warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'] },
      rsvp: { eyebrow: 'RSVP by August 8', title: 'Save your seat', body: 'It takes about 90 seconds. Pear will follow up if anyone forgets.' },
      faq: { eyebrow: 'Questions & answers', title: 'The', italic: 'little things', qa: [
        { q: "What's the dress code, really?", a: 'Garden formal — think linen suits and tea-length dresses. The ceremony is on grass, so consider your heels.' },
        { q: 'Can I bring a plus-one?', a: 'If your invitation names a guest, absolutely. If you are flying solo, you will be in great company.' },
        { q: 'Are kids welcome at the ceremony?', a: 'Little ones aged ten and up are warmly welcome for the whole evening.' },
        { q: 'Where should we stay?', a: 'We have blocked rooms at Cosmos Suites and Andronis Boutique — both a short walk from the venue.' },
      ] },
    };
  }

  window.PearSite = { buildCopy, Nav, Hero, Story, Details, Schedule, Travel, MapSection, Registry, Gallery, Rsvp, Faq, Countdown, Footer, Icon, OliveSprig, ImageSlot, PhotoPlaceholder };
})();
