'use client';

/* ════════════════════════════════════════════════════════════════
   STORY LISTEN — the wizard's "tell me about it" surface.

   One big typed field. Pear listens AUTOMATICALLY: when the host
   pauses typing (2.5s idle, enough new words since the last pass)
   an extraction run (/api/wizard/listen) plays back what she
   caught — names / date / place quietly prefill the Basics step,
   mood words ride the vibeString, and the ANCHORS (the named
   personal specifics) surface as removable stitches the story
   draft is required to spend.

   The old in-page microphone is gone (2026-06-12): it rode the
   browser SpeechRecognition API, which captures a single phrase
   then stops, needs Google's servers on Chrome, and is broken
   on iOS Safari — "speaking to Pear" felt dead. Every phone
   keyboard ships system dictation that works perfectly with a
   plain textarea, so the field hints at that instead.

   Keyless deploys degrade to "just keep typing": the raw story
   still rides the factSheet verbatim, so the site is themed to
   them either way.
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../motifs';
import { PearThinking } from '../pear-thinking';
import { questionsFor } from '@/lib/event-os/wizard-questions';

/* Structural slice of WizardState this component touches — keeps
   the giant wizard type internal to WizardV8. */
export interface StorySlice {
  occasion: string;
  names: [string, string];
  eventDate: string;
  location: string;
  storyText?: string;
  anchors?: string[];
  heardVibes?: string[];
}

interface Caught {
  names?: string[];
  eventDate?: string;
  location?: string;
  vibeWords?: string[];
  anchors?: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/* Auto-listen tuning: wait for a real pause, require real new
   material, and never burn more than a few passes per visit. */
const IDLE_MS = 2500;
const MIN_NEW_CHARS = 30;
const MAX_AUTO_RUNS = 3;

export function StoryListen<S extends StorySlice>({
  st,
  setSt,
}: {
  st: S;
  setSt: (updater: (s: S) => S) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [caught, setCaught] = useState<Caught | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const story = st.storyText ?? '';
  const q = questionsFor(st.occasion);

  /* Auto-listen bookkeeping — refs, not state: none of it renders. */
  const lastListenedText = useRef('');
  const autoRuns = useRef(0);
  const storyRef = useRef(story);
  storyRef.current = story;

  async function listen(auto: boolean) {
    const text = storyRef.current.trim();
    if (text.length < 20 || busy) return;
    if (auto && Math.abs(text.length - lastListenedText.current.length) < MIN_NEW_CHARS) return;
    if (auto && autoRuns.current >= MAX_AUTO_RUNS) return;
    if (auto) autoRuns.current += 1;
    lastListenedText.current = text;
    setBusy(true); setNote(null);
    try {
      const res = await fetch('/api/wizard/listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: text, occasion: st.occasion }),
      });
      const data = await res.json().catch(() => null) as (Caught & { ok?: boolean; error?: string }) | null;
      if (!res.ok) {
        if (!auto) setNote(data?.error ?? 'Pear lost the thread — try again?');
        return;
      }
      if (!data?.ok) {
        // Keyless / model-down — the story itself still grounds the
        // generation, so this is a soft note, not a failure.
        if (!auto) setNote('Pear will read this while she weaves — every word of it counts.');
        return;
      }
      setCaught(data);
      setSt((s) => {
        const next = { ...s } as S;
        // Quiet prefills — never clobber something the host typed.
        const heardNames = (data.names ?? []).filter(Boolean);
        if (!s.names[0] && heardNames[0]) {
          next.names = [heardNames[0], heardNames[1] ?? s.names[1] ?? ''] as [string, string];
        }
        if (!s.eventDate && data.eventDate && ISO_DATE.test(data.eventDate)) {
          next.eventDate = data.eventDate;
        }
        if (!s.location && data.location) next.location = data.location;
        next.heardVibes = (data.vibeWords ?? []).slice(0, 4);
        // Merge-dedupe anchors; a fuzzy date ("next June") becomes
        // an anchor so it isn't lost to the date input's format.
        const fuzzyDate = data.eventDate && !ISO_DATE.test(data.eventDate)
          ? [`The date, as they said it: ${data.eventDate}`] : [];
        const merged = [...(s.anchors ?? []), ...(data.anchors ?? []), ...fuzzyDate];
        next.anchors = [...new Set(merged.map((a) => a.trim()).filter(Boolean))].slice(0, 10);
        return next;
      });
    } catch {
      if (!auto) setNote('Pear lost the thread — try again?');
    } finally {
      setBusy(false);
    }
  }

  /* Auto-listen: a quiet pass when the host stops typing. */
  useEffect(() => {
    if (story.trim().length < 20) return;
    const t = setTimeout(() => { void listen(true); }, IDLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  /* Prompt chips — the occasion's three fact-sheet questions as
     tappable starters. Tapping appends the label as a lead-in so
     the host answers in their own words right after it. */
  const prompts = [q.q1Label, q.q2Label, q.q3Label.replace(/\s*\(optional\)\s*/i, '')];
  const addPrompt = (label: string) => {
    setSt((s) => {
      const cur = (s.storyText ?? '').trimEnd();
      const lead = `${label}: `;
      if (cur.includes(lead)) return s;
      return { ...s, storyText: cur ? `${cur}\n\n${lead}` : lead } as S;
    });
  };

  const removeAnchor = (a: string) => {
    setSt((s) => ({ ...s, anchors: (s.anchors ?? []).filter((x) => x !== a) }) as S);
  };

  const anchors = st.anchors ?? [];

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Tappable starters — answer any, in any order, in your words. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addPrompt(p)}
            style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: '1px dashed var(--line, #D8CFB8)', background: 'transparent',
              color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + {p}
          </button>
        ))}
      </div>

