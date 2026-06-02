'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx StoryEditor —
   now with working Shorten/Warmer/Funnier/More poetic chips that
   call /api/inline-rewrite to rewrite the story body in place. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, PearChip, SectionPanelShell } from './_section-atoms';

type Tone = 'Shorten' | 'Warmer' | 'Funnier' | 'More poetic';

export function StoryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const story = (manifest as unknown as { storySection?: { headline?: string; body?: string; chips?: string[] } }).storySection ?? {};
  const headline = story.headline ?? '';
  const body = story.body ?? '';
  const chips = story.chips ?? ['Together since 2017', 'Santorini, Greece', 'Aegean blue'];
  const [busy, setBusy] = useState<Tone | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const patch = (next: Partial<{ headline: string; body: string; chips: string[] }>) =>
    onChange({ ...manifest, storySection: { ...story, ...next } } as StoryManifest);

  /* Rewrite — POST /api/inline-rewrite with the body + tone-tagged
     context, then patch storySection.body with the result. */
  async function rewrite(tone: Tone) {
    if (!body.trim()) {
      setErr('Write some story first, then Pear can rewrite it.');
      return;
    }
    setBusy(tone); setErr(null);
    try {
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, context: `story body — make it ${tone.toLowerCase()}` }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const { rewritten } = await res.json() as { rewritten: string };
      if (rewritten && rewritten !== body) patch({ body: rewritten });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Headline">
          <FInput value={headline} onChange={(v) => patch({ headline: v })} placeholder="How we got here" />
        </FGroup>
        <FGroup label="Your story" action={<PearChip>Draft for me</PearChip>}>
          <textarea
            value={body}
            onChange={(e) => patch({ body: e.target.value })}
            rows={6}
            placeholder="We met on an ordinary Tuesday…"
            disabled={!!busy}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none', opacity: busy ? 0.7 : 1 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(['Shorten', 'Warmer', 'Funnier', 'More poetic'] as Tone[]).map((s) => {
              const on = busy === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => rewrite(s)}
                  disabled={!!busy}
                  style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: on ? 'var(--peach-bg)' : 'var(--cream-2)', border: '1px solid var(--line)', color: on ? 'var(--peach-ink)' : 'var(--ink-soft)', cursor: busy && !on ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)', animation: 'pl-dot-pulse 1.4s ease-in-out infinite' }} />}
                  {on ? `${s}…` : s}
                </button>
              );
            })}
          </div>
          {err && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11.5, color: '#7A2D2D' }}>
              {err}
            </div>
          )}
        </FGroup>
        <FGroup label="Highlight chips" hint="Little facts shown as pills.">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c, i) => (
              <span key={c} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--lavender-bg)', color: 'var(--lavender-ink)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                {c}
                <button
                  type="button"
                  onClick={() => patch({ chips: chips.filter((_, idx) => idx !== i) })}
                  aria-label={`Remove ${c}`}
                  style={{ background: 'transparent', border: 'none', color: 'var(--lavender-ink)', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                >
                  <Icon name="close" size={9} color="var(--lavender-ink)" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                const text = window.prompt('Add a chip');
                if (text && text.trim()) patch({ chips: [...chips, text.trim()] });
              }}
              style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, border: '1px dashed var(--line)', color: 'var(--ink-soft)', background: 'transparent', cursor: 'pointer' }}
            >
              + Add
            </button>
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default StoryPanel;
