'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/SlashMenu.tsx
// Notion-style slash-menu for any [data-pe-editable][contenteditable=true]
// text field. Listens for `/` at the caret and shows a filterable
// popover of smart inserts pulled from manifest.logistics + events +
// a few utility formatters.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Link2, Users, Shirt, CalendarClock,
  Heart, Minus, Sparkles, Hash, Type,
} from 'lucide-react';
import type { StoryManifest } from '@/types';

interface SlashItem {
  id: string;
  label: string;
  hint?: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  /** Text to insert. Can be empty if the item is disabled/hint-only. */
  value: string;
  /** Keywords used for fuzzy filter. */
  keywords: string[];
}

interface Props {
  manifest: StoryManifest;
  coupleNames?: [string, string];
}

// Format an ISO/date-ish string into "January 15, 2024" style.
function formatNiceDate(value: string | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function todaysDate(): string {
  return new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function SlashMenu({ manifest, coupleNames }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeEditableRef = useRef<HTMLElement | null>(null);
  // Range covering the "/<query>" substring we need to replace on select.
  const triggerRangeRef = useRef<Range | null>(null);

  // Build the item list from live manifest data.
  const items = buildItems(manifest, coupleNames);

  const filteredItems = query.trim() === ''
    ? items
    : items.filter(it => {
        const q = query.toLowerCase();
        return it.label.toLowerCase().includes(q)
          || it.keywords.some(k => k.toLowerCase().includes(q));
      });

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIdx(0);
    activeEditableRef.current = null;
    triggerRangeRef.current = null;
  }, []);

  const insertSelected = useCallback((item: SlashItem | undefined) => {
    if (!item || !item.value) { close(); return; }
    const el = activeEditableRef.current;
    const triggerRange = triggerRangeRef.current;
    if (!el || !triggerRange) { close(); return; }
    const sel = window.getSelection();
    if (!sel) { close(); return; }
    // Extend the range to the current caret so we replace "/<query>".
    try {
      const now = sel.getRangeAt(0);
      const replace = document.createRange();
      replace.setStart(triggerRange.startContainer, triggerRange.startOffset);
      replace.setEnd(now.endContainer, now.endOffset);
      replace.deleteContents();
      const text = document.createTextNode(item.value);
      replace.insertNode(text);
      // Move caret to end of inserted text.
      const after = document.createRange();
      after.setStartAfter(text);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
      // Tell the contenteditable something changed so rAF-batched DOM
      // observers (MutationObserver in SiteRenderer) pick it up.
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } catch {
      // Fallthrough — user likely re-selected; just close.
    }
    close();
  }, [close]);

  // ── Keydown listener: open on "/" inside a [data-pe-editable] field ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Navigation / dismissal while menu is already open.
      if (open) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIdx(i => Math.min(filteredItems.length - 1, i + 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIdx(i => Math.max(0, i - 1));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          insertSelected(filteredItems[selectedIdx]);
          return;
        }
        // Update query as user types filter chars. Backspace past "/" closes.
        if (e.key === 'Backspace' && query === '') { close(); return; }
        return;
      }

      // Only open on "/" typed inside a contenteditable[data-pe-editable].
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const editable = target.closest<HTMLElement>('[data-pe-editable="true"]');
      if (!editable || editable.contentEditable !== 'true') return;

      // Capture caret position BEFORE the "/" is inserted so we can compute
      // the replacement range on commit. `/` will still type into the field;
      // we snapshot the range and then as the user types we read the query
      // from the live selection.
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const caretRange = sel.getRangeAt(0).cloneRange();
      // Trigger anchor is the current caret position (before `/`).
      triggerRangeRef.current = caretRange;
      activeEditableRef.current = editable;
      // Anchor the popover just below the caret rect.
      const rect = caretRange.getBoundingClientRect();
      // Collapsed-range rects can be zero-width — fall back to the element.
      const anchorRect = (rect.height === 0)
        ? editable.getBoundingClientRect()
        : rect;
      setAnchor({ top: anchorRect.bottom + 6, left: anchorRect.left });
      setQuery('');
      setSelectedIdx(0);
      setOpen(true);
    };

    // Track the query as the user types. We read it by comparing the caret
    // position to the trigger range: everything between trigger+1 (after
    // the "/") and the caret is the live filter text.
    const onInput = () => {
      if (!open) return;
      const el = activeEditableRef.current;
      const trigger = triggerRangeRef.current;
      const sel = window.getSelection();
      if (!el || !trigger || !sel || sel.rangeCount === 0) return;
      try {
        const caret = sel.getRangeAt(0);
        const between = document.createRange();
        between.setStart(trigger.startContainer, trigger.startOffset);
        between.setEnd(caret.endContainer, caret.endOffset);
        const text = between.toString();
        // Menu is only valid while the "/" is still the leading char.
        if (!text.startsWith('/')) { close(); return; }
        setQuery(text.slice(1));
        setSelectedIdx(0);
      } catch {
        close();
      }
    };

    // Outside click / field blur dismisses.
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-pe-slash-menu]')) return;
      if (activeEditableRef.current?.contains(t as Node)) return;
      close();
    };

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open, query, selectedIdx, filteredItems, close, insertSelected]);

  if (typeof document === 'undefined' || !open || !anchor) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        data-pe-slash-menu="true"
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          top: anchor.top,
          left: anchor.left,
          width: 296,
          maxHeight: 360,
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #FDFAF0 0%, #F3EFE7 100%)',
          backdropFilter: 'saturate(160%) blur(16px)',
          WebkitBackdropFilter: 'saturate(160%) blur(16px)',
          borderTop: '2px solid rgba(193,154,75,0.55)',
          borderLeft: '1px solid rgba(193,154,75,0.22)',
          borderRight: '1px solid rgba(193,154,75,0.22)',
          borderBottom: '1px solid rgba(193,154,75,0.22)',
          borderRadius: 'var(--pl-radius-xs)',
          boxShadow: '0 20px 48px rgba(28,22,10,0.24), 0 2px 8px rgba(28,22,10,0.06)',
          zIndex: 'var(--z-max)',
          padding: '10px 10px 8px',
          fontFamily: 'var(--pl-font-body)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'end',
            gap: 10,
            padding: '2px 8px 8px',
            borderBottom: '1px solid rgba(193,154,75,0.28)',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(193,154,75,0.85)',
            }}>
              Slash · compose
            </span>
            <span style={{
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              fontSize: '1.05rem',
              lineHeight: 1.05,
              color: 'var(--ink)',
              fontWeight: 400,
            }}>
              Insert…
            </span>
          </div>
          {query && (
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                color: 'rgba(193,154,75,0.95)',
                padding: '3px 8px',
                border: '1px solid rgba(193,154,75,0.35)',
                borderRadius: 'var(--pl-radius-xs)',
                background: 'rgba(255,252,245,0.7)',
                textTransform: 'uppercase',
              }}
            >
              /{query}
            </span>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '22px 10px',
              fontSize: 12,
              color: 'var(--ink-muted)',
              textAlign: 'center',
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              border: '1px dashed rgba(193,154,75,0.45)',
              borderRadius: 'var(--pl-radius-xs)',
              background: 'rgba(255,252,245,0.45)',
            }}
          >
            <span style={{
              display: 'block',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(193,154,75,0.85)',
              fontStyle: 'normal',
              marginBottom: 4,
            }}>
              Blank folio
            </span>
            No matches.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const selected = idx === selectedIdx;
            return (
              <button
                key={item.id}
                type="button"
                // onMouseDown fires before the editable loses focus.
                onMouseDown={(e) => { e.preventDefault(); insertSelected(item); }}
                onMouseEnter={() => setSelectedIdx(idx)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 30px 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 'var(--pl-radius-xs)',
                  border: 'none',
                  background: selected
                    ? 'rgba(193,154,75,0.12)'
                    : 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  position: 'relative',
                  transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: selected ? 'inset 2px 0 0 rgba(193,154,75,0.75)' : 'none',
                }}
              >
                <span style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  color: selected ? 'rgba(193,154,75,1)' : 'rgba(193,154,75,0.5)',
                  textAlign: 'right',
                  paddingRight: 2,
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--pl-radius-xs)',
                    background: selected
                      ? 'rgba(193,154,75,0.20)'
                      : 'rgba(255,252,245,0.65)',
                    border: selected
                      ? '1px solid rgba(193,154,75,0.55)'
                      : '1px solid rgba(193,154,75,0.18)',
                    flexShrink: 0,
                    transition: 'background 180ms ease, border-color 180ms ease',
                  }}
                >
                  <item.Icon
                    size={13}
                    color={selected ? 'rgba(120,90,40,1)' : 'var(--ink-soft)'}
                  />
                </div>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div style={{
                    fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                    fontStyle: 'italic',
                    fontSize: '0.88rem',
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: 'var(--ink)',
                  }}>
                    {item.label}
                  </div>
                  {item.hint && (
                    <div
                      style={{
                        fontSize: 9.5,
                        color: 'rgba(82,82,91,0.9)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--pl-font-mono)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.hint}
                    </div>
                  )}
                </div>
                {selected && (
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(193,154,75,0.95)',
                      flexShrink: 0,
                      paddingLeft: 4,
                    }}
                  >
                    ↵
                  </span>
                )}
              </button>
            );
          })
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function buildItems(m: StoryManifest, coupleNames?: [string, string]): SlashItem[] {
  const items: SlashItem[] = [];
  const logistics = m.logistics ?? {};
  const firstEvent = m.events?.[0];
  const mainDate = formatNiceDate(firstEvent?.date || logistics.date);
  const mainTime = firstEvent?.time || logistics.time || '';
  const venue = firstEvent?.venue || logistics.venue || '';
  const venueAddress = logistics.venueAddress || '';
  const rsvpDeadline = formatNiceDate(logistics.rsvpDeadline);
  const dresscode = logistics.dresscode || '';
  const rsvpUrl = m.registry?.entries?.[0]?.url || '';
  const names = (coupleNames && coupleNames[0] && coupleNames[1])
    ? `${coupleNames[0]} & ${coupleNames[1]}`
    : '';

  // --- Smart data inserts ---
  if (mainDate) items.push({
    id: 'date', label: 'Wedding date', hint: mainDate,
    Icon: Calendar, value: mainDate, keywords: ['date', 'when', 'wedding'],
  });
  if (mainTime) items.push({
    id: 'time', label: 'Ceremony time', hint: mainTime,
    Icon: Clock, value: mainTime, keywords: ['time', 'ceremony', 'when'],
  });
  if (venue) items.push({
    id: 'venue', label: 'Venue', hint: venue,
    Icon: MapPin, value: venue, keywords: ['venue', 'place', 'where'],
  });
  if (venueAddress) items.push({
    id: 'venue-addr', label: 'Venue address', hint: venueAddress,
    Icon: MapPin, value: venueAddress, keywords: ['address', 'location'],
  });
  if (rsvpDeadline) items.push({
    id: 'rsvp-deadline', label: 'RSVP deadline', hint: rsvpDeadline,
    Icon: CalendarClock, value: rsvpDeadline, keywords: ['rsvp', 'deadline'],
  });
  if (dresscode) items.push({
    id: 'dresscode', label: 'Dress code', hint: dresscode,
    Icon: Shirt, value: dresscode, keywords: ['dress', 'attire', 'code'],
  });
  if (rsvpUrl) items.push({
    id: 'rsvp-url', label: 'RSVP link', hint: rsvpUrl,
    Icon: Link2, value: rsvpUrl, keywords: ['rsvp', 'link', 'url'],
  });
  if (names) items.push({
    id: 'names', label: 'Couple names', hint: names,
    Icon: Users, value: names, keywords: ['names', 'couple', 'us'],
  });
  // --- Utilities ---
  items.push({
    id: 'today', label: 'Today', hint: todaysDate(),
    Icon: Calendar, value: todaysDate(), keywords: ['today', 'now', 'date'],
  });
  items.push({
    id: 'em-dash', label: 'Em dash', hint: '—',
    Icon: Minus, value: '—', keywords: ['dash', 'em', 'punctuation'],
  });
  items.push({
    id: 'divider-line', label: 'Horizontal divider', hint: '⸻',
    Icon: Minus, value: '⸻', keywords: ['divider', 'rule', 'line', 'hr'],
  });
  items.push({
    id: 'bullet', label: 'Bullet point', hint: '•',
    Icon: Hash, value: '•', keywords: ['bullet', 'list', 'dot'],
  });
  items.push({
    id: 'heart', label: 'Heart', hint: '❤',
    Icon: Heart, value: '❤', keywords: ['heart', 'love', 'emoji'],
  });
  items.push({
    id: 'sparkle', label: 'Sparkle', hint: '✦',
    Icon: Sparkles, value: '✦', keywords: ['sparkle', 'star', 'emoji'],
  });
  items.push({
    id: 'ampersand', label: 'Ampersand', hint: '&',
    Icon: Type, value: '&', keywords: ['and', 'ampersand', 'symbol'],
  });

  return items;
}
