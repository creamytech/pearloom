'use client';

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { AISuggestButton, useAICall } from './ai';
import { Icon, Pear, Sparkle } from '../motifs';

type Suggestion = {
  id: string;
  category: 'palette' | 'typography' | 'content' | 'layout' | 'voice' | 'accessibility';
  severity: 'info' | 'nice-to-have' | 'should-fix';
  title: string;
  body: string;
};

export function DesignAdvisor({
  manifest,
  names,
  open,
  onClose,
}: {
  manifest: StoryManifest;
  names: [string, string];
  open: boolean;
  onClose: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const { state, error, run } = useAICall(async () => {
    const res = await fetch('/api/pear-critique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest, names }),
    });
    if (!res.ok) throw new Error(`Pear couldn't review (${res.status})`);
    const data = (await res.json()) as { suggestions?: Suggestion[]; items?: Suggestion[] };
    const list = data.suggestions ?? data.items ?? [];
    if (!list.length) throw new Error('No suggestions');
    setSuggestions(list);
    return list;
  });

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Design advisor"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.32)',
        backdropFilter: 'blur(4px)',
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 94vw)',
          height: '100%',
          background: 'var(--cream)',
          borderLeft: '1px solid var(--line-soft)',
          boxShadow: '-24px 0 60px rgba(14,13,11,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '18px 22px',
            borderBottom: '1px solid var(--line-soft)',
            position: 'sticky',
            top: 0,
            background: 'var(--cream)',
            zIndex: 2,
          }}
        >
          <Pear size={30} tone="sage" sparkle />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)', textTransform: 'uppercase' }}>
              Design advisor
            </div>
            <div className="display" style={{ fontSize: 18, margin: 0 }}>
              Pear reviews your site
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </header>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>
            Pear reads your manifest and flags what would make the site clearer, warmer, or more accessible. You
            don't have to accept any of it — these are suggestions, not fixes.
          </p>
          <AISuggestButton
            label={suggestions.length ? 'Review again' : 'Ask Pear to review'}
            runningLabel="Reviewing…"
            state={state}
            onClick={() => void run()}
            error={error ?? undefined}
          />

          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: 14,
                    background: 'var(--card)',
                    border: '1px solid var(--card-ring)',
                    borderRadius: 14,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        background:
                          s.severity === 'should-fix'
                            ? 'rgba(198,86,61,0.1)'
                            : s.severity === 'nice-to-have'
                              ? 'var(--peach-bg)'
                              : 'var(--cream-2)',
                        color:
                          s.severity === 'should-fix'
                            ? '#7A2D2D'
                            : s.severity === 'nice-to-have'
                              ? 'var(--peach-ink)'
                              : 'var(--ink-soft)',
                      }}
                    >
                      {s.severity}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      {s.category}
                    </span>
                  </div>
                  <div className="display" style={{ fontSize: 16, marginBottom: 4 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{s.body}</div>
                </div>
              ))}
            </div>
          )}

          {suggestions.length === 0 && state === 'idle' && (
            <div style={{ padding: 22, background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 14, textAlign: 'center' }}>
              <Sparkle size={14} />
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>
                Pear waits for you to ask — it's polite like that.
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
