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

const VIBE_WORDS = [
  'Warm',
  'Botanical',
  'Romantic',
  'Timeless',
  'Playful',
  'Modern',
  'Minimal',
  'Elegant',
  'Coastal',
  'Rustic',
  'Garden',
  'Intimate',
];

// ── Step 9: VIBE ─────────────────────────────────────────────
export function StepVibe({ answers, set, next, back, skip, dark }: StepProps) {
  const [longer, setLonger] = useState(answers.vibe ?? '');
  const selectedWords = (answers.vibeName ?? '')
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);
  const [expanded, setExpanded] = useState(false);

  const toggleWord = (word: string) => {
    const cur = new Set(selectedWords);
    if (cur.has(word)) cur.delete(word);
    else cur.add(word);
    const joined = Array.from(cur).join(', ');
    set({ vibeName: joined });
  };

  const visibleWords = expanded ? VIBE_WORDS : VIBE_WORDS.slice(0, 9);

  return (
    <Scene deco={<SceneDeco variant="ink" />} dark={dark}>
      <StepHead stepKey="vibe" dark={dark} />
      <div
        style={{
          background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
          border: '1px solid rgba(31,36,24,0.1)',
          borderRadius: 24,
          padding: '32px 36px',
          maxWidth: 820,
          margin: '0 auto',
          display: 'grid',
          gap: 28,
        }}
      >
        {/* Section 1 — Vibe words */}
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              opacity: 0.75,
              letterSpacing: '0.22em',
              marginBottom: 6,
            }}
          >
            1. VIBE WORDS
          </div>
          <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 14 }}>
            Pick 3–5 words that capture the feeling you want your day to have.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {visibleWords.map((w) => {
              const on = selectedWords.includes(w);
              return (
                <button
                  key={w}
                  onClick={() => toggleWord(w)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: on ? '#E8DFE9' : 'transparent',
                    color: PD.ink,
                    border: `1px solid ${on ? '#6E5BA8' : 'rgba(31,36,24,0.18)'}`,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: on ? 500 : 400,
                  }}
                >
                  {w}
                  {on && <span style={{ fontSize: 11, color: '#6E5BA8' }}>✓</span>}
                </button>
              );
            })}
            {!expanded && VIBE_WORDS.length > 9 && (
              <button
                onClick={() => setExpanded(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'transparent',
                  color: PD.inkSoft,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Show more ▾
              </button>
            )}
          </div>
        </div>

        {/* Section 2 — Optional sentence */}
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              opacity: 0.75,
              letterSpacing: '0.22em',
              marginBottom: 6,
            }}
          >
            2. OR A FEW SENTENCES (OPTIONAL)
          </div>
          <textarea
            rows={2}
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
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Section 3 — Palette */}
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              opacity: 0.75,
              letterSpacing: '0.22em',
              marginBottom: 6,
            }}
          >
            3. PALETTE
          </div>
          <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 14 }}>
            Choose a color palette to set the tone.
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
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
                    padding: 14,
                    borderRadius: 16,
                    background: active ? '#FFFEF7' : 'transparent',
                    border: `1.5px solid ${active ? '#6E5BA8' : 'rgba(31,36,24,0.1)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    color: PD.ink,
                    position: 'relative',
                  }}
                >
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        background: '#6E5BA8',
                        color: '#FFFEF7',
                        fontSize: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✓
                    </span>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 4,
                      marginBottom: 12,
                      marginTop: active ? 24 : 0,
                    }}
                  >
                    {p.colors.slice(0, 4).map((c, i) => (
                      <div
                        key={i}
                        style={{ height: 28, background: c, borderRadius: 6 }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: 'center',
                      paddingTop: 4,
                      borderTop: '1px solid rgba(31,36,24,0.06)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <StepNav onBack={back} onNext={next} onSkip={skip} nextDisabled={selectedWords.length === 0} />
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
