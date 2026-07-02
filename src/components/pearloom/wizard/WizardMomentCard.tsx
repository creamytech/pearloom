'use client';

/* ─────────────────────────────────────────────────────────────
   WizardMomentCard — the living glass pane at the top of every
   wizard step. As the host answers, the card fills in: occasion
   first, then names, then the date in display type, then the
   place — the celebration literally taking shape behind glass.

   The ambient layer is tinted by the occasion's voice
   (celebratory → gold drift, playful → peach, intimate →
   lavender). Solemn occasions get no particles at all — a single
   quiet thread under the name instead. Particle positions are a
   deterministic module-level table (no Math.random in render —
   SSR + compiler safe); motion honors prefers-reduced-motion.
   ───────────────────────────────────────────────────────────── */

import { getEventType, type EventVoice } from '@/lib/event-os/event-types';

/* Deterministic particle field — golden-ratio-ish scatter so it
   reads organic without randomness. */
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: ((i * 61.8) % 94) + 3,           // 3–97 %
  top: ((i * 37.3) % 78) + 8,            // 8–86 %
  size: 2.5 + (i % 4) * 1.25,            // 2.5–6.25 px
  delay: (i % 8) * 1.1,                  // s
  dur: 7 + (i % 5) * 2.3,                // 7–16.2 s
  dim: i % 3 === 0,                      // every third dot quieter
}));

const VOICE_TINT: Record<EventVoice, { dot: string; wash: string } | null> = {
  celebratory: { dot: 'var(--gold, #C19A4B)', wash: 'var(--gold, #C19A4B)' },
  ceremonial:  { dot: 'var(--gold, #C19A4B)', wash: 'var(--sage-deep, #5C6B3F)' },
  playful:     { dot: 'var(--peach-ink, #C6703D)', wash: 'var(--peach-ink, #C6703D)' },
  intimate:    { dot: 'var(--lavender-ink, #6E5E8E)', wash: 'var(--lavender-ink, #6E5E8E)' },
  solemn:      null, // quiet thread, no particles
};

/* Local-date parse for yyyy-mm-dd — new Date('2027-06-12') would
   land a day early west of UTC. */
function parseLocal(iso?: string): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function WizardMomentCard({
  occasion,
  names,
  eventDate,
  location,
}: {
  occasion: string;
  names: string[];
  eventDate?: string;
  location?: string;
}) {
  const et = getEventType(occasion);
  const voice: EventVoice = et?.voice ?? 'celebratory';
  const tint = VOICE_TINT[voice];
  const occasionLabel = et?.label ?? 'Celebration';

  const realNames = names.filter(Boolean);
  const nameLine = realNames.join(' & ');
  const date = parseLocal(eventDate);
  const dateLine = date
    ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  /* Big slot priority: date → names → an invitation to keep going. */
  const big = dateLine ?? (nameLine || 'Taking shape');
  const subParts = [
    dateLine ? nameLine : null, // names move to the sub line once the date owns the big slot
    location || null,
  ].filter(Boolean) as string[];

  return (
    <div
      aria-label={`${occasionLabel} — woven so far`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        padding: '16px 18px 15px',
        background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
        backdropFilter: 'var(--pl-glass-blur, blur(16px) saturate(1.5))',
        WebkitBackdropFilter: 'var(--pl-glass-blur, blur(16px) saturate(1.5))',
        border: '1px solid var(--pl-glass-border)',
        boxShadow: 'var(--pl-glass-shadow)',
      }}
    >
      {/* Ambient wash + drifting motes — behind the glass content. */}
      {tint && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(120% 90% at 12% 0%, color-mix(in oklab, ${tint.wash} 14%, transparent), transparent 62%)`,
            }}
          />
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="pl-wiz-mote"
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: tint.dot,
                opacity: p.dim ? 0.22 : 0.4,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
              }}
            />
          ))}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span aria-hidden style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold, #C19A4B)' }} />
          {occasionLabel}
        </div>
        <div
          className="display"
          style={{
            fontSize: 'clamp(21px, 5vw, 27px)',
            fontStyle: 'italic',
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginTop: 4,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {big}
        </div>
        {subParts.length > 0 && (
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--ink-soft)',
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subParts.join(' · ')}
          </div>
        )}
        {/* The quiet thread — solemn occasions carry a single rule
            where the others carry light. */}
        {!tint && (
          <svg width="120" height="6" viewBox="0 0 120 6" aria-hidden style={{ display: 'block', marginTop: 9 }}>
            <path d="M1 3.5 C 28 1.5, 58 5, 86 3 S 112 2.5, 119 3" fill="none" stroke="var(--sage-deep, #5C6B3F)" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
            <path d="M1 2.5 C 28 0.5, 58 4, 86 2 S 112 1.5, 119 2" fill="none" stroke="var(--gold, #C19A4B)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
          </svg>
        )}
      </div>

      <style jsx global>{`
        @keyframes pl-wiz-mote-drift {
          0%   { transform: translate(0, 0); }
          50%  { transform: translate(3px, -14px); }
          100% { transform: translate(0, -26px); opacity: 0; }
        }
        .pl-wiz-mote {
          animation-name: pl-wiz-mote-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-wiz-mote { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
