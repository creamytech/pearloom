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
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Bold, Italic, Type } from 'lucide-react';
import { PearIcon } from '@/components/icons/PearloomIcons';
import type { TextFormat } from './preview/CanvasInlineFormatBar';
import type { StoryManifest } from '@/types';

const OLIVE = '#18181B';

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
  { value: '#A3B18A', label: 'Olive' },
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
  const pillRef = useRef<HTMLDivElement>(null);
  const ignoreNextSelection = useRef(false);

  // Current format for the focused path, sourced from the manifest.
  const currentFormat: TextFormat = (editPath && manifest?.textFormats?.[editPath]) || {};

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

    // Path lives on data-pe-path (data-pe-editable is always "true").
    const path = editableEl.getAttribute('data-pe-path');
    if (!path) return;

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

  // ── Rewrite handler ───────────────────────────────────────
  const handleRewrite = useCallback(async (style: string) => {
    if (!editPath || !selectedText || loading) return;

    setLoading(true);
    setActiveStyle(style);
    ignoreNextSelection.current = true;

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Rewrite this text to be ${style}: "${selectedText}". Return ONLY the rewritten text with no quotes, no explanation, no extra formatting. Just the rewritten text.`,
            },
          ],
          manifest: {},
          coupleNames: [],
        }),
      });

      if (!res.ok) throw new Error('Rewrite failed');

      const data = await res.json();
      const rewritten = data.reply?.trim() || data.message?.trim();

      if (rewritten) {
        // Replace selected text by updating the manifest via the edit path.
        // Works against the live DOM node (data-pe-path locator) — pick the
        // exact editable element so we don't accidentally target a different
        // field that happens to contain the same text.
        const editableEl = document.querySelector(`[data-pe-path="${editPath}"]`);
        const fullText = editableEl?.textContent || '';
        const newText = fullText.replace(selectedText, rewritten);
        onTextEdit(editPath, newText);

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setVisible(false);
      }
    } catch (err) {
      console.error('[PearTextRewrite] Rewrite failed:', err);
    } finally {
      setLoading(false);
      setActiveStyle(null);
    }
  }, [editPath, selectedText, loading, onTextEdit]);

  // ── Format change — writes through the __format: protocol ──
  const applyFormat = useCallback((patch: Partial<TextFormat>) => {
    if (!editPath) return;
    const next: TextFormat = { ...currentFormat, ...patch };
    onTextEdit('__format:' + editPath, JSON.stringify(next));
  }, [editPath, currentFormat, onTextEdit]);

  const activeSize = currentFormat.size ?? 'md';
  const activeColor = currentFormat.color ?? '';

  return (
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
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 6px',
            borderRadius: '10px',
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
                borderRadius: '8px',
                border: 'none',
                background: activeStyle === opt.value ? 'rgba(24,24,27,0.08)' : 'transparent',
                color: 'var(--pl-ink-soft, #3D3530)',
                fontSize: '0.6rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading && activeStyle !== opt.value ? 0.5 : 1,
                transition: 'all 0.15s',
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
                    borderRadius: 6,
                    border: on ? '1px solid rgba(24,24,27,0.2)' : '1px solid transparent',
                    background: on ? 'rgba(24,24,27,0.08)' : 'transparent',
                    color: on ? OLIVE : 'rgba(24,24,27,0.55)',
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
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
                    transition: 'all 0.12s',
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
    </AnimatePresence>
  );
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
        borderRadius: 6,
        border: active ? '1px solid rgba(24,24,27,0.2)' : '1px solid transparent',
        background: active ? 'rgba(24,24,27,0.08)' : 'transparent',
        color: active ? OLIVE : 'rgba(24,24,27,0.55)',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}
