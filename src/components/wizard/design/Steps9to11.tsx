'use client';

// Steps 9-11: Vibe (mood words + palette), Layout (reading feel),
// Song (URL + metadata). Vibe feeds Pass 2 (palette); layout is a
// preference only — the true choice is auto-picked post-generation
// from chapter count.

import { useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../../marketing/design/DesignAtoms';
import { Scene, SceneDeco, StepHead, StepNav } from './WizardShell';
import type { Palette, StepProps, StoryLayout } from './wizardAnswers';

// Curated starter palettes that reflect common vibe words.
const PALETTE_LIBRARY: Palette[] = [
  { id: 'golden-hour', name: 'golden hour', colors: ['#E8C77A', '#B89244', '#704A5A', '#F4ECD8'] },
  { id: 'sage-dusk', name: 'sage dusk', colors: ['#6B7A3A', '#4C5A26', '#D9A89E', '#F4ECD8'] },
  { id: 'paper-rose', name: 'paper rose', colors: ['#D9A89E', '#B5613A', '#E3DCC0', '#F7F0DC'] },
  { id: 'midnight-grove', name: 'midnight grove', colors: ['#1F2418', '#4C5A26', '#B89244', '#E8DCB4'] },
  { id: 'linen-mist', name: 'linen mist', colors: ['#E8DCB4', '#C8BFA5', '#B8C96B', '#F4ECD8'] },
  { id: 'plum-velvet', name: 'plum velvet', colors: ['#704A5A', '#B5613A', '#E8C77A', '#F1E6C8'] },
];

// ── Step 9: VIBE ─────────────────────────────────────────────
export function StepVibe({ answers, set, next, back, skip, dark }: StepProps) {
  const [words, setWords] = useState(answers.vibeName ?? '');
  const [longer, setLonger] = useState(answers.vibe ?? '');

  return (
    <Scene deco={<SceneDeco variant="ink" />} dark={dark}>
      <StepHead stepKey="vibe" dark={dark} />
      <div
        style={{
          background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
          border: '1px solid rgba(31,36,24,0.1)',
          borderRadius: 24,
          padding: '32px 36px',
          maxWidth: 780,
          margin: '0 auto',
          display: 'grid',
          gap: 22,
        }}
      >
        <div>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 8 }}>
            THREE WORDS
          </div>
          <input
            autoFocus
            value={words}
            onChange={(e) => {
              setWords(e.target.value);
              set({ vibeName: e.target.value });
            }}
            placeholder="warm, held, slightly wild"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid rgba(31,36,24,0.25)',
              outline: 'none',
              padding: '8px 2px',
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              color: dark ? PD.paper : PD.ink,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          />
        </div>

        <div>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 8 }}>
            OR A FEW SENTENCES (OPTIONAL)
          </div>
          <textarea
            rows={3}
            value={longer}
            onChange={(e) => {
              setLonger(e.target.value);
              set({ vibe: e.target.value });
            }}
            placeholder="It should feel like the last hour before sunset on a friend's porch."
            style={{
              width: '100%',
              background: dark ? 'rgba(244,236,216,0.05)' : PD.paper3,
              border: '1px solid rgba(31,36,24,0.12)',
              borderRadius: 10,
              outline: 'none',
              padding: '12px 14px',
              fontFamily: 'inherit',
              fontSize: 14,
              color: dark ? PD.paper : PD.ink,
              resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Starter palette picker — all optional */}
        <div style={{ paddingTop: 18, borderTop: '1px solid rgba(31,36,24,0.1)' }}>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 14 }}>
            OR START FROM A PALETTE
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            {PALETTE_LIBRARY.map((p) => {
              const active = answers.palette?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => set({ palette: p })}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: active ? (dark ? 'rgba(184,146,68,0.15)' : '#FFFEF7') : 'transparent',
                    border: `1.5px solid ${active ? PD.gold : 'rgba(31,36,24,0.1)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    color: dark ? PD.paper : PD.ink,
                  }}
                >
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {p.colors.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 24,
                          background: c,
                          borderRadius: i === 0 ? '6px 0 0 6px' : i === p.colors.length - 1 ? '0 6px 6px 0' : 0,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 15,
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    {p.name}
                  </div>
                </button>
              );
            })}
          </div>
          {answers.palette && (
            <button
              onClick={() => set({ palette: undefined })}
              style={{
                marginTop: 12,
                background: 'transparent',
                border: 'none',
                ...MONO_STYLE,
                fontSize: 9,
                color: PD.terra,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              CLEAR
            </button>
          )}
        </div>
      </div>
      <StepNav onBack={back} onNext={next} onSkip={skip} nextDisabled={!words.trim()} />
    </Scene>
  );
}

// ── Step 10: LAYOUT ───────────────────────────────────────────
interface LayoutOption {
  k: StoryLayout;
  l: string;
  s: string;
  preview: React.CSSProperties;
}

const LAYOUTS: LayoutOption[] = [
  {
    k: 'auto',
    l: 'Let Pear decide',
    s: 'Picked after the chapters are written. This is usually the right call.',
    preview: { background: `linear-gradient(135deg, ${PD.olive}, ${PD.gold})` },
  },
  {
    k: 'magazine',
    l: 'Magazine',
    s: 'Dense. Like a printed profile — copy beside photo, captions pulled.',
    preview: { background: PD.paperCard, border: `1px dashed ${PD.ink}` },
  },
  {
    k: 'parallax',
    l: 'Parallax',
    s: 'Still photography, text over. Reads like the opening of a novel.',
    preview: { background: `linear-gradient(to bottom, ${PD.ink} 0%, ${PD.paperCard} 100%)` },
  },
  {
    k: 'timeline',
    l: 'Timeline',
    s: 'A vertical thread. Works when there are many moments in order.',
    preview: {
      background: `repeating-linear-gradient(to bottom, ${PD.paperCard} 0 24px, ${PD.paper2} 24px 28px)`,
    },
  },
  {
    k: 'filmstrip',
    l: 'Filmstrip',
    s: 'Horizontal rail. Good with lots of photos and short captions.',
    preview: {
      background: `repeating-linear-gradient(to right, ${PD.ink} 0 8px, ${PD.paperCard} 8px 40px)`,
    },
  },
  {
    k: 'bento',
    l: 'Bento',
    s: 'Grid of unequal tiles. Editorial but playful.',
    preview: {
      background: `linear-gradient(135deg, ${PD.rose} 35%, ${PD.butter} 35% 70%, ${PD.olive} 70%)`,
    },
  },
];

export function StepLayout({ answers, set, next, back, skip, dark }: StepProps) {
  const choice = answers.storyLayoutPreference ?? 'auto';
  return (
    <Scene deco={<SceneDeco variant="ink" />} dark={dark}>
      <StepHead stepKey="layout" dark={dark} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
          marginTop: 16,
        }}
      >
        {LAYOUTS.map((l) => {
          const active = choice === l.k;
          return (
            <button
              key={l.k}
              onClick={() => set({ storyLayoutPreference: l.k })}
              style={{
                background: active ? PD.ink : PD.paperCard,
                color: active ? PD.paper : PD.ink,
                border: `1.5px solid ${active ? PD.ink : 'rgba(31,36,24,0.1)'}`,
                borderRadius: 18,
                padding: 16,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 200ms',
              }}
            >
              <div
                style={{
                  height: 92,
                  borderRadius: 10,
                  ...l.preview,
                  opacity: active ? 1 : 0.85,
                }}
              />
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 19,
                  fontWeight: 400,
                  letterSpacing: '-0.015em',
                }}
              >
                {l.l}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  opacity: 0.72,
                  lineHeight: 1.5,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                {l.s}
              </div>
            </button>
          );
        })}
      </div>
      <StepNav onBack={back} onNext={next} onSkip={skip} />
    </Scene>
  );
}

// ── Step 11: SONG ─────────────────────────────────────────────
export function StepSong({ answers, set, next, back, skip, dark }: StepProps) {
  const [url, setUrl] = useState(answers.songUrl ?? '');
  const [title, setTitle] = useState(answers.songMeta?.title ?? '');
  const [artist, setArtist] = useState(answers.songMeta?.artist ?? '');

  const commit = () => {
    set({
      songUrl: url.trim() || undefined,
      songMeta: title.trim() ? { title: title.trim(), artist: artist.trim() || undefined } : undefined,
    });
  };

  return (
    <Scene deco={<SceneDeco variant="ink" />} dark={dark}>
      <StepHead stepKey="song" dark={dark} />
      <div
        style={{
          background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
          border: '1px solid rgba(31,36,24,0.1)',
          borderRadius: 24,
          padding: '32px 36px',
          maxWidth: 680,
          margin: '0 auto',
          display: 'grid',
          gap: 22,
        }}
      >
        <div>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 8 }}>LINK</div>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              set({ songUrl: e.target.value });
            }}
            placeholder="spotify.com/track/… or apple.co/…"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid rgba(31,36,24,0.25)',
              outline: 'none',
              padding: '8px 2px',
              fontFamily: 'inherit',
              fontSize: 17,
              color: dark ? PD.paper : PD.ink,
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 18,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>TITLE</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                set({
                  songMeta: e.target.value.trim()
                    ? { title: e.target.value, artist }
                    : undefined,
                });
              }}
              onBlur={commit}
              placeholder="(optional)"
              style={songInput(dark)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>ARTIST</span>
            <input
              value={artist}
              onChange={(e) => {
                setArtist(e.target.value);
                if (title.trim()) set({ songMeta: { title, artist: e.target.value } });
              }}
              onBlur={commit}
              placeholder="(optional)"
              style={songInput(dark)}
            />
          </label>
        </div>

        <div
          style={{
            fontSize: 12.5,
            opacity: 0.7,
            fontFamily: 'var(--pl-font-body)',
            color: dark ? PD.paper : PD.ink,
          }}
        >
          Optional. If you share a title, I weigh the song&rsquo;s mood into the palette.
        </div>
      </div>
      <StepNav onBack={back} onNext={next} onSkip={skip} />
    </Scene>
  );
}

function songInput(dark?: boolean): React.CSSProperties {
  return {
    padding: '10px 14px',
    background: dark ? 'rgba(244,236,216,0.05)' : PD.paper3,
    border: '1px solid rgba(31,36,24,0.12)',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
    color: dark ? PD.paper : PD.ink,
  };
}
