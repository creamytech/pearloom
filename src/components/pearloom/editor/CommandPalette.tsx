'use client';

/* =========================================================================
   PEARLOOM — COMMAND PALETTE (⌘K / Ctrl+K)
   Strict literal port of ClaudeDesign/pages/command-palette.jsx.
   ========================================================================= */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { EVENT_TYPES } from '@/lib/event-os/event-types';
import { Icon, Pear } from '../motifs';

type KitId = NonNullable<StoryManifest['kitId']>;
const KITS: { id: KitId; label: string; blurb: string }[] = [
  { id: 'classic',   label: 'Classic',   blurb: 'Theme-native cards & rules' },
  { id: 'ticket',    label: 'Ticket',    blurb: 'Perforated stubs · monospace' },
  { id: 'plate',     label: 'Plate',     blurb: 'Engraved frames · Roman counter' },
  { id: 'scrapbook', label: 'Scrapbook', blurb: 'Taped, tilted, handwritten' },
  { id: 'index',     label: 'Index',     blurb: 'Ruled cards · red margin' },
  { id: 'minimal',   label: 'Minimal',   blurb: 'Hairlines · big numerals' },
];

export type CommandPaletteSection = { key: string; label: string; description?: string };

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  swatch?: string;
  group?: string;
  keywords?: string[];
  run: () => void;
};

export interface CommandPaletteProps {
  manifest: StoryManifest;
  sections: readonly CommandPaletteSection[];
  onPatchManifest: (next: StoryManifest) => void;
  onJumpSection: (key: string) => void;
  onOpenThemeShop?: () => void;
  onOpenDecorLibrary?: () => void;
  onOpenSettings?: () => void;
  onPublish?: () => void;
  onTogglePreview?: () => void;
  onOpenAskPear?: () => void;
}

export const COMMAND_PALETTE_OPEN_EVENT = 'pearloom:command-palette-open';

function fuzzy(q: string, s: string): number {
  q = q.toLowerCase(); s = s.toLowerCase();
  if (!q) return 1;
  if (s.includes(q)) return 2 - (s.indexOf(q) / 100);
  let i = 0; for (const ch of s) { if (ch === q[i]) i++; if (i === q.length) return 0.5; }
  return 0;
}

