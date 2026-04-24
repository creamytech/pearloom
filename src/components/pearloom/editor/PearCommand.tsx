'use client';

/* ========================================================================
   PearCommand — ⌘K command palette for the v8 editor.
   Lets the user run AI actions or jump blocks without leaving the keyboard.
   ======================================================================== */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear, Sparkle } from '../motifs';

type BlockKey =
  | 'hero'
  | 'story'
  | 'details'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'gallery'
  | 'rsvp'
  | 'theme';

type Command = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  group: 'jump' | 'ai' | 'act';
  run: () => void | Promise<void>;
};

export function PearCommand({
  manifest,
  names,
  onJumpBlock,
  onPatchManifest,
  onOpenInvite,
  onOpenPreview,
  onPublish,
}: {
  manifest: StoryManifest;
  names: [string, string];
  onJumpBlock: (b: BlockKey) => void;
  onPatchManifest: (m: StoryManifest) => void;
  onOpenInvite: () => void;
  onOpenPreview: () => void;
  onPublish: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [chatOutput, setChatOutput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
      setChatOutput('');
    }
  }, [open]);

  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const vibes = ((manifest as unknown as { vibes?: string[] }).vibes ?? []).join(', ');

  async function runChat(prompt: string, label: string) {
    setBusy(label);
    setChatOutput('');
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Context: ${occasion} site for ${names.filter(Boolean).join(' & ') || 'the hosts'}. Vibes: ${vibes || '—'}. Venue: ${
                manifest.logistics?.venue ?? '—'
              }. Current tagline: ${
                (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '—'
              }. \n\nRequest: ${prompt}\n\nRespond in 1-3 sentences, warm and specific.`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { reply?: string; text?: string; message?: string };
      setChatOutput(data.reply ?? data.text ?? data.message ?? 'No response.');
    } catch (err) {
      setChatOutput(`Pear couldn't answer that. (${err instanceof Error ? err.message : 'error'})`);
    } finally {
      setBusy(null);
    }
  }

  async function rewriteTagline(instruction: string, label: string) {
    setBusy(label);
    try {
      const res = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `${instruction} Context: ${occasion} site for ${names.filter(Boolean).join(' & ')}. Current tagline: "${
            (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? ''
          }". Return ONLY the rewritten tagline.`,
          tone: 'warm',
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
      const text = (data.text ?? data.rewritten ?? data.result ?? '').trim().replace(/^"|"$/g, '');
      if (!text) throw new Error('Empty');
      onPatchManifest({
        ...manifest,
        poetry: {
          ...((manifest as unknown as { poetry?: Record<string, unknown> }).poetry ?? {}),
          heroTagline: text,
        },
      } as unknown as StoryManifest);
      setChatOutput(`✓ New tagline: "${text}"`);
      onJumpBlock('hero');
    } catch (err) {
      setChatOutput(`Pear couldn't rewrite. (${err instanceof Error ? err.message : 'error'})`);
    } finally {
      setBusy(null);
    }
  }

  const commands = useMemo<Command[]>(
    () => [
      // Jumps
      { id: 'j-hero', label: 'Edit hero', hint: 'Jump to names, date, tagline', icon: 'image', group: 'jump', run: () => onJumpBlock('hero') },
      { id: 'j-story', label: 'Edit story chapters', hint: 'Timeline of how you got here', icon: 'text', group: 'jump', run: () => onJumpBlock('story') },
      { id: 'j-details', label: 'Edit details', hint: 'Ceremony, dress code, notes', icon: 'section', group: 'jump', run: () => onJumpBlock('details') },
      { id: 'j-schedule', label: 'Edit schedule', hint: 'Day-of itinerary', icon: 'clock', group: 'jump', run: () => onJumpBlock('schedule') },
      { id: 'j-travel', label: 'Edit travel', hint: 'Venue + hotels', icon: 'pin', group: 'jump', run: () => onJumpBlock('travel') },
      { id: 'j-registry', label: 'Edit registry', hint: 'Gift funds + links', icon: 'gift', group: 'jump', run: () => onJumpBlock('registry') },
      { id: 'j-gallery', label: 'Edit gallery', hint: 'Photo mosaic', icon: 'gallery', group: 'jump', run: () => onJumpBlock('gallery') },
      { id: 'j-rsvp', label: 'Edit RSVP', hint: 'Deadline, meals, plus-ones', icon: 'mail', group: 'jump', run: () => onJumpBlock('rsvp') },
      { id: 'j-theme', label: 'Edit theme', hint: 'Palette, motif, typography', icon: 'palette', group: 'jump', run: () => onJumpBlock('theme') },

      // AI
      { id: 'ai-warmer', label: 'Rewrite my tagline, warmer', hint: 'Pear softens the tone', icon: 'sparkles', group: 'ai', run: () => rewriteTagline('Rewrite this tagline to feel warmer and more handwritten — like a friend, not a brand. Keep it 1-2 sentences.', 'Warmer tagline') },
      { id: 'ai-shorter', label: 'Rewrite my tagline, shorter', hint: 'One crisp line', icon: 'sparkles', group: 'ai', run: () => rewriteTagline('Rewrite this tagline to a single sentence, 14 words or fewer.', 'Shorter tagline') },
      { id: 'ai-quiet', label: 'Rewrite my tagline, quieter', hint: 'More editorial, less cute', icon: 'sparkles', group: 'ai', run: () => rewriteTagline('Rewrite this tagline in a quiet, editorial voice. No exclamation marks. No cliches.', 'Quieter tagline') },
      { id: 'ai-suggest-song', label: 'Suggest a first-dance song', hint: 'Pear picks 3 that match your vibe', icon: 'music', group: 'ai', run: () => runChat('Suggest three first-dance songs that match this couple\'s vibe. For each, one line of why it fits.', 'Song ideas') },
      { id: 'ai-suggest-readings', label: 'Suggest a ceremony reading', hint: 'Pear picks 3 readings', icon: 'leaf', group: 'ai', run: () => runChat('Suggest three ceremony readings — one poem, one secular text, one offbeat option — that match this couple\'s vibe.', 'Reading ideas') },
      { id: 'ai-write-vows', label: 'Draft my vows', hint: 'A warm starting point', icon: 'heart-icon', group: 'ai', run: () => runChat('Draft warm, specific wedding vows for this couple — 1 minute spoken length. Include one concrete shared memory if you can infer one from the context, otherwise use a tasteful placeholder.', 'Vow draft') },
      { id: 'ai-parking', label: 'Write parking + arrival notes', hint: 'One helpful paragraph for guests', icon: 'pin', group: 'ai', run: () => runChat('Write a 2-3 sentence parking + arrival note for guests attending this event at the venue above. Warm, concrete, no cliches.', 'Parking copy') },
      { id: 'ai-thanks', label: 'Draft a thank-you message', hint: 'Sent after the event', icon: 'mail', group: 'ai', run: () => runChat('Write a warm 3-sentence thank-you message we can send to guests after the event. Signed "[N1] & [N2]".', 'Thank-you draft') },

      // Actions
      { id: 'act-invite', label: 'Open invite designer', hint: 'Save-the-date + wedding invite', icon: 'mail', group: 'act', run: () => onOpenInvite() },
      { id: 'act-preview', label: 'Preview published site', hint: 'Opens in a new tab', icon: 'eye', group: 'act', run: () => onOpenPreview() },
      { id: 'act-publish', label: 'Save & publish', hint: 'Writes the latest draft live', icon: 'arrow-ur', group: 'act', run: () => onPublish() },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manifest, names]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const n = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(n) || c.hint.toLowerCase().includes(n));
  }, [commands, query]);

  const [cursor, setCursor] = useState(0);
  useEffect(() => setCursor(0), [query]);

  function onInputKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[cursor];
      if (cmd) void cmd.run();
      if (!cmd?.id.startsWith('ai-')) setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.38)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'grid',
        placeItems: 'flex-start center',
        paddingTop: '14vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          maxHeight: '72vh',
          background: 'var(--card)',
          border: '1px solid var(--card-ring)',
          borderRadius: 18,
          boxShadow: '0 30px 80px rgba(14,13,11,0.35), 0 2px 6px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <Pear size={22} tone="sage" shadow={false} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Ask Pear, or jump to a block…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 0,
              fontSize: 16,
              color: 'var(--ink)',
              fontFamily: 'var(--font-ui)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--ink-muted)',
              padding: '4px 8px',
              borderRadius: 8,
              border: '1px solid var(--line)',
            }}
          >
            ESC
          </span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chatOutput && (
            <div
              style={{
                margin: '12px 14px',
                padding: 12,
                background: 'var(--lavender-bg)',
                border: '1px solid rgba(107,90,140,0.2)',
                borderRadius: 12,
                fontSize: 13,
                color: 'var(--ink)',
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 4, letterSpacing: '0.06em' }}>
                PEAR SAYS
              </div>
              {chatOutput}
            </div>
          )}

          {renderGroup('Jump to a block', filtered.filter((c) => c.group === 'jump'), cursor, filtered, busy)}
          {renderGroup('Ask Pear', filtered.filter((c) => c.group === 'ai'), cursor, filtered, busy)}
          {renderGroup('Actions', filtered.filter((c) => c.group === 'act'), cursor, filtered, busy)}

          {filtered.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
              Nothing matched "{query}". Try a different word — Pear is listening.
            </div>
          )}
        </div>

        <div
          style={{
            padding: '8px 14px',
            background: 'var(--cream-2)',
            fontSize: 11,
            color: 'var(--ink-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--line-soft)',
          }}
        >
          <span>
            <Sparkle size={10} /> ⌘K open · ↑↓ navigate · Enter run · Esc close
          </span>
          <span>{filtered.length} {filtered.length === 1 ? 'command' : 'commands'}</span>
        </div>
      </div>
    </div>
  );
}

function renderGroup(
  label: string,
  list: Command[],
  cursor: number,
  all: Command[],
  busy: string | null,
) {
  if (list.length === 0) return null;
  return (
    <div style={{ padding: '10px 0' }}>
      <div
        style={{
          padding: '2px 18px 6px',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--peach-ink)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {list.map((c) => {
        const idx = all.findIndex((x) => x.id === c.id);
        const active = idx === cursor;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => void c.run()}
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '28px 1fr auto',
              gap: 12,
              padding: '10px 16px',
              background: active ? 'var(--cream-2)' : 'transparent',
              border: 0,
              borderLeft: active ? '3px solid var(--ink)' : '3px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font-ui)',
              color: 'var(--ink)',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: active ? 'var(--ink)' : 'var(--cream)',
                color: active ? 'var(--cream)' : 'var(--ink-soft)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name={c.icon} size={14} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{c.hint}</div>
            </div>
            {busy === c.label && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '2px solid var(--sage-deep)',
                  borderTopColor: 'transparent',
                  animation: 'pl8-spin 700ms linear infinite',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
