/* Pearloom — Site Editor (redesigned shell).
   The live renderer (../site-renderer) is embedded as the canvas via an
   iframe; the editor drives it over postMessage (pl:set / pl:select) and
   listens for selection + state back. Chrome runs on the brand product
   palette, insulated from the edited site's theme. */
(function () {
  const h = React.createElement;
  const { useState, useEffect, useRef, useCallback } = React;

  /* ── Brand chrome palette ── */
  const C = {
    cream: '#FBF7EE', page: '#F1E8D6', studio: '#E7E0D0', card: '#FFFDF7',
    ink: '#18181B', inkSoft: '#4A5642', muted: '#7A7060', faint: '#A89E8B',
    line: '#E2D9C3', lineSoft: '#EDE6D5', olive: '#5C6B3F', oliveHover: '#4A5731',
    gold: '#C19A4B', goldSoft: '#F0E6CF', goldInk: '#8C6E3D', plum: '#C6563D',
  };
  const FONT_D = "'Fraunces', Georgia, serif";
  const FONT_M = "'Geist Mono', ui-monospace, monospace";

  const SECTIONS = [
    { id: 'top', name: 'Hero', note: 'Names, date, the cover' },
    { id: 'story', name: 'Our story', note: 'How you got here' },
    { id: 'countdown', name: 'Countdown', note: 'Days until' },
    { id: 'details', name: 'Details', note: 'Dress code, gifts' },
    { id: 'schedule', name: 'Schedule', note: 'The run of the day' },
    { id: 'travel', name: 'Travel', note: 'Where to stay' },
    { id: 'gallery', name: 'Gallery', note: 'A few favorites' },
    { id: 'registry', name: 'Registry', note: 'Gifts & funds' },
    { id: 'faq', name: 'FAQ', note: 'Anything else' },
    { id: 'rsvp', name: 'RSVP', note: 'The reply' },
  ];
  const SEC_MAP = {}; SECTIONS.forEach((s) => { SEC_MAP[s.id] = s; });
  SEC_MAP.map = { id: 'map', name: 'Map', note: 'Where it happens' };
  const DEFAULT_ORDER = SECTIONS.map((s) => s.id);
  const DEVICES = { desktop: { label: 'Desktop', w: null }, tablet: { label: 'Tablet', w: 834 }, mobile: { label: 'Mobile', w: 390 } };
  const TEXTURES = [['paper', 'Pressed paper'], ['linen', 'Linen'], ['watercolor', 'Watercolor'], ['cotton', 'Cotton rag'], ['velvet', 'Velvet'], ['silk', 'Silk'], ['marble', 'Marble'], ['washi', 'Washi'], ['slate', 'Slate'], ['tweed', 'Tweed'], ['none', 'Smooth']];
  const DENSITIES = ['cozy', 'comfortable', 'spacious'];
  const HEROES = ['centered', 'split', 'minimal', 'postcard', 'typographic', 'fullbleed'];
  const STORIES = [['sidebyside', 'Side by side'], ['stacked', 'Stacked'], ['quote', 'Quote'], ['letter', 'Letter']];
  const SECTION_LAYOUTS = {
    top: [['centered', 'Centered'], ['split', 'Split'], ['minimal', 'Minimal'], ['postcard', 'Postcard'], ['typographic', 'Type'], ['fullbleed', 'Full bleed']],
    story: [['sidebyside', 'Side by side'], ['stacked', 'Stacked'], ['quote', 'Quote'], ['letter', 'Letter']],
    details: [['grid', 'Grid'], ['list', 'List']],
    schedule: [['cards', 'Cards'], ['timeline', 'Timeline']],
    gallery: [['grid', 'Grid'], ['strip', 'Strip'], ['mosaic', 'Mosaic']],
  };
  const LAYOUT_DEFAULT = { top: 'centered', story: 'sidebyside', details: 'grid', schedule: 'cards', gallery: 'grid' };
  const DIVIDERS = [['auto', 'From theme'], ['rule', 'Rule'], ['dot', 'Dot'], ['sprig', 'Sprig'], ['brush', 'Brush'], ['deckle', 'Deckle'], ['laurel', 'Laurel'], ['wave', 'Wave'], ['chevron', 'Chevron'], ['ribbon', 'Ribbon'], ['arc', 'Arc'], ['rays', 'Rays'], ['diamond', 'Diamond']];
  const DIVIDERS_ANIM = [['flow', 'Gleam'], ['grow-vine', 'Growing vine'], ['tide', 'Tide'], ['twinkle', 'Twinkle']];
  const MOTIFS = [['auto', 'From theme'], ['none', 'None'], ['olive', 'Olive sprig'], ['bloom', 'Bloom'], ['pressed', 'Pressed bloom'], ['fern', 'Fern'], ['laurel', 'Laurel'], ['deco', 'Deco fan'], ['sun', 'Sun'], ['wave', 'Wave'], ['lavender', 'Lavender']];
  const MOTIFS_ANIM = [['breeze', 'Breeze'], ['sunbeam', 'Sunbeam'], ['tide', 'Tide'], ['fireflies', 'Fireflies'], ['bloom-open', 'Blooming']];
  const DEFAULT_CONTENT = {
    names: ['Mira', 'Jun'], coupleType: 'couple',
    date: 'Saturday · September 6, 2026', place: 'Point Reyes, California', dateISO: '2026-09-06',
    tagline: 'together, at last',
    story: { eyebrow: 'Our story', title: 'How we', italic: 'met', body: 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.' },
    schedule: [
      { t: '4:30 pm', l: 'Ceremony', s: 'Olive grove' },
      { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
      { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
      { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
    ],
    registryBody: "If you'd like to celebrate further, we've put a few things together.",
    registry: ['Honeymoon fund', 'Crate & Barrel', 'Zola'],
    travel: [],
    faq: [
      { q: "What's the dress code, really?", a: 'Garden formal — think linen suits and tea-length dresses. The ceremony is on grass, so consider your heels.' },
      { q: 'Can I bring a plus-one?', a: 'If your invitation names a guest, absolutely. If you are flying solo, you will be in great company.' },
      { q: 'Are kids welcome at the ceremony?', a: 'Little ones aged ten and up are warmly welcome for the whole evening.' },
      { q: 'Where should we stay?', a: 'We have blocked rooms at Cosmos Suites and Andronis Boutique — both a short walk from the venue.' },
    ],
  };
  const STATIC_KITS = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal', 'arch', 'stamp', 'deco', 'gallery', 'menu', 'boarding-pass', 'marquee', 'chalkboard', 'nursery', 'certificate', 'kraft', 'luggage-tag', 'memoriam', 'gilt', 'atelier', 'cabinet', 'scallop', 'noir', 'glass', 'linen-press', 'wax-seal', 'pennant', 'embossed'];
  const KIT_LABEL = { 'boarding-pass': 'Boarding pass', 'luggage-tag': 'Luggage tag', 'linen-press': 'Linen press', 'wax-seal': 'Wax seal' };
  const kitLabel = (k) => KIT_LABEL[k] || (k.charAt(0).toUpperCase() + k.slice(1));
  const MOTION_KITS = [
    { id: 'neon', name: 'Neon', desc: 'Tube flicker + buzz glow', for: 'Bachelor/ette · NYE · galas', sw: ['#15131C', '#B9A6E0'] },
    { id: 'marquee-live', name: 'Marquee Live', desc: 'Bulb lights, pulsing', for: 'Birthdays · theatre', sw: ['#FFFEF7', '#C19A4B'] },
    { id: 'aurora-glass', name: 'Aurora Glass', desc: 'Light drifting behind frosted glass', for: 'Evening weddings', sw: ['#1A1B2E', '#B9A6E0'] },
    { id: 'gold-foil', name: 'Gold Foil', desc: 'A sheen sweeping the edges', for: 'Deco · anniversaries', sw: ['#14110C', '#C9A24B'] },
    { id: 'confetti', name: 'Confetti', desc: 'Slow falling flecks', for: 'Parties · reveals', sw: ['#FFFEF7', '#D9A89E'] },
    { id: 'candlelight', name: 'Candlelight', desc: 'A gentle warm flame', for: 'Memorials · vigils', sw: ['#FCF4EE', '#C19A4B'] },
    { id: 'pressed-bloom', name: 'Pressed Bloom', desc: 'A swaying pressed flower', for: 'Garden · baby · bridal', sw: ['#FDFAF0', '#B7A4D0'] },
    { id: 'vinyl', name: 'Vinyl', desc: 'A spinning record', for: 'Milestone birthdays · music', sw: ['#FFFEF7', '#5C6B3F'] },
  ];
  const PREMIUM_THEMES = new Set(['deco-gilt', 'midnight', 'tide-coast', 'provence', 'botanical', 'gilded-noir', 'blush-atelier', 'sage-marble', 'terracotta-sun', 'ink-botanical', 'champagne-deco', 'moss-velvet', 'coral-sea', 'plum-romance', 'golden-hour']);

  /* ── Tiny UI atoms ── */
  function Glyph({ size = 26 }) {
    return h('svg', { width: size, height: size * 0.42, viewBox: '0 0 100 42', 'aria-hidden': true },
      h('g', { fill: 'none', stroke: C.olive, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M2 21 C 30 21 64 21 96 21' }),
        [0.34, 0.54, 0.74].map((t, i) => h('g', { key: i }, h('path', { d: `M${2 + t * 94} 21 q -7 -8 -15 -9` }), h('path', { d: `M${2 + t * 94} 21 q -7 8 -15 9` }))),
        h('circle', { cx: 96, cy: 21, r: 2, fill: C.gold, stroke: 'none' })));
  }
  function GLabel({ children, style }) {
    return h('div', { style: Object.assign({ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, margin: '0 0 9px' }, style) }, children);
  }
  function Chip({ active, premium, onClick, title, children }) {
    return h('button', { onClick, title, style: {
      padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
      border: '1px solid ' + (active ? (premium ? C.gold : C.olive) : C.line),
      background: active ? (premium ? C.gold : C.olive) : C.cream,
      color: active ? (premium ? '#241a08' : C.cream) : (premium ? C.goldInk : C.inkSoft),
      transition: 'all .12s', textTransform: 'capitalize',
    } }, children);
  }

  /* ════════════════════ TOPBAR ════════════════════ */
  function Topbar({ device, setDevice, editMode, setEditMode, undo, redo, canUndo, canRedo, premium, onUpgrade, onPublish, saved, onCmd, onDecor, onStore, onCoHost, onProfile, onProgress, progress }) {
    const seg = (val, label) => h('button', { onClick: () => setDevice(val), style: { padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: device === val ? C.cream : 'transparent', color: device === val ? C.ink : C.muted, boxShadow: device === val ? '0 1px 3px rgba(40,28,12,0.12)' : 'none' } }, label);
    const eseg = (val, label) => h('button', { onClick: () => setEditMode(val), title: val ? 'Edit text, photos & order right on the canvas' : 'Preview the live site', style: { padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: editMode === val ? C.cream : 'transparent', color: editMode === val ? C.ink : C.muted, boxShadow: editMode === val ? '0 1px 3px rgba(40,28,12,0.12)' : 'none' } }, label);
    const tbtn = (label, onClick, extra) => h('button', { onClick, style: Object.assign({ padding: '7px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: '1px solid ' + C.line, background: C.cream, color: C.inkSoft, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }, extra || {}) }, label);
    const hbtn = (label, onClick, enabled, title) => h('button', { onClick: enabled ? onClick : undefined, title, disabled: !enabled, style: { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.line, background: C.cream, color: enabled ? C.inkSoft : C.faint, cursor: enabled ? 'pointer' : 'default', fontSize: 14, display: 'grid', placeItems: 'center', opacity: enabled ? 1 : 0.5 } }, label);
    return h('header', { style: { gridArea: 'top', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: C.cream, borderBottom: '1px solid ' + C.line, zIndex: 20 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 } },
        h('span', { style: { fontSize: 12, color: C.muted, cursor: 'pointer', whiteSpace: 'nowrap' } }, '‹ Dashboard'),
        h('div', { style: { width: 1, height: 22, background: C.line } }),
        h(Glyph, { size: 26 }),
        h('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 } },
          h('span', { style: { fontFamily: FONT_D, fontStyle: 'italic', fontSize: 16, color: C.ink } }, 'Mira & Jun'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 } },
            h('span', { style: { fontFamily: FONT_M, fontSize: 8.5, letterSpacing: '0.08em', color: C.faint, textTransform: 'uppercase' } }, 'pearloom.com/wedding'),
            h('button', { onClick: onProgress, title: 'Ready to publish', style: { display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 } },
              h('span', { style: { width: 50, height: 4, borderRadius: 99, background: C.line, overflow: 'hidden', display: 'inline-block' } }, h('span', { style: { display: 'block', height: '100%', width: progress + '%', background: C.olive } })),
              h('span', { style: { fontSize: 9, fontWeight: 700, color: C.olive } }, progress + '%'))))),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, background: C.studio, borderRadius: 9, padding: 3 } }, eseg(true, 'Editing'), eseg(false, 'Preview')),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, background: C.studio, borderRadius: 9, padding: 3 } }, seg('desktop', 'Desktop'), seg('tablet', 'Tablet'), seg('mobile', 'Mobile'))),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } }, hbtn('↶', undo, canUndo, 'Undo (⌘Z)'), hbtn('↷', redo, canRedo, 'Redo (⇧⌘Z)')),
        h('span', { style: { fontSize: 11.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, marginRight: 1 } }, h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: saved ? C.olive : C.gold } }), saved ? 'Saved' : 'Saving…'),
        tbtn(h(React.Fragment, null, '✦ Ask Pear ', h('kbd', { style: { fontFamily: FONT_M, fontSize: 9, background: C.studio, borderRadius: 4, padding: '1px 4px', color: C.muted } }, '⌘K')), onCmd, { background: '#fff', color: C.ink }),
        (function () { const av = (init, grad, ring, active) => h('span', { style: { position: 'relative', width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10.5, fontWeight: 700, fontFamily: FONT_D, background: grad, boxShadow: '0 0 0 2px ' + C.cream + ', 0 0 0 3px ' + ring } }, init, active && h('span', { style: { position: 'absolute', right: -1, bottom: -1, width: 8, height: 8, borderRadius: '50%', background: '#4B9E6A', boxShadow: '0 0 0 1.5px ' + C.cream } })); return h('button', { onClick: onCoHost, title: 'Jun is here \u00b7 co-hosts', style: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', marginRight: 2 } }, av('SB', 'linear-gradient(135deg,#8B9C5A,#5C6B3F)', 'rgba(92,107,63,0.25)', false), h('span', { style: { marginLeft: -7, display: 'inline-flex' } }, av('J', 'linear-gradient(135deg,#E6C877,#C19A4B)', 'rgba(193,154,75,0.3)', true))); })(),
        tbtn('Decor', onDecor), tbtn('Theme', onStore),
        h('button', { onClick: onUpgrade, style: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: '1px solid ' + (premium ? C.gold : 'rgba(193,154,75,0.5)'), background: premium ? C.gold : C.goldSoft, color: premium ? '#241a08' : C.goldInk } }, '✦ ', premium ? 'Atelier' : 'Upgrade'),
        h('button', { onClick: onPublish, style: { padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, border: 'none', background: C.olive, color: C.cream } }, 'Publish'),
        h('button', { onClick: onProfile, title: 'Account', style: { width: 34, height: 34, borderRadius: '50%', border: '1px solid ' + C.line, background: C.olive, color: C.cream, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: FONT_D, flexShrink: 0 } }, 'SB')));
  }

  /* ════════════════════ LEFT — SECTION RAIL ════════════════════ */
  function SectionRail({ selId, onSelect, hidden, toggleHidden, onCoHost, onTool, onAdd, order, onReorder }) {
    const dragRef = useRef(null);
    const [overId, setOverId] = useState(null);
    const reorder = (from, to) => { if (!from || from === to) return; const cur = order.filter((x) => x !== from); const ti = cur.indexOf(to); cur.splice(ti < 0 ? cur.length : ti, 0, from); onReorder(cur); };
    const rows = (order && order.length ? order : DEFAULT_ORDER);
    return h('aside', { className: 'ed-scroll', style: { gridArea: 'left', background: C.cream, borderRight: '1px solid ' + C.line, overflowY: 'auto', padding: '16px 12px' } },
      h(GLabel, { style: { padding: '0 6px' } }, 'Sections'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
        rows.map((id) => {
          const s = SEC_MAP[id]; if (!s) return null;
          const on = selId === id; const off = hidden[id]; const isOver = overId === id;
          const shadows = []; if (on) shadows.push('inset 2px 0 0 ' + C.olive); if (isOver) shadows.push('inset 0 2px 0 ' + C.gold);
          return h('div', { key: id, draggable: true,
            onDragStart: (e) => { try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); } catch (_) { /* */ } dragRef.current = id; },
            onDragOver: (e) => { e.preventDefault(); if (overId !== id) setOverId(id); },
            onDragLeave: () => { if (overId === id) setOverId(null); },
            onDrop: (e) => { e.preventDefault(); reorder(dragRef.current, id); setOverId(null); dragRef.current = null; },
            onDragEnd: () => { setOverId(null); dragRef.current = null; },
            onClick: () => onSelect(id), style: {
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 9px', borderRadius: 9, cursor: 'pointer',
            background: on ? 'rgba(92,107,63,0.12)' : 'transparent',
            boxShadow: shadows.length ? shadows.join(', ') : 'none', opacity: off ? 0.5 : 1, transition: 'background .12s, box-shadow .1s',
          } },
            h('span', { style: { color: C.faint, fontSize: 13, cursor: 'grab', letterSpacing: '-2px' } }, '⠿'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 13, fontWeight: on ? 700 : 600, color: on ? C.olive : C.ink } }, s.name),
              h('div', { style: { fontSize: 10.5, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, s.note)),
            h('button', { onClick: (e) => { e.stopPropagation(); toggleHidden(id); }, title: off ? 'Hidden — show' : 'Hide section', style: { border: 'none', background: 'transparent', cursor: 'pointer', color: off ? C.faint : C.muted, fontSize: 13, padding: 2 } }, off ? '◌' : '◉'));
        })),
      h('button', { onClick: onAdd, style: { marginTop: 12, width: '100%', padding: '11px', borderRadius: 9, border: '1.5px dashed ' + C.line, background: 'transparent', color: C.olive, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, '+ Add section'),
      h(GLabel, { style: { padding: '0 6px', marginTop: 24 } }, 'Tools'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 1 } },
        TOOLS.map((t) => h('div', { key: t.id, onClick: () => (t.id === 'cohosts' ? onCoHost() : onTool && onTool(t.id)), style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', borderRadius: 9, cursor: 'pointer' }, onMouseEnter: (e) => e.currentTarget.style.background = C.page, onMouseLeave: (e) => e.currentTarget.style.background = 'transparent' },
          h('span', { style: { width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center', background: C.page, color: C.olive, fontFamily: FONT_M, fontSize: 11, fontWeight: 700 } }, t.g),
          h('div', { style: { minWidth: 0 } }, h('div', { style: { fontSize: 12.5, fontWeight: 600, color: C.ink } }, t.name), h('div', { style: { fontSize: 10, color: C.faint } }, t.note))))),
    );
  }

  /* ════════════════════ CENTER — CANVAS ════════════════════ */
  function Canvas({ device, iframeRef, onLoad }) {
    const d = DEVICES[device] || DEVICES.desktop;
    const framed = device !== 'desktop';
    const phone = device === 'mobile';
    return h('main', { style: { gridArea: 'canvas', background: C.studio, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: framed ? 'flex-start' : 'stretch', padding: framed ? '12px 0 60px' : '0' } },
      framed && h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT_M, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, padding: '4px 0 9px' } },
        h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: C.olive } }), d.label + ' · ' + d.w + ' px'),
      h('div', { className: 'ed-canvas-frame', style: {
        width: framed ? d.w : '100%', maxWidth: '100%',
        height: framed ? 'calc(100vh - 56px - 96px)' : '100%', flex: framed ? 'none' : 1,
        borderRadius: phone ? 30 : (framed ? 14 : 0), overflow: 'hidden', background: '#fff',
        border: phone ? '7px solid #1d1b16' : (framed ? '1px solid ' + C.line : 'none'),
        boxShadow: framed ? '0 24px 60px -18px rgba(40,28,12,0.45)' : 'none',
      } },
        h('iframe', { ref: iframeRef, onLoad, src: '../site-renderer/index.html?embed=1', title: 'Site canvas', style: { width: '100%', height: '100%', border: 'none', display: 'block' } })),
    );
  }

  /* ════════════════════ RIGHT — INSPECTOR ════════════════════ */
  function Inspector({ tab, setTab, st, set, selId, content, updateContent, onDraft, drafting, applied, onPicks, onCmd }) {
    const tabBtn = (id, label) => h('button', { onClick: () => setTab(id), style: {
      flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
      background: 'transparent', color: tab === id ? C.ink : C.muted,
      borderBottom: '2px solid ' + (tab === id ? C.olive : 'transparent'),
      fontFamily: 'inherit',
    } }, label);
    return h('aside', { style: { gridArea: 'right', background: C.cream, borderLeft: '1px solid ' + C.line, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      h('div', { style: { display: 'flex', borderBottom: '1px solid ' + C.line, flexShrink: 0 } }, tabBtn('content', 'Content'), tabBtn('design', 'Design'), tabBtn('motion', '✦ Motion')),
      h('div', { className: 'ed-scroll', style: { flex: 1, overflowY: 'auto', padding: '18px 16px 28px' } },
        tab === 'content' ? h(ContentTab, { selId, st, set, content, updateContent, onDraft, drafting, onPicks, onCmd })
          : tab === 'design' ? h(DesignTab, { st, set, applied })
            : h(MotionTab, { st, set })),
    );
  }

  function ContentTab({ selId, st, set, content, updateContent, onDraft, drafting, onPicks, onCmd }) {
    const section = SECTIONS.find((s) => s.id === selId);
    if (!selId || !section) {
      return h('div', { style: { textAlign: 'center', padding: '40px 16px', color: C.muted } },
        h('div', { style: { fontSize: 30, marginBottom: 10 } }, '◷'),
        h('div', { style: { fontFamily: FONT_D, fontSize: 18, color: C.ink, marginBottom: 6 } }, 'Pick a section'),
        h('div', { style: { fontSize: 12.5, lineHeight: 1.5 } }, 'Click any section on the canvas, or in the list on the left, to edit its content.'));
    }
    const field = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.ink, fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' };
    const lab = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: 5, display: 'block' };
    const PK = { details: 'details', gallery: 'gallery' };
    const PTITLE = { details: 'Fill in the details', gallery: 'Arrange the gallery' };
    const pkind = PK[selId];
    const c = content || {};
    const sfield = Object.assign({}, field, { marginBottom: 0, padding: '7px 9px', fontSize: 12.5 });
    const miniBtn = { width: 24, height: 24, borderRadius: 6, border: '1px solid ' + C.line, background: C.cream, color: C.inkSoft, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0, flexShrink: 0 };
    const move = (arr, i, d) => { const n = arr.slice(); const j = i + d; if (j < 0 || j >= n.length) return null; const t = n[i]; n[i] = n[j]; n[j] = t; return n; };
    const rowTools = (arr, i, key) => h('div', { style: { display: 'flex', gap: 4, marginLeft: 'auto' } },
      h('button', { title: 'Move up', onClick: () => { const n = move(arr, i, -1); if (n) updateContent({ [key]: n }); }, style: miniBtn }, '\u2191'),
      h('button', { title: 'Move down', onClick: () => { const n = move(arr, i, 1); if (n) updateContent({ [key]: n }); }, style: miniBtn }, '\u2193'),
      h('button', { title: 'Remove', onClick: () => updateContent({ [key]: arr.filter((_, k) => k !== i) }), style: Object.assign({}, miniBtn, { color: '#B5524A' }) }, '\u2715'));
    const addBtn = (label, onClick) => h('button', { onClick, style: { width: '100%', padding: '9px', borderRadius: 9, border: '1px dashed ' + C.line, background: 'transparent', color: C.olive, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 } }, '+ ' + label);
    const cardWrap = (kids) => h('div', { style: { border: '1px solid ' + C.lineSoft, borderRadius: 10, padding: 10, marginBottom: 8, background: C.card } }, kids);
    const draftBtn = (kind, label) => h('button', { onClick: () => onDraft && onDraft(kind), disabled: !!drafting, title: 'Draft with Pear (AI)', style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '8px 13px', borderRadius: 8, border: '1px solid ' + C.gold, background: C.goldSoft, color: C.goldInk, fontSize: 11.5, fontWeight: 700, cursor: drafting ? 'default' : 'pointer', opacity: (drafting && drafting !== kind) ? 0.5 : 1 } }, drafting === kind ? '✦ Drafting…' : ('✦ ' + label));
    const draftNote = (drafting === '__noapi' || drafting === '__err') ? h('div', { style: { fontSize: 11.5, color: C.plum, marginBottom: 12, lineHeight: 1.4 } }, drafting === '__noapi' ? 'Pear drafting runs in the live preview — open this site in Preview to use it.' : 'Pear had trouble drafting that — try again.') : null;
    return h('div', { className: 'ed-pop' },
      h('div', { style: { fontFamily: FONT_D, fontSize: 21, color: C.ink, marginBottom: 3 } }, section.name),
      h('div', { style: { fontSize: 12, color: C.muted, marginBottom: 18 } }, section.note),
      selId === 'top' && h('div', null,
        h('label', { style: lab }, 'Names'),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('input', { value: (c.names || ['', ''])[0] || '', onChange: (e) => { const n = (c.names || ['', '']).slice(); n[0] = e.target.value; updateContent({ names: n }); }, style: field }),
          (c.coupleType || 'couple') !== 'solo' && h('input', { value: (c.names || ['', ''])[1] || '', onChange: (e) => { const n = (c.names || ['', '']).slice(); n[1] = e.target.value; updateContent({ names: n }); }, style: field })),
        h('label', { style: lab }, 'Celebrating'),
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } }, [['couple', 'A couple'], ['solo', 'One person']].map(([v, l]) => h(Chip, { key: v, active: (c.coupleType || 'couple') === v, onClick: () => updateContent({ coupleType: v }) }, l))),
        h('label', { style: lab }, 'Date shown'),
        h('input', { value: c.date || '', onChange: (e) => updateContent({ date: e.target.value }), style: field }),
        h('label', { style: lab }, 'Date · for the countdown'),
        h('input', { type: 'date', value: (c.dateISO || '').slice(0, 10), onChange: (e) => updateContent({ dateISO: e.target.value }), style: field }),
        h('label', { style: lab }, 'Place'),
        h('input', { value: c.place || '', onChange: (e) => updateContent({ place: e.target.value }), style: field }),
        h('label', { style: lab }, 'Tagline'),
        h('input', { value: c.tagline || '', onChange: (e) => updateContent({ tagline: e.target.value }), style: field }),
        h(GLabel, { style: { marginTop: 6 } }, 'Hero layout'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, HEROES.map((v) => h(Chip, { key: v, active: st.hero === v, onClick: () => set('hero', v) }, v)))),
      selId === 'story' && (() => { const s = c.story || {}; const us = (p) => updateContent({ story: Object.assign({}, s, p) });
        return h('div', null,
          h('label', { style: lab }, 'Eyebrow'), h('input', { value: s.eyebrow || '', onChange: (e) => us({ eyebrow: e.target.value }), style: field }),
          h('label', { style: lab }, 'Title'),
          h('div', { style: { display: 'flex', gap: 8 } }, h('input', { value: s.title || '', onChange: (e) => us({ title: e.target.value }), style: field }), h('input', { value: s.italic || '', placeholder: 'italic', onChange: (e) => us({ italic: e.target.value }), style: field })),
          h('label', { style: lab }, 'Story'),
          h('textarea', { rows: 6, value: s.body || '', onChange: (e) => us({ body: e.target.value }), style: Object.assign({}, field, { resize: 'vertical', lineHeight: 1.5 }) }),
          h('button', { onClick: () => onPicks('story'), style: { display: 'none' } }, ''),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, draftBtn('story', 'Draft with Pear'), draftBtn('warm', 'Polish tone')), draftNote,
          h(GLabel, { style: { marginTop: 6 } }, 'Story layout'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, STORIES.map(([v, l]) => h(Chip, { key: v, active: st.story === v, onClick: () => set('story', v) }, l)))); })(),

      selId === 'schedule' && (() => { const rows = c.schedule || [];
        return h('div', null,
          h('label', { style: lab }, 'Timeline'),
          draftBtn('schedule', 'Draft the timeline'), draftNote,
          rows.map((r, i) => h('div', { key: i }, cardWrap([
            h('div', { key: 'h', style: { display: 'flex', alignItems: 'center', marginBottom: 7 } }, h('span', { style: { fontSize: 11, fontWeight: 700, color: C.faint } }, 'Event ' + (i + 1)), rowTools(rows, i, 'schedule')),
            h('div', { key: 'b', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('input', { value: r.t || '', placeholder: 'Time', onChange: (e) => { const n = rows.slice(); n[i] = Object.assign({}, r, { t: e.target.value }); updateContent({ schedule: n }); }, style: sfield }),
              h('input', { value: r.l || '', placeholder: 'Title', onChange: (e) => { const n = rows.slice(); n[i] = Object.assign({}, r, { l: e.target.value }); updateContent({ schedule: n }); }, style: sfield }),
              h('input', { value: r.s || '', placeholder: 'Detail', onChange: (e) => { const n = rows.slice(); n[i] = Object.assign({}, r, { s: e.target.value }); updateContent({ schedule: n }); }, style: sfield }))]))),
          addBtn('Add event', () => updateContent({ schedule: rows.concat([{ t: '', l: 'New moment', s: '' }]) }))); })(),

      selId === 'faq' && (() => { const qa = c.faq || [];
        return h('div', null,
          h('label', { style: lab }, 'Questions'),
          draftBtn('faq', 'Draft the FAQ'), draftNote,
          qa.map((it, i) => h('div', { key: i }, cardWrap([
            h('div', { key: 'h', style: { display: 'flex', alignItems: 'center', marginBottom: 7 } }, h('span', { style: { fontSize: 11, fontWeight: 700, color: C.faint } }, 'Q' + (i + 1)), rowTools(qa, i, 'faq')),
            h('input', { key: 'q', value: it.q || '', placeholder: 'Question', onChange: (e) => { const n = qa.slice(); n[i] = Object.assign({}, it, { q: e.target.value }); updateContent({ faq: n }); }, style: Object.assign({}, sfield, { marginBottom: 6 }) }),
            h('textarea', { key: 'a', rows: 3, value: it.a || '', placeholder: 'Answer', onChange: (e) => { const n = qa.slice(); n[i] = Object.assign({}, it, { a: e.target.value }); updateContent({ faq: n }); }, style: Object.assign({}, sfield, { resize: 'vertical', lineHeight: 1.5 }) })]))),
          addBtn('Add question', () => updateContent({ faq: qa.concat([{ q: 'New question?', a: '' }]) }))); })(),

      selId === 'registry' && (() => { const stores = c.registry || [];
        return h('div', null,
          draftBtn('registry', 'Draft with Pear'), draftNote,
          h('label', { style: lab }, 'Intro'),
          h('textarea', { rows: 3, value: c.registryBody || '', onChange: (e) => updateContent({ registryBody: e.target.value }), style: Object.assign({}, field, { resize: 'vertical', lineHeight: 1.5 }) }),
          h('label', { style: lab }, 'Registry links'),
          stores.map((s, i) => h('div', { key: i, style: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 } },
            h('input', { value: s || '', onChange: (e) => { const n = stores.slice(); n[i] = e.target.value; updateContent({ registry: n }); }, style: sfield }),
            rowTools(stores, i, 'registry'))),
          addBtn('Add link', () => updateContent({ registry: stores.concat(['New registry']) }))); })(),

      selId === 'travel' && (() => { const stays = c.travel || [];
        return h('div', null,
          draftBtn('travel', stays.length ? 'Re-suggest stays' : ('Suggest stays near ' + (c.place ? c.place.split(',')[0] : 'the venue'))), draftNote,
          stays.length === 0 && drafting !== 'travel' && h('div', { style: { fontSize: 12.5, color: C.muted, lineHeight: 1.5, background: C.card, border: '1px solid ' + C.lineSoft, borderRadius: 10, padding: 12, marginBottom: 10 } }, 'Empty for now — Pear suggests places to stay near your venue automatically, or add your own below.'),
          stays.map((r, i) => h('div', { key: i }, cardWrap([
            h('div', { key: 'h', style: { display: 'flex', alignItems: 'center', marginBottom: 7 } }, h('span', { style: { fontSize: 11, fontWeight: 700, color: C.faint } }, 'Stay ' + (i + 1)), rowTools(stays, i, 'travel')),
            h('div', { key: 'b', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('input', { value: r.name || '', placeholder: 'Name', onChange: (e) => { const n = stays.slice(); n[i] = Object.assign({}, r, { name: e.target.value }); updateContent({ travel: n }); }, style: sfield }),
              h('input', { value: r.area || '', placeholder: 'Area / distance', onChange: (e) => { const n = stays.slice(); n[i] = Object.assign({}, r, { area: e.target.value }); updateContent({ travel: n }); }, style: sfield }),
              h('textarea', { rows: 2, value: r.blurb || '', placeholder: 'One-line description', onChange: (e) => { const n = stays.slice(); n[i] = Object.assign({}, r, { blurb: e.target.value }); updateContent({ travel: n }); }, style: Object.assign({}, sfield, { resize: 'vertical', lineHeight: 1.45 }) }),
              h('input', { value: r.link || '', placeholder: 'Link (https://…)', onChange: (e) => { const n = stays.slice(); n[i] = Object.assign({}, r, { link: e.target.value }); updateContent({ travel: n }); }, style: sfield }))]))),
          addBtn('Add a stay', () => updateContent({ travel: stays.concat([{ name: 'New stay', area: '', blurb: '', link: '' }]) }))); })(),

      ['details', 'gallery', 'rsvp', 'countdown', 'map'].includes(selId) && h('div', null,
        selId === 'map' && h('div', { style: { fontSize: 13, color: C.inkSoft, lineHeight: 1.6, background: C.card, border: '1px solid ' + C.lineSoft, borderRadius: 10, padding: 14, marginBottom: 10 } }, h('span', { style: { fontWeight: 700 } }, '◉ Pinned to your venue. '), 'The map and “Get directions” use the place set in the ', h('b', null, 'Hero'), ' section.'),
        selId === 'countdown' && h('div', { style: { fontSize: 13, color: C.inkSoft, lineHeight: 1.6, background: C.card, border: '1px solid ' + C.lineSoft, borderRadius: 10, padding: 14, marginBottom: 10 } }, h('span', { style: { fontWeight: 700 } }, '⏱ Counts to your date. '), 'Set the date in the ', h('b', null, 'Hero'), ' section.'),
        pkind && h('div', { className: 'ed-pop', style: { borderRadius: 12, overflow: 'hidden', border: '1px solid ' + C.gold, marginBottom: 12 } },
          h('div', { style: { background: 'linear-gradient(135deg, rgba(193,154,75,0.16), rgba(193,154,75,0.06))', padding: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 } }, h(Glyph, { size: 22 }), h('span', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.goldInk } }, 'Pear can populate this')),
            h('div', { style: { fontFamily: FONT_D, fontSize: 16, color: C.ink, marginBottom: 4 } }, PTITLE[selId]),
            h('div', { style: { fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 11 } }, 'Pear returns rich, ready-to-place cards — not just text. Review and Add what fits.'),
            h('button', { onClick: () => onPicks(pkind), style: { padding: '9px 16px', borderRadius: 8, border: 'none', background: C.olive, color: C.cream, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, '✦ Show me'))),
        h('div', { style: { fontSize: 13, color: C.inkSoft, lineHeight: 1.6, background: C.card, border: '1px solid ' + C.lineSoft, borderRadius: 10, padding: 14 } },
          h('span', { style: { fontWeight: 700 } }, '✎ Edit on the canvas. '), 'Click any text in this section to rewrite it inline. Card styling follows the ', h('b', null, 'Design'), ' tab.'),
        h('button', { onClick: onCmd, style: { marginTop: 10, width: '100%', padding: '10px', borderRadius: 9, border: '1px dashed ' + C.gold, background: C.goldSoft, color: C.goldInk, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, '✦ Ask Pear to draft this section')));
  }

  function LThumb({ kind, id, label, active, onClick }) {
    const links = (w) => h('span', { style: { display: 'flex', gap: 3 } }, [0, 1, 2].map((i) => h('span', { key: i, style: { width: w || 7, height: 3, borderRadius: 2, background: C.faint } })));
    const dot = h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: C.olive } });
    const pill = h('span', { style: { width: 12, height: 6, borderRadius: 3, background: C.olive } });
    let dia;
    if (kind === 'nav') {
      if (id === 'centered') dia = h('div', { style: { position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } }, dot, links(), h('span', { style: { position: 'absolute', right: 0, top: 0 } }, pill));
      else if (id === 'split') dia = h('div', { style: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, dot, links(), pill);
      else if (id === 'minimal') dia = links();
      else dia = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } }, h('span', { style: { width: 34, height: 6, borderRadius: 2, background: C.ink } }), links());
    } else {
      if (id === 'signature') dia = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 } }, h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: C.olive } }), h('span', { style: { width: 24, height: 4, borderRadius: 2, background: C.ink } }), links(5));
      else if (id === 'columns') dia = h('div', { style: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: C.olive } }), links(5));
      else dia = h('span', { style: { width: 36, height: 3, borderRadius: 2, background: C.faint } });
    }
    return h('button', { onClick, style: { display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (active ? C.olive : C.line), background: active ? 'rgba(92,107,63,0.08)' : C.card } },
      h('div', { style: { height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' } }, dia),
      h('span', { style: { fontSize: 10.5, fontWeight: active ? 700 : 600, color: active ? C.olive : C.inkSoft, textAlign: 'center' } }, label));
  }

  function DesignTab({ st, set, applied }) {
    const themeDefaultTexture = window.PL_getTheme(st.theme).texture;
    const curTexture = st.texture || themeDefaultTexture;
    return h('div', { className: 'ed-pop' },
      h('button', { onClick: () => set('_store', true), style: { width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800, marginBottom: applied ? 6 : 18, color: '#241a08', background: 'linear-gradient(135deg,#E6C877,#C19A4B)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 } }, '✦ Browse the Theme Store'),
      applied && h('div', { style: { fontSize: 11, color: C.goldInk, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' } }, 'Wearing a store pack — pick a base theme below to reset.'),
      h(GLabel, null, 'Theme'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 20 } },
        window.PL_THEMES.map((t) => {
          const active = st.theme === t.id; const prem = PREMIUM_THEMES.has(t.id);
          return h('button', { key: t.id, onClick: () => set('theme', t.id), title: t.blurb, style: {
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
            border: '1px solid ' + (active ? C.olive : C.line), background: active ? 'rgba(92,107,63,0.1)' : C.card, position: 'relative',
          } },
            h('span', { style: { display: 'flex', flexShrink: 0, borderRadius: 5, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' } }, t.swatches.slice(0, 4).map((c, i) => h('span', { key: i, style: { width: 8, height: 19, background: c } }))),
            h('span', { style: { fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? C.olive : C.inkSoft, lineHeight: 1.15 } }, t.name),
            prem && h('span', { style: { position: 'absolute', top: 5, right: 6, fontSize: 9, color: C.gold } }, '✦'));
        })),
      h(GLabel, null, 'Paper · texture'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 } }, TEXTURES.map(([v, l]) => h(Chip, { key: v, active: curTexture === v, onClick: () => set('texture', v) }, l))),
      h(GLabel, null, 'Component kit'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } }, STATIC_KITS.map((k) => h(Chip, { key: k, active: st.kit === k, onClick: () => set('kit', k) }, kitLabel(k)))),
      h('button', { onClick: () => set('_tab', 'motion'), style: { width: '100%', padding: '10px', borderRadius: 9, border: '1px solid ' + C.gold, background: C.goldSoft, color: C.goldInk, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 20 } }, '✦ Browse animated kits — Atelier'),
      h(GLabel, null, 'Divider'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 } }, DIVIDERS.map(([v, l]) => h(Chip, { key: v, active: (st.divider || 'auto') === v, onClick: () => set('divider', v) }, l))),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, alignItems: 'center' } }, h('span', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gold, marginRight: 2 } }, '✦ Animated'), DIVIDERS_ANIM.map(([v, l]) => h(Chip, { key: v, active: st.divider === v, premium: true, title: 'Atelier motion divider', onClick: () => set('divider', v) }, l))),
      h(GLabel, null, 'Motif'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 } }, MOTIFS.map(([v, l]) => h(Chip, { key: v, active: (st.motif || 'auto') === v, onClick: () => set('motif', v) }, l))),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, alignItems: 'center' } }, h('span', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gold, marginRight: 2 } }, '✦ Animated'), MOTIFS_ANIM.map(([v, l]) => h(Chip, { key: v, active: st.motif === v, premium: true, title: 'Atelier motion motif', onClick: () => set('motif', v) }, l))),
      h(GLabel, null, 'Density'),
      h('div', { style: { display: 'flex', gap: 6, marginBottom: 22 } }, DENSITIES.map((d) => h(Chip, { key: d, active: st.density === d, onClick: () => set('density', d) }, d))),
      h(GLabel, null, 'Navigation · desktop'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 } }, [['centered', 'Centered'], ['split', 'Split'], ['minimal', 'Minimal'], ['serif', 'Serif block']].map(([id, l]) => h(LThumb, { key: id, kind: 'nav', id, label: l, active: (st.nav || 'centered') === id, onClick: () => set('nav', id) }))),
      h(GLabel, null, 'Navigation · mobile'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 } }, [['overlay', 'Overlay'], ['slide', 'Slide-in'], ['sheet', 'Bottom sheet'], ['pill', 'Pill']].map(([id, l]) => h(Chip, { key: id, active: (st.navm || 'overlay') === id, onClick: () => set('navm', id) }, l))),
      h(GLabel, null, 'Footer'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 } }, [['signature', 'Signature'], ['columns', 'Columns'], ['minimal', 'Minimal']].map(([id, l]) => h(LThumb, { key: id, kind: 'footer', id, label: l, active: (st.footer || 'signature') === id, onClick: () => set('footer', id) }))),
      h(GLabel, null, 'Decor'),
      h('div', { style: { fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.4 } }, 'Drag a flourish onto any section.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } }, DECOR.map((it) => { const locked = it.prem && !st.premium; return h('div', { key: it.id, title: it.name, style: { position: 'relative', aspectRatio: '1', borderRadius: 10, border: '1px solid ' + C.line, background: C.card, display: 'grid', placeItems: 'center', cursor: 'grab' } }, decorSvg(it), locked && h('span', { style: { position: 'absolute', top: 4, right: 5, fontSize: 9, color: C.gold } }, '✦')); })));
  }

  function MotionTab({ st, set }) {
    const premium = st.premium;
    return h('div', { className: 'ed-pop' },
      /* Hero upsell banner */
      h('div', { style: { borderRadius: 14, overflow: 'hidden', marginBottom: 18, background: 'linear-gradient(135deg, #2A2416, #4A3A1C)', padding: '18px 16px', position: 'relative' } },
        h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 30%, rgba(255,240,200,0.18) 47%, transparent 64%)', backgroundSize: '250% 100%', animation: 'ed-sheen 4.5s ease-in-out infinite', pointerEvents: 'none' } }),
        h('div', { style: { position: 'relative' } },
          h('div', { style: { fontFamily: FONT_M, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gold, marginBottom: 7 } }, '✦ Atelier · Motion'),
          h('div', { style: { fontFamily: FONT_D, fontSize: 21, color: '#FBF1DC', lineHeight: 1.1, marginBottom: 6 } }, premium ? 'Your site is alive.' : 'Bring your site to life.'),
          h('div', { style: { fontSize: 12, color: 'rgba(243,236,217,0.75)', lineHeight: 1.5, marginBottom: 14 } }, premium ? 'Every motion kit is unlocked for this site. Tap one to apply it.' : 'Eight living finishes — neon, foil, candlelight and more. One unlock, this site forever.'),
          h('button', { onClick: () => set('premium', !premium), style: {
            padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
            background: premium ? 'rgba(251,241,220,0.16)' : C.gold, color: premium ? '#FBF1DC' : '#241a08',
          } }, premium ? 'Unlocked ✓ · Manage' : 'Unlock Atelier — $19'))),
      /* Motion kit cards */
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
        MOTION_KITS.map((k) => {
          const active = st.kit === k.id;
          return h('div', { key: k.id, style: {
            display: 'flex', alignItems: 'center', gap: 11, padding: 10, borderRadius: 11,
            border: '1px solid ' + (active ? C.gold : C.line), background: active ? C.goldSoft : C.card,
          } },
            h('span', { style: { width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,' + k.sw[0] + ',' + k.sw[1] + ')', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)', position: 'relative' } },
              !premium && h('span', { style: { position: 'absolute', right: -3, bottom: -3, width: 15, height: 15, borderRadius: '50%', background: C.gold, color: '#241a08', fontSize: 8, display: 'grid', placeItems: 'center', fontWeight: 800 } }, '✦')),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: C.ink } }, k.name),
              h('div', { style: { fontSize: 11, color: C.muted, lineHeight: 1.35 } }, k.desc),
              h('div', { style: { fontFamily: FONT_M, fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginTop: 3 } }, k.for)),
            h('button', { onClick: () => set('kit', k.id), style: {
              padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, flexShrink: 0,
              border: '1px solid ' + (active ? C.gold : C.line), background: active ? C.gold : 'transparent', color: active ? '#241a08' : C.olive,
            } }, active ? (premium ? 'On' : 'Preview') : 'Apply'));
        })),
      !premium && h('div', { style: { fontSize: 11, color: C.goldInk, fontStyle: 'italic', textAlign: 'center', marginTop: 14, lineHeight: 1.5 } }, 'Applying shows the still preview on your canvas. Unlock to set it in motion.'));
  }

  /* ════════════════════ PEAR ASSISTANT ════════════════════ */
  function PearBubble() {
    const [open, setOpen] = useState(false);
    return h('div', { style: { position: 'fixed', left: 20, bottom: 20, zIndex: 60 } },
      open && h('div', { className: 'ed-pop', style: { position: 'absolute', bottom: 58, left: 0, width: 270, background: C.cream, border: '1px solid ' + C.line, borderRadius: 14, boxShadow: '0 18px 44px -16px rgba(40,28,12,0.4)', padding: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } }, h(Glyph, { size: 24 }), h('span', { style: { fontFamily: FONT_D, fontStyle: 'italic', fontSize: 16, color: C.ink } }, 'Pear')),
        h('div', { style: { fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 12 } }, 'Want me to set the tone? I can draft your story, suggest a look, or write your FAQ.'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, ['Draft my story', 'Suggest a look', 'Write the FAQ'].map((c) => h('button', { key: c, style: { padding: '6px 11px', borderRadius: 999, border: '1px solid ' + C.line, background: C.card, color: C.olive, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' } }, c)))),
      h('button', { onClick: () => setOpen(!open), style: { width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer', background: C.olive, boxShadow: '0 10px 26px -8px rgba(40,28,12,0.5)', display: 'grid', placeItems: 'center' } },
        h('svg', { width: 26, height: 26, viewBox: '0 0 100 42', 'aria-hidden': true }, h('g', { fill: 'none', stroke: C.cream, strokeWidth: 2, strokeLinecap: 'round' }, h('path', { d: 'M2 21 C 30 21 64 21 96 21' }), h('circle', { cx: 96, cy: 21, r: 2.4, fill: C.gold, stroke: 'none' })))));
  }

  /* ════════════════════ UPGRADE MODAL ════════════════════ */
  function UpgradeModal({ open, onClose, premium, setPremium }) {
    if (!open) return null;
    const feat = (t) => h('li', { style: { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 9 } }, h('span', { style: { color: C.olive, fontWeight: 800 } }, '✓'), t);
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,14,8,0.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 24 } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { width: '100%', maxWidth: 440, background: C.cream, borderRadius: 18, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)' } },
        h('div', { style: { background: 'linear-gradient(135deg, #2A2416, #4A3A1C)', padding: '26px 26px 22px', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 30%, rgba(255,240,200,0.18) 47%, transparent 64%)', backgroundSize: '250% 100%', animation: 'ed-sheen 4.5s ease-in-out infinite' } }),
          h('div', { style: { position: 'relative' } },
            h('div', { style: { fontFamily: FONT_M, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 } }, '✦ Atelier'),
            h('div', { style: { fontFamily: FONT_D, fontSize: 28, color: '#FBF1DC', lineHeight: 1.05 } }, 'Every finish, in motion.'))),
        h('div', { style: { padding: '22px 26px 26px' } },
          h('ul', { style: { listStyle: 'none', padding: 0, margin: '0 0 20px' } },
            feat('All 8 animated Motion kits — neon, foil, candlelight & more'),
            feat('Premium theme packs (Deco Gilt, Midnight, Tide & Coast)'),
            feat('Every component kit & paper texture'),
            feat('One-time, this celebration — yours forever')),
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 } },
            h('span', { style: { fontFamily: FONT_D, fontSize: 34, color: C.ink, fontWeight: 600 } }, '$19'),
            h('span', { style: { fontSize: 12.5, color: C.muted } }, 'once · per site')),
          h('button', { onClick: () => { setPremium(true); onClose(); }, style: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, background: premium ? C.olive : C.gold, color: premium ? C.cream : '#241a08' } }, premium ? 'Atelier is active ✓' : 'Unlock Atelier'),
          h('button', { onClick: onClose, style: { width: '100%', padding: '11px', marginTop: 8, borderRadius: 10, border: 'none', background: 'transparent', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' } }, 'Maybe later'))));
  }

  /* ════════════════════ THEME STORE ════════════════════
     Curated cross-section of the real catalog (lib/theme-store/packs.ts),
     built with the production mk() factory so palettes/type/radii match
     exactly. Applying a pack writes its full --t-* bag onto the canvas. */
  const F = { cormorant: "'Cormorant Garamond',Georgia,serif", fraunces: "'Fraunces',Georgia,serif", playfair: "'Playfair Display',Georgia,serif", dmserif: "'DM Serif Display',Georgia,serif", marcellus: "'Marcellus',Georgia,serif", cinzel: "'Cinzel',Georgia,serif", italiana: "'Italiana',Georgia,serif", space: "'Space Grotesk',sans-serif", tenor: "'Tenor Sans',sans-serif", inter: "'Inter',sans-serif", dmsans: "'DM Sans',sans-serif", bodoni: "'Bodoni Moda',Georgia,serif", prata: "'Prata',Georgia,serif", jost: "'Jost',sans-serif" };
  const SC = { caveat: "'Caveat',cursive", dancing: "'Dancing Script',cursive" };
  const cm = (a, p, b) => 'color-mix(in oklab, ' + a + ' ' + p + '%, ' + b + ')';
  const EXCL_KITS = new Set([]);
  const EXCL_TEX = new Set(['flecked']);
  const KIT_FALLBACK = {};
  const TEX_FALLBACK = { flecked: 'paper', marble: 'marble', kraft: 'cotton', gilded: 'velvet', canvas: 'cotton' };
  function mk(o) {
    const dark = !!o.dark, paper = o.paper, ink = o.ink, accent = o.accent, gold = o.gold;
    const section = o.section || cm(paper, dark ? 86 : 93, dark ? '#ffffff' : ink);
    const card = o.card || (dark ? cm(paper, 84, '#ffffff') : cm('#ffffff', 70, paper));
    const vars = {
      '--t-paper': paper, '--t-section': section, '--t-card': card, '--t-ink': ink,
      '--t-ink-soft': o.inkSoft || cm(ink, 74, paper), '--t-ink-muted': o.inkMuted || cm(ink, 48, paper),
      '--t-accent': accent, '--t-accent-2': o.accent2 || cm(accent, 62, paper),
      '--t-accent-bg': o.accentBg || cm(accent, dark ? 28 : 16, paper),
      '--t-accent-ink': o.accentInk || (dark ? cm(accent, 78, '#ffffff') : cm(accent, 84, ink)),
      '--t-gold': gold, '--t-line': o.line || cm(ink, dark ? 22 : 16, 'transparent'), '--t-line-soft': cm(ink, dark ? 12 : 8, 'transparent'),
      '--t-rsvp': o.rsvp || (dark ? gold : ink), '--t-rsvp-ink': o.rsvpInk || (dark ? '#1a1a1a' : paper),
      '--t-display': o.display || F.fraunces, '--t-body': o.body || F.inter, '--t-script': o.script || SC.caveat,
      '--t-radius': (o.radius != null ? o.radius : 8) + 'px', '--t-radius-lg': ((o.radius != null ? o.radius : 8) + 8) + 'px',
      '--t-display-wght': o.wght || '600', '--t-hero-scale': String(o.heroScale || 1), '--t-eyebrow-ls': o.ls || '0.18em',
      '--t-shadow': o.shadow || (dark ? '0 16px 40px rgba(0,0,0,0.42)' : '0 10px 26px rgba(40,40,30,0.08)'),
    };
    const price = o.price || 0; const tier = price === 0 ? 'free' : price >= 20 ? 'signature' : 'premium';
    const sw = o.swatches || [accent, dark ? (o.accent2 || gold) : ink, gold, section];
    return { id: o.id, name: o.name, collection: o.collection, blurb: o.blurb, vars, texture: o.texture || 'none', kit: o.kit || 'classic', dark, foil: !!o.foil, swatches: sw, price, tier, rating: o.r || 4.8, sales: o.s || '1.0k', badges: o.badges || {}, exclKit: EXCL_KITS.has(o.kit), exclTex: EXCL_TEX.has(o.texture) };
  }
  const COLLECTIONS = [['all', 'All'], ['med', 'Mediterranean'], ['garden', 'Garden'], ['watercolor', 'Watercolor'], ['modern', 'Modern'], ['evening', 'Evening & Luxe'], ['coastal', 'Coastal'], ['heritage', 'Heritage'], ['celestial', 'Celestial'], ['whimsy', 'Whimsy'], ['prints', 'Prints'], ['seasonal', 'Seasonal']];
  const PACKS = [
    mk({ id: 'first-thread', name: 'First Thread', collection: 'modern', blurb: 'The house colors — cream paper, olive ink, one gold thread. On us.', paper: '#F5EFE2', ink: '#0E0D0B', accent: '#5C6B3F', accent2: '#A4B57A', gold: '#B8935A', motif: 'vine', kit: 'classic', texture: 'paper', section: '#EBE3D2', card: '#FBF7EE', display: F.fraunces, radius: 12, price: 0, swatches: ['#F5EFE2', '#5C6B3F', '#B8935A', '#A4B57A'] }),
    mk({ id: 'pressed-garden', name: 'Pressed Garden', collection: 'garden', blurb: 'Sage leaves pressed between linen pages — herbarium-soft.', paper: '#F7F8F2', ink: '#2A3328', accent: '#6E8A6A', gold: '#B8935A', section: '#FDFAF0', card: '#FFFFFF', accentBg: '#E0DDC9', line: '#D4D8C6', display: F.fraunces, radius: 10, texture: 'paper', motif: 'pressed', kit: 'classic', price: 0, r: 4.9, s: '3.4k' }),
    mk({ id: 'modern-editorial', name: 'Modern Editorial', collection: 'modern', blurb: 'Magazine-clean cream, crisp labels, charcoal ink.', paper: '#F4F3EF', ink: '#1A1A17', accent: '#1A1A17', gold: '#A89578', accent2: '#5A5A55', line: '#D9D6CE', display: F.inter, body: F.inter, radius: 2, wght: '600', ls: '0.04em', texture: 'paper', kit: 'minimal', swatches: ['#F4F3EF', '#1A1A17', '#A89578', '#5A5A55'], price: 0, s: '2.4k' }),
    mk({ id: 'sage-watercolor', name: 'Sage Watercolor', collection: 'watercolor', blurb: 'Soft sage leaves washed across cream — garden-fresh.', paper: '#F5F2E8', ink: '#2A3324', accent: '#7E8F6E', gold: '#B8935A', accent2: '#A8B59A', texture: 'watercolor', motif: 'fern', kit: 'classic', radius: 16, wght: '500', ls: '0.16em', price: 0, s: '5.4k' }),
    mk({ id: 'shell-blush', name: 'Shell Blush', collection: 'coastal', blurb: 'Seafoam wash on sand paper with scallop-shell motifs.', paper: '#F2EDDF', ink: '#1F3833', accent: '#6FA8A0', gold: '#C7A971', motif: 'shell', kit: 'classic', texture: 'cotton', display: F.fraunces, wght: '500', radius: 16, price: 0 }),
    mk({ id: 'cinque-terre', name: 'Cinque Terre', collection: 'med', blurb: 'Coral villages stacked above a quiet harbor.', paper: '#FBF7EC', ink: '#2E4A52', accent: '#D96A4A', gold: '#C2A165', accent2: '#EFA68A', accentBg: '#F5D5C5', display: F.marcellus, radius: 12, wght: '600', heroScale: 1.12, ls: '0.2em', texture: 'watercolor', motif: 'bloom', kit: 'ticket', price: 0 }),
    mk({ id: 'santorini-linen', name: 'Santorini Linen', collection: 'med', blurb: 'Whitewashed walls and Aegean blue on sea-bleached linen.', paper: '#F5F1E8', ink: '#1F2A35', accent: '#3F6E92', gold: '#C9A765', motif: 'olive', kit: 'plate', texture: 'linen', display: F.cormorant, wght: '500', ls: '0.22em', price: 18 }),
    mk({ id: 'amalfi-lemon', name: 'Amalfi Lemon', collection: 'med', blurb: 'Lemon groves spilling over a sun-warmed coast.', paper: '#FBF7EC', ink: '#2C5E72', accent: '#E0A92E', gold: '#C2A165', accent2: '#F1D27A', accentBg: '#F8EBC3', display: F.playfair, radius: 14, wght: '600', heroScale: 1.1, ls: '0.18em', texture: 'watercolor', motif: 'citrus', kit: 'scallop', price: 18, s: '2.1k' }),
    mk({ id: 'tuscan-watercolor', name: 'Tuscan Watercolor', collection: 'watercolor', blurb: 'Sun-warmed terracotta washes — an afternoon in Montepulciano.', paper: '#FBF1E4', ink: '#3A1F12', accent: '#C2693E', gold: '#B8893E', inkSoft: '#5C3A26', accent2: '#D89576', texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', radius: 16, wght: '500', ls: '0.14em', price: 18, r: 4.9, s: '2.4k' }),
    mk({ id: 'peony-dusk', name: 'Peony Dusk', collection: 'watercolor', blurb: 'Plum peonies bleeding at the edges — gentle, romantic.', paper: '#F8F0EC', ink: '#3C1F33', accent: '#9C5E84', gold: '#BFA15E', inkSoft: '#5E3850', accent2: '#C892B0', accentBg: '#EFD9E4', texture: 'watercolor', motif: 'peony', kit: 'classic', radius: 18, wght: '500', ls: '0.16em', price: 18, r: 4.9, s: '3.1k', badges: { best: true } }),
    mk({ id: 'english-rose', name: 'English Rose', collection: 'garden', blurb: 'Soft pink blooms on cream — a cottage garden in full bloom.', paper: '#FDFAF0', ink: '#3A2832', accent: '#C66B7C', gold: '#C9A769', section: '#F8EFE8', card: '#FFFFFF', accentBg: '#F3D8DE', line: '#E8D4D0', display: F.cormorant, script: SC.dancing, radius: 12, texture: 'paper', motif: 'bow', kit: 'classic', price: 18, s: '2.1k' }),
    mk({ id: 'palm-springs', name: 'Palm Springs', collection: 'coastal', blurb: 'Retro pink on cabana stripes — poolside ease.', paper: '#F6F1E7', ink: '#2A1820', accent: '#D06A8E', gold: '#D4A85E', motif: 'palm', kit: 'ticket', texture: 'cotton', display: F.dmserif, wght: '500', radius: 10, price: 18 }),
    mk({ id: 'gingham-picnic', name: 'Gingham Picnic', collection: 'prints', blurb: 'Red-check picnic gingham on kraft — a backyard supper.', paper: '#FBF3E6', ink: '#2A1A12', accent: '#C7493B', gold: '#C9A55E', accent2: '#8A6A3C', texture: 'kraft', motif: 'none', kit: 'arch', display: F.fraunces, body: F.dmsans, wght: '600', price: 16 }),
    mk({ id: 'magnolia-porch', name: 'Magnolia Porch', collection: 'garden', blurb: 'Dusty rose magnolias on warm linen — a southern veranda.', paper: '#F8F3EA', ink: '#2C2218', accent: '#A86B76', accent2: '#D9B8A6', gold: '#C9A55E', motif: 'magnolia', kit: 'plate', texture: 'linen', section: '#F0E7D8', card: '#FFFDF4', display: F.playfair, radius: 14, price: 16, s: '1.1k' }),
    mk({ id: 'provence-lavender', name: 'Provence Lavender', collection: 'whimsy', blurb: 'Dried lavender bundles in a sun-bleached farmhouse.', paper: '#FAF6F0', ink: '#4A3F5C', accent: '#8B7BB0', gold: '#C9A961', accent2: '#B8A8D4', accentBg: '#EDE6F3', accentInk: '#3A3148', motif: 'bloom', kit: 'scrapbook', texture: 'washi', price: 18, swatches: ['#8B7BB0', '#4A3F5C', '#C9A961', '#FAF6F0'] }),
    mk({ id: 'citrus-pop', name: 'Citrus Pop', collection: 'whimsy', blurb: 'Sliced orange on a juice-stained ticket — punchy citrus.', paper: '#FFF6EC', ink: '#3D1F12', accent: '#F0682E', gold: '#D49A3A', accent2: '#F4A155', accentBg: '#FCDCC4', accentInk: '#6A2E14', motif: 'citrus', kit: 'ticket', pattern: 'dots', price: 16, swatches: ['#F0682E', '#3D1F12', '#D49A3A', '#FFF6EC'] }),
    mk({ id: 'autumn-harvest', name: 'Autumn Harvest', collection: 'seasonal', blurb: 'Kraft paper, wheat stamps, rust ink — a late-October table.', paper: '#FAF2E4', ink: '#2A1A0E', accent: '#B5552B', accent2: '#D87A48', gold: '#C9A55E', motif: 'wheat', kit: 'cabinet', texture: 'tweed', section: '#F0E5D0', card: '#FFFCEE', display: F.fraunces, radius: 12, wght: '500', price: 14, swatches: ['#FAF2E4', '#B5552B', '#C9A55E', '#D87A48'] }),
    mk({ id: 'winter-frost', name: 'Winter Frost', collection: 'seasonal', blurb: 'Pale ice and brushed silver — a clear-sky January morning.', paper: '#F2F5F7', ink: '#1F2A35', accent: '#6E8FA6', accent2: '#B9C2D6', gold: '#A4B8C8', motif: 'none', kit: 'minimal', texture: 'silk', section: '#E8EEF2', card: '#FFFFFF', display: F.italiana, radius: 4, ls: '0.18em', price: 14, swatches: ['#F2F5F7', '#6E8FA6', '#A4B8C8', '#B9C2D6'] }),
    mk({ id: 'glasshouse', name: 'The Glasshouse', collection: 'celestial', blurb: 'Liquid-glass panes floating on aurora light.', paper: '#15131C', ink: '#F2EEF8', accent: '#8FA8E8', gold: '#D4B373', section: '#1B1826', card: '#211D2E', inkSoft: '#C9C2DC', inkMuted: '#8E86A6', accent2: '#C490C8', accentBg: '#2A2540', accentInk: '#0E0C14', line: 'rgba(242,238,248,0.16)', display: F.italiana, radius: 16, wght: '400', ls: '0.10em', heroScale: 1.12, kit: 'glass', dark: true, swatches: ['#15131C', '#8FA8E8', '#C490C8', '#D4B373'], price: 24, r: 5.0, s: 'New', badges: { new: true } }),
    mk({ id: 'midnight-velvet', name: 'Midnight Velvet', collection: 'evening', blurb: 'Mauve champagne on inky velvet — a midnight ballroom.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#B9A6E0', accent2: '#C9A24B', accentBg: '#2C2A48', accentInk: '#F4ECFF', gold: '#D4B373', line: 'rgba(241,236,220,0.18)', display: F.fraunces, radius: 6, wght: '500', ls: '0.22em', dark: true, foil: true, texture: 'velvet', motif: 'chandelier', kit: 'plate', swatches: ['#1A1B2E', '#B9A6E0', '#C9A24B', '#F1ECDC'], price: 24 }),
    mk({ id: 'obsidian-gold', name: 'Obsidian Gold', collection: 'evening', blurb: 'Pure leaf gold pressed onto obsidian — one bright glint.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#CDA349', accent2: '#E5C77E', accentBg: '#2E2818', accentInk: '#F9E9C0', gold: '#CDA349', line: 'rgba(241,236,220,0.20)', display: F.italiana, radius: 2, wght: '400', ls: '0.28em', dark: true, foil: true, texture: 'velvet', kit: 'gilt', swatches: ['#1A1B2E', '#CDA349', '#E5C77E', '#F1ECDC'], price: 24, r: 5, s: '2.1k' }),
    mk({ id: 'art-deco-gatsby', name: 'Art Deco Gatsby', collection: 'heritage', blurb: 'Onyx and gilt — fan-rays, foil rules, a roaring twenties press.', paper: '#15161A', ink: '#F4EAD2', accent: '#CBA14A', gold: '#CBA14A', accent2: '#E6C879', accentBg: '#2A2316', accentInk: '#15161A', line: '#3A2F18', display: F.cinzel, body: F.tenor, ls: '0.14em', wght: '600', radius: 2, dark: true, foil: true, texture: 'gilded', motif: 'deco', kit: 'deco', swatches: ['#15161A', '#CBA14A', '#E6C879', '#2A2316'], price: 24, s: '2.4k' }),
    mk({ id: 'sicilian-marble', name: 'Sicilian Marble', collection: 'med', blurb: 'Veined stone, old laurel, and slow afternoons.', paper: '#FBF7EC', ink: '#2D2D28', accent: '#5A5A52', gold: '#C2A165', accent2: '#9C9C92', accentBg: '#DCDBD2', section: '#F0ECDF', card: '#FFFFFF', display: F.cinzel, radius: 8, wght: '600', heroScale: 1.16, ls: '0.24em', foil: true, texture: 'marble', motif: 'laurel', kit: 'deco', price: 22, badges: { best: true } }),
    mk({ id: 'celestial-night', name: 'Celestial Night', collection: 'celestial', blurb: 'Midnight indigo with gilded constellations.', paper: '#111634', ink: '#EFEAD8', accent: '#C7A24B', accent2: '#9AA6E0', gold: '#C7A24B', dark: true, foil: true, motif: 'sun', kit: 'deco', texture: 'velvet', section: '#171D40', card: '#1D2450', display: F.cinzel, radius: 6, wght: '600', ls: '0.22em', price: 22, swatches: ['#111634', '#C7A24B', '#9AA6E0', '#EFEAD8'] }),
    mk({ id: 'opera-house', name: 'Opera House', collection: 'evening', blurb: 'Aubergine velvet, orchids on the rail, Bodoni at full voice.', paper: '#221420', ink: '#F2EAE4', accent: '#B687A8', accent2: '#D9B3C9', gold: '#D4AF6A', dark: true, foil: true, motif: 'orchid', kit: 'deco', texture: 'silk', section: '#2B1A28', card: '#322030', display: F.bodoni, body: F.jost, radius: 4, wght: '500', ls: '0.16em', price: 24, s: '860', badges: { new: true } }),
    mk({ id: 'the-gallery', name: 'The Gallery', collection: 'modern', blurb: 'Museum mats, exhibit numbers, Prata under glass.', paper: '#F7F5F1', ink: '#1A1916', accent: '#44403A', accent2: '#8A8378', gold: '#B8935A', motif: 'none', kit: 'gallery', texture: 'marble', section: '#EFECE6', card: '#FFFFFF', display: F.prata, body: F.jost, radius: 0, ls: '0.12em', price: 22, s: '720', badges: { new: true } }),
    mk({ id: 'gilded-coupe', name: 'Gilded Coupe', collection: 'evening', blurb: 'Champagne bubbles rising through candlelit velvet.', paper: '#1C1712', ink: '#F1EBDC', accent: '#D4B373', accent2: '#E8C77A', gold: '#D8A06A', dark: true, foil: true, motif: 'champagne', kit: 'deco', texture: 'velvet', section: '#251E16', card: '#2C241A', display: F.italiana, radius: 6, wght: '500', ls: '0.20em', price: 20, swatches: ['#1C1712', '#D4B373', '#D8A06A', '#E8C77A'] }),
  ];
  const TIER_LABEL = { free: 'Free', premium: 'Premium', signature: 'Signature' };

  function PackCard({ p, applied, premium, onApply }) {
    const locked = p.tier !== 'free' && !premium;
    const on = applied === p.id;
    return h('div', { style: { display: 'flex', flexDirection: 'column', borderRadius: 13, overflow: 'hidden', border: '1px solid ' + (on ? C.olive : C.line), background: C.card, boxShadow: on ? '0 0 0 2px ' + C.olive : '0 1px 2px rgba(40,28,12,0.05)' } },
      h('div', { style: { position: 'relative', height: 60, display: 'flex' } },
        p.swatches.map((c, i) => h('span', { key: i, style: { flex: 1, background: c } })),
        h('span', { style: { position: 'absolute', top: 7, left: 7, padding: '2px 8px', borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', background: p.tier === 'free' ? 'rgba(92,107,63,0.92)' : 'rgba(20,14,8,0.78)', color: p.tier === 'free' ? '#F4EFE2' : C.gold } }, TIER_LABEL[p.tier]),
        (p.badges.best || p.badges.new) && h('span', { style: { position: 'absolute', top: 7, right: 7, padding: '2px 8px', borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', background: C.cream, color: C.plum } }, p.badges.new ? 'New' : 'Best')),
      h('div', { style: { padding: '11px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 } },
          h('span', { style: { fontFamily: FONT_D, fontSize: 15.5, fontWeight: 600, color: C.ink } }, p.name),
          h('span', { style: { fontSize: 11.5, fontWeight: 700, color: p.price ? C.goldInk : C.olive } }, p.price ? '$' + p.price : 'Free')),
        h('div', { style: { fontSize: 11.5, color: C.muted, lineHeight: 1.4, margin: '4px 0 9px', flex: 1 } }, p.blurb),
        (p.exclKit || p.exclTex || p.foil) && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 } },
          p.exclKit && h('span', { style: { fontSize: 9, fontWeight: 700, color: C.goldInk, background: C.goldSoft, padding: '2px 7px', borderRadius: 999 } }, '✦ ' + p.kit + ' kit'),
          p.exclTex && h('span', { style: { fontSize: 9, fontWeight: 700, color: C.goldInk, background: C.goldSoft, padding: '2px 7px', borderRadius: 999 } }, '✦ ' + p.texture),
          p.foil && h('span', { style: { fontSize: 9, fontWeight: 700, color: C.goldInk, background: C.goldSoft, padding: '2px 7px', borderRadius: 999 } }, '✦ foil')),
        h('button', { onClick: () => onApply(p), style: {
          width: '100%', padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          border: '1px solid ' + (on ? C.olive : locked ? C.gold : C.line),
          background: on ? C.olive : 'transparent', color: on ? C.cream : locked ? C.goldInk : C.olive,
        } }, on ? 'Applied ✓' : locked ? '✦ Preview' : 'Apply')));
  }

  function Store({ open, onClose, applied, premium, onApply, onUnlock }) {
    const [col, setCol] = useState('all');
    if (!open) return null;
    const list = PACKS.filter((p) => col === 'all' || p.collection === col);
    return h('div', { style: { position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,14,8,0.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24 } },
      h('div', { className: 'ed-pop', style: { width: '100%', maxWidth: 1080, height: '88vh', display: 'flex', flexDirection: 'column', background: C.page, borderRadius: 18, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 100px -30px rgba(0,0,0,0.55)' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', background: C.cream, borderBottom: '1px solid ' + C.line } },
          h('div', null,
            h('div', { style: { fontFamily: FONT_D, fontSize: 24, fontWeight: 600, color: C.ink, lineHeight: 1 } }, 'The Theme Store'),
            h('div', { style: { fontSize: 12, color: C.muted, marginTop: 4 } }, 'Curated looks for every occasion — applied to your site in one tap.')),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('button', { onClick: onUnlock, style: { padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: '1px solid ' + (premium ? C.gold : 'rgba(193,154,75,0.5)'), background: premium ? C.gold : C.goldSoft, color: premium ? '#241a08' : C.goldInk } }, premium ? '✦ Atelier — all unlocked' : '✦ Unlock all — $19'),
            h('button', { onClick: onClose, style: { width: 32, height: 32, borderRadius: 9, border: '1px solid ' + C.line, background: C.cream, color: C.muted, cursor: 'pointer', fontSize: 15 } }, '✕'))),
        h('div', { className: 'ed-scroll', style: { display: 'flex', gap: 7, padding: '12px 24px', overflowX: 'auto', borderBottom: '1px solid ' + C.line, background: C.cream, flexShrink: 0 } },
          COLLECTIONS.map(([id, label]) => h('button', { key: id, onClick: () => setCol(id), style: { whiteSpace: 'nowrap', padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: '1px solid ' + (col === id ? C.olive : C.line), background: col === id ? C.olive : C.cream, color: col === id ? C.cream : C.inkSoft } }, label))),
        h('div', { className: 'ed-scroll', style: { flex: 1, overflowY: 'auto', padding: '20px 24px 28px' } },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))', gap: 16 } },
            list.map((p) => h(PackCard, { key: p.id, p, applied, premium, onApply }))))));
  }

  /* ── Tools (left rail) + small line icons ── */
  const TOOLS = [
    { id: 'photos', name: 'Photos', note: 'Your image library', g: '▦' },
    { id: 'fitting', name: 'Fitting room', note: 'Try looks on your site', g: 'F' },
    { id: 'guests', name: 'Guests', note: 'Your guest list', g: 'G' },
    { id: 'sitefile', name: 'Site file', note: 'Back up · move · duplicate', g: '⤓' },
    { id: 'savedate', name: 'Save the date', note: 'Pre-invite teaser', g: 'S' },
    { id: 'privacy', name: 'Privacy', note: 'Password · public', g: 'P' },
    { id: 'dayof', name: 'Day-of', note: 'Live broadcasts', g: 'D' },
    { id: 'toasts', name: 'Toasts & speeches', note: 'Drafted with Pear', g: 'T' },
    { id: 'cohosts', name: 'Co-hosts', note: 'Invite a partner to edit', g: '+' },
  ];

  /* ════════ PEAR COMMAND BAR (⌘K) — the AI hub ════════
     Natural-language asks + jump-to-section + quick Pear actions,
     all in one surface. Replaces the chat popup as the primary AI. */
  function CmdBar({ open, onClose, onJump, onAction }) {
    const [q, setQ] = useState('');
    const ref = useRef(null);
    useEffect(() => { if (open) { setQ(''); setTimeout(() => ref.current && ref.current.focus(), 30); } }, [open]);
    if (!open) return null;
    const ql = q.trim().toLowerCase();
    const ACTIONS = [
      { k: 'story', t: 'Draft our story', d: 'Pear writes it from your details' },
      { k: 'faq', t: 'Write the FAQ', d: 'The questions guests always ask' },
      { k: 'warm', t: 'Warm up the tone', d: 'Rephrase every line, softer' },
      { k: 'look', t: 'Suggest a look', d: 'Open Theme Store picks for you' },
      { k: 'hotels', t: 'Recommend stays for guests', d: 'Pear finds hotels near your venue' },
      { k: 'moment', t: 'Add a schedule moment', d: 'Drop a new time card' },
    ];
    const fa = ACTIONS.filter((a) => !ql || a.t.toLowerCase().includes(ql));
    const fj = SECTIONS.filter((s) => !ql || s.name.toLowerCase().includes(ql));
    const row = (icon, title, desc, onClick, key) => h('button', { key, onClick, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: 9 }, onMouseEnter: (e) => e.currentTarget.style.background = C.cream, onMouseLeave: (e) => e.currentTarget.style.background = 'transparent' },
      h('span', { style: { width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center', background: C.goldSoft, color: C.goldInk, fontSize: 12, fontWeight: 800 } }, icon),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 13, fontWeight: 600, color: C.ink } }, title), desc && h('div', { style: { fontSize: 11, color: C.muted } }, desc)));
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(20,14,8,0.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh' } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { width: 'min(560px, 92vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: C.cream, borderRadius: 16, border: '1px solid ' + C.line, boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)', overflow: 'hidden' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px', borderBottom: '1px solid ' + C.line } },
          h(Glyph, { size: 24 }),
          h('input', { ref, value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Ask Pear, or jump anywhere…', style: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: C.ink, fontFamily: 'inherit' } }),
          h('kbd', { style: { fontFamily: FONT_M, fontSize: 10, background: C.studio, borderRadius: 5, padding: '2px 6px', color: C.muted } }, 'esc')),
        h('div', { className: 'ed-scroll', style: { overflowY: 'auto', padding: '8px 8px 12px' } },
          ql && h('div', { style: { padding: '4px 10px' } }, row('✦', 'Ask Pear: “' + q + '”', 'Pear drafts a reply and proposes the edit', () => { onAction('nl', q); onClose(); }, 'nl')),
          fa.length > 0 && h('div', null, h('div', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, padding: '8px 14px 4px' } }, 'Pear can'), fa.map((a) => row('✦', a.t, a.d, () => { onAction(a.k); onClose(); }, a.k))),
          fj.length > 0 && h('div', null, h('div', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, padding: '10px 14px 4px' } }, 'Jump to'), fj.map((s) => row(s.name[0], s.name, s.note, () => { onJump(s.id); onClose(); }, s.id)))),
        h('div', { style: { padding: '9px 16px', borderTop: '1px solid ' + C.line, fontSize: 10.5, color: C.faint, display: 'flex', gap: 16 } }, h('span', null, '⏎ run'), h('span', null, '↑↓ move'), h('span', null, 'Pear suggests — you approve every change'))));
  }

  /* ════════ PROFILE MENU (top-right) ════════ */
  function ProfileMenu({ open, onClose }) {
    if (!open) return null;
    const link = (t, sub) => h('button', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, fontSize: 13, color: C.ink, fontFamily: 'inherit' }, onMouseEnter: (e) => e.currentTarget.style.background = C.page, onMouseLeave: (e) => e.currentTarget.style.background = 'transparent' }, h('span', null, t), sub && h('span', { style: { fontSize: 11, color: C.faint } }, sub));
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 95 } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { position: 'absolute', top: 50, right: 14, width: 248, background: C.cream, border: '1px solid ' + C.line, borderRadius: 14, boxShadow: '0 20px 50px -16px rgba(40,28,12,0.4)', overflow: 'hidden' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 11, padding: '15px 14px', background: C.page } },
          h('span', { style: { width: 40, height: 40, borderRadius: 11, background: C.olive, color: C.cream, display: 'grid', placeItems: 'center', fontFamily: FONT_D, fontSize: 16, fontWeight: 600 } }, 'SB'),
          h('div', null, h('div', { style: { fontFamily: FONT_D, fontSize: 16, color: C.ink, lineHeight: 1 } }, 'Scott B'), h('div', { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, 'Journal plan'))),
        h('div', { style: { padding: 6 } },
          link('Your mark', 'SB'), link('Account'), link('Usage & credits'), link('Subscription', 'Journal'), link('Notifications')),
        h('div', { style: { borderTop: '1px solid ' + C.line, padding: 6 } }, link('Sign out'))));
  }

  /* ════════ CO-HOST MODAL ════════ */
  function CoHostModal({ open, onClose }) {
    const [role, setRole] = useState('editor');
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    useEffect(() => { if (open) { setSent(false); setCopied(false); setEmail(''); } }, [open]);
    if (!open) return null;
    const ROLES = [
      ['editor', 'Editor', 'Edits everything', 'M4 20 14 10l3 3L7 20ZM14 10l1.8-1.8a2 2 0 0 1 3 3L17 13'],
      ['guest', 'Guest manager', 'RSVPs & notes', 'M3 6h18v12H3zM3 7l9 6 9-6'],
      ['viewer', 'Viewer', 'Preview only', 'M2 12C5 6 19 6 22 12 19 18 5 18 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
    ];
    const ricon = (p, on) => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: on ? C.olive : C.muted, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: p }));
    const avatar = (init, grad, ring) => h('span', { style: { width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: FONT_D, background: grad, boxShadow: '0 0 0 2px ' + C.cream + ', 0 0 0 3.5px ' + ring } }, init);
    const pill = (txt, tone, bg) => h('span', { style: { fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tone, background: bg, padding: '3px 8px', borderRadius: 999 } }, txt);
    const person = (av, name, sub, right) => h('div', { style: { display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0' } }, av,
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 13, fontWeight: 700, color: C.ink } }, name), h('div', { style: { fontSize: 11, color: C.muted } }, sub)), right);
    const link = 'pearloom.co/j/mira-jun-2026';
    const doCopy = () => { try { navigator.clipboard && navigator.clipboard.writeText('https://' + link); } catch (e) { /* */ } setCopied(true); setTimeout(() => setCopied(false), 1800); };
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(20,14,8,0.52)', WebkitBackdropFilter: 'blur(5px)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', padding: 24, fontFamily: "'Inter',system-ui,sans-serif" } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop ed-scroll', style: { width: '100%', maxWidth: 460, background: C.cream, borderRadius: 20, border: '1px solid ' + C.line, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 50px 100px -30px rgba(20,14,8,0.55)' } },
        /* Invitation header band */
        h('div', { style: { position: 'relative', padding: '26px 26px 22px', background: 'radial-gradient(120% 140% at 15% 0%, ' + C.goldSoft + ' 0%, ' + C.cream + ' 60%)', borderBottom: '1px solid ' + C.line, overflow: 'hidden' } },
          h('div', { 'aria-hidden': true, style: { position: 'absolute', top: -18, right: -10, opacity: 0.16 } }, h(Glyph, { size: 132 })),
          h('button', { onClick: onClose, style: { position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 999, border: '1px solid ' + C.line, background: 'rgba(255,253,247,0.7)', color: C.muted, cursor: 'pointer', fontSize: 14, zIndex: 2 } }, '\u2715'),
          h('div', { style: { position: 'relative', display: 'flex', alignItems: 'center', gap: 13 } },
            avatar('M', 'linear-gradient(135deg,#8B9C5A,#5C6B3F)', 'rgba(92,107,63,0.25)'),
            h('div', null,
              h('div', { style: { fontFamily: FONT_M, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldInk, marginBottom: 5 } }, '\u2726 Plan it together'),
              h('div', { style: { fontFamily: FONT_D, fontSize: 25, color: C.ink, lineHeight: 1 } }, 'Invite a co-host'))),
          h('div', { style: { position: 'relative', fontSize: 12.5, color: C.muted, marginTop: 11, lineHeight: 1.5, maxWidth: 360 } }, 'They edit the very same site \u2014 no copies, no account juggling. Perfect for a partner, planner, or family.')),
        h('div', { style: { padding: '20px 26px 24px' } },
          h('label', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: 7, display: 'block' } }, 'Invite by email'),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 18 } },
            h('input', { value: email, onChange: (e) => setEmail(e.target.value), placeholder: 'partner@email.com', style: { flex: 1, padding: '11px 13px', borderRadius: 10, border: '1px solid ' + C.line, background: C.card, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }),
            h('button', { onClick: () => { if (email.trim()) { setSent(true); setEmail(''); setTimeout(() => setSent(false), 2200); } }, style: { padding: '0 18px', borderRadius: 10, border: 'none', background: C.olive, color: C.cream, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' } }, sent ? 'Sent \u2713' : 'Send')),
          h('label', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: 8, display: 'block' } }, 'They can'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 } }, ROLES.map(([id, t, d, p]) => { const on = role === id; return h('button', { key: id, onClick: () => setRole(id), style: { display: 'flex', flexDirection: 'column', gap: 7, padding: '12px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: '1px solid ' + (on ? C.olive : C.line), background: on ? 'rgba(92,107,63,0.09)' : C.card, transition: 'all .12s' } },
            h('span', { style: { width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: on ? 'rgba(92,107,63,0.14)' : C.page } }, ricon(p, on)),
            h('div', null, h('div', { style: { fontSize: 12, fontWeight: 700, color: on ? C.olive : C.ink, lineHeight: 1.1 } }, t), h('div', { style: { fontSize: 10.5, color: C.muted, marginTop: 2 } }, d))); })),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 20px' } }, h('span', { style: { flex: 1, height: 1, background: C.line } }), h('span', { style: { fontSize: 10.5, color: C.faint, fontWeight: 600 } }, 'or share a link'), h('span', { style: { flex: 1, height: 1, background: C.line } })),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 9px 9px 14px', borderRadius: 11, border: '1px dashed ' + C.line, background: C.card, marginBottom: 22 } },
            h('span', { style: { width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: C.page, color: C.olive } }, h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M9 15 15 9M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5' }))),
            h('span', { style: { flex: 1, minWidth: 0, fontSize: 12.5, color: C.inkSoft, fontFamily: FONT_M, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, link),
            h('button', { onClick: doCopy, style: { padding: '8px 14px', borderRadius: 8, border: '1px solid ' + (copied ? C.olive : C.line), background: copied ? 'rgba(92,107,63,0.1)' : C.cream, color: copied ? C.olive : C.inkSoft, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' } }, copied ? 'Copied \u2713' : 'Copy')),
          h('div', { style: { borderTop: '1px solid ' + C.line, paddingTop: 14 } },
            h('div', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: 4 } }, 'On this site'),
            person(avatar('SB', 'linear-gradient(135deg,#8B9C5A,#5C6B3F)', 'rgba(92,107,63,0.25)'), 'Scott B', 'scott@email.com', pill('Owner', C.olive, 'rgba(92,107,63,0.12)')),
            person(avatar('J', 'linear-gradient(135deg,#E6C877,#C19A4B)', 'rgba(193,154,75,0.3)'), 'jun@email.com', 'Editor', pill('Pending', C.goldInk, C.goldSoft))))));
  }

  /* ════════ DECOR LIBRARY (drawer) ════════ */
  const DECOR = [
    { id: 'sprig', name: 'Olive sprig', g: 'M4 12 H20 M10 12 q-3-4-6-5 M10 12 q-3 4-6 5 M16 12 q3-4 6-5 M16 12 q3 4 6 5' },
    { id: 'bloom', name: 'Bloom', g: 'circle' },
    { id: 'laurel', name: 'Laurel', g: 'M12 21 C5 17 4 9 8 4 M12 21 C19 17 20 9 16 4' },
    { id: 'sun', name: 'Sun', g: 'sun' },
    { id: 'wave', name: 'Wave', g: 'M3 13 q3-5 6 0 t6 0 t6 0' },
    { id: 'ring', name: 'Rings', g: 'rings' },
    { id: 'heart', name: 'Heart', g: 'M12 20 C4 14 4 7 9 6 C11 6 12 8 12 9 C12 8 13 6 15 6 C20 7 20 14 12 20Z', prem: true },
    { id: 'star', name: 'Sparkle', g: 'M12 3 C13 9 15 11 21 12 C15 13 13 15 12 21 C11 15 9 13 3 12 C9 11 11 9 12 3Z', prem: true },
  ];
  function decorSvg(it) {
    const stroke = h('g', { fill: 'none', stroke: C.olive, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
      it.g === 'circle' ? [0, 60, 120, 180, 240, 300].map((a) => h('ellipse', { key: a, cx: 12, cy: 7, rx: 2.4, ry: 5, transform: 'rotate(' + a + ' 12 12)' })).concat(h('circle', { key: 'c', cx: 12, cy: 12, r: 2, fill: C.gold, stroke: 'none' }))
        : it.g === 'sun' ? [h('circle', { key: 'c', cx: 12, cy: 12, r: 4.5 })].concat([0, 45, 90, 135, 180, 225, 270, 315].map((a) => h('path', { key: a, d: 'M12 5.5 V3', transform: 'rotate(' + a + ' 12 12)' })))
          : it.g === 'rings' ? [h('circle', { key: 1, cx: 9, cy: 13, r: 6 }), h('circle', { key: 2, cx: 15, cy: 13, r: 6 }), h('path', { key: 3, d: 'M12 6 l1.5-2.5 l1.5 2.5', fill: C.gold, stroke: C.gold })]
            : h('path', { d: it.g }));
    return h('svg', { width: 30, height: 30, viewBox: '0 0 24 24', 'aria-hidden': true }, stroke);
  }
  function DecorDrawer({ open, onClose, premium, onUnlock }) {
    const [tab, setTab] = useState('motifs');
    if (!open) return null;
    const PATTERNS = [['gingham', 'repeating-linear-gradient(0deg,rgba(92,107,63,.25) 0 4px,transparent 4px 8px),repeating-linear-gradient(90deg,rgba(92,107,63,.25) 0 4px,transparent 4px 8px)'], ['stripe', 'repeating-linear-gradient(90deg,rgba(92,107,63,.3) 0 5px,transparent 5px 11px)'], ['dots', 'radial-gradient(circle,rgba(92,107,63,.4) 1.5px,transparent 2px)'], ['scallop', 'radial-gradient(circle at 50% 0,transparent 6px,rgba(193,154,75,.3) 6px 7px,transparent 7px)'], ['deco', 'repeating-linear-gradient(45deg,rgba(193,154,75,.3) 0 3px,transparent 3px 8px)'], ['celestial', 'radial-gradient(circle,rgba(193,154,75,.5) 1px,transparent 1.5px)']];
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,14,8,0.4)' } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { position: 'absolute', top: 0, right: 0, height: '100vh', width: 340, background: C.cream, borderLeft: '1px solid ' + C.line, boxShadow: '-20px 0 50px -20px rgba(40,28,12,0.3)', display: 'flex', flexDirection: 'column' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 14px', borderBottom: '1px solid ' + C.line } },
          h('div', null, h('div', { style: { fontFamily: FONT_D, fontSize: 21, color: C.ink, lineHeight: 1 } }, 'Decor library'), h('div', { style: { fontSize: 11.5, color: C.muted, marginTop: 4 } }, 'Drag a flourish onto your site.')),
          h('button', { onClick: onClose, style: { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.muted, cursor: 'pointer', fontSize: 14 } }, '✕')),
        h('div', { style: { display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid ' + C.line } }, [['motifs', 'Motifs'], ['patterns', 'Patterns']].map(([id, l]) => h('button', { key: id, onClick: () => setTab(id), style: { padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: '1px solid ' + (tab === id ? C.olive : C.line), background: tab === id ? C.olive : C.cream, color: tab === id ? C.cream : C.inkSoft } }, l))),
        h('div', { className: 'ed-scroll', style: { flex: 1, overflowY: 'auto', padding: 16 } },
          tab === 'motifs'
            ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } }, DECOR.map((it) => {
                const locked = it.prem && !premium;
                return h('div', { key: it.id, title: it.name, style: { position: 'relative', aspectRatio: '1', borderRadius: 11, border: '1px solid ' + C.line, background: C.card, display: 'grid', placeItems: 'center', cursor: 'grab' } },
                  decorSvg(it), locked && h('span', { style: { position: 'absolute', top: 5, right: 6, fontSize: 9, color: C.gold } }, '✦'));
              }))
            : h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } }, PATTERNS.map(([id, bg], i) => h('div', { key: id, title: id, style: { position: 'relative', height: 72, borderRadius: 11, border: '1px solid ' + C.line, background: bg + ', ' + C.card, backgroundSize: id === 'gingham' ? '8px 8px' : id === 'dots' || id === 'celestial' ? '10px 10px' : 'auto', cursor: 'grab' } }, i > 3 && !premium && h('span', { style: { position: 'absolute', top: 5, right: 6, fontSize: 9, color: C.gold } }, '✦'))))),
        !premium && h('button', { onClick: onUnlock, style: { margin: 16, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#E6C877,#C19A4B)', color: '#241a08', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' } }, '✦ Unlock premium decor — Atelier')));
  }

  /* ════ PEAR PICKS — rich, VISUAL AI suggestions (not text) ════
     Ask Pear to recommend stays → it returns real hotel cards
     (photo, rating, price, amenities) ready to drop into Travel. */
  const PEAR_HOTELS = [
    { name: 'Cosmos Suites', tone: 'warm', rating: 4.8, reviews: 412, price: '$$$', dist: '8-min walk', blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.', tags: ['Caldera view', 'Pool', 'Breakfast'] },
    { name: 'Andronis Boutique', tone: 'lavender', rating: 4.9, reviews: 286, price: '$$$$', dist: '12-min walk', blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.', tags: ['Spa', 'Infinity pool', 'Fine dining'] },
    { name: 'Olive & Vine Inn', tone: 'sage', rating: 4.7, reviews: 198, price: '$$', dist: '5-min drive', blurb: 'A restored farmhouse among the groves — simple, warm, walkable.', tags: ['Garden', 'Free parking', 'Pet-friendly'] },
  ];
  const PTONE = { warm: 'linear-gradient(135deg,#E8C8A8,#D9A87E)', lavender: 'linear-gradient(135deg,#D4C4E4,#B0A0CE)', sage: 'linear-gradient(135deg,#CBD4B0,#A6B884)' };
  function PearPicks({ open, onClose }) {
    const [added, setAdded] = useState({});
    useEffect(() => { if (open) setAdded({}); }, [open]);
    if (!open) return null;
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(20,14,8,0.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 24 } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { width: '100%', maxWidth: 480, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: C.cream, borderRadius: 16, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)' } },
        h('div', { style: { padding: '18px 20px 14px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-start', gap: 11 } },
          h(Glyph, { size: 26 }),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontFamily: FONT_D, fontSize: 19, color: C.ink, lineHeight: 1.1 } }, 'Three stays near Point Reyes'),
            h('div', { style: { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 } }, 'Pear pulled these for your guests — tap Add and they drop into Travel as cards.')),
          h('button', { onClick: onClose, style: { width: 28, height: 28, borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.muted, cursor: 'pointer' } }, '✕')),
        h('div', { className: 'ed-scroll', style: { overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
          PEAR_HOTELS.map((ht, i) => {
            const on = added[i];
            return h('div', { key: i, className: 'ed-pop', style: { display: 'flex', gap: 12, padding: 12, borderRadius: 13, border: '1px solid ' + (on ? C.olive : C.line), background: C.card } },
              h('div', { style: { width: 84, height: 84, borderRadius: 10, flexShrink: 0, background: PTONE[ht.tone], position: 'relative' } },
                h('span', { style: { position: 'absolute', bottom: 5, left: 5, background: 'rgba(20,14,8,0.62)', color: '#fff', borderRadius: 6, padding: '1px 6px', fontSize: 10, fontWeight: 700 } }, '★ ' + ht.rating)),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 } },
                  h('div', { style: { fontFamily: FONT_D, fontSize: 16, color: C.ink } }, ht.name),
                  h('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.muted } }, ht.price)),
                h('div', { style: { fontSize: 11, color: C.muted, margin: '2px 0 5px' } }, ht.reviews + ' reviews · ' + ht.dist),
                h('div', { style: { fontSize: 11.5, color: C.inkSoft, lineHeight: 1.4, marginBottom: 7 } }, ht.blurb),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 } }, ht.tags.map((t) => h('span', { key: t, style: { fontSize: 9.5, fontWeight: 600, color: C.olive, background: C.page, padding: '2px 7px', borderRadius: 999 } }, t))),
                h('button', { onClick: () => setAdded((a) => Object.assign({}, a, { [i]: !a[i] })), style: { padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: '1px solid ' + (on ? C.olive : C.line), background: on ? C.olive : 'transparent', color: on ? C.cream : C.olive } }, on ? 'Added ✓' : '+ Add to site')));
          })),
        h('div', { style: { padding: '12px 16px', borderTop: '1px solid ' + C.line, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('button', { style: { fontSize: 12, color: C.olive, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' } }, '↺ Show three more'),
          h('button', { onClick: onClose, style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: C.olive, color: C.cream, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, 'Done'))));
  }

  /* ════ PEAR BLOCKS — rich VISUAL results for every section ════ */
  const PB_META = {
    travel: ['Three stays near Point Reyes', 'Pear pulled these for your guests — tap Add and they drop into Travel.'],
    story: ['A first draft of your story', 'In your voice, from your details. Edit anything after.'],
    schedule: ['Your day, in moments', 'A timeline Pear built from your event.'],
    registry: ['A few registry ideas', 'Funds and shops that fit your celebration.'],
    gallery: ['A gallery, arranged', 'Pear set your photos into a rhythm.'],
    faq: ['The questions guests ask', 'Answered in your voice — keep the ones that fit.'],
    details: ['The details guests need', 'Dress code, kids, gifts — filled in for you.'],
  };
  function PearBlocks({ open, kind, onClose }) {
    const [added, setAdded] = useState({});
    useEffect(() => { if (open) setAdded({}); }, [open, kind]);
    if (!open) return null;
    const k = PB_META[kind] ? kind : 'travel';
    const meta = PB_META[k];
    const cardBase = { borderRadius: 13, border: '1px solid ' + C.line, background: C.card, padding: 13 };
    const addBtn = (i, label) => h('button', { onClick: () => setAdded((a) => Object.assign({}, a, { [i]: !a[i] })), style: { padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: '1px solid ' + (added[i] ? C.olive : C.line), background: added[i] ? C.olive : 'transparent', color: added[i] ? C.cream : C.olive } }, added[i] ? 'Added ✓' : (label || '+ Add'));
    let body;
    if (k === 'travel') {
      body = PEAR_HOTELS.map((ht, i) => h('div', { key: i, style: Object.assign({ display: 'flex', gap: 12 }, cardBase, { borderColor: added[i] ? C.olive : C.line }) },
        h('div', { style: { width: 78, height: 78, borderRadius: 10, flexShrink: 0, background: PTONE[ht.tone], position: 'relative' } }, h('span', { style: { position: 'absolute', bottom: 5, left: 5, background: 'rgba(20,14,8,0.62)', color: '#fff', borderRadius: 6, padding: '1px 6px', fontSize: 10, fontWeight: 700 } }, '★ ' + ht.rating)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 } }, h('div', { style: { fontFamily: FONT_D, fontSize: 16, color: C.ink } }, ht.name), h('div', { style: { fontSize: 11.5, fontWeight: 700, color: C.muted } }, ht.price)),
          h('div', { style: { fontSize: 11, color: C.muted, margin: '2px 0 6px' } }, ht.reviews + ' reviews · ' + ht.dist),
          h('div', { style: { fontSize: 11.5, color: C.inkSoft, lineHeight: 1.4, marginBottom: 8 } }, ht.blurb),
          addBtn(i))));
    } else if (k === 'story') {
      body = [h('div', { key: 'd', style: cardBase },
        h('div', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.goldInk, marginBottom: 8 } }, 'Our story'),
        h('div', { style: { fontFamily: FONT_D, fontSize: 22, color: C.ink, marginBottom: 10 } }, 'How we ', h('span', { style: { fontStyle: 'italic', color: C.olive } }, 'met')),
        h('p', { style: { fontSize: 13, color: C.inkSoft, lineHeight: 1.6, margin: '0 0 12px' } }, 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry.'),
        h('div', { style: { borderLeft: '2px solid ' + C.gold, paddingLeft: 12, fontFamily: FONT_D, fontStyle: 'italic', fontSize: 15, color: C.ink, marginBottom: 14, lineHeight: 1.4 } }, '“No story we would rather tell, and no one we would rather tell it to.”'),
        h('div', { style: { display: 'flex', gap: 8 } }, addBtn(0, 'Use this draft'), h('button', { style: { padding: '7px 13px', borderRadius: 8, border: '1px solid ' + C.line, background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' } }, '↺ Another tone')))];
    } else if (k === 'schedule') {
      const rows = [['4:30 pm', 'Ceremony', 'Olive grove'], ['5:30 pm', 'Cocktails', 'Terrace bar'], ['7:00 pm', 'Dinner', 'Long table'], ['9:00 pm', 'Dancing', 'Until late']];
      body = [h('div', { key: 't', style: cardBase },
        h('div', { style: { position: 'relative', paddingLeft: 20 } },
          h('div', { style: { position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: C.line } }),
          rows.map((r, i) => h('div', { key: i, style: { position: 'relative', paddingBottom: i < 3 ? 15 : 0 } },
            h('span', { style: { position: 'absolute', left: -20, top: 2, width: 12, height: 12, borderRadius: '50%', background: C.olive, border: '2px solid ' + C.card } }),
            h('div', { style: { fontFamily: FONT_D, fontWeight: 600, fontSize: 15, color: C.ink } }, r[0] + ' · ' + r[1]),
            h('div', { style: { fontSize: 12, color: C.muted } }, r[2])))),
        h('div', { style: { marginTop: 12 } }, addBtn(0, 'Add these moments')))];
    } else if (k === 'registry') {
      const regs = [['Honeymoon fund', 'A week in the Cyclades', 64], ['Crate & Barrel', 'Home & table', null], ['Zola', 'The full registry', null]];
      body = regs.map((r, i) => h('div', { key: i, style: Object.assign({}, cardBase, { borderColor: added[i] ? C.olive : C.line }) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
          h('div', null, h('div', { style: { fontFamily: FONT_D, fontSize: 16, color: C.ink } }, r[0]), h('div', { style: { fontSize: 11.5, color: C.muted } }, r[1])), addBtn(i)),
        r[2] != null && h('div', { style: { marginTop: 10 } }, h('div', { style: { height: 6, borderRadius: 99, background: C.page, overflow: 'hidden' } }, h('div', { style: { height: '100%', width: r[2] + '%', background: C.gold } })), h('div', { style: { fontSize: 10.5, color: C.muted, marginTop: 4 } }, r[2] + '% funded'))));
    } else if (k === 'gallery') {
      const tones = ['warm', 'sage', 'lavender', 'warm', 'sage', 'lavender', 'warm', 'sage', 'lavender'];
      body = [h('div', { key: 'g', style: cardBase },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 } }, tones.map((t, i) => h('div', { key: i, style: { aspectRatio: '1', borderRadius: 7, background: PTONE[t] } }))),
        h('div', { style: { fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 } }, 'Pear grouped 12 photos into a balanced grid — cover first, candids after.'),
        addBtn(0, 'Use this arrangement'))];
    } else if (k === 'faq') {
      const qa = [["What's the dress code?", 'Garden formal — linen suits, tea-length dresses.'], ['Can I bring a plus-one?', 'If your invite names a guest, absolutely.'], ['Are kids welcome?', 'Little ones ten and up, all evening.'], ['Where should we stay?', "We've blocked rooms at two nearby hotels."]];
      body = qa.map((q, i) => h('div', { key: i, style: Object.assign({}, cardBase, { borderColor: added[i] ? C.olive : C.line }) },
        h('div', { style: { fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 } }, q[0]),
        h('div', { style: { fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 9 } }, q[1]), addBtn(i)));
    } else {
      const tiles = [['Dress code', 'Garden formal'], ['Kids', 'Ages 10 +'], ['Gifts', 'Your presence is enough']];
      body = tiles.map((t, i) => h('div', { key: i, style: Object.assign({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, cardBase, { borderColor: added[i] ? C.olive : C.line }) },
        h('div', null, h('div', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint } }, t[0]), h('div', { style: { fontFamily: FONT_D, fontSize: 16, color: C.ink, marginTop: 2 } }, t[1])), addBtn(i)));
    }
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(20,14,8,0.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 24 } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { width: '100%', maxWidth: 480, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: C.cream, borderRadius: 16, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)' } },
        h('div', { style: { padding: '18px 20px 14px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-start', gap: 11 } },
          h(Glyph, { size: 26 }),
          h('div', { style: { flex: 1 } }, h('div', { style: { fontFamily: FONT_D, fontSize: 19, color: C.ink, lineHeight: 1.1 } }, meta[0]), h('div', { style: { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 } }, meta[1])),
          h('button', { onClick: onClose, style: { width: 28, height: 28, borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.muted, cursor: 'pointer' } }, '✕')),
        h('div', { className: 'ed-scroll', style: { overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } }, body),
        h('div', { style: { padding: '12px 16px', borderTop: '1px solid ' + C.line, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('button', { style: { fontSize: 12, color: C.olive, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' } }, '↺ Regenerate'),
          h('button', { onClick: onClose, style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: C.olive, color: C.cream, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, 'Done'))));
  }

  /* ════ PUBLISH CHECKLIST — the progress meter, made actionable ════ */
  function Checklist({ open, onClose, onJump, onPear, onCoHost }) {
    if (!open) return null;
    const items = [
      { done: true, label: 'Choose a look', desc: 'Pressed Garden' },
      { done: true, label: 'Set the date & place', desc: 'Sept 6 · Point Reyes', jump: 'top' },
      { done: false, label: 'Add a cover photo', desc: 'Your hero needs one image', jump: 'top' },
      { done: false, label: 'Write your story', desc: 'Pear can draft it for you', pear: 'story' },
      { done: false, label: 'Line up the day', desc: 'Add your schedule moments', pear: 'schedule' },
      { done: true, label: 'Open RSVPs', desc: 'Guests can reply', jump: 'rsvp' },
      { done: false, label: 'Invite a co-host', desc: 'Optional — plan together', cohost: true },
    ];
    const done = items.filter((i) => i.done).length;
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 95 } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { position: 'absolute', top: 50, left: 14, width: 332, background: C.cream, border: '1px solid ' + C.line, borderRadius: 14, boxShadow: '0 20px 50px -16px rgba(40,28,12,0.4)', overflow: 'hidden' } },
        h('div', { style: { padding: '15px 16px 13px', borderBottom: '1px solid ' + C.line } },
          h('div', { style: { fontFamily: FONT_D, fontSize: 18, color: C.ink } }, 'Ready to publish'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } },
            h('div', { style: { flex: 1, height: 5, borderRadius: 99, background: C.page, overflow: 'hidden' } }, h('div', { style: { height: '100%', width: Math.round(done / items.length * 100) + '%', background: C.olive } })),
            h('span', { style: { fontSize: 11, fontWeight: 700, color: C.olive } }, done + ' of ' + items.length))),
        h('div', { className: 'ed-scroll', style: { maxHeight: '58vh', overflowY: 'auto', padding: 6 } },
          items.map((it, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9 } },
            h('span', { style: { width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', border: '1.5px solid ' + (it.done ? C.olive : C.line), background: it.done ? C.olive : 'transparent', color: C.cream, fontSize: 10, fontWeight: 800 } }, it.done ? '✓' : ''),
            h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 12.5, fontWeight: 600, color: it.done ? C.muted : C.ink, textDecoration: it.done ? 'line-through' : 'none' } }, it.label), h('div', { style: { fontSize: 10.5, color: C.faint } }, it.desc)),
            !it.done && h('button', { onClick: () => { onClose(); if (it.pear) onPear(it.pear); else if (it.cohost) onCoHost(); else if (it.jump) onJump(it.jump); }, style: { padding: '5px 10px', borderRadius: 7, border: '1px solid ' + C.olive, background: 'transparent', color: C.olive, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 } }, it.pear ? '✦ Pear' : 'Fix')))),
        h('div', { style: { padding: '12px 16px', borderTop: '1px solid ' + C.line } }, h('button', { onClick: onClose, style: { width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: C.olive, color: C.cream, fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, 'Publish site'))));
  }

  /* ════ ADD SECTION — a visual gallery, occasion-filtered ════ */
  const ADD_CORE = [['Countdown', 'Days until the date', 'C'], ['Map', 'Where it happens', 'M'], ['Music', 'A playlist or first song', '♪'], ['Wedding party', 'Who stands with you', 'W'], ['Note from us', 'A welcome message', 'N'], ['More Q&A', 'Extra guest questions', '?']];
  const ADD_BLOCKS = [['Cost splitter', 'Share weekend costs', 1], ['Advice wall', 'Guests leave notes', 0], ['Livestream', 'For those far away', 1], ['Program', 'The order of service', 0], ['Voice toasts', 'Collect spoken toasts', 1], ['Packing list', 'What to bring', 0]];
  const ADD_ID = { Map: 'map', Countdown: 'countdown', Gallery: 'gallery', Registry: 'registry', FAQ: 'faq', Travel: 'travel' };
  function AddSection({ open, onClose, premium, order, onInsert }) {
    const [added, setAdded] = useState({});
    useEffect(() => { if (open) setAdded({}); }, [open]);
    if (!open) return null;
    const inOrder = (name) => { const id = ADD_ID[name]; return id && (order || []).includes(id); };
    const tile = (g) => h('span', { style: { width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: C.page, color: C.olive, fontFamily: FONT_M, fontSize: 13, fontWeight: 700 } }, g);
    const card = (key, name, desc, locked) => { const realId = ADD_ID[name]; const present = inOrder(name); const on = present || added[key];
      return h('button', { key, onClick: () => { if (realId && onInsert) { onInsert(realId); setAdded((a) => Object.assign({}, a, { [key]: true })); } else { setAdded((a) => Object.assign({}, a, { [key]: !a[key] })); } }, style: { display: 'flex', alignItems: 'center', gap: 11, padding: 12, borderRadius: 12, textAlign: 'left', cursor: 'pointer', border: '1px solid ' + (on ? C.olive : C.line), background: on ? 'rgba(92,107,63,0.08)' : C.card, position: 'relative' } },
        tile(name[0]),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 13, fontWeight: 700, color: C.ink, display: 'flex', alignItems: 'center', gap: 5 } }, name, locked && h('span', { style: { fontSize: 9, color: C.gold } }, '✦')), h('div', { style: { fontSize: 11, color: C.muted } }, present ? 'On your site' : desc)),
        h('span', { style: { fontSize: 16, fontWeight: 700, color: on ? C.olive : C.faint } }, on ? '✓' : '+'));
    };
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(20,14,8,0.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 24 } },
      h('div', { onClick: (e) => e.stopPropagation(), className: 'ed-pop', style: { width: '100%', maxWidth: 560, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: C.cream, borderRadius: 16, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)' } },
        h('div', { style: { padding: '18px 22px 15px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' } },
          h('div', null, h('div', { style: { fontFamily: FONT_D, fontSize: 22, color: C.ink } }, 'Add a section'), h('div', { style: { fontSize: 12.5, color: C.muted, marginTop: 3 } }, 'Pick what your celebration needs — chosen for a wedding.')),
          h('button', { onClick: onClose, style: { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.muted, cursor: 'pointer' } }, '✕')),
        h('div', { className: 'ed-scroll', style: { flex: 1, overflowY: 'auto', padding: 18 } },
          h(GLabel, null, 'Core sections'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 22 } }, ADD_CORE.map((c) => card('c-' + c[0], c[0], c[1], false))),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 11px' } }, h('span', { style: { fontFamily: FONT_M, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.goldInk } }, '✦ Atelier blocks'), h('span', { style: { flex: 1, height: 1, background: C.line } })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 } }, ADD_BLOCKS.map((b) => card('b-' + b[0], b[0], b[1], b[2] && !premium)))),
        h('div', { style: { padding: '12px 18px', borderTop: '1px solid ' + C.line, display: 'flex', justifyContent: 'flex-end' } }, h('button', { onClick: onClose, style: { padding: '9px 22px', borderRadius: 8, border: 'none', background: C.olive, color: C.cream, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, 'Done'))));
  }

  /* ════ FITTING ROOM — try your site on under each look (#5) ════ */
  function FittingRoom({ open, onClose, current, onWear }) {
    const [tryId, setTryId] = useState(current);
    const ref = useRef(null);
    const tryRef = useRef(current); tryRef.current = tryId;
    useEffect(() => { if (open) setTryId(current); }, [open, current]);
    useEffect(() => { const f = ref.current; if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'pl:set', key: 'theme', value: tryId }, '*'); }, [tryId]);
    if (!open) return null;
    const themes = window.PL_THEMES;
    const t = window.PL_getTheme(tryId);
    const prem = PREMIUM_THEMES.has(tryId);
    return h('div', { style: { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(16,11,6,0.72)', WebkitBackdropFilter: 'blur(5px)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column' } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', flexShrink: 0 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h(Glyph, { size: 26 }),
          h('div', null,
            h('div', { style: { fontFamily: FONT_D, fontStyle: 'italic', fontSize: 21, color: C.cream, lineHeight: 1 } }, 'The fitting room'),
            h('div', { style: { fontFamily: FONT_M, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(251,247,238,0.55)', marginTop: 4 } }, 'Try your site on for size'))),
        h('button', { onClick: onClose, style: { width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(251,247,238,0.22)', background: 'rgba(251,247,238,0.08)', color: C.cream, cursor: 'pointer', fontSize: 15 } }, '\u2715')),
      h('div', { style: { flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 22px' } },
        h('div', { style: { width: '100%', maxWidth: 1040, height: '100%', borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 30px 80px -24px rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.3)' } },
          h('iframe', { ref: ref, onLoad: () => { const f = ref.current; if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'pl:set', key: 'theme', value: tryRef.current }, '*'); }, src: '../site-renderer/index.html?embed=1&preview=1&theme=' + tryId, title: 'Fitting room preview', style: { width: '100%', height: '100%', border: 'none', display: 'block' } }))),
      h('div', { style: { flexShrink: 0, padding: '14px 22px 18px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 11 } },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 } },
            h('span', { style: { fontFamily: FONT_D, fontSize: 18, color: C.cream } }, t.name),
            prem && h('span', { style: { fontFamily: FONT_M, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gold } }, '\u2726 Atelier'),
            h('span', { style: { fontSize: 11.5, color: 'rgba(251,247,238,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, t.blurb)),
          h('button', { onClick: () => onWear(tryId), style: { flexShrink: 0, padding: '10px 22px', borderRadius: 999, border: 'none', background: tryId === current ? 'rgba(251,247,238,0.14)' : C.cream, color: tryId === current ? 'rgba(251,247,238,0.7)' : C.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, tryId === current ? 'You\u2019re wearing this' : 'Wear this look')),
        h('div', { className: 'ed-scroll', style: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 } },
          themes.map((th) => {
            const on = tryId === th.id;
            return h('button', { key: th.id, onClick: () => setTryId(th.id), title: th.name, style: { flexShrink: 0, width: 92, padding: 7, borderRadius: 11, cursor: 'pointer', border: '1.5px solid ' + (on ? C.gold : 'rgba(251,247,238,0.2)'), background: on ? 'rgba(251,247,238,0.12)' : 'rgba(251,247,238,0.04)' } },
              h('div', { style: { display: 'flex', borderRadius: 6, overflow: 'hidden', marginBottom: 6, height: 30 } }, th.swatches.slice(0, 4).map((c, i) => h('span', { key: i, style: { flex: 1, background: c } }))),
              h('div', { style: { fontSize: 10, fontWeight: on ? 700 : 600, color: on ? C.cream : 'rgba(251,247,238,0.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' } }, th.name));
          }))));
  }

  /* ════ SITE FILE — one document: back up · move · duplicate ════ */
  function SiteFileModal({ open, onClose }) {
    const inputRef = useRef(null);
    const [msg, setMsg] = useState(null);
    if (!open) return null;
    const KEYS = ['pl-editor-design', 'pl-site-content', 'pl-site-edits', 'pl-site-images', 'pl-site-library', 'pl-site-rsvps'];
    const sizeKB = (() => { let n = 0; KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v) n += v.length; }); return Math.round(n / 1024); })();
    const doExport = () => {
      const doc = { _pearloom: 1, savedAt: new Date().toISOString() };
      KEYS.forEach((k) => { doc[k] = localStorage.getItem(k); });
      const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pearloom-site.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setMsg('Downloaded pearloom-site.json');
    };
    const doImport = (file) => {
      if (!file) return; const r = new FileReader();
      r.onload = () => { try { const doc = JSON.parse(r.result); if (!doc || !doc._pearloom) { setMsg('That doesn\u2019t look like a Pearloom site file.'); return; } KEYS.forEach((k) => { if (typeof doc[k] === 'string') localStorage.setItem(k, doc[k]); }); setMsg('Loaded \u2014 reopening\u2026'); setTimeout(() => location.reload(), 600); } catch (e) { setMsg('That file could not be read.'); } };
      r.readAsText(file);
    };
    const btn = (label, onClick, primary) => h('button', { onClick, style: { flex: 1, padding: '12px', borderRadius: 10, border: primary ? 'none' : '1px solid ' + C.line, background: primary ? C.olive : C.card, color: primary ? C.cream : C.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, label);
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,14,8,0.5)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24, fontFamily: "'Inter',system-ui,sans-serif" } },
      h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 460, background: C.cream, borderRadius: 16, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)' } },
        h('div', { style: { padding: '18px 20px 15px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 } },
          h('div', null,
            h('div', { style: { fontFamily: FONT_D, fontSize: 21, color: C.ink, lineHeight: 1.1 } }, 'Site file'),
            h('div', { style: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 } }, 'One file holds your whole site \u2014 design, words, photos and replies. Back it up, move it, or duplicate it.')),
          h('button', { onClick: onClose, style: { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.muted, cursor: 'pointer', fontSize: 14, flexShrink: 0 } }, '\u2715')),
        h('div', { style: { padding: 18 } },
          h('div', { style: { fontSize: 11.5, color: C.faint, marginBottom: 12 } }, 'This site \u2248 ' + sizeKB + ' KB'),
          h('div', { style: { display: 'flex', gap: 8 } }, btn('\u2913  Export', doExport, true), btn('\u2911  Import', () => inputRef.current && inputRef.current.click(), false)),
          h('input', { ref: inputRef, type: 'file', accept: 'application/json,.json', onChange: (e) => { doImport(e.target.files && e.target.files[0]); e.target.value = ''; }, style: { display: 'none' } }),
          h('div', { style: { fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.5 } }, 'Importing replaces what\u2019s on this site and reopens the editor.'),
          msg && h('div', { style: { fontSize: 12, color: C.olive, marginTop: 10, fontWeight: 600 } }, msg))));
  }

  /* ════ GUESTS — RSVPs collected from the published site ════ */
  function GuestsModal({ open, onClose, nonce }) {
    const list = (() => { if (!open) return []; try { return JSON.parse(localStorage.getItem('pl-site-rsvps') || '[]'); } catch { return []; } })();
    if (!open) return null;
    const yes = list.filter((r) => r.attending === 'yes');
    const no = list.filter((r) => r.attending !== 'yes');
    const heads = yes.reduce((n, r) => n + (Number(r.party) || 1), 0);
    const stat = (n, l) => h('div', { style: { flex: 1, textAlign: 'center', padding: '12px 6px', background: C.card, border: '1px solid ' + C.line, borderRadius: 11 } },
      h('div', { style: { fontFamily: FONT_D, fontSize: 26, color: C.ink, lineHeight: 1 } }, n),
      h('div', { style: { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginTop: 5 } }, l));
    const when = (t) => { try { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,14,8,0.5)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24, fontFamily: "'Inter',system-ui,sans-serif" } },
      h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 560, maxHeight: '84vh', display: 'flex', flexDirection: 'column', background: C.cream, borderRadius: 16, border: '1px solid ' + C.line, overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)' } },
        h('div', { style: { padding: '17px 20px 14px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 } },
          h('div', null,
            h('div', { style: { fontFamily: FONT_D, fontSize: 21, color: C.ink, lineHeight: 1.1 } }, 'Guest replies'),
            h('div', { style: { fontSize: 12, color: C.muted, marginTop: 4 } }, list.length ? 'Replies land here as guests RSVP on your site.' : 'No replies yet.')),
          h('button', { onClick: onClose, style: { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.line, background: C.card, color: C.muted, cursor: 'pointer', fontSize: 14, flexShrink: 0 } }, '✕')),
        h('div', { className: 'ed-scroll', style: { flex: 1, overflowY: 'auto', padding: 18 } },
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } }, stat(heads, 'Coming'), stat(yes.length, 'Yes'), stat(no.length, 'Regrets')),
          list.length === 0
            ? h('div', { style: { textAlign: 'center', padding: '26px 16px', color: C.muted, lineHeight: 1.5, fontSize: 12.5 } }, h('div', { style: { fontSize: 28, marginBottom: 8 } }, '✉'), 'When someone replies on your published site, their name, headcount and note will appear here.')
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, list.slice().reverse().map((r, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 11, padding: 12, background: C.card, border: '1px solid ' + C.lineSoft, borderRadius: 11 } },
                h('span', { style: { width: 9, height: 9, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: r.attending === 'yes' ? C.olive : C.plum } }),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
                    h('span', { style: { fontWeight: 700, fontSize: 13.5, color: C.ink } }, r.name || 'Someone'),
                    h('span', { style: { fontSize: 11, color: r.attending === 'yes' ? C.olive : C.plum, fontWeight: 600 } }, r.attending === 'yes' ? ('Coming · ' + (Number(r.party) || 1)) : 'Regrets'),
                    h('span', { style: { marginLeft: 'auto', fontSize: 10.5, color: C.faint } }, when(r.at))),
                  r.note && h('div', { style: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.45, fontStyle: 'italic' } }, '“' + r.note + '”'))))))));
  }

  /* ════ INLINE LAYOUT BAR — switch the selected section's layout on-canvas ════ */
  function InlineLayoutBar({ iframeRef, selId, value, onPick }) {
    const opts = SECTION_LAYOUTS[selId];
    const [pos, setPos] = useState(null);
    useEffect(() => {
      if (!opts) { setPos(null); return; }
      let stop = false;
      const tick = () => {
        if (stop) return;
        const f = iframeRef.current;
        if (f && f.contentDocument) {
          const fr = f.getBoundingClientRect();
          const el = f.contentDocument.getElementById(selId);
          if (el) {
            const r = el.getBoundingClientRect();
            const onScreen = r.top < fr.height - 24 && r.bottom > 56;
            const top = onScreen ? Math.max(fr.top + 10, Math.min(fr.top + r.top + 12, fr.bottom - 46)) : (fr.top + 12);
            const left = onScreen ? (fr.left + r.left + r.width / 2) : (fr.left + fr.width / 2);
            setPos({ top, left });
          } else setPos(null);
        }
        setTimeout(tick, 200);
      };
      tick();
      return () => { stop = true; };
    }, [selId]);
    if (!opts || !pos) return null;
    return h('div', { style: { position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 58, display: 'flex', alignItems: 'center', gap: 2, padding: 4, borderRadius: 999, background: 'rgba(255,253,247,0.97)', WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)', border: '1px solid ' + C.line, boxShadow: '0 10px 28px -8px rgba(40,28,12,0.4)', fontFamily: "'Inter',system-ui,sans-serif", transition: 'top .3s cubic-bezier(.22,.61,.36,1), left .3s cubic-bezier(.22,.61,.36,1)', maxWidth: '92vw', overflowX: 'auto' } },
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, padding: '0 7px 0 9px', whiteSpace: 'nowrap' } },
        h('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M3 5h18M3 12h18M3 19h10' })), 'Layout'),
      opts.map(([v, l]) => { const on = value === v; return h('button', { key: v, onClick: () => onPick(v), style: { padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: on ? C.olive : 'transparent', color: on ? C.cream : C.inkSoft, whiteSpace: 'nowrap', fontFamily: 'inherit' } }, l); }));
  }

  /* ════ LIVE PRESENCE — a co-host editing alongside you ════ */
  const PEER = { id: 'jun', name: 'Jun', initial: 'J', color: '#C19A4B' };
  function PresenceLayer({ iframeRef, section, peer }) {
    const [box, setBox] = useState(null);
    useEffect(() => {
      let stop = false;
      const tick = () => {
        if (stop) return;
        const f = iframeRef.current;
        if (f && f.contentDocument) {
          const fr = f.getBoundingClientRect();
          const el = f.contentDocument.getElementById(section);
          if (el) {
            const r = el.getBoundingClientRect();
            const visible = r.bottom > 8 && r.top < fr.height - 8;
            const top = Math.max(fr.top, Math.min(fr.top + r.top, fr.bottom));
            const height = Math.max(0, Math.min(fr.top + r.bottom, fr.bottom) - top);
            setBox({ top, left: fr.left + r.left, width: r.width, height, flagY: Math.max(fr.top + 4, fr.top + r.top), visible });
          } else setBox(null);
        }
        setTimeout(tick, 220);
      };
      tick();
      return () => { stop = true; };
    }, [section]);
    if (!box || !box.visible || box.height < 12) return null;
    const ease = 'top .5s cubic-bezier(.22,.61,.36,1), left .5s cubic-bezier(.22,.61,.36,1), width .5s, height .5s';
    return h(React.Fragment, null,
      h('div', { 'aria-hidden': true, style: { position: 'fixed', top: box.top, left: box.left, width: box.width, height: box.height, border: '2px solid ' + peer.color, borderRadius: 7, pointerEvents: 'none', zIndex: 55, boxShadow: '0 0 0 4px ' + peer.color + '22, inset 0 0 0 1px ' + peer.color + '55', transition: ease } }),
      h('div', { 'aria-hidden': true, style: { position: 'fixed', top: box.flagY, left: box.left + 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 999, background: peer.color, color: '#241a08', fontSize: 11, fontWeight: 800, pointerEvents: 'none', zIndex: 56, boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45)', transition: 'top .5s cubic-bezier(.22,.61,.36,1), left .5s cubic-bezier(.22,.61,.36,1)', whiteSpace: 'nowrap', fontFamily: "'Inter',system-ui,sans-serif" } },
        h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700 } }, peer.initial),
        peer.name + ' is editing'));
  }

  /* ════════════════════ APP ════════════════════ */
  function App() {
    const DOC = (() => { try { return JSON.parse(localStorage.getItem('pl-editor-design') || '{}') || {}; } catch { return {}; } })();
    const ST_DEFAULTS = { theme: 'garden', texture: null, divider: 'auto', motif: 'auto', density: 'comfortable', hero: 'centered', story: 'sidebyside', kit: 'classic', premium: false, nav: 'centered', navm: 'overlay', footer: 'signature' };
    const [st, setSt] = useState(Object.assign({}, ST_DEFAULTS, DOC.st || {}));
    const [tab, setTab] = useState('design');
    const [device, setDevice] = useState('desktop');
    const [selId, setSelId] = useState(null);
    const [hidden, setHidden] = useState(() => DOC.hidden || {});
    const [saved, setSaved] = useState(true);
    const [upgrade, setUpgrade] = useState(false);
    const [storeOpen, setStoreOpen] = useState(false);
    const [applied, setApplied] = useState(null);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [cohostOpen, setCohostOpen] = useState(false);
    const [decorOpen, setDecorOpen] = useState(false);
    const [picks, setPicks] = useState(null);
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editMode, setEditModeState] = useState(true);
    const [order, setOrder] = useState((Array.isArray(DOC.order) && DOC.order.length) ? DOC.order : DEFAULT_ORDER);
    const [edits, setEdits] = useState(() => { try { return JSON.parse(localStorage.getItem('pl-site-edits') || '{}'); } catch { return {}; } });
    const [imagesMap, setImagesMap] = useState(() => { try { return JSON.parse(localStorage.getItem('pl-site-images') || '{}'); } catch { return {}; } });
    const [content, setContent] = useState(() => { try { const s = JSON.parse(localStorage.getItem('pl-site-content') || 'null'); return (s && Object.keys(s).length) ? Object.assign({}, DEFAULT_CONTENT, s) : Object.assign({}, DEFAULT_CONTENT); } catch { return Object.assign({}, DEFAULT_CONTENT); } });
    const [fittingOpen, setFittingOpen] = useState(false);
    const [guestsOpen, setGuestsOpen] = useState(false);
    const [siteFileOpen, setSiteFileOpen] = useState(false);
    const [peerSection, setPeerSection] = useState('top');
    const [rsvpNonce, setRsvpNonce] = useState(0);
    const [histState, setHistState] = useState({ canUndo: false, canRedo: false });
    const iframeRef = useRef(null);
    const readyRef = useRef(false);
    const stRef = useRef(st); stRef.current = st;
    const orderRef = useRef(order); orderRef.current = order;
    const hiddenRef = useRef(hidden); hiddenRef.current = hidden;
    const editsRef = useRef(edits); editsRef.current = edits;
    const imagesRef = useRef(imagesMap); imagesRef.current = imagesMap;
    const contentRef = useRef(content); contentRef.current = content;
    const histRef = useRef({ stack: [], idx: -1, applying: false });
    const undoRef = useRef(null); const redoRef = useRef(null);

    const sendToCanvas = useCallback((key, value) => {
      const f = iframeRef.current; if (!f || !f.contentWindow) return;
      f.contentWindow.postMessage({ type: 'pl:set', key, value }, '*');
    }, []);

    const setEditMode = useCallback((v) => { setEditModeState(v); sendToCanvas('editMode', v); }, [sendToCanvas]);
    const updateContent = useCallback((patch) => { setContent((c) => { const n = Object.assign({}, c, patch); try { localStorage.setItem('pl-site-content', JSON.stringify(n)); } catch { /* */ } sendToCanvas('content', n); return n; }); setSaved(false); }, [sendToCanvas]);
    const [drafting, setDrafting] = useState(null);
    const onDraft = useCallback(async (kind) => {
      if (drafting) return;
      if (!(window.claude && typeof window.claude.complete === 'function')) { setDrafting('__noapi'); setTimeout(() => setDrafting(null), 2600); return; }
      setDrafting(kind);
      const c = contentRef.current || {};
      const who = (c.coupleType === 'solo') ? (c.names && c.names[0]) : ((c.names && c.names[0]) + ' & ' + (c.names && c.names[1]));
      const base = `Hosts: ${who}. Date: ${c.date}. Place: ${c.place}. Voice: warm, literary, understated — never cheesy or salesy.`;
      const P = {
        story: `${base}\nWrite their "how we met / our story" in first person plural, 2–4 sentences. Return ONLY minified JSON: {"eyebrow":"Our story","title":"How we","italic":"met","body":"..."}`,
        warm: `${base}\nRewrite this story copy warmer and more personal, same meaning, 2–4 sentences. Current: "${(c.story && c.story.body) || ''}". Return ONLY minified JSON: {"body":"..."}`,
        faq: `${base}\nWrite 4 concise FAQ items guests would ask for this event, answered in the hosts' voice. Return ONLY minified JSON: {"qa":[{"q":"...","a":"..."}]}`,
        schedule: `${base}\nWrite a 4–5 moment day-of timeline. Each: t (time e.g. "4:30 pm"), l (short title), s (short location/detail). Return ONLY minified JSON: {"rows":[{"t":"","l":"","s":""}]}`,
        registry: `${base}\nWrite a one-sentence registry intro plus 3–4 registry destinations (funds or shops). Return ONLY minified JSON: {"body":"...","stores":["..."]}`,
        travel: `${base}\nSuggest 3 real, well-known places to stay near the venue location for out-of-town guests — a mix of price points. For each: name (real hotel/inn if you know one for that area, else a plausible type like "a downtown boutique hotel"), area (short location or distance to venue), blurb (one warm sentence), and link (a Google search URL like "https://www.google.com/search?q=NAME+CITY"). Return ONLY minified JSON: {"hotels":[{"name":"","area":"","blurb":"","link":""}]}`,
      };
      try {
        const raw = await window.claude.complete(P[kind] || P.story);
        const json = JSON.parse(String(raw).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
        const cur = contentRef.current || {};
        if (kind === 'story') updateContent({ story: Object.assign({}, cur.story, { eyebrow: json.eyebrow || cur.story.eyebrow, title: json.title || cur.story.title, italic: json.italic || cur.story.italic, body: json.body || cur.story.body }) });
        else if (kind === 'warm' && json.body) updateContent({ story: Object.assign({}, cur.story, { body: json.body }) });
        else if (kind === 'faq' && Array.isArray(json.qa) && json.qa.length) updateContent({ faq: json.qa });
        else if (kind === 'schedule' && Array.isArray(json.rows) && json.rows.length) updateContent({ schedule: json.rows });
        else if (kind === 'registry') updateContent({ registry: Array.isArray(json.stores) && json.stores.length ? json.stores : cur.registry, registryBody: json.body || cur.registryBody });
        else if (kind === 'travel' && Array.isArray(json.hotels) && json.hotels.length) updateContent({ travel: json.hotels.slice(0, 6) });
      } catch (e) { setDrafting('__err'); setTimeout(() => setDrafting(null), 2600); return; }
      setDrafting(null);
    }, [drafting, updateContent]);
    /* Travel: when empty + a venue is set, let Pear suggest stays once on open. */
    const autoTravelRef = useRef(false);
    useEffect(() => {
      if (selId === 'travel' && !((content.travel || []).length) && content.place && !autoTravelRef.current && window.claude && typeof window.claude.complete === 'function') {
        autoTravelRef.current = true; onDraft('travel');
      }
    }, [selId, content.travel, content.place, onDraft]);
    const reorder = useCallback((next) => { setOrder(next); sendToCanvas('order', next); setSaved(false); }, [sendToCanvas]);
    const toggleHidden = useCallback((id) => { setHidden((hh) => { const n = Object.assign({}, hh, { [id]: !hh[id] }); sendToCanvas('hidden', n); return n; }); setSaved(false); }, [sendToCanvas]);
    const openLibrary = useCallback(() => { const f = iframeRef.current; if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'pl:openLibrary' }, '*'); }, []);
    const onTool = useCallback((id) => { if (id === 'photos') openLibrary(); else if (id === 'fitting') setFittingOpen(true); else if (id === 'guests') setGuestsOpen(true); else if (id === 'sitefile') setSiteFileOpen(true); }, [openLibrary]);

    /* History — snapshot the whole doc; undo/redo re-pushes to canvas. */
    const snapshot = () => ({ st: Object.assign({}, stRef.current), order: orderRef.current.slice(), hidden: Object.assign({}, hiddenRef.current), edits: Object.assign({}, editsRef.current), images: Object.assign({}, imagesRef.current), content: Object.assign({}, contentRef.current) });
    const applySnap = (snap) => {
      histRef.current.applying = true;
      setSt(snap.st); setOrder(snap.order); setHidden(snap.hidden); setEdits(snap.edits); setImagesMap(snap.images); if (snap.content) setContent(snap.content); setApplied(null);
      ['theme', 'texture', 'density', 'hero', 'story', 'kit', 'premium', 'nav', 'footer'].forEach((k) => sendToCanvas(k, snap.st[k]));
      sendToCanvas('order', snap.order); sendToCanvas('hidden', snap.hidden); sendToCanvas('edits', snap.edits); sendToCanvas('images', snap.images); if (snap.content) sendToCanvas('content', snap.content);
      setSaved(false);
    };
    const undo = useCallback(() => { const H = histRef.current; if (H.idx <= 0) return; H.idx -= 1; applySnap(H.stack[H.idx]); setHistState({ canUndo: H.idx > 0, canRedo: true }); }, [sendToCanvas]);
    const redo = useCallback(() => { const H = histRef.current; if (H.idx >= H.stack.length - 1) return; H.idx += 1; applySnap(H.stack[H.idx]); setHistState({ canUndo: H.idx > 0, canRedo: H.idx < H.stack.length - 1 }); }, [sendToCanvas]);
    undoRef.current = undo; redoRef.current = redo;
    useEffect(() => {
      const H = histRef.current;
      if (H.applying) { H.applying = false; return; }
      const snap = snapshot();
      if (H.idx < 0) { H.stack = [snap]; H.idx = 0; setHistState({ canUndo: false, canRedo: false }); return; }
      if (JSON.stringify(H.stack[H.idx]) === JSON.stringify(snap)) return;
      H.stack = H.stack.slice(0, H.idx + 1); H.stack.push(snap); if (H.stack.length > 80) H.stack.shift(); H.idx = H.stack.length - 1;
      setHistState({ canUndo: H.idx > 0, canRedo: false });
    }, [st, order, hidden, edits, imagesMap, content]);

    /* A control changed something — update editor state, push to canvas. */
    const set = useCallback((key, value) => {
      if (key === '_tab') { setTab(value); return; }
      setSt((s) => {
        const next = Object.assign({}, s, { [key]: value });
        if (key === 'theme') { next.texture = null; next.divider = 'auto'; next.motif = 'auto'; } // theme resets paper + ornaments to its defaults
        return next;
      });
      if (key === '_store') { setStoreOpen(value); return; }
      setSaved(false);
      sendToCanvas(key, value);
      if (key === 'theme') { sendToCanvas('texture', null); sendToCanvas('themeVars', null); sendToCanvas('divider', 'auto'); sendToCanvas('motif', 'auto'); setApplied(null); }
    }, [sendToCanvas]);

    const applyPack = useCallback((p) => {
      const kit = KIT_FALLBACK[p.kit] || p.kit;
      const tex = TEX_FALLBACK[p.texture] || p.texture;
      setSt((s) => Object.assign({}, s, { kit, texture: tex }));
      sendToCanvas('themeVars', p.vars);
      sendToCanvas('kit', kit);
      sendToCanvas('texture', tex);
      setApplied(p.id); setSaved(false);
    }, [sendToCanvas]);

    /* Fake autosave settle. */
    useEffect(() => { if (saved) return; const t = setTimeout(() => setSaved(true), 900); return () => clearTimeout(t); }, [saved, st]);

    /* Persist the design document (survives editor reload + feeds export). */
    useEffect(() => { try { localStorage.setItem('pl-editor-design', JSON.stringify({ st, order, hidden })); } catch { /* */ } }, [st, order, hidden]);

    /* A co-host (Jun) editing alongside you: drift their focus across visible sections. */
    useEffect(() => {
      const vis = (order || []).filter((id) => !hidden[id]);
      if (vis.length < 2) return;
      setPeerSection((p) => (vis.includes(p) ? p : vis[0]));
      const t = setInterval(() => { setPeerSection((p) => { const i = vis.indexOf(p); return vis[(i + 1) % vis.length]; }); }, 4800);
      return () => clearInterval(t);
    }, [order, hidden]);

    /* Listen to the canvas — selection + ready handshake. */
    useEffect(() => {
      const onMsg = (e) => {
        const d = e.data; if (!d || typeof d !== 'object') return;
        if (d.type === 'pl:ready') { readyRef.current = true; pushAll(); }
        else if (d.type === 'pl:select') { setSelId(d.id); setTab('content'); }
        else if (d.type === 'pl:order' && Array.isArray(d.order)) setOrder(d.order);
        else if (d.type === 'pl:edit') { setSaved(false); if (d.edits) setEdits(d.edits); }
        else if (d.type === 'pl:image') { setSaved(false); if (d.images) setImagesMap(d.images); }
        else if (d.type === 'pl:rsvp-new') setRsvpNonce((n) => n + 1);
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, []);

    const pushAll = () => { ['theme', 'texture', 'divider', 'motif', 'density', 'hero', 'story', 'kit', 'premium', 'nav', 'footer'].forEach((k) => sendToCanvas(k, st[k])); sendToCanvas('content', content); sendToCanvas('editMode', editMode); sendToCanvas('order', order); sendToCanvas('hidden', hidden); sendToCanvas('edits', edits); sendToCanvas('images', imagesMap); };

    const onSelect = (id) => { setSelId(id); setTab('content'); const f = iframeRef.current; if (f && f.contentWindow) { f.contentWindow.postMessage({ type: 'pl:select', id }, '*'); try { const el = f.contentDocument.getElementById(id); if (el) f.contentWindow.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + (f.contentWindow.scrollY || 0) - 24), behavior: 'smooth' }); } catch (e) { /* */ } } };

    /* Pear actions from the command bar — rich, visual results. */
    const onAction = (kind, text) => {
      if (kind === 'look') { setStoreOpen(true); return; }
      const t = (text || '').toLowerCase();
      const m = kind === 'hotels' ? 'travel' : kind === 'moment' ? 'schedule' : kind === 'faq' ? 'faq' : (kind === 'story' || kind === 'warm') ? 'story'
        : /hotel|stay|where/.test(t) ? 'travel' : /schedule|timeline|moment|day/.test(t) ? 'schedule' : /registr|gift|fund/.test(t) ? 'registry' : /faq|question/.test(t) ? 'faq' : /gallery|photo/.test(t) ? 'gallery' : 'story';
      setPicks(m);
    };
    useEffect(() => {
      const onKey = (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true); return; }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); if (e.shiftKey) { redoRef.current && redoRef.current(); } else { undoRef.current && undoRef.current(); } }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);

    return h('div', { style: { display: 'grid', height: '100vh', gridTemplateRows: '56px 1fr', gridTemplateColumns: '248px 1fr 340px', gridTemplateAreas: '"top top top" "left canvas right"' } },
      h(Topbar, { device, setDevice, editMode, setEditMode, undo, redo, canUndo: histState.canUndo, canRedo: histState.canRedo, premium: st.premium, onUpgrade: () => setUpgrade(true), onPublish: () => {}, saved, onCmd: () => setCmdOpen(true), onDecor: () => setTab('design'), onStore: () => setStoreOpen(true), onCoHost: () => setCohostOpen(true), onProfile: () => setProfileOpen(true), onProgress: () => setChecklistOpen(true), progress: 62 }),
      h(SectionRail, { selId, onSelect, hidden, toggleHidden, onCoHost: () => setCohostOpen(true), onTool, onAdd: () => setAddOpen(true), order, onReorder: reorder }),
      h(Canvas, { device, iframeRef, onLoad: () => { if (readyRef.current) pushAll(); } }),
      editMode && device === 'desktop' && h(PresenceLayer, { iframeRef, section: peerSection, peer: PEER }),
      editMode && device === 'desktop' && selId && SECTION_LAYOUTS[selId] && h(InlineLayoutBar, { iframeRef, selId, value: selId === 'top' ? st.hero : selId === 'story' ? st.story : ((content.layouts && content.layouts[selId]) || LAYOUT_DEFAULT[selId]), onPick: (v) => { if (selId === 'top') set('hero', v); else if (selId === 'story') set('story', v); else updateContent({ layouts: Object.assign({}, content.layouts, { [selId]: v }) }); } }),
      h(Inspector, { tab, setTab, st, set, selId, content, updateContent, onDraft, drafting, applied, onPicks: (kind) => setPicks(kind || 'travel'), onCmd: () => setCmdOpen(true) }),
      h('button', { onClick: () => setCmdOpen(true), style: { position: 'fixed', left: 20, bottom: 20, zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 15px', borderRadius: 999, border: 'none', cursor: 'pointer', background: C.olive, color: C.cream, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 10px 26px -8px rgba(40,28,12,0.5)' } }, '✦ Ask Pear', h('kbd', { style: { fontFamily: FONT_M, fontSize: 9, background: 'rgba(255,255,255,0.18)', borderRadius: 4, padding: '1px 5px' } }, '⌘K')),
      h(CmdBar, { open: cmdOpen, onClose: () => setCmdOpen(false), onJump: onSelect, onAction }),
      h(ProfileMenu, { open: profileOpen, onClose: () => setProfileOpen(false) }),
      h(CoHostModal, { open: cohostOpen, onClose: () => setCohostOpen(false) }),
      h(DecorDrawer, { open: decorOpen, onClose: () => setDecorOpen(false), premium: st.premium, onUnlock: () => { setDecorOpen(false); setUpgrade(true); } }),
      h(PearBlocks, { open: !!picks, kind: picks, onClose: () => setPicks(null) }),
      h(Checklist, { open: checklistOpen, onClose: () => setChecklistOpen(false), onJump: onSelect, onPear: (k) => setPicks(k), onCoHost: () => setCohostOpen(true) }),
      h(AddSection, { open: addOpen, onClose: () => setAddOpen(false), premium: st.premium, order, onInsert: (id) => { if (!order.includes(id)) { const o = order.slice(); const after = o.indexOf('travel'); o.splice(after >= 0 ? after + 1 : o.length, 0, id); reorder(o); } setSelId(id); setTab('content'); } }),
      h(Store, { open: storeOpen, onClose: () => setStoreOpen(false), applied, premium: st.premium, onApply: applyPack, onUnlock: () => { if (!st.premium) setUpgrade(true); } }),
      h(FittingRoom, { open: fittingOpen, onClose: () => setFittingOpen(false), current: st.theme, onWear: (id) => { set('theme', id); setFittingOpen(false); } }),
      h(GuestsModal, { open: guestsOpen, onClose: () => setGuestsOpen(false), nonce: rsvpNonce }),
      h(SiteFileModal, { open: siteFileOpen, onClose: () => setSiteFileOpen(false) }),
      h(UpgradeModal, { open: upgrade, onClose: () => setUpgrade(false), premium: st.premium, setPremium: (v) => set('premium', v) }));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
