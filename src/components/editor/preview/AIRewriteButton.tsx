'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/preview/AIRewriteButton.tsx
// Sparkle button that offers AI rewrite suggestions for any text
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIRewriteButtonProps {
  text: string;
  context: string; // couple names, vibe, occasion context
  onAccept: (newText: string) => void;
}

type RewriteStyle = 'poetic' | 'casual' | 'shorter';

const STYLES: { id: RewriteStyle; label: string }[] = [
  { id: 'poetic', label: 'More poetic' },
  { id: 'casual', label: 'More casual' },
  { id: 'shorter', label: 'Shorter' },
];

export function AIRewriteButton({ text, context, onAccept }: AIRewriteButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<RewriteStyle | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setResult(null);
        setActiveStyle(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRewrite = async (style: RewriteStyle) => {
    if (!text.trim() || loading) return;
    setActiveStyle(style);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context, style }),
      });
      const data = await res.json();
      setResult(data.rewrite || null);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!text || text.length < 5) return null;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <motion.button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title="AI Rewrite"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'rgba(24,24,27,0.08)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#71717A',
          transition: 'background 0.15s',
        }}
      >
        <Sparkles size={12} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#FFFFFF', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              padding: '0.75rem', minWidth: '220px', zIndex: 100,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              AI Rewrite
            </div>

            {/* Style options */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleRewrite(s.id)}
                  disabled={loading}
                  style={{
                    padding: '0.35rem 0.65rem', borderRadius: '8px',
                    border: `1.5px solid ${activeStyle === s.id ? '#71717A' : 'rgba(0,0,0,0.08)'}`,
                    background: activeStyle === s.id ? 'rgba(24,24,27,0.06)' : '#fff',
                    fontSize: '0.78rem', fontWeight: 500, cursor: loading ? 'wait' : 'pointer',
                    color: '#18181B', transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Loading state */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', color: '#9A9488', fontSize: '0.82rem' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Rewriting...
              </div>
            )}

            {/* Result */}
            {result && !loading && (
              <div>
                <div style={{
                  padding: '0.6rem', borderRadius: '0.5rem', background: '#F4F4F5',
                  border: '1px solid rgba(24,24,27,0.08)', fontSize: '0.85rem', lineHeight: 1.5,
                  color: '#18181B', marginBottom: '0.5rem',
                }}>
                  {result}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setOpen(false); setResult(null); setActiveStyle(null); }}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.08)', background: '#fff',
                      fontSize: '0.78rem', cursor: 'pointer', color: '#9A9488',
                    }}
                  >Dismiss</button>
                  <button
                    onClick={() => {
                      onAccept(result);
                      setOpen(false);
                      setResult(null);
                      setActiveStyle(null);
                    }}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '8px',
                      border: 'none', background: '#71717A', color: '#fff',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >Use this</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
