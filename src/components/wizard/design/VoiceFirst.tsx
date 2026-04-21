'use client';

// Voice-first alt entry: user describes the whole event in their own
// words; /api/wizard/parse pulls structured fields and we jump them
// to the first unanswered step.

import { useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../../marketing/design/DesignAtoms';
import type { WizardAnswers } from './wizardAnswers';

export function VoiceFirst({
  onParsed,
  onCancel,
  dark,
}: {
  onParsed: (patch: Partial<WizardAnswers>) => void;
  onCancel: () => void;
  dark?: boolean;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 6) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/wizard/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "I couldn't read that — try rephrasing?");
      }
      const data = (await res.json()) as {
        occasion?: string | null;
        name1?: string | null;
        name2?: string | null;
        date?: string | null;
        venue?: string | null;
        vibe?: string | null;
      };
      const patch: Partial<WizardAnswers> = {};
      if (data.occasion) patch.occasion = data.occasion;
      if (data.name1) patch.nameA = data.name1;
      if (data.name2) patch.nameB = data.name2;
      if (data.date) {
        patch.dateMode = 'specific';
        patch.date = data.date;
      }
      if (data.venue) patch.venue = data.venue;
      if (data.vibe) {
        patch.vibeName = data.vibe;
        patch.vibe = data.vibe;
      }
      onParsed(patch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: dark ? 'rgba(12,14,9,0.82)' : 'rgba(31,36,24,0.48)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: dark ? PD.ink : PD.paper,
          color: dark ? PD.paper : PD.ink,
          borderRadius: 28,
          padding: '40px 44px',
          maxWidth: 640,
          width: '100%',
          border: `1px solid ${dark ? 'rgba(244,236,216,0.1)' : 'rgba(31,36,24,0.1)'}`,
          boxShadow: '0 32px 80px rgba(31,36,24,0.4)',
          animation: 'pl-enter-scale-in 320ms cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Pear size={44} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
          <div>
            <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive, opacity: 0.85 }}>
              TELL ME THE WHOLE STORY
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 22,
                fontWeight: 400,
                marginTop: 2,
                letterSpacing: '-0.015em',
              }}
            >
              I&rsquo;ll fill in what I can.
            </div>
          </div>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          placeholder={
            'October 28 wedding in Cape Cod for Alex & Jordan. ' +
            'Beachy sage and linen vibe, about 80 guests.'
          }
          rows={5}
          style={{
            width: '100%',
            background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
            border: `1px solid ${dark ? 'rgba(244,236,216,0.12)' : 'rgba(31,36,24,0.1)'}`,
            borderRadius: 16,
            outline: 'none',
            padding: '16px 18px',
            fontFamily: '"Fraunces", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 18,
            color: dark ? PD.paper : PD.ink,
            resize: 'vertical',
            lineHeight: 1.5,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        />

        {err && (
          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              color: PD.terra,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              background: 'transparent',
              border: 'none',
              ...MONO_STYLE,
              fontSize: 10,
              color: dark ? 'rgba(244,236,216,0.6)' : PD.inkSoft,
              cursor: busy ? 'not-allowed' : 'pointer',
              padding: '6px 12px',
            }}
          >
            ← STEP BY STEP INSTEAD
          </button>
          <button
            onClick={submit}
            disabled={busy || text.trim().length < 6}
            style={{
              background: PD.ink,
              color: PD.paper,
              border: 'none',
              borderRadius: 999,
              padding: '13px 24px',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy || text.trim().length < 6 ? 0.55 : 1,
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {busy ? 'Reading…' : 'Pull what you can'}
            <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 11,
            opacity: 0.55,
            fontFamily: 'var(--pl-font-body)',
            lineHeight: 1.5,
          }}
        >
          I only pull what you say. Anything I can&rsquo;t read stays blank for you to fill in.
        </div>
      </div>
    </div>
  );
}
