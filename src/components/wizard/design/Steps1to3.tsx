'use client';

// Steps 1-3: Category → Occasion → Names
// Each step is a pure <Scene> consumer; state + navigation are
// passed in by the parent wizard app.

import { useEffect, useState } from 'react';
import { Bloom, Sparkle } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../../marketing/design/DesignAtoms';
import { Scene, SceneDeco, StepHead, StepNav } from './WizardShell';
import { CATEGORIES, EVENTS, type CategoryKey } from './wizardSpec';
import type { StepProps } from './wizardAnswers';

// Palette used for the category tile bloom accent
const CAT_PAL = [PD.pear, PD.butter, PD.rose, PD.gold, PD.plum];
const CAT_TILTS = [-2.5, 1.5, -1, 2, -1.5];

// ── Step 1: CATEGORY ──────────────────────────────────────────
export function StepCategory({
  answers,
  set,
  next,
  onVoice,
  dark,
}: StepProps & { onVoice: () => void }) {
  const [hovered, setHovered] = useState<CategoryKey | null>(null);
  return (
    <Scene deco={<SceneDeco variant="bloom-tl" />} dark={dark}>
      <StepHead stepKey="category" dark={dark} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        {CATEGORIES.map((c, i) => {
          const active = answers.category === c.k;
          const hl = hovered === c.k;
          return (
            <button
              key={c.k}
              onMouseEnter={() => setHovered(c.k)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                set({ category: c.k });
                setTimeout(next, 220);
              }}
              style={{
                position: 'relative',
                background: active ? PD.ink : PD.paperCard,
                color: active ? PD.paper : PD.ink,
                border: `1.5px solid ${active ? PD.ink : 'rgba(31,36,24,0.12)'}`,
                borderRadius: 22,
                padding: '24px 18px 22px',
                textAlign: 'left',
                fontFamily: 'inherit',
                minHeight: 220,
                transform: hl
                  ? 'rotate(0deg) translateY(-6px) scale(1.02)'
                  : `rotate(${CAT_TILTS[i]}deg)`,
                transition: 'all 260ms cubic-bezier(.2,.8,.2,1)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  opacity: hl ? 1 : 0.6,
                  transition: 'all 260ms',
                }}
                aria-hidden
              >
                <Bloom size={48} color={CAT_PAL[i]} centerColor={active ? PD.paper : PD.ink} speed={10} />
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 48 }}>
                0{i + 1}
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 18,
                  lineHeight: 1.05,
                  fontWeight: 400,
                  marginBottom: 8,
                  letterSpacing: '-0.02em',
                }}
              >
                {c.l}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  opacity: 0.7,
                  lineHeight: 1.5,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                {c.s}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <button
          onClick={onVoice}
          style={{
            background: 'transparent',
            border: '1px dashed rgba(31,36,24,0.2)',
            borderRadius: 999,
            padding: '12px 20px',
            fontSize: 13,
            color: dark ? 'rgba(244,236,216,0.8)' : PD.inkSoft,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Sparkle size={14} color={PD.gold} /> Or tell Pear the whole story in your own words
        </button>
      </div>
    </Scene>
  );
}

// ── Step 2: OCCASION ─────────────────────────────────────────
const OCCASION_BG = [PD.pear, PD.butter, PD.rose, PD.gold, PD.olive, PD.plum, PD.terra, PD.stone];
const bgFor = (k: string) =>
  OCCASION_BG[(k.charCodeAt(0) + k.length) % OCCASION_BG.length];

export function StepOccasion({ answers, set, next, back, dark }: StepProps) {
  const filtered = EVENTS.filter((e) => !answers.category || e.cat === answers.category);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Scene deco={<SceneDeco variant="bloom-tl" />} dark={dark}>
      <StepHead stepKey="occasion" dark={dark} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginTop: 20,
        }}
      >
        {filtered.map((e) => {
          const active = answers.occasion === e.k;
          const hl = hovered === e.k;
          const bg = bgFor(e.k);
          return (
            <button
              key={e.k}
              onMouseEnter={() => setHovered(e.k)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                set({ occasion: e.k });
                setTimeout(next, 200);
              }}
              style={{
                textAlign: 'left',
                background: active ? PD.ink : PD.paperCard,
                color: active ? PD.paper : PD.ink,
                border: `1px solid ${active ? PD.ink : 'rgba(31,36,24,0.1)'}`,
                borderRadius: 18,
                padding: '18px 18px 16px',
                fontFamily: 'inherit',
                transform: hl ? 'translateY(-3px)' : 'translateY(0)',
                transition: 'all 220ms',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '46% 54% 42% 58% / 58% 38% 62% 42%',
                  background: bg,
                  marginBottom: 14,
                  animation: hl ? 'pl-blob-morph 4s ease-in-out infinite' : 'none',
                }}
              />
              <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.15 }}>{e.l}</div>
              <div style={{ ...MONO_STYLE, fontSize: 8.5, opacity: 0.55, marginTop: 4 }}>
                {e.tone.toUpperCase()} · {e.theme.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>
      <StepNav onBack={back} onNext={next} nextDisabled={!answers.occasion} />
    </Scene>
  );
}

