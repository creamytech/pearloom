'use client';

// ─────────────────────────────────────────────────────────────
// StudioLanding — the v2 Studio entry (handoff-v2 screenshots/
// studio.png): "Design the invitation." A warm welcome that lets the
// host pick which piece of stationery to make before dropping into the
// card editor. Production's Studio is site-scoped, so the cards are the
// three real stationery types (save-the-date / invitation / thank-you)
// rather than the prototype's occasion gallery. Picking one sets the
// type and opens the editor.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { Icon, Pear } from '../motifs';
import { PageIntro } from '../dash/QuietDash';
import type { StationeryType } from './studio-constants';

interface CardSpec {
  id: StationeryType;
  eyebrow: string;
  name: string;
  sub: string;
  icon: string;
  tint: string;   // soft fill
  ink: string;    // accent ink for eyebrow + glyph
  ring: string;   // hairline
}

/* Accent tokens must be REAL pearloom.css vars (they carry the
   editorial-midnight dark values) — --sage-ink / --lavender-tint
   don't exist, so their light-mode hex fallbacks applied in dark
   mode too: dark olive ink on dark paper, a glaring pastel disc. */
const CARDS: CardSpec[] = [
  { id: 'std', eyebrow: 'Save the date', name: 'Save the Date', sub: 'Send 6–9 months ahead', icon: 'calendar-check', tint: 'var(--peach-bg, #F6E9DD)', ink: 'var(--peach-ink, #8C6E3D)', ring: 'var(--peach-2, #E6C9A8)' },
  { id: 'invite', eyebrow: 'Invitation', name: 'The Invitation', sub: 'Send about 8 weeks before', icon: 'mail', tint: 'var(--sage-tint, #E7EAD3)', ink: 'var(--sage-deep, #5C6B3F)', ring: 'var(--sage, #A6B884)' },
  { id: 'thanks', eyebrow: 'Thank-you', name: 'Thank You', sub: 'Send the day after', icon: 'heart-icon', tint: 'var(--lavender-bg, #E7E2EF)', ink: 'var(--lavender-ink, #6B5E86)', ring: 'var(--lavender, #B7A7D0)' },
];

export function StudioLanding({ onPick }: { onPick: (t: StationeryType) => void }) {
  return (
    <div
      className="pl8"
      style={{
        /* dvh, not vh — mobile browser chrome resizes the visual
           viewport; a fixed 100vh box can pin the cards' Start row
           behind the toolbar with no scrollbar (same rule as the
           editor root). minHeight so content can grow past it. */
        minHeight: '100dvh', overflow: 'auto', background: 'var(--cream, #FBF7EE)',
        fontFamily: 'var(--font-ui, "Inter", system-ui, sans-serif)', color: 'var(--ink)',
      }}
    >
      {/* slim top row — brand + a way back to the dashboard */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px clamp(20px, 5vw, 48px)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <Pear size={22} tone="sage" shadow={false} />
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Studio</span>
        </div>
        <Link href="/dashboard/event" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="arrow-left" size={13} /> Dashboard
        </Link>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '12px clamp(20px, 5vw, 48px) 64px' }}>
        {/* Headline — quiet PageIntro (DASHBOARD-LAYOUT-PLAN rule 1):
            one display line; the three cards below name their own
            jobs, so the old paragraph is gone. */}
        <PageIntro
          eyebrow="Stationery"
          title={
            <>
              Design the <span className="display-italic" style={{ color: 'var(--peach-ink, #8C6E3D)' }}>invitation.</span>
            </>
          }
          style={{ marginBottom: 'clamp(18px, 3vw, 28px)' }}
        />

        {/* Stationery cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(14px, 2vw, 22px)' }}>
          {CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="lift"
              style={{
                appearance: 'none', textAlign: 'center', cursor: 'pointer', padding: 0,
                borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line, #E2D9C3)',
                background: 'var(--card, #FFFDF7)', boxShadow: 'var(--shadow-sm, 0 8px 26px -18px rgba(40,28,12,0.4))',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minHeight: 280, justifyContent: 'center', gap: 14,
              }}
            >
              {/* tinted motif disc */}
              <span style={{ width: 76, height: 76, borderRadius: '50%', background: c.tint, border: `1px solid ${c.ring}`, display: 'grid', placeItems: 'center' }}>
                <Icon name={c.icon} size={30} color={c.ink} />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.ink, marginBottom: 6 }}>{c.eyebrow}</div>
                <div className="display" style={{ fontSize: 24, color: 'var(--ink)', lineHeight: 1.1 }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 5 }}>{c.sub}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: c.ink }}>
                Start <Icon name="arrow-right" size={12} color={c.ink} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
