'use client';

// ─────────────────────────────────────────────────────────────
// DesignGuests — "What your guests get". The page is host-heavy;
// this balances it with the guest side, all real features:
// a personal page, one-tap RSVP + plus-one, edit-from-email, the
// guestbook, and safe (auto-screened) photo uploads. Fresh
// treatment: centered intro + a four-card "moments" grid distinct
// from the split/act sections.
// ─────────────────────────────────────────────────────────────

import { Pill, Pearl, PD, DISPLAY_STYLE, MONO_STYLE, pdInkMix } from './DesignAtoms';

interface Moment {
  tone: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}

export function DesignGuests() {
  const moments: Moment[] = [
    {
      tone: PD.olive,
      eyebrow: 'THEIR OWN PAGE',
      title: 'A link addressed to them',
      body: 'Every guest gets a private page — their name, their reply, the photos they sent. Not a form. A letter.',
      visual: <EnvelopeMini />,
    },
    {
      tone: PD.terra,
      eyebrow: 'ONE TAP',
      title: 'Reply, plus a guest',
      body: 'Going, maybe, or no — in one tap. Bringing someone? Add their name. Changed your mind? Edit it from the email.',
      visual: <RsvpMini />,
    },
    {
      tone: PD.gold,
      eyebrow: 'A FEW WARM WORDS',
      title: 'Sign the guestbook',
      body: 'Guests leave a wish on the wall, and the most heartfelt one rises to the top. Every note kept for the keepsake.',
      visual: <GuestbookMini />,
    },
    {
      tone: PD.plum,
      eyebrow: 'THE PHOTO WALL',
      title: 'Add to the night, safely',
      body: 'Snap or pick a photo, add a filter, send. Every upload is auto-checked before it ever reaches the wall.',
      visual: <PhotoMini />,
    },
  ];

  return (
    <section style={{ position: 'relative', padding: 'clamp(60px, 8vw, 116px) 24px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* Centered intro */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
          <Pill color="transparent">
            <Pearl size={7} /> FOR THE GUESTS
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(34px, 4.6vw, 62px)',
              lineHeight: 1.02,
              margin: '20px 0 16px',
              letterSpacing: '-0.02em',
              color: PD.ink,
            }}
          >
            The day matters to{' '}
            <span style={{ fontStyle: 'italic', color: PD.olive }}>them</span>, too.
          </h2>
          <p
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(15px, 1.1vw, 18px)',
              lineHeight: 1.6,
              color: PD.inkSoft,
              margin: 0,
            }}
          >
            No apps, no logins. Your guests open one link and everything they need is already there —
            and everything they leave behind comes home to you.
          </p>
        </div>

        {/* Four moments — staggered reveal via the motion engine */}
        <div
          className="pd-guests-grid"
          data-reveal-stagger="80"
          data-reveal-as="rise"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
        >
          {moments.map((m) => (
            <div
              key={m.title}
              className="pl-lift"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                padding: 22,
                borderRadius: 18,
                background: PD.paperCard,
                border: `1px solid ${pdInkMix(12)}`,
                boxShadow: `0 14px 36px ${pdInkMix(7)}`,
              }}
            >
              <div
                style={{
                  height: 96,
                  borderRadius: 14,
                  background: `${m.tone}10`,
                  border: `1px solid ${m.tone}33`,
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {m.visual}
              </div>
              <span style={{ ...MONO_STYLE, fontSize: 9.5, color: m.tone }}>{m.eyebrow}</span>
              <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 19, fontWeight: 600, color: PD.ink, lineHeight: 1.1, marginTop: -6 }}>
                {m.title}
              </div>
              <p style={{ fontFamily: 'var(--pl-font-body)', fontSize: 13.5, lineHeight: 1.55, color: PD.inkSoft, margin: 0 }}>
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-guests-grid) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 560px) {
          :global(.pd-guests-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ── Mini visuals (on-brand, simple) ─────────────────────────── */

function EnvelopeMini() {
  return (
    <svg width="78" height="58" viewBox="0 0 78 58" aria-hidden>
      <rect x="6" y="8" width="66" height="44" rx="6" fill="var(--pd-paper, #F5EFE2)" stroke={PD.olive} strokeWidth="1.6" />
      <path d="M7 11 39 34 71 11" fill="none" stroke={PD.olive} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="39" cy="34" r="5" fill={PD.gold} />
    </svg>
  );
}

function RsvpMini() {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {['Going', 'Maybe', 'No'].map((l, i) => (
        <span
          key={l}
          style={{
            padding: '6px 11px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            background: i === 0 ? PD.terra : 'transparent',
            color: i === 0 ? '#fff' : PD.inkSoft,
            border: i === 0 ? 'none' : `1px solid ${pdInkMix(20)}`,
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

function GuestbookMini() {
  return (
    <svg width="84" height="56" viewBox="0 0 84 56" aria-hidden>
      <rect x="14" y="10" width="56" height="36" rx="5" fill="var(--pd-paper, #F5EFE2)" stroke={PD.gold} strokeWidth="1.6" />
      <path d="M22 22h40M22 29h40M22 36h26" stroke={pdInkMix(28)} strokeWidth="2" strokeLinecap="round" />
      <circle cx="63" cy="40" r="6" fill={PD.gold} />
    </svg>
  );
}

function PhotoMini() {
  return (
    <svg width="78" height="56" viewBox="0 0 78 56" aria-hidden>
      <rect x="10" y="9" width="58" height="38" rx="5" fill="var(--pd-paper, #F5EFE2)" stroke={PD.plum} strokeWidth="1.6" />
      <circle cx="26" cy="22" r="4" fill={PD.gold} />
      <path d="M12 41 31 28 44 37 56 25 66 33" fill="none" stroke={PD.plum} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* the "checked / safe" tick */}
      <circle cx="60" cy="42" r="9" fill={PD.olive} />
      <path d="M56 42l3 3 5-6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default DesignGuests;
