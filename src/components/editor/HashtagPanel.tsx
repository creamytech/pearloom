'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/HashtagPanel.tsx
// AI wedding hashtag generator panel for the editor Details tab.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Loader2, Tag } from 'lucide-react';
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
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    gap: '6px',
    fontSize: '0.62rem',
    fontWeight: 600,
    color: '#A1A1AA',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  const generateBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.6rem',
    fontWeight: 600,
    cursor: generating ? 'not-allowed' : 'pointer',
    opacity: generating ? 0.6 : 1,
    background: '#18181B',
    color: '#fff',
    border: 'none',
    transition: 'all 0.15s ease',
  };

  const tagRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.55rem 0.75rem',
    borderRadius: '0.55rem',
    background: '#F4F4F5',
    border: '1px solid #F4F4F5',
    transition: 'background 0.15s ease',
  };

  const tagTextStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#18181B',
    fontFamily: 'inherit',
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
    background: '#F4F4F5',
    border: '1px solid rgba(24,24,27,0.1)',
    color: '#71717A',
    transition: 'all 0.15s ease',
  };

  const expandBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#71717A',
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
          <Tag size={16} style={{ color: '#18181B' }} />
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
                          background: 'rgba(24,24,27,0.1)',
                          color: '#71717A',
                          borderColor: '#E4E4E7',
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
          color: '#71717A',
          
          textAlign: 'center',
          paddingBottom: '0.25rem',
        }}>
          Click "Generate Hashtags" to create personalized wedding hashtags using AI.
        </p>
      )}

      <style>{`
        
      `}</style>
    </div>
  );
}
