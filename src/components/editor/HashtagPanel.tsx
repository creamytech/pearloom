'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/HashtagPanel.tsx
// AI wedding hashtag generator, restyled in the editorial chrome:
// Fraunces italic tag display, mono uppercase meta, gold accents on
// cream surfaces. Slots into the Details tab below logistics.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, Loader2, Tag } from 'lucide-react';
import type { StoryManifest } from '@/types';
import {
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

interface HashtagPanelProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Couple names — passed separately so they don't need to come from manifest */
  names?: [string, string];
}

const PREVIEW_COUNT = 3;

export function HashtagPanel({ manifest, onChange, names }: HashtagPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const hashtags: string[] = manifest.hashtags || [];

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

      const data = (await res.json()) as { hashtags: string[] };
      onChange({ ...manifest, hashtags: data.hashtags || [] });
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again');
    } finally {
      setGenerating(false);
    }
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag).catch(() => {});
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const visibleTags = expanded ? hashtags : hashtags.slice(0, PREVIEW_COUNT);
  const hiddenCount = hashtags.length - PREVIEW_COUNT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: panelFont.mono,
            fontSize: panelText.meta,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-text-faint)',
          }}
        >
          <Tag size={11} strokeWidth={1.75} color="var(--pl-chrome-accent)" />
          Hashtag lab
        </span>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '99px',
            fontFamily: panelFont.mono,
            fontSize: panelText.meta,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
            background: 'var(--pl-chrome-accent)',
            color: 'var(--pl-chrome-accent-ink)',
            border: '1px solid var(--pl-chrome-accent)',
            transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
            lineHeight: 1,
          }}
        >
          {generating ? (
            <Loader2 size={11} strokeWidth={2} style={{ animation: 'pl-hashtag-spin 1s linear infinite' }} />
          ) : (
            <Sparkles size={11} strokeWidth={1.75} />
          )}
          {generating ? 'Divining' : hashtags.length ? 'Reroll' : 'Generate'}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'color-mix(in srgb, var(--pl-chrome-danger) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--pl-chrome-danger) 28%, transparent)',
              color: 'var(--pl-chrome-danger)',
              fontFamily: panelFont.body,
              fontSize: panelText.hint,
              lineHeight: panelLineHeight.snug,
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {hashtags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
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
                    transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'var(--pl-chrome-surface)',
                      border: '1px solid var(--pl-chrome-border)',
                      transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          fontFamily: panelFont.mono,
                          fontSize: panelText.meta,
                          fontWeight: panelWeight.bold,
                          letterSpacing: panelTracking.widest,
                          color: 'var(--pl-chrome-accent)',
                          flexShrink: 0,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          fontFamily: panelFont.display,
                          fontStyle: 'italic',
                          fontSize: panelText.itemTitle,
                          fontWeight: panelWeight.regular,
                          color: 'var(--pl-chrome-text)',
                          letterSpacing: '-0.01em',
                          lineHeight: panelLineHeight.tight,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tag}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyTag(tag)}
                      title={`Copy ${tag}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '99px',
                        fontFamily: panelFont.mono,
                        fontSize: panelText.meta,
                        fontWeight: panelWeight.bold,
                        letterSpacing: panelTracking.widest,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        background: isCopied
                          ? 'color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)'
                          : 'transparent',
                        border: '1px solid var(--pl-chrome-border)',
                        color: isCopied ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-text-muted)',
                        transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {isCopied ? (
                        <>
                          <Check size={10} strokeWidth={2} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={10} strokeWidth={1.75} /> Copy
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {hashtags.length > PREVIEW_COUNT && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontFamily: panelFont.mono,
                    fontSize: panelText.meta,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-soft)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                  }}
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={11} strokeWidth={1.75} /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={11} strokeWidth={1.75} /> +{hiddenCount} more
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {hashtags.length === 0 && !generating && (
        <p
          style={{
            margin: 0,
            fontFamily: panelFont.body,
            fontSize: panelText.hint,
            fontStyle: 'italic',
            color: 'var(--pl-chrome-text-muted)',
            textAlign: 'center',
            lineHeight: panelLineHeight.normal,
            padding: '2px 4px 6px',
          }}
        >
          Generate a handful of hashtags for the couple — remixable, copyable, and shareable.
        </p>
      )}

      <style>{`@keyframes pl-hashtag-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
