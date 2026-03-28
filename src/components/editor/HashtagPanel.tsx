'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/HashtagPanel.tsx
// AI wedding hashtag generator panel for the editor Details tab.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { StoryManifest } from '@/types';

// ── Props ──────────────────────────────────────────────────────

interface HashtagPanelProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Couple names — passed separately so they don't need to come from manifest */
  names?: [string, string];
}

// ── Main Component ─────────────────────────────────────────────

export function HashtagPanel({ manifest, onChange, names }: HashtagPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const hashtags: string[] = manifest.hashtags || [];
  const PREVIEW_COUNT = 3;

  // ── Generate ─────────────────────────────────────────────────

  const generate = async () => {
    setError(null);
    setGenerating(true);

    const [name1 = 'Partner', name2 = 'Partner'] = names || ['Partner', 'Partner'];

    try {
      const res = await fetch('/api/hashtag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: [name1, name2],
          vibeString: manifest.vibeString || '',
          location: manifest.logistics?.venue,
          date: manifest.logistics?.date,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Generation failed');
      }

      const data = await res.json() as { hashtags: string[] };
      onChange({ ...manifest, hashtags: data.hashtags || [] });
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again');
    } finally {
      setGenerating(false);
    }
  };

  // ── Copy ──────────────────────────────────────────────────────

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag).catch(() => {});
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // ── Styles ────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    background: '#1E1B16',
    border: '1px solid rgba(214,198,168,0.12)',
    borderRadius: '0.875rem',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#F5F1E8',
    letterSpacing: '0.02em',
  };

  const generateBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 1rem',
    borderRadius: '0.55rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: generating ? 'not-allowed' : 'pointer',
    opacity: generating ? 0.7 : 1,
    background: generating ? 'rgba(163,177,138,0.25)' : '#A3B18A',
    color: '#1E1B16',
    border: 'none',
    transition: 'all 0.15s ease',
    letterSpacing: '0.01em',
  };

  const tagRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.55rem 0.75rem',
    borderRadius: '0.55rem',
    background: 'rgba(163,177,138,0.06)',
    border: '1px solid rgba(163,177,138,0.12)',
    transition: 'background 0.15s ease',
  };

  const tagTextStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#A3B18A',
    fontFamily: 'monospace',
    letterSpacing: '0.01em',
  };

  const copyBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.25rem 0.65rem',
    borderRadius: '0.4rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'rgba(163,177,138,0.12)',
    border: '1px solid rgba(163,177,138,0.2)',
    color: 'rgba(214,198,168,0.7)',
    transition: 'all 0.15s ease',
  };

  const expandBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'rgba(214,198,168,0.45)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '0.25rem 0',
    transition: 'color 0.15s ease',
  };

  const visibleTags = expanded ? hashtags : hashtags.slice(0, PREVIEW_COUNT);
  const hiddenCount = hashtags.length - PREVIEW_COUNT;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={labelStyle}>
          <span style={{ fontSize: '1rem' }}>🏷️</span>
          Wedding Hashtag
        </span>
        <button
          style={generateBtnStyle}
          onClick={generate}
          disabled={generating}
        >
          {generating
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <Sparkles size={13} />}
          {generating ? 'Generating…' : 'Generate Hashtags'}
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '0.55rem',
              background: 'rgba(224,112,112,0.08)',
              border: '1px solid rgba(224,112,112,0.2)',
              color: '#E07070',
              fontSize: '0.8rem',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hashtag list */}
      <AnimatePresence initial={false}>
        {hashtags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}
          >
            <AnimatePresence initial={false}>
              {visibleTags.map((tag, i) => {
                const isCopied = copiedTag === tag;
                return (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.04 }}
                    style={tagRowStyle}
                  >
                    <span style={tagTextStyle}>{tag}</span>
                    <button
                      style={{
                        ...copyBtnStyle,
                        ...(isCopied ? {
                          background: 'rgba(163,177,138,0.2)',
                          color: '#A3B18A',
                          borderColor: 'rgba(163,177,138,0.35)',
                        } : {}),
                      }}
                      onClick={() => copyTag(tag)}
                      title={`Copy ${tag}`}
                    >
                      {isCopied
                        ? <><Check size={11} /> Copied!</>
                        : <><Copy size={11} /> Copy</>}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Expand / collapse */}
            {hashtags.length > PREVIEW_COUNT && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.25rem' }}
              >
                <button
                  style={expandBtnStyle}
                  onClick={() => setExpanded(v => !v)}
                >
                  {expanded
                    ? <><ChevronUp size={13} /> Show less</>
                    : <><ChevronDown size={13} /> +{hiddenCount} more — click to expand</>}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty hint */}
      {hashtags.length === 0 && !generating && (
        <p style={{
          margin: 0,
          fontSize: '0.8rem',
          color: 'rgba(214,198,168,0.35)',
          fontStyle: 'italic',
          textAlign: 'center',
          paddingBottom: '0.25rem',
        }}>
          Click "Generate Hashtags" to create personalized wedding hashtags using AI.
        </p>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
