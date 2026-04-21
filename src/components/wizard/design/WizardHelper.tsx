'use client';

// Sticky 🍐 helper panel + dark-mode toggle + breath moment.
// Every step gets a whisper + "why I'm asking this" reveal.

import { useEffect, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../../marketing/design/DesignAtoms';
import type { StepKey } from './wizardSpec';

const HELPER_TIPS: Record<StepKey, { whisper: string; why: string }> = {
  category: {
    whisper: 'No wrong answer. You can change any of this later.',
    why: "I ask the occasion first so the whole site knows whether it's joyful, tender, or both.",
  },
  occasion: {
    whisper: "Pick the one closest. I'll tune the rest around it.",
    why: 'Different occasions use different layouts, sections, and tone of voice.',
  },
  names: {
    whisper: 'Use the names guests will see. Nicknames are fine.',
    why: "These show up as the site's headline, in the URL, and in guest-facing messages.",
  },
  date: {
    whisper: "'Late summer' is a real answer. Not everyone has a date pinned.",
    why: 'A rough season is enough for me to set the color story and the countdown tone.',
  },
  venue: {
    whisper: 'Any landmark, the building, the park, the street corner.',
    why: 'I use this to suggest directions, travel cards, and ambient imagery.',
  },
  details: {
    whisper: 'Fill what you know. Leave the rest for later.',
    why: 'Multi-day events and memorial specifics change which sections I generate.',
  },
  photos: {
    whisper: 'Ten good ones beats a hundred blurry ones.',
    why: 'I use photo mood to pick the palette, layout, and hero crop.',
  },
  photoreview: {
    whisper: 'Add a line where it matters. Skip the rest.',
    why: 'Your captions become the voice of the site. Guests read them.',
  },
  vibe: {
    whisper: 'Describe the feeling, not the colors.',
    why: 'I translate feelings into palettes better than I match colors you name.',
  },
  layout: {
    whisper: "Pick one you'd want to scroll. You can swap it later.",
    why: 'Layout shapes the whole flow. Hero, sections, rhythm.',
  },
  song: {
    whisper: 'One song. The one you hear when you think about this day.',
    why: 'I use it as ambient audio on the hero, at a very low volume.',
  },
  ready: {
    whisper: 'Take one breath, then press the big one.',
    why: "This is the last step. I'll hold everything together from here.",
  },
  generating: {
    whisper: "Almost there. Don't close this tab yet.",
    why: "Weaving takes a minute or so while I draft and press.",
  },
};

export function PearHelper({
  stepKey,
  onStartOver,
  dark,
  onToggleDark,
}: {
  stepKey: StepKey;
  onStartOver: () => void;
  dark?: boolean;
  onToggleDark: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const tip = HELPER_TIPS[stepKey] ?? HELPER_TIPS.category;

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 100,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 62,
            width: 300,
            background: dark ? '#2A3020' : '#FFFEF7',
            border: `1px solid ${dark ? '#3D4530' : '#E8DFC8'}`,
            borderRadius: 18,
            padding: 18,
            boxShadow: '0 20px 50px rgba(31,36,24,0.18)',
            color: dark ? PD.paper : PD.ink,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${PD.gold}, ${PD.olive})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFEF7',
                fontWeight: 600,
                fontSize: 14,
                fontFamily: '"Fraunces", Georgia, serif',
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Pear</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>here if you need me</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                fontSize: 18,
                opacity: 0.5,
                cursor: 'pointer',
                color: 'inherit',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 17,
              lineHeight: 1.35,
              marginBottom: 14,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              fontStyle: 'italic',
            }}
          >
            &ldquo;{tip.whisper}&rdquo;
          </div>

          <button
            onClick={() => setShowWhy((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 12,
              color: dark ? PD.gold : PD.olive,
              padding: 0,
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'inherit',
            }}
          >
            {showWhy ? '▼' : '▶'} why I&rsquo;m asking this
          </button>
          {showWhy && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                lineHeight: 1.5,
                opacity: 0.75,
                paddingLeft: 16,
                borderLeft: `2px solid ${dark ? '#3D4530' : '#E8DFC8'}`,
              }}
            >
              {tip.why}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${dark ? '#3D4530' : '#E8DFC8'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <button
              onClick={onToggleDark}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                fontSize: 12,
                color: 'inherit',
                padding: '4px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: 0.75,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 14 }}>{dark ? '☀︎' : '☾'}</span> switch to{' '}
              {dark ? 'daylight' : 'evening'} mode
            </button>
            <button
              onClick={() => {
                if (confirm('Clear everything and start over?')) onStartOver();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                fontSize: 12,
                color: 'inherit',
                padding: '4px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: 0.75,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 14 }}>↺</span> start over
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Pear helper"
        style={{
          width: 52,
          height: 52,
          borderRadius: 999,
          background: open
            ? dark
              ? '#3D4530'
              : PD.ink
            : `linear-gradient(135deg, ${PD.gold}, #8B6A2C)`,
          color: open ? PD.paper : '#FFFEF7',
          border: 'none',
          boxShadow: '0 8px 24px rgba(31,36,24,0.25)',
          fontSize: 22,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Fraunces", Georgia, serif',
          position: 'relative',
        }}
      >
        {open ? '×' : 'P'}
      </button>
    </div>
  );
}

// ── Breath moment ──────────────────────────────────────────────
export function BreathMoment({
  title,
  subtitle,
  onContinue,
}: {
  title: React.ReactNode;
  subtitle: string;
  onContinue: () => void;
}) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2400);
    const t2 = setTimeout(() => setPhase(2), 4200);
    const t3 = setTimeout(() => setPhase(3), 6400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const scale = phase === 0 ? 1.4 : phase === 1 ? 1.4 : phase === 2 ? 0.8 : 1;
  const phaseLabel =
    phase === 0 ? 'breathe in' : phase === 1 ? 'hold' : phase === 2 ? 'breathe out' : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: PD.paper,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Fraunces", Georgia, serif',
        zIndex: 200,
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 999,
          background: 'radial-gradient(circle at 35% 35%, #D4B46E, #8B6A2C)',
          transform: `scale(${scale})`,
          transition: 'transform 2s cubic-bezier(0.45, 0, 0.55, 1)',
          marginBottom: 48,
          boxShadow: '0 20px 60px rgba(139,106,44,0.25)',
        }}
      />
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 14,
          letterSpacing: '0.3em',
          color: PD.olive,
          marginBottom: 20,
          minHeight: 20,
        }}
      >
        {phaseLabel}
      </div>
      <div
        style={{
          ...DISPLAY_STYLE,
          fontSize: 38,
          lineHeight: 1.15,
          maxWidth: 600,
          color: PD.ink,
          marginBottom: 16,
          fontWeight: 400,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-body)',
          fontSize: 15,
          color: PD.inkSoft,
          maxWidth: 460,
          lineHeight: 1.6,
          opacity: 0.85,
        }}
      >
        {subtitle}
      </div>
      {phase === 3 && (
        <button
          onClick={onContinue}
          style={{
            marginTop: 40,
            background: PD.ink,
            color: PD.paper,
            border: 'none',
            borderRadius: 999,
            padding: '14px 32px',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'var(--pl-font-body)',
            letterSpacing: '0.05em',
            animation: 'pl-enter-fade-in 0.6s ease',
          }}
        >
          keep going →
        </button>
      )}
    </div>
  );
}