// ── Step 3: NAMES ────────────────────────────────────────────
const COUPLE_OCCASIONS = new Set([
  'engagement',
  'rehearsal-dinner',
  'wedding',
  'vow-renewal',
  'anniversary',
]);

export function StepNames({ answers, set, next, back, dark }: StepProps) {
  const ev = EVENTS.find((e) => e.k === answers.occasion);
  const isCouple = answers.occasion ? COUPLE_OCCASIONS.has(answers.occasion) : false;
  const isMemory = !!ev?.memory;

  const [draftA, setDraftA] = useState(answers.nameA ?? '');
  const [draftB, setDraftB] = useState(answers.nameB ?? '');
  const [showB, setShowB] = useState(isCouple && !!answers.nameB);

  useEffect(() => {
    const m = draftA.match(/^(.+?)\s+(?:&|and)\s+(.+)$/i);
    if (m && isCouple && !showB) {
      setDraftA(m[1].trim());
      setDraftB(m[2].trim());
      setShowB(true);
    }
  }, [draftA, isCouple, showB]);

  const title = isMemory
    ? 'Whose life are we celebrating?'
    : isCouple
    ? 'Whose names go up top?'
    : "Who's being honored?";
  const label = isMemory ? 'In loving memory of' : 'First name';

  const canNext = draftA.trim().length > 0 && (!showB || draftB.trim().length > 0);
  const handleNext = () => {
    set({
      nameA: draftA.trim(),
      nameB: showB ? draftB.trim() : undefined,
    });
    next();
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 180,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid rgba(31,36,24,0.25)',
    outline: 'none',
    padding: '8px 2px',
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 'clamp(24px, 3vw, 36px)',
    fontStyle: 'italic',
    color: dark ? PD.paper : PD.ink,
    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
  };

  return (
    <Scene deco={<SceneDeco variant="rose-br" />} dark={dark}>
      <StepHead stepKey="names" title={title} dark={dark} />
      <div
        style={{
          background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
          border: `1px solid ${dark ? 'rgba(244,236,216,0.08)' : 'rgba(31,36,24,0.1)'}`,
          borderRadius: 24,
          padding: '36px 40px',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
          {label.toUpperCase()}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <input
            value={draftA}
            onChange={(e) => setDraftA(e.target.value)}
            placeholder="First name"
            autoFocus
            style={inputStyle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canNext) handleNext();
            }}
          />
          {showB && (
            <>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontStyle: 'italic',
                  color: PD.gold,
                  fontSize: 28,
                  padding: '0 4px 14px',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                &amp;
              </div>
              <input
                value={draftB}
                onChange={(e) => setDraftB(e.target.value)}
                placeholder="Partner"
                style={inputStyle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canNext) handleNext();
                }}
              />
            </>
          )}
        </div>
        {!showB && isCouple && (
          <button
            onClick={() => setShowB(true)}
            style={{
              marginTop: 18,
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              color: dark ? PD.paper : PD.ink,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Add partner
          </button>
        )}
        {isMemory && draftA.trim() && (
          <div
            style={{
              marginTop: 20,
              fontSize: 13,
              color: dark ? 'rgba(244,236,216,0.65)' : PD.inkSoft,
              fontStyle: 'italic',
              fontFamily: '"Fraunces", Georgia, serif',
            }}
          >
            Their name anchors the whole site. Pear speaks their memory, never past tense where it
            hurts.
          </div>
        )}

        {/* Host role — shapes invitation voice */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(31,36,24,0.1)' }}>
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55, marginBottom: 10 }}>
            I&rsquo;M HOSTING AS
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                { k: 'principal', l: 'The person celebrating' },
                { k: 'co-host', l: 'Co-host' },
                { k: 'family', l: 'Family member' },
                { k: 'organizer', l: 'Organizer / planner' },
              ] as const
            ).map((r) => {
              const active = answers.hostRole === r.k;
              return (
                <button
                  key={r.k}
                  onClick={() => set({ hostRole: r.k })}
                  style={{
                    padding: '7px 14px',
                    fontSize: 12.5,
                    borderRadius: 999,
                    background: active ? PD.ink : 'transparent',
                    color: active ? PD.paper : dark ? PD.paper : PD.ink,
                    border: `1px solid ${active ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {r.l}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <StepNav onBack={back} onNext={handleNext} nextDisabled={!canNext} />
    </Scene>
  );
}
