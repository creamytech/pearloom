'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / PearTextRewrite.tsx — Floating AI rewrite pill
// Shows when user selects text inside [data-pe-editable] elements.
// Offers quick style rewrites via /api/ai-chat.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { PearIcon } from '@/components/icons/PearloomIcons';

const OLIVE = 'var(--pl-olive, #A3B18A)';

const STYLE_OPTIONS = [
  { label: 'Shorter', value: 'shorter and more concise' },
  { label: 'Longer', value: 'longer and more detailed' },
  { label: 'More Romantic', value: 'more romantic and heartfelt' },
  { label: 'More Formal', value: 'more formal and elegant' },
] as const;

interface PearTextRewriteProps {
  onTextEdit: (path: string, value: string) => void;
}

export function PearTextRewrite({ onTextEdit }: PearTextRewriteProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [editPath, setEditPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const ignoreNextSelection = useRef(false);

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
    const editableEl = anchor?.parentElement?.closest?.('[data-pe-editable]')
      || (anchor as Element)?.closest?.('[data-pe-editable]');
    if (!editableEl) {
      setVisible(false);
      return;
    }

    const path = editableEl.getAttribute('data-pe-editable');
    if (!path) return;

    // Position above the selection
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setEditPath(path);
    setPosition({
      top: rect.top - 48,
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
        // Replace selected text by updating the manifest via the edit path
        // We need to get the full current text and replace the selected portion
        const editableEl = document.querySelector(`[data-pe-editable="${editPath}"]`);
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={pillRef}
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
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
            borderRadius: '100px',
            background: 'rgba(250, 247, 242, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 24px rgba(43,30,20,0.12), 0 1px 4px rgba(43,30,20,0.06)',
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
              fontSize: '0.68rem',
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
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(163,177,138,0.12)' }}
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
                borderRadius: '100px',
                border: 'none',
                background: activeStyle === opt.value ? 'rgba(163,177,138,0.15)' : 'transparent',
                color: 'var(--pl-ink-soft, #3D3530)',
                fontSize: '0.64rem',
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