      <textarea
        className="input"
        rows={6}
        value={story}
        onChange={(ev) => setSt((s) => ({ ...s, storyText: ev.target.value }) as S)}
        placeholder={st.occasion === 'memorial' || st.occasion === 'funeral'
          ? 'Tell Pear about them — who they were, what they loved, how you want the day to feel…'
          : q.q1Placeholder}
        style={{ fontSize: 15, lineHeight: 1.6, resize: 'vertical' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minHeight: 20 }}>
        {busy ? (
          <PearThinking label="Pear is listening" />
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            {story.trim().length >= 20
              ? 'Pear listens as you write — pause and she’ll pick out the gold.'
              : 'Type it like a text to a friend. (Your keyboard’s mic works great here.)'}
          </span>
        )}
        {note && <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>{note}</span>}
      </div>

      {(caught || anchors.length > 0) && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--sage-tint, rgba(122,138,79,0.10))',
            border: '1px dashed var(--sage, #7A8A4F)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
            Here&rsquo;s what I caught
          </div>
          {caught && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
              {(caught.names ?? []).filter(Boolean).map((n) => (
                <span key={`n-${n}`} style={chipStyle}><Icon name="user" size={11} /> {n}</span>
              ))}
              {caught.eventDate && <span style={chipStyle}><Icon name="calendar" size={11} /> {caught.eventDate}</span>}
              {caught.location && <span style={chipStyle}><Icon name="pin" size={11} /> {caught.location}</span>}
              {(caught.vibeWords ?? []).map((v) => (
                <span key={`v-${v}`} style={{ ...chipStyle, fontStyle: 'italic' }}>{v}</span>
              ))}
            </div>
          )}
          {anchors.length > 0 && (
            <div style={{ display: 'grid', gap: 5 }}>
              {anchors.map((a) => (
                <div key={a} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, color: 'var(--ink)' }}>
                  <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)', lineHeight: '18px' }}>✦</span>
                  <span style={{ flex: 1, lineHeight: 1.45 }}>{a}</span>
                  <button
                    type="button"
                    aria-label={`Pull this thread: ${a}`}
                    onClick={() => removeAnchor(a)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 2 }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                Pear will weave these into the site itself — pull any thread you&rsquo;d rather keep private.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 10px',
  borderRadius: 999,
  background: 'var(--card, #FBF7EE)',
  border: '1px solid var(--line, #D8CFB8)',
  color: 'var(--ink)',
  fontWeight: 600,
};
