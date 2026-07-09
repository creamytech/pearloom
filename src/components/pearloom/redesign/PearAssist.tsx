'use client';

 
/* PearAssist — shared AI primitives across the editor.

   Round S consolidated four ad-hoc spinner/chip patterns into:
     - PearThinking — the canonical "Pear is thinking…" pulse used
       anywhere a Claude call is in flight.
     - PearAiChip — the canonical AI-action chip (✨ + label + busy
       state). Use this anywhere you'd previously written a bespoke
       <button> with sparkles icon + manual busy dot.
     - PearInlineRewrite — a floating "✨ polish" button that
       attaches to a focused InlineEdit on the canvas. Hits
       /api/inline-rewrite with the focused text + optional tone
       context, then writes the rewritten value back via onCommit.

   All three share the same visual language: peach accent, gold
   sparkle, pulsing dot when busy. Reuse these instead of forking
   the styles. */

import { pearWorking } from './PearLoomFx';
import { recordTaste, orderByTaste, tasteHint, tasteLine } from './taste';
import { editorVoiceProfile } from '@/lib/pear/editor-voice';
import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Icon } from '../motifs';

/* ─── pearErrorMessage — sanitize errors for display ───────── */
/* Keeps human-written copy (server `error` fields, our own warm
   strings) but swallows transport noise — "Failed to fetch",
   HTTP status codes, JSON-parse text. Codes belong in
   console.error, never in the UI (BRAND.md §7). */
const RAW_ERROR_NOISE = /failed to fetch|fetch failed|networkerror|load failed|aborted|unexpected token|not valid json|json\.parse|\bhttp\b|\b[45]\d\d\b/i;
export function pearErrorMessage(
  e: unknown,
  fallback = 'Pear couldn’t finish that one, try again?',
): string {
  const msg = e instanceof Error ? e.message.trim() : typeof e === 'string' ? e.trim() : '';
  if (!msg || RAW_ERROR_NOISE.test(msg)) return fallback;
  return msg;
}

/* ─── PearThinking — inline busy indicator ─────────────────── */

export function PearThinking({
  label = 'Pear is thinking…',
  inline = true,
}: {
  label?: string;
  /** When true (default), renders inline as a span. When false,
   *  renders as a block with vertical padding — useful for empty-
   *  state cards while AI fills them. */
  inline?: boolean;
}) {
  const Tag = inline ? ('span' as const) : ('div' as const);
  return (
    <Tag
      style={{
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--peach-ink)',
        ...(inline ? {} : { padding: '10px 14px', justifyContent: 'center' }),
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--peach-ink)',
          animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
        }}
      />
      {label}
    </Tag>
  );
}

/* ─── PearAiChip — sparkles-prefixed AI action button ─────── */

export function PearAiChip({
  label,
  onClick,
  busy = false,
  disabled = false,
  variant = 'soft',
  style,
  children,
}: {
  label?: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** 'soft' = cream-2 bg + ink-soft text (default). 'accent' =
   *  peach-bg + peach-ink, more visually present. */
  variant?: 'soft' | 'accent';
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const isAccent = variant === 'accent' || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 10px',
        borderRadius: 999,
        background: isAccent ? 'var(--peach-bg)' : 'var(--cream-2)',
        color: isAccent ? 'var(--peach-ink)' : 'var(--ink-soft)',
        border: `1px solid ${isAccent ? 'var(--peach-ink)' : 'var(--line)'}`,
        cursor: busy ? 'wait' : disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        ...style,
      }}
    >
      {busy ? (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--peach-ink)',
            animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
          }}
        />
      ) : (
        <Icon name="sparkles" size={10} color={isAccent ? 'var(--peach-ink)' : 'var(--gold)'} />
      )}
      {children ?? label}
    </button>
  );
}

/* ─── PearInlineRewrite — focused-field AI rewrite button ─── */

/**
 * Tone presets the inline rewriter offers — each becomes a chip.
 * Adding a new tone here surfaces it automatically across every
 * field that mounts PearInlineRewrite.
 */
export type RewriteTone = 'shorten' | 'warmer' | 'funnier' | 'poetic';
const TONE_LABEL: Record<RewriteTone, string> = {
  shorten: 'Shorten',
  warmer:  'Warmer',
  funnier: 'Funnier',
  poetic:  'More poetic',
};

