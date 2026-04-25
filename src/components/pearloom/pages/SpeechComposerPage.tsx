'use client';

import { useState } from 'react';
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear, Sparkle } from '../motifs';

type Kind = 'vows' | 'toast' | 'speech';

interface Analysis {
  duration_seconds: number;
  length_score: number;
  specificity_score: number;
  arc_score: number;
  cliches: Array<{ phrase: string; count: number }>;
  suggestions: string[];
  summary: string;
}

const KIND_LABELS: Record<Kind, { label: string; range: string; hint: string }> = {
  vows: { label: 'Vows', range: '60–120s', hint: 'Spoken to your partner — short, specific, structured.' },
  toast: { label: 'Toast', range: '90–180s', hint: 'Best man / MOH / parent — one anecdote, land warm.' },
  speech: { label: 'Welcome speech', range: '2–5min', hint: 'Host welcoming guests — set tone for the night.' },
};

export function SpeechComposerPage() {
  const [kind, setKind] = useState<Kind>('toast');
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!text.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/pear/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), kind }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Analyze failed (${res.status})`);
      }
      const data = (await res.json()) as { analysis?: Analysis };
      if (!data.analysis) throw new Error('No analysis returned');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speech analysis failed');
    } finally {
      setRunning(false);
    }
  }

  const meta = KIND_LABELS[kind];

  return (
    <DashLayout active="speech" title="Speech composer" subtitle="Paste a draft. Pear scores length, sentiment arc, and specificity, then suggests surgical edits.">
      <div className="pl8" style={{ padding: '0 clamp(20px, 4vw, 56px) 56px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.9fr)', gap: 28 }} className="pl8-speech-grid">
          {/* LEFT — composer */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(Object.keys(KIND_LABELS) as Kind[]).map((k) => {
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      border: active ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                      background: active ? 'var(--ink)' : 'var(--card)',
                      color: active ? 'var(--cream)' : 'var(--ink)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {KIND_LABELS[k].label}
                  </button>
                );
              })}
              <span style={{ alignSelf: 'center', marginLeft: 'auto', fontSize: 12, color: 'var(--ink-muted)' }}>
                Target: {meta.range}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10, lineHeight: 1.5 }}>
              {meta.hint}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your draft here. Pear works best with a real first attempt — even rough."
              rows={20}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--ink)',
                fontFamily: 'var(--pl-font-display, Georgia, serif)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                {text.split(/\s+/).filter(Boolean).length} words · {Math.ceil(text.length / 5)} chars
              </div>
              <button
                type="button"
                onClick={analyze}
                disabled={running || !text.trim()}
                className="btn btn-primary"
              >
                {running ? 'Pear is reading…' : 'Analyze with Pear'} <Sparkle size={11} />
              </button>
            </div>
            {error && <div style={{ marginTop: 10, fontSize: 13, color: '#7A2D2D' }}>{error}</div>}
          </div>

          {/* RIGHT — analysis */}
          <div style={{ position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
            {!analysis ? (
              <div
                style={{
                  background: 'var(--cream-2)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 16,
                  padding: 24,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Pear size={56} tone="sage" sparkle />
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  Paste a draft and tap <strong style={{ color: 'var(--ink)' }}>Analyze with Pear</strong>.
                  Scores + suggestions land here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <ScoreRow label="Length" score={analysis.length_score} suffix={`${analysis.duration_seconds}s read aloud`} />
                <ScoreRow label="Specific" score={analysis.specificity_score} suffix="concrete vs. abstract" />
                <ScoreRow label="Arc" score={analysis.arc_score} suffix="emotional rise" />

                {analysis.summary && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: 'var(--sage-tint)',
                      border: '1px solid var(--sage-deep)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--ink)',
                    }}
                  >
                    {analysis.summary}
                  </div>
                )}

                {analysis.cliches.length > 0 && (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7A2D2D', marginBottom: 8 }}>
                      Cliches found
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {analysis.cliches.map((c) => (
                        <span
                          key={c.phrase}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#F4E0D8',
                            color: '#7A2D2D',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {c.phrase} {c.count > 1 && <span style={{ opacity: 0.7 }}>×{c.count}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 10 }}>
                    Suggestions
                  </div>
                  <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.55 }}>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 920px) {
            .pl8-speech-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </DashLayout>
  );
}

function ScoreRow({ label, score, suffix }: { label: string; score: number; suffix: string }) {
  const color = score >= 80 ? 'var(--sage-deep)' : score >= 60 ? 'var(--peach-ink)' : '#7A2D2D';
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 22, fontWeight: 700, color }}>
          {Math.round(score)}
        </div>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--cream-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.max(2, Math.min(100, score))}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 6 }}>{suffix}</div>
    </div>
  );
}
