'use client';

/* =========================================================================
   PEARLOOM — COMMAND PALETTE (⌘K / Ctrl+K)
   The connective tissue: jump to any section, apply an Edition or Kit,
   switch the event occasion, or open any flow (Theme shop / Decor /
   Publish / Settings / Preview).

   Port of ClaudeDesign/pages/command-palette.jsx (fuzzy search input +
   categorized result list + keyboard nav). Adapted to read from the
   production registries (EDITIONS, EVENT_TYPES, kit list) so the
   palette never drifts from what the site actually supports.

   Items are pulled from:
     - BLOCKS  (sections)         — passed in from EditorV8
     - EDITIONS                   — src/lib/site-editions/editions.ts
     - KITS (hard-coded here)     — mirrors KitPicker (kit ids/labels
                                     live nowhere as a single export,
                                     so they're duplicated minimally
                                     for the palette to keep the
                                     KitPicker file ergonomic)
     - EVENT_TYPES                — src/lib/event-os/event-types.ts
     - Flow shortcuts             — passed in via props as callbacks
   ========================================================================= */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import type { EditionId } from '@/lib/site-editions/types';
import { EDITIONS } from '@/lib/site-editions/editions';
import { EVENT_TYPES } from '@/lib/event-os/event-types';
import { Icon, Pear } from '../motifs';

/* ── Kit registry (mirrors KitPicker.tsx) ──
   The full kit list lives inside KitPicker's component scope as a
   private constant. Re-declaring the {id,label,blurb} subset here
   keeps the palette decoupled from the picker's preview-component
   bundle (which would drag SVGs we don't need to render in a
   command list). If a new kit ships, add it here AND in KitPicker.
   Single source of truth for kit identity is StoryManifest.kitId
   in src/types.ts. */
type KitId = NonNullable<StoryManifest['kitId']>;
type KitMeta = { id: KitId; label: string; blurb: string };
const KITS: KitMeta[] = [
  { id: 'classic',   label: 'Classic',   blurb: 'Theme-native cards & rules' },
  { id: 'ticket',    label: 'Ticket',    blurb: 'Perforated stubs · monospace' },
  { id: 'plate',     label: 'Plate',     blurb: 'Engraved frames · Roman counter' },
  { id: 'scrapbook', label: 'Scrapbook', blurb: 'Taped, tilted, handwritten' },
  { id: 'index',     label: 'Index',     blurb: 'Ruled cards · red margin' },
  { id: 'minimal',   label: 'Minimal',   blurb: 'Hairlines · big numerals' },
  { id: 'arch',      label: 'Arch',      blurb: 'Arched cards · soft domes' },
  { id: 'stamp',     label: 'Stamp',     blurb: 'Postage frames · postmarks' },
  { id: 'deco',      label: 'Deco',      blurb: 'Gold frames · geometric' },
];

/* ── Section meta passed in ──
   EditorV8 owns the BLOCKS list. We accept a thin {key,label,description}
   shape so the palette never has to know about BlockDef internals
   like reorderable/togglable. */
export type CommandPaletteSection = {
  key: string;
  label: string;
  description?: string;
};

/* ── Item model ──
   `swatch`         — color disc rendered in the avatar slot for
                       editions/themes. Falls back to icon if absent.
   `keywords`       — extra strings the fuzzy scorer matches against
                       (occasion ids, tone tags, etc).
   `onSelect`       — every item is responsible for closing the
                       palette by returning. The runner closes first,
                       then schedules the callback on the next tick
                       so React state updates from the close paint
                       before the item runs (e.g. patching the
                       manifest doesn't fight the close animation). */
type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  swatch?: string;
  group: string;
  keywords?: string[];
  onSelect: () => void;
};

/* ── Fuzzy scorer ──
   Ported from the prototype's `fuzzy(q, s)` (command-palette.jsx
   lines 10-16). Empty query returns 1 so all items pass through;
   substring match returns 2 minus a small early-index bonus;
   character-by-character match returns 0.5; no match returns 0.
   Keywords boost the result by 0.7×, group label by 0.4×. */
function fuzzy(q: string, s: string): number {
  if (!q) return 1;
  const qL = q.toLowerCase();
  const sL = s.toLowerCase();
  if (sL.includes(qL)) return 2 - sL.indexOf(qL) / 100;
  let i = 0;
  for (const ch of sL) {
    if (ch === qL[i]) i++;
    if (i === qL.length) return 0.5;
  }
  return 0;
}

