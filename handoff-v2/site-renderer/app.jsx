/* Pearloom — published-site shell. Mirrors PublishedSiteShell +
   ThemedSite's root: emits themeRootStyle() onto .pl8-guest, sets
   data-pl-texture / data-pl-density, stacks the sections, and wires
   the RSVP modal. Plus a live control panel to explore every theme
   setting (theme / paper / density / hero + story layout). */
(function () {
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;
  const S = window.PearSite;
  /* Embed mode — when the renderer runs inside the editor iframe, it
     hides its own floating panel, accepts state via postMessage, and
     reports section selection back to the editor shell. */
  const EMBED = (() => { try { return new URLSearchParams(location.search).get('embed') === '1' || window.self !== window.top; } catch { return false; } })();
  const post = (type, extra) => { try { window.parent.postMessage(Object.assign({ type }, extra), '*'); } catch (e) { /* */ } };

  const NAV_ITEMS = [
    { id: 'story', label: 'Our story' },
    { id: 'details', label: 'Details' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'travel', label: 'Travel' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'registry', label: 'Registry' },
    { id: 'faq', label: 'FAQ' },
  ];

  const TEXTURES = ['paper', 'linen', 'watercolor', 'cotton', 'velvet', 'none'];
  const TEXTURE_LABEL = { paper: 'Pressed paper', linen: 'Linen weave', watercolor: 'Watercolor', cotton: 'Cotton rag', velvet: 'Velvet', none: 'Smooth' };
  const DENSITIES = ['cozy', 'comfortable', 'spacious'];
  const HEROES = ['centered', 'split', 'minimal', 'postcard', 'typographic', 'fullbleed'];
  const STORIES = ['sidebyside', 'stacked', 'quote', 'letter'];
  const KITS = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal', 'arch', 'stamp', 'deco', 'gallery', 'menu', 'boarding-pass', 'marquee', 'chalkboard', 'nursery', 'certificate', 'kraft', 'luggage-tag', 'memoriam'];
  const PREMIUM_KITS = ['neon', 'marquee-live', 'aurora-glass', 'gold-foil', 'confetti', 'candlelight', 'pressed-bloom', 'vinyl'];
  const KIT_LABEL = { 'boarding-pass': 'boarding pass', 'luggage-tag': 'luggage tag', 'marquee-live': 'marquee live', 'aurora-glass': 'aurora glass', 'gold-foil': 'gold foil', 'pressed-bloom': 'pressed bloom' };

  /* ─── RSVP modal — the 90-second reply ──────────────────────── */
  function RsvpModal({ open, onClose, C }) {
    const [sent, setSent] = useState(false);
    const [attending, setAttending] = useState('yes');
    const [name, setName] = useState('');
    const [party, setParty] = useState(2);
    const [note, setNote] = useState('');
    useEffect(() => { if (open) { setSent(false); setName(''); setParty(2); setNote(''); setAttending('yes'); } }, [open]);
    const submit = (e) => {
      e.preventDefault();
      const rec = { name: name.trim(), attending, party: attending === 'yes' ? Number(party) || 1 : 0, note: note.trim(), at: Date.now() };
      try { const list = JSON.parse(localStorage.getItem('pl-site-rsvps') || '[]'); list.push(rec); localStorage.setItem('pl-site-rsvps', JSON.stringify(list)); } catch { /* */ }
      if (EMBED) post('pl:rsvp-new', { rec });
      setSent(true);
    };
    if (!open) return null;
    const field = { width: '100%', padding: '11px 14px', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line)', background: 'var(--t-paper)', color: 'var(--t-ink)', fontSize: 14, outline: 'none', fontFamily: 'var(--t-body)', boxSizing: 'border-box' };
    const label = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 6, display: 'block' };
    return h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(20,14,8,0.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 20 } },
      h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxWidth: 440, background: 'var(--t-card)', borderRadius: 'var(--t-radius-lg)', border: '1px solid var(--t-line)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)', padding: '30px 30px 28px', color: 'var(--t-ink)', fontFamily: 'var(--t-body)' } },
        sent
          ? h('div', { style: { textAlign: 'center', padding: '20px 0' } },
              h('div', { style: { display: 'inline-flex', marginBottom: 14 } }, h(S.OliveSprig, { size: 44 })),
              h('h3', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 28, margin: '0 0 8px', color: 'var(--t-ink)' } }, attending === 'yes' ? 'See you there.' : 'We will miss you.'),
              h('p', { style: { fontSize: 14, color: 'var(--t-ink-soft)', margin: 0, lineHeight: 1.55 } }, attending === 'yes' ? 'Your seat is saved. We will send the details closer to the day.' : 'Thank you for letting us know — you will be with us in spirit.'),
              h('button', { onClick: onClose, style: { marginTop: 22, padding: '11px 26px', borderRadius: 999, border: 'none', background: 'var(--t-ink)', color: 'var(--t-paper)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--t-body)' } }, 'Done'))
          : h('form', { onSubmit: submit },
              h('div', { style: { fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 6 } }, C.rsvp.eyebrow),
              h('h3', { style: { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 30, margin: '0 0 18px', color: 'var(--t-ink)' } }, C.rsvp.title),
              h('div', { style: { marginBottom: 14 } }, h('label', { style: label }, 'Your name'), h('input', { required: true, value: name, onChange: (e) => setName(e.target.value), placeholder: 'First & last', style: field })),
              h('div', { style: { marginBottom: 14 } }, h('label', { style: label }, 'Will you join us?'),
                h('div', { style: { display: 'flex', gap: 8 } }, ['yes', 'no'].map((v) => h('button', { key: v, type: 'button', onClick: () => setAttending(v), style: { flex: 1, padding: '10px', borderRadius: 'var(--t-radius)', border: '1px solid ' + (attending === v ? 'var(--t-accent)' : 'var(--t-line)'), background: attending === v ? 'var(--t-accent-bg)' : 'var(--t-paper)', color: attending === v ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--t-body)' } }, v === 'yes' ? 'Joyfully yes' : 'Sadly no')))),
              attending === 'yes' && h('div', { style: { marginBottom: 14 } }, h('label', { style: label }, 'Guests in your party'), h('input', { type: 'number', min: 1, max: 8, value: party, onChange: (e) => setParty(e.target.value), style: field })),
              h('div', { style: { marginBottom: 20 } }, h('label', { style: label }, 'A note for the hosts'), h('textarea', { rows: 2, value: note, onChange: (e) => setNote(e.target.value), placeholder: 'Optional', style: Object.assign({}, field, { resize: 'vertical' }) })),
              h('button', { type: 'submit', style: { width: '100%', padding: '13px', borderRadius: 999, border: 'none', background: 'var(--t-ink)', color: 'var(--t-paper)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--t-body)' } }, 'Send reply'))));
  }

  /* ─── Control panel — explore the theme settings ────────────── */
  function Controls({ theme, setTheme, texture, setTexture, density, setDensity, hero, setHero, story, setStory, kit, setKit, premium, setPremium, open, setOpen }) {
    const chip = (active) => ({ padding: '6px 11px', borderRadius: 8, border: '1px solid ' + (active ? '#5C6B3F' : '#E2D9C3'), background: active ? '#5C6B3F' : '#FBF7EE', color: active ? '#FDFAF0' : '#4A5642', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", textTransform: 'capitalize', transition: 'all .12s' });
    const groupLabel = { fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A8275', margin: '0 0 7px' };
    if (!open) {
      return h('button', { onClick: () => setOpen(true), style: { position: 'fixed', right: 18, bottom: 18, zIndex: 150, padding: '11px 16px', borderRadius: 999, border: '1px solid #E2D9C3', background: 'rgba(252,248,238,0.9)', backdropFilter: 'blur(8px)', color: '#3D4A1F', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif", boxShadow: '0 8px 24px -8px rgba(40,28,12,0.3)', display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: '#C19A4B' } }), 'Theme settings');
    }
    return h('div', { style: { position: 'fixed', right: 18, bottom: 18, zIndex: 150, width: 320, maxHeight: '86vh', overflowY: 'auto', background: 'rgba(251,247,238,0.96)', backdropFilter: 'blur(14px) saturate(1.4)', border: '1px solid #E2D9C3', borderRadius: 16, boxShadow: '0 20px 60px -16px rgba(40,28,12,0.4)', padding: '18px 18px 20px', fontFamily: "'Inter',sans-serif" } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
        h('div', null,
          h('div', { style: { fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 600, color: '#18181B', lineHeight: 1 } }, 'Site settings'),
          h('div', { style: { fontSize: 10.5, color: '#8A8275', marginTop: 3 } }, 'Same renderer, every theme')),
        h('button', { onClick: () => setOpen(false), style: { width: 26, height: 26, borderRadius: 7, border: '1px solid #E2D9C3', background: '#FDFAF0', color: '#6F6557', cursor: 'pointer', fontSize: 14, lineHeight: 1 } }, '✕')),

      h('p', { style: groupLabel }, 'Theme'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 16 } },
        window.PL_THEMES.map((t) => {
          const active = theme.id === t.id;
          return h('button', { key: t.id, onClick: () => setTheme(t.id), title: t.blurb, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 9, border: '1px solid ' + (active ? '#5C6B3F' : '#E2D9C3'), background: active ? 'rgba(92,107,63,0.1)' : '#FDFAF0', cursor: 'pointer', textAlign: 'left' } },
            h('span', { style: { display: 'flex', flexShrink: 0, borderRadius: 5, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' } }, t.swatches.slice(0, 4).map((c, i) => h('span', { key: i, style: { width: 8, height: 18, background: c } }))),
            h('span', { style: { fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? '#3D4A1F' : '#4A5642', lineHeight: 1.15 } }, t.name));
        })),

      h('p', { style: groupLabel }, 'Paper · texture'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } }, TEXTURES.map((t) => h('button', { key: t, onClick: () => setTexture(t), style: chip(texture === t) }, TEXTURE_LABEL[t]))),

      h('p', { style: groupLabel }, 'Component kit'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } }, KITS.map((k) => h('button', { key: k, onClick: () => setKit(k), style: chip(kit === k) }, KIT_LABEL[k] || k))),

      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' } },
        h('span', { style: { fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9A7838' } }, '\u2726 Atelier \u00b7 Motion'),
        h('button', { onClick: () => setPremium(!premium), style: { padding: '4px 10px', borderRadius: 999, border: '1px solid ' + (premium ? '#9A7838' : '#E2D9C3'), background: premium ? '#C19A4B' : '#FBF7EE', color: premium ? '#241a08' : '#9A7838', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Inter',sans-serif" } }, premium ? 'Unlocked \u2713' : 'Unlock')),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: premium || !PREMIUM_KITS.includes(kit) ? 16 : 8 } }, PREMIUM_KITS.map((k) => {
        const active = kit === k;
        return h('button', { key: k, onClick: () => setKit(k), title: premium ? 'Animated' : 'Preview \u2014 unlock to animate', style: Object.assign({}, chip(active), !premium && { borderColor: active ? '#C19A4B' : '#E6D6AE', background: active ? '#C19A4B' : '#FBF4E2', color: active ? '#241a08' : '#9A7838' }) }, (premium ? '' : '\u2726 ') + (KIT_LABEL[k] || k));
      })),
      !premium && PREMIUM_KITS.includes(kit) && h('div', { style: { fontSize: 10.5, color: '#9A7838', fontStyle: 'italic', margin: '0 0 16px', lineHeight: 1.4 } }, '\u2726 Showing the still preview. Unlock Atelier to bring this kit to life.'),

      h('p', { style: groupLabel }, 'Density'),
      h('div', { style: { display: 'flex', gap: 6, marginBottom: 16 } }, DENSITIES.map((d) => h('button', { key: d, onClick: () => setDensity(d), style: chip(density === d) }, d))),

      h('p', { style: groupLabel }, 'Hero layout'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } }, HEROES.map((v) => h('button', { key: v, onClick: () => setHero(v), style: chip(hero === v) }, v))),

      h('p', { style: groupLabel }, 'Story layout'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, STORIES.map((v) => h('button', { key: v, onClick: () => setStory(v), style: chip(story === v) }, v === 'sidebyside' ? 'side by side' : v))));
  }

  /* ─── PhotoPicker — bottom drawer: your library as a tray (#4) ─── */
  function PhotoPicker({ open, slot, current, library, onPick, onUploadFiles, onClear, onRemoveLib, onClose }) {
    const inputRef = useRef(null);
    const [render, setRender] = useState(open);
    const [vis, setVis] = useState(false);
    useEffect(() => {
      if (open) { setRender(true); const t = setTimeout(() => setVis(true), 20); return () => clearTimeout(t); }
      setVis(false); const t = setTimeout(() => setRender(false), 280); return () => clearTimeout(t);
    }, [open]);
    if (!render) return null;
    const manage = slot == null;
    const head = manage ? 'Photo library' : 'Choose a photo';
    const sub = manage ? 'Upload once, reuse anywhere — or drag a photo straight onto any spot.' : 'Tap a photo to drop it into this spot.';
    const trigger = () => inputRef.current && inputRef.current.click();
    return h('div', { onClick: onClose, 'data-pl-skip': true, style: { position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontFamily: "'Inter',system-ui,sans-serif", background: 'rgba(20,14,8,0.18)', opacity: vis ? 1 : 0, transition: 'opacity .26s ease', pointerEvents: vis ? 'auto' : 'none' } },
      h('div', { onClick: (e) => e.stopPropagation(), style: { width: '100%', maxHeight: '56vh', display: 'flex', flexDirection: 'column', background: '#FBF7EE', borderTop: '1px solid #E2D9C3', borderRadius: '18px 18px 0 0', boxShadow: '0 -24px 60px -24px rgba(20,14,8,0.45)', transform: vis ? 'translateY(0)' : 'translateY(101%)', transition: 'transform .28s cubic-bezier(.22,.61,.36,1)' } },
        h('div', { style: { display: 'flex', justifyContent: 'center', padding: '9px 0 2px' } }, h('span', { 'aria-hidden': true, style: { width: 38, height: 4, borderRadius: 999, background: '#D8CDB4' } })),
        h('div', { style: { padding: '6px 22px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 } },
          h('div', null,
            h('div', { style: { fontFamily: "'Fraunces',Georgia,serif", fontSize: 19, color: '#18181B', lineHeight: 1.1 } }, head),
            h('div', { style: { fontSize: 12, color: '#7A7060', marginTop: 3, lineHeight: 1.4 } }, sub)),
          h('div', { style: { display: 'flex', gap: 8, flexShrink: 0 } },
            h('button', { onClick: trigger, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: 'none', background: '#5C6B3F', color: '#FBF7EE', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, '\u2191 Upload'),
            h('button', { onClick: onClose, title: 'Close', style: { width: 34, height: 34, borderRadius: 999, border: '1px solid #E2D9C3', background: '#FFFDF7', color: '#7A7060', cursor: 'pointer', fontSize: 14, flexShrink: 0 } }, '\u2715'))),
        h('div', { className: 'ed-scroll', style: { flex: 1, overflowY: 'auto', padding: '4px 22px 22px' } },
          h('input', { ref: inputRef, type: 'file', accept: 'image/*', multiple: true, onChange: (e) => { onUploadFiles(e.target.files, slot); e.target.value = ''; }, style: { display: 'none' } }),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 10 } },
            h('button', { onClick: trigger, style: { aspectRatio: '1', borderRadius: 12, border: '1.5px dashed #C8B98C', background: 'rgba(193,154,75,0.07)', color: '#8C6E3D', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' } },
              h('span', { style: { fontSize: 24, lineHeight: 1, fontWeight: 300 } }, '+'),
              h('span', { style: { fontSize: 11, fontWeight: 700 } }, 'Add photo')),
            (current && !manage) && h('div', { style: { position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '2px solid #5C6B3F' } },
              h('img', { src: current, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }),
              h('span', { style: { position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'rgba(92,107,63,0.92)', padding: '2px 7px', borderRadius: 999 } }, 'In this spot'),
              h('button', { onClick: onClear, title: 'Remove from this spot', style: { position: 'absolute', bottom: 6, right: 6, padding: '4px 9px', borderRadius: 7, border: 'none', background: 'rgba(20,14,8,0.66)', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, 'Remove')),
            library.map((p) => {
              const sel = !manage && current === p.src;
              return h('div', { key: p.id, style: { position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1px solid ' + (sel ? '#5C6B3F' : '#E2D9C3'), cursor: manage ? 'default' : 'pointer', boxShadow: sel ? '0 0 0 2px #5C6B3F' : 'none', transition: 'transform .12s ease, box-shadow .12s ease' } },
                h('img', { src: p.src, alt: '', onClick: manage ? undefined : (() => onPick(p.src)), style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: manage ? 'default' : 'pointer' } }),
                h('button', { onClick: (e) => { e.stopPropagation(); onRemoveLib(p.id); }, title: 'Remove from library', style: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(20,14,8,0.6)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'grid', placeItems: 'center', lineHeight: 1 } }, '\u2715'));
            })),
          library.length === 0 && h('div', { style: { textAlign: 'center', padding: '22px 0 4px', fontSize: 12.5, color: '#9A9080', lineHeight: 1.5 } }, 'Nothing yet \u2014 tap Add photo to begin your library.'))));
  }

  /* ─── App ───────────────────────────────────────────────────── */
  function App() {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('pl-site-state') || '{}'); } catch { return {}; } })();
    const PARAMS = (() => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } })();
    const PREVIEW = PARAMS.get('preview') === '1';
    const FORCED_THEME = PARAMS.get('theme');
    const [themeId, setThemeId] = useState(FORCED_THEME || saved.themeId || 'garden');
    const [density, setDensity] = useState(saved.density || 'comfortable');
    const [hero, setHero] = useState(saved.hero || 'centered');
    const [story, setStory] = useState(saved.story || 'sidebyside');
    const [textureOverride, setTextureOverride] = useState(saved.texture || null);
    const [dividerOverride, setDividerOverride] = useState(saved.divider || null);
    const [motifOverride, setMotifOverride] = useState(saved.motif || null);
    const [contentOverride, setContentOverride] = useState(() => { try { return JSON.parse(localStorage.getItem('pl-site-content') || '{}'); } catch { return {}; } });
    const [contentEpoch, setContentEpoch] = useState(0);
    const [kit, setKit] = useState(saved.kit || 'classic');
    const [navVariant, setNavVariant] = useState(saved.nav || 'centered');
    const [footerVariant, setFooterVariant] = useState(saved.footer || 'signature');
    const [premium, setPremium] = useState(saved.premium || false);
    const [panelOpen, setPanelOpen] = useState(saved.panelOpen !== false);
    const [rsvpOpen, setRsvpOpen] = useState(false);
    const [activeId, setActiveId] = useState('story');
    const [selId, setSelId] = useState(null);
    const [customVars, setCustomVars] = useState(null);
    const DEFAULT_ORDER = ['top', 'story', 'countdown', 'details', 'schedule', 'travel', 'gallery', 'registry', 'faq', 'rsvp'];
    const [order, setOrder] = useState(() => {
      const o = Array.isArray(saved.order) ? saved.order.filter((x) => DEFAULT_ORDER.includes(x)) : null;
      if (!o || !o.length) return DEFAULT_ORDER;
      DEFAULT_ORDER.forEach((id) => { if (!o.includes(id)) o.push(id); });
      return o;
    });
    const [editMode, setEditMode] = useState((EMBED && !PREVIEW) ? (saved.editMode !== false) : false);
    const [images, setImages] = useState(() => { try { return JSON.parse(localStorage.getItem('pl-site-images') || '{}'); } catch { return {}; } });
    const [hidden, setHidden] = useState(saved.hidden || {});
    const [library, setLibrary] = useState(() => { try { return JSON.parse(localStorage.getItem('pl-site-library') || '[]'); } catch { return []; } });
    const [pickerSlot, setPickerSlot] = useState(undefined); // undefined=closed, null=manage, string=slot
    const [dragId, setDragId] = useState(null);
    const [dropIdx, setDropIdx] = useState(null);

    const orderRef = useRef(order); orderRef.current = order;
    const editModeRef = useRef(editMode); editModeRef.current = editMode;
    const dragIdRef = useRef(null);
    const dropIdxRef = useRef(null);
    const editsRef = useRef(null);
    const origRef = useRef({});
    const rescanRef = useRef(null);

    const persistImages = (n) => { try { localStorage.setItem('pl-site-images', JSON.stringify(n)); return true; } catch (e) { if (EMBED) post('pl:warn', { kind: 'storage' }); return false; } };
    const onImage = (slot, src) => {
      setImages((m) => {
        let n; if (src == null) { n = Object.assign({}, m); delete n[slot]; } else { n = Object.assign({}, m, { [slot]: src }); }
        persistImages(n); if (EMBED) post('pl:image', { slot, images: n }); return n;
      });
    };
    /* Downscale on import so a few photos can't blow the storage quota:
       cap the longest edge and re-encode (JPEG unless the source is a PNG
       that may carry transparency). Falls back to the raw data URL. */
    const fileToDataURL = (file) => new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) { rej(); return; }
      const r = new FileReader();
      r.onerror = rej;
      r.onload = () => {
        const raw = r.result;
        const img = new Image();
        img.onload = () => {
          try {
            const MAX = 1600; const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale)); const hgt = Math.max(1, Math.round(img.height * scale));
            const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt;
            cv.getContext('2d').drawImage(img, 0, 0, w, hgt);
            const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const out = cv.toDataURL(type, 0.85);
            res(out && out.length < raw.length ? out : raw);
          } catch (e) { res(raw); }
        };
        img.onerror = () => res(raw);
        img.src = raw;
      };
      r.readAsDataURL(file);
    });
    const addToLibrary = (src) => { setLibrary((prev) => { if (prev.some((p) => p.src === src)) return prev; const item = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), src }; const n = [item].concat(prev).slice(0, 80); try { localStorage.setItem('pl-site-library', JSON.stringify(n)); } catch { /* */ } return n; }); };
    const removeFromLibrary = (id) => setLibrary((prev) => { const n = prev.filter((p) => p.id !== id); try { localStorage.setItem('pl-site-library', JSON.stringify(n)); } catch { /* */ } return n; });
    const onUploadFiles = async (fileList, slot) => {
      const files = Array.from(fileList || []); let first = null;
      for (let i = 0; i < files.length; i++) { try { const src = await fileToDataURL(files[i]); addToLibrary(src); if (i === 0) first = src; } catch (e) { /* */ } }
      if (slot && first) onImage(slot, first);
      if (slot != null) setPickerSlot(undefined);
    };
    const onSlotDrop = async (slot, file) => { try { const src = await fileToDataURL(file); addToLibrary(src); onImage(slot, src); } catch (e) { /* */ } };
    const applyEditsMap = (map) => { editsRef.current = map || {}; try { localStorage.setItem('pl-site-edits', JSON.stringify(editsRef.current)); } catch { /* */ } if (rescanRef.current) rescanRef.current(); };

    const theme = window.PL_getTheme(themeId);
    const texture = textureOverride || theme.texture;
    const pad = window.PL_PAD_BY_DENSITY[density] || 1;
    const isEditorial = theme.id === 'editorial' || theme.id === 'deco-gilt';

    /* When the theme changes, clear any manual texture override so the
       new theme's own material takes over (mirrors effectiveTexture). */
    const setTheme = (id) => { setThemeId(id); setTextureOverride(null); setDividerOverride(null); setMotifOverride(null); };

    /* Editor bridge — receive state + selection from the shell; report
       selection + state back so the editor's rails stay in sync. */
    useEffect(() => {
      if (!EMBED) return;
      const onMsg = (e) => {
        const d = e.data; if (!d || typeof d !== 'object' || !String(d.type || '').startsWith('pl:')) return;
        if (d.type === 'pl:set') {
          if (d.key === 'theme') { setTheme(d.value); setCustomVars(null); }
          else if (d.key === 'themeVars') setCustomVars(d.value && Object.keys(d.value).length ? d.value : null);
          else if (d.key === 'texture') setTextureOverride(d.value);
          else if (d.key === 'divider') setDividerOverride(d.value === 'auto' ? null : d.value);
          else if (d.key === 'motif') setMotifOverride(d.value === 'auto' ? null : d.value);
          else if (d.key === 'content') {
            const v = d.value || {};
            /* Structured content is authoritative: drop inline-edit overrides
               for any section whose data this change touches, so the new
               content isn't masked by a stale inline edit on the same element. */
            const prev = contentOverride || {};
            const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            const changed = new Set();
            ['names', 'coupleType', 'tagline', 'date', 'place'].forEach((k) => { if (!eq(prev[k], v[k])) { changed.add('top'); changed.add('root'); } });
            if (!eq(prev.story, v.story)) changed.add('story');
            if (!eq(prev.schedule, v.schedule)) changed.add('schedule');
            if (!eq(prev.faq, v.faq)) changed.add('faq');
            if (!eq(prev.registry, v.registry) || prev.registryBody !== v.registryBody) changed.add('registry');
            const store = editsRef.current;
            if (store && changed.size) {
              let touched = false;
              Object.keys(store).forEach((p) => { if (changed.has(p.split('|')[0])) { delete store[p]; touched = true; } });
              if (touched) { try { localStorage.setItem('pl-site-edits', JSON.stringify(store)); } catch { /* */ } if (rescanRef.current) rescanRef.current(); setContentEpoch((n) => n + 1); }
            }
            setContentOverride(v); try { localStorage.setItem('pl-site-content', JSON.stringify(v)); } catch { /* */ }
          }
          else if (d.key === 'density') setDensity(d.value);
          else if (d.key === 'hero') setHero(d.value);
          else if (d.key === 'story') setStory(d.value);
          else if (d.key === 'kit') setKit(d.value);
          else if (d.key === 'nav') setNavVariant(d.value);
          else if (d.key === 'footer') setFooterVariant(d.value);
          else if (d.key === 'premium') setPremium(!!d.value);
          else if (d.key === 'editMode') setEditMode(!!d.value);
          else if (d.key === 'order' && Array.isArray(d.value)) setOrder(d.value.slice());
          else if (d.key === 'hidden') setHidden(d.value || {});
          else if (d.key === 'edits') applyEditsMap(d.value || {});
          else if (d.key === 'images') { const n = d.value || {}; setImages(n); persistImages(n); }
        } else if (d.type === 'pl:openLibrary') { setPickerSlot(null);
        } else if (d.type === 'pl:select') {
          setSelId(d.id);
          const el = document.getElementById(d.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (d.type === 'pl:rsvp') { setRsvpOpen(true); }
      };
      window.addEventListener('message', onMsg);
      if (!PREVIEW) post('pl:ready', {});
      return () => window.removeEventListener('message', onMsg);
    }, []);

    useEffect(() => {
      if (!PREVIEW) { try { localStorage.setItem('pl-site-state', JSON.stringify({ themeId, density, hero, story, texture: textureOverride, divider: dividerOverride, motif: motifOverride, kit, premium, nav: navVariant, footer: footerVariant, panelOpen, order, editMode, hidden })); } catch { /* */ } }
      if (EMBED && !PREVIEW) post('pl:state', { state: { themeId, density, hero, story, texture: textureOverride, kit, premium } });
    }, [themeId, density, hero, story, textureOverride, dividerOverride, motifOverride, kit, premium, navVariant, footerVariant, panelOpen, order, editMode, hidden]);

    const co = contentOverride || {};
    const baseNames = (Array.isArray(co.names) && co.names[0]) ? [co.names[0], co.names[1] || ''] : ['Mira', 'Jun'];
    const meta = { date: co.date || 'Saturday · September 6, 2026', place: co.place || 'Point Reyes, California', dateISO: co.dateISO || '2026-09-06T16:30:00' };
    const C = S.buildCopy(baseNames, meta);
    if (co.coupleType) C.subject.type = co.coupleType;
    if (co.tagline != null) C.tagline = co.tagline;
    if (co.story) C.story = Object.assign({}, C.story, co.story);
    if (Array.isArray(co.schedule)) C.schedule = Object.assign({}, C.schedule, { rows: co.schedule });
    if (Array.isArray(co.faq)) C.faq = Object.assign({}, C.faq, { qa: co.faq });
    if (Array.isArray(co.registry)) C.registry = Object.assign({}, C.registry, { stores: co.registry });
    if (Array.isArray(co.travel)) C.travel = Object.assign({}, C.travel, { hotels: co.travel });
    const layouts = co.layouts || {};
    if (co.registryBody != null) C.registry = Object.assign({}, C.registry, { body: co.registryBody });

    const onRsvp = (e) => { if (e) e.preventDefault(); setRsvpOpen(true); };
    const ctx = { C, pad, isEditorial, variant: hero, storyVariant: story, layouts, dividerLook: dividerOverride || theme.look.divider, motif: motifOverride || theme.motif, motifDensity: motifOverride ? 'generous' : theme.look.motifDensity, navItems: NAV_ITEMS, onRsvp, activeId, navVariant, footerVariant, images, onImage, onSlotClick: (slot) => setPickerSlot(slot), onSlotDrop, editMode };

    /* Active-section highlight for the nav. */
    const rootRef = useRef(null);
    useEffect(() => {
      const ids = NAV_ITEMS.map((n) => n.id);
      const onScroll = () => {
        let cur = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 140) cur = id;
        }
        setActiveId(cur);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* Scroll-reveal — sections thread in (fade + rise). Entrance motion
       runs in preview/published only; in edit mode everything is shown
       statically so editing never fights an animation. A failsafe reveal
       guarantees nothing stays hidden if the observer never fires (e.g.
       a capture engine that pauses just after mount). */
    useEffect(() => {
      const root = rootRef.current; if (!root) return;
      const els = Array.from(root.querySelectorAll('[data-reveal]'));
      const animate = !editMode;
      if (!animate) {
        root.classList.remove('pl-anim');
        els.forEach((el) => el.classList.add('pl-in'));
        return;
      }
      root.classList.add('pl-anim');
      els.forEach((el) => el.classList.remove('pl-in'));
      const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('pl-in'); io.unobserve(en.target); } }), { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
      els.forEach((el, i) => { if (i < 2) el.classList.add('pl-in'); else io.observe(el); });
      const failsafe = setTimeout(() => els.forEach((el) => el.classList.add('pl-in')), 2600);
      return () => { io.disconnect(); clearTimeout(failsafe); };
    }, [themeId, hero, story, density, editMode, order, hidden]);

    /* ─── Direct text editing — DOM overlay (editor canvas) ─────── */
    useEffect(() => {
      if (!EMBED) return;
      const root = rootRef.current; if (!root) return;
      if (!editsRef.current) { try { editsRef.current = JSON.parse(localStorage.getItem('pl-site-edits') || '{}'); } catch { editsRef.current = {}; } }
      const orig = origRef.current;
      const OK = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'P', 'SPAN', 'DIV', 'BUTTON', 'A', 'LI', 'BLOCKQUOTE', 'B', 'STRONG', 'EM', 'I', 'LABEL']);
      const INLINE = new Set(['SPAN', 'B', 'I', 'EM', 'STRONG', 'A', 'BR', 'SMALL', 'SUP', 'SUB', 'U']);
      let applying = false;
      const pathFor = (el) => {
        const secEl = el.closest('[data-screen-label]');
        const sec = secEl ? secEl.getAttribute('data-screen-label') : 'root';
        const stop = secEl || root;
        const parts = []; let node = el;
        while (node && node !== stop && node.parentElement) {
          const p = node.parentElement;
          parts.unshift(node.tagName.toLowerCase() + Array.prototype.indexOf.call(p.children, node));
          node = p;
        }
        return sec + '|' + parts.join('/');
      };
      const isUnit = (el) => {
        if (!OK.has(el.tagName)) return false;
        if (!(el.textContent || '').trim()) return false;
        if (el.closest('input,textarea')) return false;
        if (el.closest('[data-pl-skip]')) return false;
        for (const c of el.children) { if (!INLINE.has(c.tagName)) return false; }
        return true;
      };
      const scan = () => {
        applying = true;
        const store = editsRef.current || {};
        root.querySelectorAll('h1,h2,h3,h4,h5,p,span,div,button,a,li,blockquote,b,strong,em,i,label').forEach((el) => {
          if (el.parentElement && el.parentElement.closest('[data-pl-txt]')) return;
          if (!isUnit(el)) return;
          el.setAttribute('data-pl-txt', '');
          const path = pathFor(el); el.setAttribute('data-pl-path', path);
          const hasEl = el.children.length > 0;
          if (!(path in orig)) orig[path] = hasEl ? { h: el.innerHTML } : { t: el.textContent };
          if (el.isContentEditable) return;
          const ov = store[path];
          if (ov) {
            if (ov.h != null && el.innerHTML !== ov.h) el.innerHTML = ov.h;
            else if (ov.t != null && el.textContent !== ov.t) el.textContent = ov.t;
          }
          /* No else: elements without an explicit inline edit are owned by
             React/structured content — never force them back to first-seen
             text, or content changes would be silently reverted. */
        });
        applying = false;
      };
      rescanRef.current = scan;
      const finish = (el) => {
        el.removeAttribute('contenteditable');
        el.removeEventListener('blur', onBlur, true);
        el.removeEventListener('keydown', onKey);
        const path = el.getAttribute('data-pl-path') || pathFor(el);
        const store = editsRef.current || (editsRef.current = {});
        const o = orig[path];
        const val = el.children.length ? { h: el.innerHTML } : { t: el.textContent };
        const isOrig = o && ((o.h != null && o.h === val.h) || (o.t != null && o.t === val.t));
        if (isOrig) delete store[path]; else store[path] = val;
        try { localStorage.setItem('pl-site-edits', JSON.stringify(store)); } catch { /* */ }
        post('pl:edit', { path, text: (el.textContent || '').slice(0, 80), edits: store });
      };
      function onBlur(e) { finish(e.currentTarget); }
      function onKey(e) { if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }
      const onClick = (e) => {
        if (!editModeRef.current) return;
        const el = e.target.closest && e.target.closest('[data-pl-txt]');
        if (!el || !root.contains(el) || el.isContentEditable) return;
        if (e.target.closest('[data-pl-skip]')) return;
        e.preventDefault(); e.stopPropagation();
        el.setAttribute('contenteditable', 'true'); el.focus();
        el.addEventListener('blur', onBlur, true); el.addEventListener('keydown', onKey);
      };
      root.addEventListener('click', onClick, true);
      scan();
      let raf = 0;
      const obs = new MutationObserver(() => { if (applying) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); });
      obs.observe(root, { childList: true, characterData: true, subtree: true });
      return () => { root.removeEventListener('click', onClick, true); obs.disconnect(); cancelAnimationFrame(raf); };
    }, []);

    /* ─── Section drag-reorder ──────────────────────────────────── */
    const commitReorder = (id, idx) => {
      setOrder((prev) => {
        const oldIdx = prev.indexOf(id); if (oldIdx < 0) return prev;
        let target = idx; if (oldIdx < idx) target -= 1;
        const cur = prev.filter((x) => x !== id);
        target = Math.max(0, Math.min(target, cur.length));
        cur.splice(target, 0, id);
        if (EMBED) post('pl:order', { order: cur });
        return cur;
      });
    };
    const startDrag = (id, e) => {
      e.preventDefault(); e.stopPropagation();
      dragIdRef.current = id; setDragId(id);
      document.body.style.userSelect = 'none';
      const move = (ev) => {
        const y = ev.clientY; const ids = orderRef.current; let idx = ids.length;
        for (let i = 0; i < ids.length; i++) { const el = document.getElementById(ids[i]); if (!el) continue; const r = el.getBoundingClientRect(); if (y < r.top + r.height / 2) { idx = i; break; } }
        dropIdxRef.current = idx; setDropIdx(idx);
      };
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        document.body.style.userSelect = '';
        const from = dragIdRef.current, di = dropIdxRef.current;
        dragIdRef.current = null; dropIdxRef.current = null; setDragId(null); setDropIdx(null);
        if (from != null && di != null) commitReorder(from, di);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    };

    const rootStyle = Object.assign({}, window.PL_themeRootStyle(theme, density, customVars), { minHeight: '100vh', position: 'relative' });
    const SEC_NODE = { top: () => h(S.Hero, { ctx }), story: () => h(S.Story, { ctx }), countdown: () => h(S.Countdown, { ctx }), details: () => h(S.Details, { ctx }), schedule: () => h(S.Schedule, { ctx }), travel: () => h(S.Travel, { ctx }), map: () => h(S.MapSection, { ctx }), gallery: () => h(S.Gallery, { ctx }), registry: () => h(S.Registry, { ctx }), faq: () => h(S.Faq, { ctx }), rsvp: () => h(S.Rsvp, { ctx }) };
    const SEC_NAME = { top: 'Hero', story: 'Our story', countdown: 'Countdown', details: 'Details', schedule: 'Schedule', travel: 'Travel', map: 'Map', gallery: 'Gallery', registry: 'Registry', faq: 'FAQ', rsvp: 'RSVP' };
    const dropBar = (k) => h('div', { key: 'db' + k, 'data-pl-skip': true, style: { position: 'relative', height: 0 } }, h('div', { style: { position: 'absolute', left: 0, right: 0, top: -2, height: 4, borderRadius: 3, background: '#C19A4B', boxShadow: '0 0 0 1px rgba(193,154,75,0.45), 0 2px 8px rgba(193,154,75,0.5)', zIndex: 60 } }));
    const sec = (id) => {
      const selected = selId === id; const dragging = dragId === id;
      const handle = (EMBED && editMode) ? h('button', { 'data-pl-skip': true, className: 'pl-sec-handle', onPointerDown: (e) => startDrag(id, e), onClick: (e) => e.stopPropagation(), title: 'Drag to reorder', style: { position: 'absolute', top: 12, left: 12, zIndex: 44, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(40,28,12,0.16)', background: 'rgba(252,248,238,0.94)', WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)', color: '#5C6B3F', fontSize: 10.5, fontWeight: 700, fontFamily: "'Geist Mono',ui-monospace,monospace", letterSpacing: '0.04em', cursor: 'grab', opacity: (selected || dragging) ? 1 : 0, transition: 'opacity .12s', boxShadow: '0 4px 14px -5px rgba(40,28,12,0.4)', touchAction: 'none' } }, '\u283F  ' + SEC_NAME[id]) : null;
      return h('div', { id, key: id + '|e' + contentEpoch, 'data-reveal': true, 'data-screen-label': id,
        onClick: (EMBED && !PREVIEW) ? (() => { setSelId(id); post('pl:select', { id }); }) : undefined,
        style: EMBED ? { position: 'relative', cursor: (PREVIEW || editMode) ? 'default' : 'pointer', scrollMarginTop: 20, boxShadow: selected ? 'inset 0 0 0 2px var(--pl-gold, #C19A4B)' : 'none', transition: 'box-shadow .15s, opacity .15s', opacity: dragging ? 0.45 : 1 } : undefined,
      }, handle, SEC_NODE[id]());
    };
    const body = [];
    order.forEach((id, i) => { if (hidden[id]) return; if (dragId && dropIdx === i) body.push(dropBar(i)); body.push(sec(id)); });
    if (dragId && dropIdx === order.length) body.push(dropBar(order.length));

    return h(React.Fragment, null,
      h('div', { ref: rootRef, className: 'pl8-guest' + (editMode ? ' pl-edit-on' : ''), 'data-pl-texture': texture, 'data-pl-kit': kit, 'data-pl-premium': premium ? 'on' : 'off', 'data-pl-density': density, style: rootStyle },
        h(S.Nav, { key: 'nav|e' + contentEpoch, ctx }),
        body,
        h(S.Footer, { key: 'foot|e' + contentEpoch, ctx })),
      h(RsvpModal, { open: rsvpOpen, onClose: () => setRsvpOpen(false), C }),
      h(PhotoPicker, { open: pickerSlot !== undefined, slot: pickerSlot, current: (pickerSlot && images[pickerSlot]) || null, library, onPick: (src) => { if (pickerSlot) onImage(pickerSlot, src); setPickerSlot(undefined); }, onUploadFiles, onClear: () => { if (pickerSlot) onImage(pickerSlot, null); setPickerSlot(undefined); }, onRemoveLib: removeFromLibrary, onClose: () => setPickerSlot(undefined) }),
      !EMBED && h(Controls, { theme, setTheme, texture, setTexture: setTextureOverride, density, setDensity, hero, setHero, story, setStory, kit, setKit, premium, setPremium, open: panelOpen, setOpen: setPanelOpen }));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
