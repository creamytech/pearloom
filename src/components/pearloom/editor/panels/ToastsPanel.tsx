'use client';

/* eslint-disable no-restricted-syntax */

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, PanelSection, SegmentedToggle, TextArea } from '../atoms';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { Icon, Sparkle } from '../../motifs';
import { AISource } from '../../ai-source';

type Kind = 'vows' | 'toast-parent' | 'toast-friend' | 'welcome';

const KINDS: Array<{ value: Kind; label: string }> = [
  { value: 'vows', label: 'Vows' },
  { value: 'toast-parent', label: 'Parent toast' },
  { value: 'toast-friend', label: 'Best-friend toast' },
  { value: 'welcome', label: 'Welcome speech' },
];

const LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const TONES = [
  { value: 'warm', label: 'Warm' },
  { value: 'funny', label: 'Funny' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'quiet', label: 'Quiet' },
];

interface ToastsDraft {
  id: string;
  kind: Kind;
  length: string;
  tone: string;
  notes: string;
  text: string;
  savedAt: number;
}

export function ToastsPanel({
  manifest,
  names,
  onChange,
}: {
  manifest: StoryManifest;
  names: [string, string];
  onChange: (m: StoryManifest) => void;
}) {
  const [kind, setKind] = useState<Kind>('vows');
  const [length, setLength] = useState<string>('medium');
  const [tone, setTone] = useState<string>('warm');
  const [notes, setNotes] = useState<string>('');
  const [draft, setDraft] = useState<string>('');

  // Persisted drafts live on the manifest so a host who closes the
  // editor doesn't lose what Pear wrote them. Keyed array — the
  // most recent is at the head.
  const savedDrafts = ((manifest as unknown as { toastsDrafts?: ToastsDraft[] }).toastsDrafts) ?? [];
  // Hydrate the current draft area with the most recent saved draft
  // matching the current kind, so swapping kinds restores the right
  // copy without re-running Pear.
  useEffect(() => {
    const match = savedDrafts.find((d) => d.kind === kind);
    if (match) {
      setDraft(match.text);
      setLength(match.length);
      setTone(match.tone);
      setNotes(match.notes);
    } else {
      setDraft('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function persistDraft(text: string) {
    const entry: ToastsDraft = {
      id: `td-${Date.now().toString(36)}`,
      kind, length, tone, notes, text, savedAt: Date.now(),
    };
    // Keep one entry per kind plus a small history (max 10 total).
    const others = savedDrafts.filter((d) => d.kind !== kind).slice(0, 9);
    onChange({
      ...manifest,
      toastsDrafts: [entry, ...others],
    } as unknown as StoryManifest);
  }

  const { state, error, run } = useAICall(async () => {
    const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
    const vibes = ((manifest as unknown as { vibes?: string[] }).vibes ?? []).join(', ');
    // Sanitize chapter title/description so a rogue character (backtick,
    // hash, asterisk, pipe) doesn't end up breaking the prompt's
    // markdown framing. Collapse whitespace + trim to 400 chars.
    const sanitize = (s: string | undefined) =>
      (s ?? '')
        .replace(/[`*#|_\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400);
    const chapters = (manifest.chapters ?? [])
      .map((c) => `- ${sanitize(c.title)}: ${sanitize(c.description)}`)
      .join('\n');
    const prompt =
      kind === 'vows'
        ? `Write wedding vows for ${names[0] || 'one person'} addressing ${names[1] || 'their partner'}. ${length} length. Tone: ${tone}. No cliches. Specific, warm, at least one concrete memory. Return ONLY the vows, no preamble.`
        : kind === 'toast-parent'
          ? `Write a parent's wedding toast for ${names.filter(Boolean).join(' & ')}. ${length} length. Tone: ${tone}. One concrete story if possible. Return ONLY the toast.`
          : kind === 'toast-friend'
            ? `Write a best-friend's wedding toast for ${names.filter(Boolean).join(' & ')}. ${length} length. Tone: ${tone}. Include one funny specific anecdote. Return ONLY the toast.`
            : `Write a warm welcome speech from ${names.filter(Boolean).join(' & ')} for their ${occasion} guests. ${length} length. Tone: ${tone}. Return ONLY the speech.`;
    const res = await fetch('/api/toasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        length,
        tone,
        prompt: `${prompt}\n\nContext — vibes: ${vibes || '—'}. Additional notes from host: ${notes || '—'}.\nStory chapters they've shared:\n${chapters || '—'}`,
        manifest: { occasion, names, vibes },
      }),
    });
    if (!res.ok) {
      /* Status codes stay in the console — the host only ever
         sees warm, code-free copy (BRAND.md §7). */
      console.error('[toasts] draft failed:', res.status);
      if (res.status === 429) throw new Error('Pear credits are used up for now');
      throw new Error("Pear couldn't draft that one — try again?");
    }
    const data = (await res.json()) as { text?: string; draft?: string; toast?: string; vows?: string };
    const text = (data.text ?? data.draft ?? data.toast ?? data.vows ?? '').trim();
    if (!text) throw new Error('Pear came back empty');
    setDraft(text);
    // Persist on the manifest so the draft survives panel close +
    // editor refresh. The audit flagged the previous version as
    // "broken affordance" — every draft died with the component.
    persistDraft(text);
    return text;
  });

  return (
    <div>
      <PanelSection label="Speech draft" hint="Pear drafts vows, toasts, or welcome speeches you can copy into your notes.">
        <Field label="What are we writing?">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {KINDS.map((k) => {
              const on = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKind(k.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: on ? 'var(--sage-tint)' : 'var(--paper)',
                    border: on ? '1.5px solid var(--sage-deep)' : '1.5px solid var(--line)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Length">
          <SegmentedToggle value={length} onChange={setLength} options={LENGTHS} />
        </Field>
        <Field label="Tone">
          <SegmentedToggle value={tone} onChange={setTone} options={TONES} />
        </Field>
        <Field label="Anything Pear should include?" help="Specific memories, inside jokes, people to mention.">
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="They met at a book club. He burned the risotto the night he proposed…"
          />
        </Field>

        <AIHint>
          Drafts are a starting point — you'll want to add your own moments. Pear works with what you give in "notes" above.
        </AIHint>
        <AISuggestButton
          label="Draft with Pear"
          runningLabel="Drafting…"
          state={state}
          onClick={() => void run()}
        />
        {state === 'error' && (
          <div
            role="alert"
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--plum-ink, #7A2D2D)' }}
          >
            <span>{error ?? "Pear couldn't draft that one — try again?"}</span>
            <button
              type="button"
              onClick={() => void run()}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--peach-ink, #C6703D)',
                textDecoration: 'underline',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {draft && (
          <div
            style={{
              marginTop: 14,
              padding: 16,
              background: 'var(--card)',
              border: '1px solid var(--card-ring)',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkle size={12} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--peach-ink)',
                  textTransform: 'uppercase',
                }}
              >
                Draft
              </span>
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{draft}</div>
            {/* Quiet attribution — the host always knows what Pear
                wrote vs what they typed (shared ai-source.tsx). */}
            <AISource style={{ opacity: 0.85 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(draft).catch(() => {});
                  }
                }}
              >
                <Icon name="copy" size={12} /> Copy
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => void run()}>
                <Icon name="wand" size={12} /> Try another
              </button>
            </div>
          </div>
        )}
      </PanelSection>
    </div>
  );
}