function scoreItem(q: string, item: CommandItem): number {
  if (!q) return 1;
  const labelScore = fuzzy(q, item.label);
  const hintScore = item.hint ? fuzzy(q, item.hint) * 0.6 : 0;
  const groupScore = fuzzy(q, item.group) * 0.4;
  const keywordScore = (item.keywords ?? [])
    .map((k) => fuzzy(q, k) * 0.7)
    .reduce((a, b) => Math.max(a, b), 0);
  return Math.max(labelScore, hintScore, groupScore, keywordScore);
}

export interface CommandPaletteProps {
  manifest: StoryManifest;
  /** Section descriptors owned by EditorV8 (BLOCKS array, projected
   *  down to {key,label,description}). */
  sections: readonly CommandPaletteSection[];

  /** Patch the manifest — used by edition/kit/event apply items. */
  onPatchManifest: (next: StoryManifest) => void;

  /** Jump the outline rail + canvas to a section. EditorV8 already
   *  handles scroll-into-view + flash highlight; we just call setBlock. */
  onJumpSection: (key: string) => void;

  /* ── Flow callbacks ──
     Each is optional so consumers (Studio mode, embed mode) can
     hide flows they don't have wired up. If absent, the matching
     palette item is filtered out. */
  onOpenThemeShop?: () => void;
  onOpenDecorLibrary?: () => void;
  onOpenSettings?: () => void;
  onPublish?: () => void;
  onTogglePreview?: () => void;
  /** Bridge to the legacy PearCommand AI palette. Dispatched as
   *  a `pearloom:open-pear-ai` event so callers can decide whether
   *  to mount the AI surface. */
  onOpenAskPear?: () => void;
}

/** Custom event name the editor dispatches on ⌘K. Allows multiple
 *  surfaces (toolbar buttons, mobile tab bar) to open the palette
 *  without holding a ref to it. */