export interface PearInlineRewriteProps {
  /** Current text to rewrite. */
  value: string;
  /** Called with the rewritten text when the host keeps it. */
  onCommit: (next: string) => void;
  /** Free-form context tag passed to /api/inline-rewrite —
   *  identifies the field so Claude knows the register. E.g.
   *  'hero tagline', 'story body', 'details value — dress code'. */
  context: string;
  /** Canvas section the field belongs to — when set, the loom FX
   *  thread travels there while the rewrite is in flight. */
  fxSection?: string;
  /** Tone presets to show. Defaults to all four. */
  tones?: RewriteTone[];
  /** Optional inline error renderer override. */
  onError?: (msg: string) => void;
  /** Opt-out of preview-before-apply: when true, a tone tap writes
   *  the rewrite straight through onCommit (the pre-2026-06
   *  behavior). Default false — the rewrite lands in a quiet
   *  preview card with Keep / Try again / Discard. */
  instantApply?: boolean;
  /** Start with the tone chips + whisper visible. Default false:
   *  the component renders as ONE quiet "Polish with Pear" chip
   *  and expands on tap. Before this, every field stacked four
   *  tone chips + a whisper input + a mic — multiplied across a
   *  panel it read as a wall of AI chrome (2026-06-10). */
  defaultOpen?: boolean;
}

