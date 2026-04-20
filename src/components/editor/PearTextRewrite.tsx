'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / PearTextRewrite.tsx — Floating text toolbar
// Shows when user selects text inside [data-pe-editable] elements.
// Combines quick AI rewrites (/api/ai-chat) with inline format
// controls (bold, italic, size, color). Format changes write to
// `manifest.textFormats[path]` via the existing `__format:` edit
// protocol handled in EditorCanvas.handleTextEdit.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Bold, Italic, Type, ChevronDown } from 'lucide-react';
import { PearIcon } from '@/components/icons/PearloomIcons';
import type { TextFormat } from './preview/CanvasInlineFormatBar';
import type { StoryManifest } from '@/types';
import { buildSingleFontUrl } from '@/lib/font-catalog';

const OLIVE = '#18181B';

// Curated inline font list — small enough to fit a popover, broad enough
// to cover serif / sans / display / script needs. Full catalog is still
// reachable via the Design panel.
const FONT_OPTIONS: string[] = [
  'Playfair Display',
  'Cormorant Garamond',
  'Lora',
  'Libre Baskerville',
  'EB Garamond',
  'Dancing Script',
  'Great Vibes',
  'Pinyon Script',
  'Josefin Sans',
  'DM Sans',
  'Montserrat',
  'Inter',
  'Raleway',
  'Open Sans',
  'Lato',
];