export function CommandPalette({
  manifest,
  sections,
  onPatchManifest,
  onJumpSection,
  onOpenThemeShop,
  onOpenDecorLibrary,
  onOpenSettings,
  onPublish,
  onTogglePreview,
  onOpenAskPear,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === 'Escape' && open) { setOpen(false); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 40); } }, [open]);

  const commands = useMemo<Command[]>(() => {
    const out: Command[] = [];
    for (const s of sections) {
      out.push({ id: `section:${s.key}`, label: `Jump to ${s.label}`, hint: s.description, icon: 'arrow-right', group: 'Sections', keywords: ['jump', 'section', s.key], run: () => onJumpSection(s.key) });
    }
    /* Editions removed from the palette 2026-06-10 — they were a v8
       concept (EditionPicker is gone); manifest.edition survives only
       as an internal layout-defaults signal, not a host-facing pick. */
    for (const k of KITS) {
      out.push({ id: `kit:${k.id}`, label: `Kit — ${k.label}`, hint: k.blurb, icon: 'sparkles', group: 'Kits', keywords: ['kit', 'component', k.id], run: () => onPatchManifest({ ...manifest, kitId: k.id } as StoryManifest) });
    }
    for (const et of EVENT_TYPES) {
      if (et.status === 'planned') continue;
      out.push({ id: `event:${et.id}`, label: `Event — ${et.label}`, hint: et.tagline, icon: 'heart-icon', group: 'Events', keywords: ['event', 'occasion', et.id, et.category, et.voice], run: () => onPatchManifest({ ...manifest, occasion: et.id } as unknown as StoryManifest) });
    }
    if (onOpenThemeShop)    out.push({ id: 'flow:theme-shop', label: 'Open theme shop',     hint: 'Theme packs, palettes, templates',     icon: 'palette',   group: 'Flows', keywords: ['theme', 'shop'],         run: onOpenThemeShop });
    if (onOpenDecorLibrary) out.push({ id: 'flow:decor',      label: 'Open decor library',  hint: 'Dividers, stamps, motifs, stickers', icon: 'brush',     group: 'Flows', keywords: ['decor', 'library'],      run: onOpenDecorLibrary });
    if (onOpenSettings)     out.push({ id: 'flow:settings',   label: 'Open settings',       hint: 'Site URL, privacy, account',         icon: 'section',   group: 'Flows', keywords: ['settings', 'account'],   run: onOpenSettings });
    if (onPublish)          out.push({ id: 'flow:publish',    label: 'Publish & share',     hint: 'Push the latest draft live',         icon: 'arrow-ur',  group: 'Flows', keywords: ['publish', 'share'],      run: onPublish });
    if (onTogglePreview)    out.push({ id: 'flow:preview',    label: 'Preview as a guest',  hint: 'See the site as guests will',        icon: 'eye',       group: 'Flows', keywords: ['preview', 'guest'],      run: onTogglePreview });
    if (onOpenAskPear)      out.push({ id: 'flow:ask-pear',   label: 'Ask Pear (AI)',       hint: 'Rewrite, draft, suggest',            icon: 'sparkles',  group: 'Flows', keywords: ['ai', 'pear', 'rewrite'], run: onOpenAskPear });
    return out;
  }, [sections, manifest, onJumpSection, onPatchManifest, onOpenThemeShop, onOpenDecorLibrary, onOpenSettings, onPublish, onTogglePreview, onOpenAskPear]);

  const results = useMemo(() => {
    const scored = commands.map(c => ({ c, s: Math.max(fuzzy(q, c.label), fuzzy(q, c.group || '') * 0.4, ...(c.keywords || []).map(k => fuzzy(q, k) * 0.7)) })).filter(x => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.map(x => x.c).slice(0, 40);
  }, [q, commands]);

  useEffect(() => { setSel(0); }, [q]);

  const onClose = () => setOpen(false);
  const run = (c: Command | undefined) => { if (!c) return; onClose(); setTimeout(() => c.run(), 0); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[sel]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[sel] as HTMLElement | undefined;
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [sel, open]);

  if (!open) return null;

  const groups: [string, Command[]][] = [];
  const seen: Record<string, Command[]> = {};
  results.forEach(c => { const g = c.group || 'Actions'; if (!seen[g]) { seen[g] = []; groups.push([g, seen[g]]); } seen[g].push(c); });

  let idx = -1;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(40,40,30,0.4)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh' } as CSSProperties}>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={onKey} style={{ width: 'min(580px, 94vw)', background: 'var(--pl-glass)', backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))', WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))', borderRadius: 16, boxShadow: 'var(--pl-glass-shadow-lg)', overflow: 'hidden', border: '1px solid var(--pl-glass-border)', animation: 'cmd-in 180ms cubic-bezier(0.16,1,0.3,1)' }}>
        <style>{`@keyframes cmd-in{from{transform:translateY(-8px) scale(0.99);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 18px', borderBottom: '1px solid var(--pl-chrome-border)' }}>
          <Icon name="search" size={17} color="var(--pl-chrome-text-muted)"/>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sections, themes, actions…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15.5, outline: 'none', color: 'var(--pl-chrome-text)', fontFamily: 'inherit' }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-chrome-text-muted)', background: 'var(--cream-2)', padding: '3px 7px', borderRadius: 6 }}>ESC</span>
        </div>
        <div ref={listRef} style={{ maxHeight: '52vh', overflow: 'auto', padding: 8 }}>
          {results.length === 0 && <div style={{ padding: '34px 0', textAlign: 'center', color: 'var(--pl-chrome-text-muted)', fontSize: 13.5 }}><Pear size={36} tone="sage" shadow={false}/><div style={{ marginTop: 8 }}>No matches</div></div>}
          {groups.map(([g, items]) => (
            <div key={g}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pl-chrome-text-muted)', padding: '10px 12px 5px' }}>{g}</div>
              {items.map(c => {
                idx++; const i = idx; const on = i === sel;
                return (
                  <button key={c.id || c.label} onMouseEnter={() => setSel(i)} onClick={() => run(c)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, textAlign: 'left', background: on ? 'var(--pl-chrome-text)' : 'transparent', color: on ? 'var(--pl-chrome-bg)' : 'var(--pl-chrome-text)', cursor: 'pointer' } as CSSProperties}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: on ? 'rgba(255,255,255,0.14)' : 'var(--cream-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {c.swatch ? <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.swatch }}/> : <Icon name={c.icon || 'arrow-right'} size={15} color={on ? 'var(--pl-chrome-bg)' : 'var(--pl-chrome-text-soft)'}/>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{c.label}</span>
                      {c.hint && <span style={{ display: 'block', fontSize: 11.5, color: on ? 'rgba(248,241,228,0.7)' : 'var(--pl-chrome-text-muted)' }}>{c.hint}</span>}
                    </span>
                    {on && <Icon name="arrow-right" size={13} color="var(--pl-chrome-bg)"/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '9px 16px', borderTop: '1px solid var(--pl-chrome-border)', fontSize: 11, color: 'var(--pl-chrome-text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><b style={{ color: 'var(--pl-chrome-text-soft)' }}>↑↓</b> navigate</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><b style={{ color: 'var(--pl-chrome-text-soft)' }}>↵</b> select</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pear size={14} tone="sage" shadow={false}/> Pearloom</span>
        </div>
      </div>
    </div>
  );
}