export function PearInlineRewrite({
  value,
  onCommit,
  context,
  fxSection,
  tones = ['shorten', 'warmer', 'funnier', 'poetic'],
  onError,
  instantApply = false,
  defaultOpen = false,
}: PearInlineRewriteProps) {
  /* Progressive disclosure — collapsed is a single chip. */
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /* Preview-before-apply — the rewrite parks here until the host
     keeps or discards it. Never shown when instantApply is on.
     `instruction` is kept so "Try again" replays whispers too. */
  const [pending, setPending] = useState<{ label: string; instruction: string; text: string } | null>(null);
  /* The whisper — a free-form direction typed (or spoken) by the
     host. The preset tone chips are suggestions; this is the
     ceiling-remover. */
  const [whisper, setWhisper] = useState('');
  const [listening, setListening] = useState(false);
  /* Taste memory — most-kept directions lead; computed once per
     mount so chips don't reshuffle mid-interaction. */
  const [orderedTones] = useState(() => orderByTaste(tones));
  const [learnedLine] = useState(() => tasteLine());

  /* A preview belongs to the text it was drafted from — if the host
     edits the field (or keeps a suggestion), any parked preview is
     stale and quietly discards itself. */
  useEffect(() => {
    setPending(null);
  }, [value]);

  async function rewrite(label: string, instruction: string) {
    if (!value.trim() || value.trim().length < 2) {
      const msg = 'Write something first, then Pear can polish it.';
      setErr(msg);
      onError?.(msg);
      return;
    }
    setBusy(label); setErr(null);
    try {
      pearWorking('start', fxSection);
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          context,
          instruction: [instruction, tasteHint()].filter(Boolean).join(' '),
          /* Voice DNA — registered by EditorRedesign; undefined
             (and omitted by JSON.stringify) when never captured. */
          voiceProfile: editorVoiceProfile(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[pear-rewrite] request failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t polish that one, try again?');
      }
      const { rewritten } = await res.json() as { rewritten: string };
      if (rewritten && rewritten !== value) {
        if (instantApply) { onCommit(rewritten); pearWorking('done', fxSection); }
        else {
          setPending({ label, instruction, text: rewritten });
          /* Preview parked — retract the thread without the landed
             settle; that fires when the host keeps it. */
          pearWorking('error', fxSection);
        }
      } else {
        pearWorking('error', fxSection);
      }
    } catch (e) {
      console.error('[pear-rewrite] failed:', e);
      pearWorking('error', fxSection);
      const msg = pearErrorMessage(e, 'Pear couldn’t polish that one, try again?');
      setErr(msg);
      onError?.(msg);
    } finally {
      setBusy(null);
    }
  }

  const keep = () => {
    if (!pending) return;
    onCommit(pending.text); /* same write path as instantApply */
    recordTaste('keep', pending.label, value.length, pending.text.length);
    pearWorking('done', fxSection);
    setPending(null);
  };
  const discard = () => {
    if (pending) recordTaste('discard', pending.label, value.length, pending.text.length);
    setPending(null);
  };

  /* Prevent focus from leaving the field/chips when tapping a
     preview action — Safari fires focusout with a null
     relatedTarget on button mousedown, which would discard the
     preview before the click handler ran. */
  const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

  /* Collapsed — one quiet chip. Everything (tones, whisper, mic)
     stays one tap away instead of permanently stacked under the
     field. */
  if (!open) {
    return <PearAiChip label="Polish with Pear" onClick={() => setOpen(true)} />;
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && pending) {
          e.stopPropagation();
          discard();
        }
      }}
      onBlur={(e) => {
        /* Focus walked out of the chips + preview entirely → the
           host moved on. Discard the parked suggestion. */
        if (!pending) return;
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) discard();
      }}
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {orderedTones.map((t) => (
          <PearAiChip
            key={t}
            label={busy === t ? `${TONE_LABEL[t]}…` : TONE_LABEL[t]}
            onClick={() => rewrite(t, `make it ${TONE_LABEL[t].toLowerCase()}`)}
            busy={busy === t}
            disabled={!!busy && busy !== t}
          />
        ))}
        {learnedLine && (
          <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', alignSelf: 'center', fontStyle: 'italic' }}>
            {learnedLine}
          </span>
        )}
        {!busy && !pending && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Hide polish options"
            style={{
              border: 'none', background: 'transparent', alignSelf: 'center',
              color: 'var(--ink-muted)', fontSize: 10.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px',
            }}
          >
            Hide
          </button>
        )}
      </div>
      {/* The whisper — type (or speak) any direction. This is the
          grab-anything-ask-anything surface: the chips above are
          suggestions, not the ceiling. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const w = whisper.trim();
          if (!w || busy) return;
          void rewrite('whisper', w);
        }}
        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
      >
        <input
          value={whisper}
          onChange={(e) => setWhisper(e.target.value)}
          placeholder="or whisper a direction, “like a dinner party, not a gala”"
          aria-label="Tell Pear how to rewrite this"
          maxLength={280}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '7px 10px',
            borderRadius: 999,
            border: '1px dashed var(--sage, #7A8A4F)',
            background: 'transparent',
            fontSize: 11.5,
            fontFamily: 'inherit',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        {speechAvailable() && (
          <button
            type="button"
            aria-label={listening ? 'Stop listening' : 'Speak your direction'}
            onClick={() => startListening(setWhisper, setListening, listening)}
            style={{
              width: 28, height: 28, borderRadius: 999, flexShrink: 0,
              border: '1px solid var(--sage, #7A8A4F)',
              background: listening ? 'var(--sage-tint, rgba(122,138,79,0.18))' : 'transparent',
              color: 'var(--sage-deep, #5C6B3F)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12,
            }}
          >
            {listening ? <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--sage-deep, #5C6B3F)' }} /> : <Icon name="mic" size={13} />}
          </button>
        )}
        {whisper.trim() && (
          <button
            type="submit"
            disabled={!!busy}
            style={{
              padding: '6px 12px', borderRadius: 999, flexShrink: 0,
              background: 'var(--sage-deep, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
              border: 'none', fontSize: 11.5, fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {busy === 'whisper' ? 'Weaving…' : 'Weave it'}
          </button>
        )}
      </form>
      {pending && (
        <div
          role="group"
          aria-label="Pear’s suggestion"
          style={{
            padding: '9px 11px',
            borderRadius: 9,
            background: 'var(--sage-tint, rgba(122,138,79,0.12))',
            border: '1px solid var(--sage, #7A8A4F)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
            {pending.text}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={keep}
              onMouseDown={keepFocus}
              disabled={!!busy}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                background: 'var(--sage-deep, #5C6B3F)',
                color: 'var(--cream, #F5EFE2)',
                border: 'none',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => rewrite(pending.label, pending.instruction)}
              onMouseDown={keepFocus}
              disabled={!!busy}
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--sage-deep, #5C6B3F)',
                border: '1px solid var(--sage, #7A8A4F)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'Polishing…' : 'Try again'}
            </button>
            <button
              type="button"
              onClick={discard}
              onMouseDown={keepFocus}
              disabled={!!busy}
              style={{
                padding: '5px 9px',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--ink-muted)',
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Discard
            </button>
            <span style={{ marginLeft: 'auto' }}>
              <AISource model="Haiku" />
            </span>
          </div>
        </div>
      )}
      {err && (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 7,
            background: 'var(--pl-chrome-danger-soft, rgba(122,45,45,0.08))',
            fontSize: 11,
            color: 'var(--pl-chrome-danger, #7A2D2D)',
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

/* ─── AISource — "Drafted by Pear" stamp ────────────────────── */

export function AISource({ when, model = 'Haiku' }: { when?: Date | string | null; model?: 'Haiku' | 'Sonnet' | 'Opus' }) {
  const ts = when
    ? (typeof when === 'string' ? when : when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    : null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10.5,
        color: 'var(--ink-muted)',
        fontStyle: 'italic',
      }}
    >
      <Icon name="sparkles" size={9} color="var(--gold)" />
      Drafted by Pear · {model}{ts ? ` · ${ts}` : ''}
    </span>
  );
}

/* ─── Speech-to-whisper — browser SpeechRecognition where it
   exists (Chrome/Safari); silently absent elsewhere. One short
   utterance per tap, appended into the whisper input. ─── */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechAvailable(): boolean {
  return speechCtor() !== null;
}

let activeRecognition: SpeechRecognitionLike | null = null;

export function startListening(
  setText: (updater: (prev: string) => string) => void,
  setListening: (on: boolean) => void,
  alreadyListening: boolean,
) {
  if (alreadyListening) {
    activeRecognition?.stop();
    return;
  }
  const Ctor = speechCtor();
  if (!Ctor) return;
  try {
    const rec = new Ctor();
    activeRecognition = rec;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript ?? '';
      if (t) setText((prev) => (prev ? `${prev} ${t}` : t));
    };
    rec.onend = () => { setListening(false); activeRecognition = null; };
    rec.onerror = () => { setListening(false); activeRecognition = null; };
    setListening(true);
    rec.start();
  } catch {
    setListening(false);
  }
}