// Track which <link>s we've injected so we don't thrash the DOM.
const __injectedFontHrefs = new Set<string>();
function ensureFontLoaded(name: string) {
  if (typeof document === 'undefined') return;
  const href = buildSingleFontUrl(name);
  if (__injectedFontHrefs.has(href)) return;
  __injectedFontHrefs.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const STYLE_OPTIONS = [
  { label: 'Shorter', value: 'shorter and more concise' },
  { label: 'Longer', value: 'longer and more detailed' },
  { label: 'More Romantic', value: 'more romantic and heartfelt' },
  { label: 'More Formal', value: 'more formal and elegant' },
] as const;

const SIZE_OPTIONS: Array<{ id: NonNullable<TextFormat['size']>; label: string }> = [
  { id: 'sm', label: 'S'  },
  { id: 'md', label: 'M'  },
  { id: 'lg', label: 'L'  },
  { id: 'xl', label: 'XL' },
];

const COLOR_SWATCHES = [
  { value: '#18181B', label: 'Ink'   },
  { value: '#ffffff', label: 'White' },
  { value: '#F5F1E8', label: 'Cream' },
  { value: '#5C6B3F', label: 'Olive' },
  { value: '#C4A96A', label: 'Gold'  },
  { value: '#8B7355', label: 'Warm'  },
  { value: '#6B7280', label: 'Gray'  },
];

interface PearTextRewriteProps {
  onTextEdit: (path: string, value: string) => void;
  /** Live manifest — needed to read current per-field format state. */
  manifest?: StoryManifest;
}

export function PearTextRewrite({ onTextEdit, manifest }: PearTextRewriteProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [editPath, setEditPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  // Variant compare — when the user triggers a rewrite we ask for 3
  // distinct variants and show them side-by-side instead of replacing
  // text immediately. User picks one (or regenerates / cancels).
  const [variants, setVariants] = useState<string[] | null>(null);
  const [variantStyle, setVariantStyle] = useState<string | null>(null);
  const [variantIdx, setVariantIdx] = useState(0);
  const pillRef = useRef<HTMLDivElement>(null);
  const ignoreNextSelection = useRef(false);
  // Remember the DOM node that owns the active selection — we need it
  // when the edit path is synthetic (`chapter:<id>:<field>`) and no
  // plain [data-pe-path] attribute exists to query by.
  const editableRef = useRef<HTMLElement | null>(null);

  // Current format for the focused path, sourced from the manifest.
  const currentFormat: TextFormat = (editPath && manifest?.textFormats?.[editPath]) || {};

  // Preload the active font whenever the focused field changes so the
  // menu button shows the real face instead of a fallback.
  useEffect(() => {
    if (currentFormat.fontFamily) ensureFontLoaded(currentFormat.fontFamily);
  }, [currentFormat.fontFamily]);

  // Close the font menu whenever we lose visibility.
  useEffect(() => {
    if (!visible) setFontMenuOpen(false);
  }, [visible]);

  // ── Listen for text selection inside editable regions ──────
  const handleSelectionChange = useCallback(() => {
    if (ignoreNextSelection.current) {
      ignoreNextSelection.current = false;
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // Small delay before hiding to allow clicking the pill
      setTimeout(() => {
        const sel2 = window.getSelection();
        if (!sel2 || sel2.isCollapsed || !sel2.toString().trim()) {
          setVisible(false);
        }
      }, 150);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 3) return;

    // Check if selection is inside a [data-pe-editable] element
    const anchor = sel.anchorNode;
    const editableEl = (anchor?.parentElement?.closest?.('[data-pe-editable="true"]')
      || (anchor as Element)?.closest?.('[data-pe-editable="true"]')) as HTMLElement | null;
    if (!editableEl) {
      setVisible(false);
      return;
    }

    // Resolve the manifest path the same way EditBridge does: prefer an
    // explicit data-pe-path, else derive `chapter:<id>:<field>` from the
    // enclosing chapter + field attribute (how StoryLayouts marks things).
    const directPath = editableEl.getAttribute('data-pe-path');
    const chapterEl = editableEl.closest('[data-pe-chapter]') as HTMLElement | null;
    const chapterId = chapterEl?.getAttribute('data-pe-chapter') ?? null;
    const field = editableEl.getAttribute('data-pe-field');
    const path = directPath
      || (chapterId && field ? `chapter:${chapterId}:${field}` : null);
    if (!path) return;

    editableRef.current = editableEl;

    // Position above the selection
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setEditPath(path);
    setPosition({
      top: rect.top - 52,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
    setActiveStyle(null);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // ── Dismiss on Escape ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        setVisible(false);
        window.getSelection()?.removeAllRanges();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  // ── Dismiss on click outside ──────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    // Delay to avoid immediately catching the selection click
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [visible]);

  // ── Rewrite handler (generates 3 variants for compare) ────
  const handleRewrite = useCallback(async (style: string) => {
    if (!editPath || !selectedText || loading) return;

    setLoading(true);
    setActiveStyle(style);
    setVariantStyle(style);
    setVariants(null);
    setVariantIdx(0);
    ignoreNextSelection.current = true;

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Rewrite this text to be ${style}: "${selectedText}". Give me exactly 3 DISTINCT variants that differ from each other in tone, phrasing, or rhythm. Return ONLY the 3 variants, one per line, no numbers, no bullets, no quotes, no extra explanation. Each variant should be a complete rewrite of the original, not a continuation.`,
            },
          ],
          manifest: {},
          coupleNames: [],
        }),
      });

      if (!res.ok) throw new Error('Rewrite failed');

      const data = await res.json();
      const raw: string = data.reply || data.message || '';
      const parsed = raw
        .split(/\r?\n/)
        .map(line => line.replace(/^\s*[-*•\d.)]+\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(Boolean)
        .slice(0, 3);

      if (parsed.length === 0) {
        // Graceful fallback: treat the whole response as a single variant.
        setVariants([raw.trim()].filter(Boolean));
      } else {
        setVariants(parsed);
      }
    } catch (err) {
      console.error('[PearTextRewrite] Rewrite failed:', err);
      setVariants([]);
    } finally {
      setLoading(false);
      setActiveStyle(null);
    }
  }, [editPath, selectedText, loading]);

  // Commit a single variant to the manifest and close the pill.
  const acceptVariant = useCallback((text: string) => {
    if (!editPath || !text) return;
    const editableEl = editableRef.current
      || document.querySelector(`[data-pe-path="${editPath}"]`);
    const fullText = editableEl?.textContent || '';
    const newText = fullText.replace(selectedText, text);
    onTextEdit(editPath, newText);
    window.getSelection()?.removeAllRanges();
    setVariants(null);
    setVariantStyle(null);
    setVisible(false);
  }, [editPath, selectedText, onTextEdit]);

  const cancelVariants = useCallback(() => {
    setVariants(null);
    setVariantStyle(null);
    setVariantIdx(0);
  }, []);

  // Keyboard nav while variants are showing — ↑/↓ to move, Enter to accept, Esc to cancel.
  useEffect(() => {
    if (!variants || variants.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setVariantIdx(i => Math.min(variants.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setVariantIdx(i => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); acceptVariant(variants[variantIdx]); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelVariants(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variants, variantIdx, acceptVariant, cancelVariants]);

  // ── Format change — writes through the __format: protocol ──
  const applyFormat = useCallback((patch: Partial<TextFormat>) => {
    if (!editPath) return;
    const next: TextFormat = { ...currentFormat, ...patch };
    onTextEdit('__format:' + editPath, JSON.stringify(next));
  }, [editPath, currentFormat, onTextEdit]);

  const activeSize = currentFormat.size ?? 'md';
  const activeColor = currentFormat.color ?? '';

  // Portal to document.body so we escape `#pl-editor-canvas`'s stacking
  // context (it has zIndex:1 relative to its panel sibling, which would
  // otherwise clip our fixed-position pill behind the right-side editor
  // panel).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={pillRef}
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          // Prevent selectionchange from clearing our anchor while the user
          // clicks format buttons. Buttons use onMouseDown (with preventDefault)
          // below, but we also guard at the container level for safety.
          onMouseDown={(e) => {
            // Don't blur the selection when clicking anywhere on the pill
            // (except on the buttons themselves, which handle this explicitly).
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
            zIndex: 'var(--z-max)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 6px',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'rgba(250, 247, 242, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid #E4E4E7',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {/* Pear icon + Rewrite label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px 3px 6px',
              color: OLIVE,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            <PearIcon size={14} color={OLIVE} />
            Rewrite
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />

          {/* Style options */}
          {STYLE_OPTIONS.map((opt) => (
            <motion.button
              key={opt.label}
              whileHover={{ scale: 1.05, backgroundColor: '#F4F4F5' }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRewrite(opt.value);
              }}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: 'var(--pl-radius-md)',
                border: 'none',
                background: activeStyle === opt.value ? 'rgba(24,24,27,0.08)' : 'transparent',
                color: 'var(--pl-ink-soft, #3D3530)',
                fontSize: '0.6rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading && activeStyle !== opt.value ? 0.5 : 1,
                transition: 'all var(--pl-dur-instant)',
              }}
            >
              {loading && activeStyle === opt.value ? (
                <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              ) : null}
              {opt.label}
            </motion.button>
          ))}

          {/* ── Format section ──────────────────────────────── */}
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />

          {/* Font family picker (opens a small popover) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              title="Font family"
              aria-haspopup="menu"
              aria-expanded={fontMenuOpen}
              onMouseDown={(e) => { e.preventDefault(); setFontMenuOpen(o => !o); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                height: 22,
                borderRadius: 'var(--pl-radius-sm)',
                border: currentFormat.fontFamily
                  ? '1px solid rgba(24,24,27,0.2)'
                  : '1px solid transparent',
                background: currentFormat.fontFamily ? 'rgba(24,24,27,0.08)' : 'transparent',
                color: OLIVE,
                fontFamily: currentFormat.fontFamily
                  ? `"${currentFormat.fontFamily}", serif`
                  : 'inherit',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentFormat.fontFamily || 'Font'}
              <ChevronDown size={10} />
            </button>
            {fontMenuOpen && (
              <div
                role="menu"
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  minWidth: 180,
                  maxHeight: 240,
                  overflowY: 'auto',
                  padding: 4,
                  borderRadius: 'var(--pl-radius-lg)',
                  background: 'rgba(250,247,242,0.98)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid #E4E4E7',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 1,
                }}
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormat({ fontFamily: '' });
                    setFontMenuOpen(false);
                  }}
                  style={fontMenuItemStyle(!currentFormat.fontFamily)}
                >
                  Default
                </button>
                {FONT_OPTIONS.map(f => {
                  const on = currentFormat.fontFamily === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onMouseEnter={() => ensureFontLoaded(f)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        ensureFontLoaded(f);
                        applyFormat({ fontFamily: f });
                        setFontMenuOpen(false);
                      }}
                      style={{
                        ...fontMenuItemStyle(on),
                        fontFamily: `"${f}", serif`,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />

          {/* Bold */}
          <FormatBtn
            title="Bold"
            active={!!currentFormat.bold}
            onMouseDown={() => applyFormat({ bold: !currentFormat.bold })}
          >
            <Bold size={11} />
          </FormatBtn>

          {/* Italic */}
          <FormatBtn
            title="Italic"
            active={!!currentFormat.italic}
            onMouseDown={() => applyFormat({ italic: !currentFormat.italic })}
          >
            <Italic size={11} />
          </FormatBtn>

          {/* Size picker */}
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Type size={10} color="rgba(24,24,27,0.45)" />
            {SIZE_OPTIONS.map(s => {
              const on = activeSize === s.id;
              return (
                <button
                  key={s.id}
                  title={`Size: ${s.label}`}
                  onMouseDown={(e) => { e.preventDefault(); applyFormat({ size: s.id }); }}
                  style={{
                    padding: '2px 5px',
                    height: 20,
                    borderRadius: 'var(--pl-radius-sm)',
                    border: on ? '1px solid rgba(24,24,27,0.2)' : '1px solid transparent',
                    background: on ? 'rgba(24,24,27,0.08)' : 'transparent',
                    color: on ? OLIVE : 'rgba(24,24,27,0.55)',
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all var(--pl-dur-instant)',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Color swatches */}
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {COLOR_SWATCHES.map(c => {
              const on = activeColor === c.value;
              return (
                <button
                  key={c.value}
                  title={c.label}
                  aria-label={`Color ${c.label}`}
                  aria-pressed={on}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormat({ color: on ? '' : c.value });
                  }}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    padding: 0,
                    background: c.value,
                    border: on
                      ? '2px solid #18181B'
                      : c.value === '#ffffff'
                        ? '1.5px solid rgba(0,0,0,0.18)'
                        : '1.5px solid rgba(0,0,0,0.06)',
                    boxShadow: on ? '0 0 0 1px rgba(24,24,27,0.35)' : 'none',
                    cursor: 'pointer',
                    transition: 'all var(--pl-dur-instant)',
                  }}
                />
              );
            })}
            {activeColor && (
              <button
                title="Clear color"
                onMouseDown={(e) => { e.preventDefault(); applyFormat({ color: '' }); }}
                style={{
                  padding: '2px 4px',
                  height: 18,
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(24,24,27,0.45)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Variant compare panel — shown after a rewrite returns 3 options.
          Positioned just below the pill so the user can see original + choices. */}
      {variants && variants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top + 48,
            left: position.left,
            transform: 'translateX(-50%)',
            width: 360,
            maxHeight: 420,
            overflowY: 'auto',
            zIndex: 'var(--z-max)',
            padding: 10,
            borderRadius: 'var(--pl-radius-lg)',
            background: 'rgba(250, 247, 242, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid #E4E4E7',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '2px 4px 8px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#71717A',
            }}>
              Pick a variant · {variantStyle?.split(' ')[0] ?? ''}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); if (variantStyle) handleRewrite(variantStyle); }}
                disabled={loading}
                title="Regenerate variants"
                style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 'var(--pl-radius-sm)',
                  border: '1px solid #E4E4E7', background: '#fff',
                  color: '#3F3F46', cursor: loading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? '…' : 'Regenerate'}
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); cancelVariants(); }}
                title="Cancel (Esc)"
                style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 'var(--pl-radius-sm)',
                  border: '1px solid #E4E4E7', background: '#fff',
                  color: '#3F3F46', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {variants.map((v, i) => {
              const selected = i === variantIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setVariantIdx(i)}
                  onMouseDown={(e) => { e.preventDefault(); acceptVariant(v); }}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--pl-radius-md)',
                    border: selected ? '1.5px solid var(--pl-olive)' : '1px solid #E4E4E7',
                    background: selected ? 'rgba(163,177,138,0.1)' : '#fff',
                    color: '#18181B',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    lineHeight: 1.4,
                    cursor: 'pointer',
                    transition: 'all var(--pl-dur-instant)',
                  }}
                >
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--pl-olive)',
                    marginBottom: 4,
                  }}>
                    Variant {i + 1}{selected ? ' · ↵ to accept' : ''}
                  </div>
                  <div>{v}</div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Loading placeholder — keeps the area reserved while variants stream. */}
      {loading && !variants && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: position.top + 48,
            left: position.left,
            transform: 'translateX(-50%)',
            zIndex: 'var(--z-max)',
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'rgba(250, 247, 242, 0.98)',
            border: '1px solid #E4E4E7',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: '#52525B', fontFamily: 'inherit',
          }}
        >
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Drafting 3 variants…
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Shared style for font-picker menu items.
function fontMenuItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '5px 8px',
    borderRadius: 'var(--pl-radius-sm)',
    border: 'none',
    background: active ? 'rgba(24,24,27,0.08)' : 'transparent',
    color: OLIVE,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  };
}

// ── Small format button ────────────────────────────────────
function FormatBtn({
  title, active, onMouseDown, children,
}: {
  title: string;
  active: boolean;
  onMouseDown: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      style={{
        width: 22,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--pl-radius-sm)',
        border: active ? '1px solid rgba(24,24,27,0.2)' : '1px solid transparent',
        background: active ? 'rgba(24,24,27,0.08)' : 'transparent',
        color: active ? OLIVE : 'rgba(24,24,27,0.55)',
        cursor: 'pointer',
        transition: 'all var(--pl-dur-instant)',
      }}
    >
      {children}
    </button>
  );
}
