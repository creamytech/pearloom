'use client';

/* ════════════════════════════════════════════════════════════════
   STORY LISTEN — the wizard's "tell me about it" surface.

   One big field (typed, or spoken via hold-to-talk where the
   browser supports it). "Pear, listen" runs one extraction pass
   (/api/wizard/listen) and plays back what she caught: names /
   date / place quietly prefill the Basics step, mood words ride
   the vibeString, and the ANCHORS — the named personal specifics
   — surface as removable stitches the generation passes are
   required to spend. Keyless deploys degrade to "just keep
   typing": the raw story still rides the factSheet verbatim, so
   the site is themed to them either way.
   ════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Pear } from '../motifs';
import { PearThinking } from '../pear-thinking';
import { speechAvailable, startListening } from '../redesign/PearAssist';

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

export function StoryListen<S extends StorySlice>({
  st,
  setSt,
}: {
  st: S;
  setSt: (updater: (s: S) => S) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [caught, setCaught] = useState<Caught | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const story = st.storyText ?? '';

  async function listen() {
    const text = story.trim();
    if (text.length < 12 || busy) return;
    setBusy(true); setNote(null);
    try {
      const res = await fetch('/api/wizard/listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: text, occasion: st.occasion }),
      });
      const data = await res.json().catch(() => null) as (Caught & { ok?: boolean; error?: string }) | null;
      if (!res.ok) {
        setNote(data?.error ?? 'Pear lost the thread — try again?');
        return;
      }
      if (!data?.ok) {
        // Keyless / model-down — the story itself still grounds the
        // generation, so this is a soft note, not a failure.
        setNote('Pear will read this while she weaves — every word of it counts.');
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
      setNote('Pear lost the thread — try again?');
    } finally {
      setBusy(false);
    }
  }

  const removeAnchor = (a: string) => {
    setSt((s) => ({ ...s, anchors: (s.anchors ?? []).filter((x) => x !== a) }) as S);
  };

  const anchors = st.anchors ?? [];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <textarea
          className="input"
          rows={6}
          value={story}
          onChange={(ev) => setSt((s) => ({ ...s, storyText: ev.target.value }) as S)}
          placeholder={st.occasion === 'memorial' || st.occasion === 'funeral'
            ? 'Tell Pear about them — who they were, what they loved, how you want the day to feel…'
            : 'We met at a tiny bar in Lisbon, our dog Biscuit is coming, it’s at her grandmother’s farm next June and everyone’s flying in…'}
          style={{ fontSize: 15, lineHeight: 1.6, resize: 'vertical' }}
        />
        {speechAvailable() && (
          <button
            type="button"
            aria-label={listening ? 'Stop listening' : 'Speak instead'}
            onClick={() => startListening(
              (updater) => setSt((s) => ({ ...s, storyText: updater(s.storyText ?? '') }) as S),
              setListening,
              listening,
            )}
            style={{
              position: 'absolute', right: 10, bottom: 10,
              width: 34, height: 34, borderRadius: 999,
              border: '1px solid var(--line, #D8CFB8)',
              background: listening ? 'var(--sage-tint, rgba(122,138,79,0.18))' : 'var(--card, #FBF7EE)',
              cursor: 'pointer', fontSize: 14,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {listening ? '●' : '🎙'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void listen()}
          disabled={busy || story.trim().length < 12}
          style={{ opacity: story.trim().length < 12 ? 0.55 : 1 }}
        >
          <Pear size={15} tone="cream" shadow={false} />
          {busy ? 'Pear is listening…' : caught ? 'Listen again' : 'Pear, listen'}
        </button>
        {busy && <PearThinking label="finding the gold" />}
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
                <span key={`n-${n}`} style={chipStyle}>👤 {n}</span>
              ))}
              {caught.eventDate && <span style={chipStyle}>📅 {caught.eventDate}</span>}
              {caught.location && <span style={chipStyle}>📍 {caught.location}</span>}
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
  padding: '4px 10px',
  borderRadius: 999,
  background: 'var(--card, #FBF7EE)',
  border: '1px solid var(--line, #D8CFB8)',
  color: 'var(--ink)',
  fontWeight: 600,
};
