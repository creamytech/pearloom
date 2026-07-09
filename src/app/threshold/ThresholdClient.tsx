'use client';

// ─────────────────────────────────────────────────────────────
// ThresholdClient — the pressed cards on the desk. Each
// celebration is a made object: cover photo (or a tinted crest
// tile), letterpress title, the phase line, a real guest count.
// Picking one writes the dashboard's sticky store and steps
// inside. The whole card is the door.
// ─────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PearloomLogo } from '@/components/pearloom/motifs';
import { Pearl } from '@/components/brand/Pearl';
import { PLAtmosphere } from '@/components/pearloom/dash/PLChrome';
import { setStickySiteSelection } from '@/components/marketing/design/dash/hooks';

export interface ThresholdCard {
  id: string;
  title: string;
  initial: string;
  occasion: string | null;
  occasionLabel: string;
  dateLabel: string | null;
  phaseLine: string | null;
  coverPhoto: string | null;
  guests: number;
  shared: boolean;
}

/* The SiteCrest tint families — occasion-shaped paper when there's
   no cover photo yet. */
function crestTint(occasion: string | null): { bg: string; ink: string } {
  const o = occasion ?? '';
  if (/wedding|engagement|vow|bridal|rehearsal|bachelor/.test(o)) {
    return { bg: 'var(--peach-bg, #FBE8D6)', ink: 'var(--peach-ink, #9D5222)' };
  }
  if (/memorial|funeral/.test(o)) {
    return { bg: 'var(--pl-plum-mist, rgba(122,45,45,0.10))', ink: 'var(--pl-plum, #7A2D2D)' };
  }
  if (/birthday|quincea|sweet|retirement|graduation|reunion/.test(o)) {
    return { bg: 'rgba(193,154,75,0.14)', ink: '#8A6A2E' };
  }
  if (/baby|baptism|communion|confirmation|mitzvah|shower|sip/.test(o)) {
    return { bg: 'var(--lavender-bg, #E8E0F0)', ink: 'var(--lavender-ink, #6B5784)' };
  }
  return { bg: 'var(--sage-tint, #E3E8CD)', ink: 'var(--sage-deep, #5C6B3F)' };
}

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

export function ThresholdClient({ cards, firstName }: { cards: ThresholdCard[]; firstName: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const enter = (id: string) => {
    if (leaving) return;
    setLeaving(true);
    setStickySiteSelection(id);
    router.push('/dashboard');
  };

  return (
    <div
      className="pl8"
      style={{
        minHeight: '100vh',
        background: 'var(--cream, #F5EFE2)',
        color: 'var(--ink, #0E0D0B)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(28px, 6vh, 64px) 20px 48px',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 320ms ease',
      }}
    >
      <PLAtmosphere />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 1180, width: '100%' }}>
        <div><PearloomLogo size={30} /></div>

        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: MONO, fontSize: 10, fontWeight: 600,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--ink-muted)', margin: '28px 0 8px',
          }}
        >
          <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #C19A4B)' }} />
          Your celebrations
          <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #C19A4B)' }} />
        </div>

        <h1
          className="pl-letterpress"
          style={{
            fontFamily: DISPLAY,
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontOpticalSizing: 'auto',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Welcome back{firstName ? <>, <span style={{ fontStyle: 'italic' }}>{firstName}</span></> : ''}.
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', margin: '10px 0 0' }}>
          Choose the day you’re tending, everything is where you left it.
        </p>

        {/* The desk — pressed cards, wrap-centered. */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 18, marginTop: 'clamp(24px, 4vh, 40px)',
          }}
        >
          {cards.map((c) => {
            const tint = crestTint(c.occasion);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => enter(c.id)}
                className="pl8-card-lift"
                style={{
                  width: 218,
                  textAlign: 'left',
                  background: 'var(--card, #FBF7EE)',
                  border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
                  borderRadius: 'var(--r-md, 18px)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* The face — cover photo in a hairline frame, or the
                    occasion-tinted crest tile (no stock photography). */}
                <div style={{ padding: 10 }}>
                  <div
                    style={{
                      aspectRatio: '5 / 4',
                      borderRadius: 10,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid rgba(193,154,75,0.45)',
                      background: c.coverPhoto ? undefined : tint.bg,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {c.coverPhoto ? (
                      <img
                        src={c.coverPhoto}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
                      />
                    ) : (
                      <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 44, fontWeight: 500, color: tint.ink, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                        {c.initial}
                        <Pearl size={8} />
                      </span>
                    )}
                    {c.guests > 0 && (
                      <span
                        style={{
                          position: 'absolute', left: 8, bottom: 8,
                          padding: '3px 9px', borderRadius: 999,
                          background: 'rgba(14,13,11,0.72)', color: 'var(--cream, #F5EFE2)',
                          fontSize: 10.5, fontWeight: 650,
                        }}
                      >
                        {c.guests} {c.guests === 1 ? 'guest' : 'guests'}
                      </span>
                    )}
                    {c.shared && (
                      <span
                        style={{
                          position: 'absolute', right: 8, top: 8,
                          padding: '2px 8px', borderRadius: 999,
                          background: 'var(--cream, #F5EFE2)', color: 'var(--ink-soft)',
                          fontFamily: MONO, fontSize: 8, fontWeight: 700,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          border: '1px solid var(--line-soft)',
                        }}
                      >
                        Shared with you
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '2px 14px 14px' }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 3 }}>
                    {c.occasionLabel}
                    {c.dateLabel ? ` · ${c.dateLabel}` : ''}
                  </div>
                  {c.phaseLine && (
                    <div
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        marginTop: 9, fontFamily: MONO, fontSize: 9.5, fontWeight: 600,
                        letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: 'var(--sage-deep, #5C6B3F)',
                      }}
                    >
                      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold, #C19A4B)' }} />
                      {c.phaseLine}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Begin a new thread — a first-class card, not an afterthought. */}
          <button
            type="button"
            onClick={() => { if (!leaving) { setLeaving(true); router.push('/wizard/new'); } }}
            style={{
              width: 218, minHeight: 258,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: 'transparent',
              border: '1.5px dashed var(--line, rgba(14,13,11,0.18))',
              borderRadius: 'var(--r-md, 18px)',
              cursor: 'pointer',
              color: 'var(--ink-soft)',
              fontFamily: 'inherit',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 52, height: 52, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                background: 'var(--sage-tint, #E3E8CD)', color: 'var(--sage-deep, #5C6B3F)',
                fontSize: 26, fontWeight: 300, lineHeight: 1,
              }}
            >
              +
            </span>
            <span style={{ fontFamily: DISPLAY, fontSize: 16.5, fontWeight: 600, color: 'var(--ink)' }}>
              Start a new event
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', maxWidth: 170, lineHeight: 1.5 }}>
              Another day worth remembering.
            </span>
          </button>
        </div>

        {/* One quiet exit under the desk. */}
        <button
          type="button"
          onClick={() => enter(cards[0]?.id ?? '')}
          style={{
            marginTop: 'clamp(24px, 4vh, 36px)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--ink-muted)', textDecoration: 'underline',
            textUnderlineOffset: 3, fontFamily: 'inherit',
          }}
        >
          Skip, go to my dashboard
        </button>
      </div>
    </div>
  );
}