export const COMMAND_PALETTE_OPEN_EVENT = 'pearloom:command-palette-open';

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

  /* ── Keyboard binding ──
     ⌘K / Ctrl+K toggle. We capture during the typing phase so the
     keystroke wins against in-canvas typing without us needing to
     check `target.tagName` — the user always wants the palette to
     open even when their cursor is in an EditableText. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* ── External-open custom event ──
     Surfaces other than the keyboard (a topbar button, a help
     bubble) dispatch `pearloom:command-palette-open` to pop the
     palette open. Keeps the binding centralised here. */
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
  }, []);

  /* ── Reset on open ──
     Clear the query + selection + focus the input. Slight defer so
     the modal mount has settled and the input element exists. */
  useEffect(() => {
    if (!open) return;
    setQ('');
    setSel(0);
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  /* ── Item registry ──
     Built lazily from props + registries on every render so manifest
     changes (occasion swap → kit defaults shift) are reflected in
     the keyword set immediately. Cheap — <100 items total. */
  const items = useMemo<CommandItem[]>(() => {
    const out: CommandItem[] = [];

    /* Sections */
    for (const s of sections) {
      out.push({
        id: `section:${s.key}`,
        label: `Jump to ${s.label}`,
        hint: s.description ?? `Open the ${s.label} section`,
        icon: 'arrow-right',
        group: 'Sections',
        keywords: ['jump', 'section', s.key, 'navigate'],
        onSelect: () => onJumpSection(s.key),
      });
    }

    /* Editions — derive the swatch from the Edition's recommendedTheme
       accent so the palette previews the actual ink colour, not a
       hard-coded swatch. Falls back to ink if the accent isn't set. */
    const activeEdition = manifest.edition;
    for (const ed of EDITIONS) {
      const accent = ed.recommendedTheme?.colors?.accent ?? '#0E0D0B';
      const isActive = activeEdition === ed.id;
      out.push({
        id: `edition:${ed.id}`,
        label: `Edition — ${ed.label}${isActive ? ' (active)' : ''}`,
        hint: ed.tagline,
        swatch: accent,
        group: 'Editions',
        keywords: ['edition', 'theme', 'layout', ed.id, ...(ed.recommendedFor ?? [])],
        onSelect: () => applyEdition(ed.id),
      });
    }

    /* Kits */
    const activeKit = manifest.kitId;
    for (const k of KITS) {
      const isActive = activeKit === k.id;
      out.push({
        id: `kit:${k.id}`,
        label: `Kit — ${k.label}${isActive ? ' (active)' : ''}`,
        hint: k.blurb,
        icon: 'sparkles',
        group: 'Kits',
        keywords: ['kit', 'component', 'cards', k.id],
        onSelect: () => applyKit(k.id),
      });
    }

    /* Events — only surface shipping + beta types; planned events
       have no real template behind them so picking one silently
       leaves the site as-is. */
    const activeOccasion = (manifest as unknown as { occasion?: string }).occasion;
    for (const et of EVENT_TYPES) {
      if (et.status === 'planned') continue;
      const isActive = activeOccasion === et.id;
      out.push({
        id: `event:${et.id}`,
        label: `Event — ${et.label}${isActive ? ' (active)' : ''}`,
        hint: et.tagline,
        icon: 'heart-icon',
        group: 'Events',
        keywords: ['event', 'occasion', 'preset', et.id, et.category, et.voice],
        onSelect: () => applyOccasion(et.id),
      });
    }

    /* Flows — only the ones the caller wired up. Filtering on
       presence keeps the palette honest: items that wouldn't do
       anything just aren't shown. */
    if (onPublish) {
      out.push({
        id: 'flow:publish',
        label: 'Publish & share',
        hint: 'Save and push the latest draft live',
        icon: 'arrow-ur',
        group: 'Flows',
        keywords: ['publish', 'save', 'live', 'share', 'release'],
        onSelect: onPublish,
      });
    }
    if (onTogglePreview) {
      out.push({
        id: 'flow:preview',
        label: 'Preview as a guest',
        hint: 'See the site exactly as guests will',
        icon: 'eye',
        group: 'Flows',
        keywords: ['preview', 'guest', 'view'],
        onSelect: onTogglePreview,
      });
    }
    if (onOpenThemeShop) {
      out.push({
        id: 'flow:theme-shop',
        label: 'Open the theme shop',
        hint: 'Editions, palettes, templates',
        icon: 'palette',
        group: 'Flows',
        keywords: ['theme', 'shop', 'palette', 'template'],
        onSelect: onOpenThemeShop,
      });
    }
    if (onOpenDecorLibrary) {
      out.push({
        id: 'flow:decor',
        label: 'Open the decor library',
        hint: 'Dividers, stamps, motifs, stickers',
        icon: 'brush',
        group: 'Flows',
        keywords: ['decor', 'library', 'sticker', 'divider', 'motif'],
        onSelect: onOpenDecorLibrary,
      });
    }
    if (onOpenSettings) {
      out.push({
        id: 'flow:settings',
        label: 'Open settings',
        hint: 'Site URL, privacy, account',
        icon: 'section',
        group: 'Flows',
        keywords: ['settings', 'preferences', 'account', 'profile'],
        onSelect: onOpenSettings,
      });
    }
    if (onOpenAskPear) {
      out.push({
        id: 'flow:ask-pear',
        label: 'Ask Pear (AI)',
        hint: 'Rewrite, draft, suggest',
        icon: 'sparkles',
        group: 'Flows',
        keywords: ['ai', 'pear', 'rewrite', 'draft', 'ask'],
        onSelect: onOpenAskPear,
      });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sections,
    manifest,
    onJumpSection,
    onPatchManifest,
    onPublish,
    onTogglePreview,
    onOpenThemeShop,
    onOpenDecorLibrary,
    onOpenSettings,
    onOpenAskPear,
  ]);

  /* ── Apply helpers ──
     Each apply spreads the existing manifest and writes the one
     field so all other state (chapters, photos, atmosphere) is
     preserved. The runner already closes the palette before
     calling — we just patch. */
  function applyEdition(id: EditionId) {
    onPatchManifest({ ...manifest, edition: id } as StoryManifest);
  }
  function applyKit(id: KitId) {
    onPatchManifest({ ...manifest, kitId: id } as StoryManifest);
  }
  function applyOccasion(id: string) {
    onPatchManifest({ ...manifest, occasion: id } as unknown as StoryManifest);
  }

  /* ── Filter + group ──
     Score every item; drop zero-scoring; sort descending; cap at
     50 so the list stays scannable. Then group by `group` to
     emit categorized sections, preserving discovery order. */
  const results = useMemo(() => {
    const scored = items
      .map((c) => ({ c, s: scoreItem(q, c) }))
      .filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 50).map((x) => x.c);
  }, [items, q]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const c of results) {
      const g = c.group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return Array.from(map.entries());
  }, [results]);

  /* Reset selection on query change so the user's first ↓ always
     lands on the top result. */
  useEffect(() => {
    setSel(0);
  }, [q]);

  /* Scroll the active row into view when ↑↓ moves past the visible
     portion of the list. Block: nearest avoids snapping to the
     centre, which feels twitchy on small lists. */
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelectorAll<HTMLElement>('[data-pl-cmd-row]')[sel];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [sel, open]);

  const run = useCallback(
    (c: CommandItem | undefined) => {
      if (!c) return;
      setOpen(false);
      // Defer one tick so the close paint commits before the
      // action fires — patching the manifest while the modal is
      // unmounting was previously dropping the focus ring into
      // a no-op state for ~80ms.
      setTimeout(() => c.onSelect(), 0);
    },
    [],
  );

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[sel]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (!open) return null;

  /* Index counter for roving-tabindex semantics — every visible row
     gets a flat 0..N index so ↑↓ traverses across group boundaries
     without re-implementing the grouping logic inside the keyboard
     handler. */
  let flatIndex = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(40,40,30,0.40)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        animation: 'pl-cmd-fade 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        style={{
          width: 'min(580px, 94vw)',
          background: 'var(--card, #FBF7EE)',
          borderRadius: 16,
          boxShadow: '0 30px 80px rgba(40,40,30,0.32)',
          overflow: 'hidden',
          border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          animation: 'pl-cmd-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <style>{`@keyframes pl-cmd-in { from { transform: translateY(-8px) scale(0.99); opacity: 0 } to { transform: none; opacity: 1 } } @keyframes pl-cmd-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>

        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '15px 18px',
            borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          }}
        >
          <Icon name="search" size={17} color="var(--ink-muted, #6F6557)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sections, themes, actions…"
            aria-label="Command palette search"
            type="search"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 15.5,
              outline: 'none',
              color: 'var(--ink, #0E0D0B)',
              fontFamily: 'inherit',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ink-muted, #6F6557)',
              background: 'var(--cream-2, #EBE3D2)',
              padding: '3px 7px',
              borderRadius: 6,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            maxHeight: '52vh',
            overflowY: 'auto',
            padding: 8,
          }}
        >
          {results.length === 0 && (
            <div
              style={{
                padding: '34px 0',
                textAlign: 'center',
                color: 'var(--ink-muted, #6F6557)',
                fontSize: 13.5,
              }}
            >
              <Pear size={36} tone="sage" shadow={false} />
              <div style={{ marginTop: 8 }}>No matches</div>
            </div>
          )}
          {groups.map(([groupLabel, groupItems]) => (
            <div key={groupLabel}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted, #6F6557)',
                  padding: '10px 12px 5px',
                }}
              >
                {groupLabel}
              </div>
              {groupItems.map((c) => {
                flatIndex++;
                const myIndex = flatIndex;
                const isActive = myIndex === sel;
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-pl-cmd-row
                    onMouseEnter={() => setSel(myIndex)}
                    onClick={() => run(c)}
                    aria-current={isActive ? 'true' : undefined}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      textAlign: 'left',
                      background: isActive ? 'var(--ink, #0E0D0B)' : 'transparent',
                      color: isActive ? 'var(--cream, #F5EFE2)' : 'var(--ink, #0E0D0B)',
                      cursor: 'pointer',
                      border: 'none',
                      fontFamily: 'inherit',
                      transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: isActive
                          ? 'rgba(255,255,255,0.14)'
                          : 'var(--cream-2, #EBE3D2)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {c.swatch ? (
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: c.swatch,
                            border: isActive
                              ? '1px solid rgba(255,255,255,0.30)'
                              : '1px solid rgba(14,13,11,0.12)',
                          }}
                        />
                      ) : (
                        <Icon
                          name={c.icon || 'arrow-right'}
                          size={15}
                          color={isActive ? 'var(--cream, #F5EFE2)' : 'var(--ink-soft, #3A332C)'}
                        />
                      )}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13.5,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.label}
                      </span>
                      {c.hint && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 11.5,
                            color: isActive
                              ? 'rgba(248,241,228,0.7)'
                              : 'var(--ink-muted, #6F6557)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.hint}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <Icon name="arrow-right" size={13} color="var(--cream, #F5EFE2)" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '9px 16px',
            borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            fontSize: 11,
            color: 'var(--ink-muted, #6F6557)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <b style={{ color: 'var(--ink-soft, #3A332C)' }}>↑↓</b> navigate
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <b style={{ color: 'var(--ink-soft, #3A332C)' }}>↵</b> select
          </span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Pear size={14} tone="sage" shadow={false} /> Pearloom
          </span>
        </div>
      </div>
    </div>
  );
}
