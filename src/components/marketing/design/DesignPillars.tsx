'use client';

// ─────────────────────────────────────────────────────────────
// DesignPillars — "One place, beautifully connected."
//
// The four-pillar feature-cards band for the v4 marketing landing.
// Each card names one act of the celebration (Compose · Guests ·
// Day-of · Keepsake), carries a fixed brand accent, and closes on
// a tiny inset "UI" widget so the reader feels the product without
// a single screenshot. No photos — warm gradient tints only
// (BRAND rule). Cards lift subtly on hover.
// ─────────────────────────────────────────────────────────────

import { PenLine, Users, CalendarCheck, Images, Check, type LucideIcon } from 'lucide-react';
import { PD, MONO_STYLE, DISPLAY_STYLE, Pearl, pdInkMix } from './DesignAtoms';

// Translucent tint from a PD var() token — never string-concat an
// alpha suffix onto a var(), color-mix instead.
const mix = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`;

type PillarId = 'compose' | 'guests' | 'dayof' | 'keepsake';

interface Pillar {
  id: PillarId;
  name: string;
  sub: string;
  body: string;
  /** Brand-fixed accent — literal hex, passed as-is. */
  accent: string;
  Icon: LucideIcon;
}

const PILLARS: Pillar[] = [
  {
    id: 'compose',
    name: 'Compose',
    sub: 'Design your day, your way.',
    body: 'Timelines, budgets, vendor lists and moodboards, drafted by Pear, in minutes, not months.',
    accent: '#5C6B3F',
    Icon: PenLine,
  },
  {
    id: 'guests',
    name: 'Guests',
    sub: 'Make every guest feel seen.',
    body: 'Smart RSVPs, meal preferences, seating and travel, gathered in one calm place.',
    accent: '#8B7BA8',
    Icon: Users,
  },
  {
    id: 'dayof',
    name: 'Day-of',
    sub: 'Run a seamless celebration.',
    body: 'A shared run-of-show, vendor coordination and live updates keep the day flowing.',
    accent: '#C6703D',
    Icon: CalendarCheck,
  },
  {
    id: 'keepsake',
    name: 'Keepsake',
    sub: 'Relive it all, beautifully.',
    body: 'Photos, video and notes woven into a private, Pear-curated album that lasts.',
    accent: '#C19A4B',
    Icon: Images,
  },
];

export function DesignPillars() {
  return (
    <section id="product" style={{ padding: 'clamp(64px,9vw,110px) 24px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', marginBottom: 'clamp(36px,5vw,56px)' }}>
        <div
          style={{
            ...MONO_STYLE,
            color: PD.terra,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Pearl size={8} /> Everything you need
        </div>
        <h2 className="pl-letterpress" style={{ ...DISPLAY_STYLE, fontSize: 'clamp(34px,4.6vw,60px)', color: PD.ink, margin: 0 }}>
          One place, <em style={{ fontStyle: 'italic', color: PD.olive }}>beautifully</em> connected.
        </h2>
        <p
          style={{
            fontSize: 'clamp(16px,1.3vw,18px)',
            lineHeight: 1.6,
            color: PD.inkSoft,
            maxWidth: 600,
            margin: '18px auto 0',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          From the first idea to the last thank-you, Pearloom holds the whole celebration — drafted, gathered, and kept.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}
      >
        {PILLARS.map((p) => (
          <PillarCard key={p.id} p={p} />
        ))}
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          :global(.pd-anim),
          :global(.pd-anim *) {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

function PillarCard({ p }: { p: Pillar }) {
  const { Icon } = p;
  return (
    <div
      style={{
        background: PD.paperCard,
        border: `1px solid ${PD.line}`,
        borderRadius: 18,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition:
          'transform var(--pl-dur-base) var(--pl-ease-out), border-color var(--pl-dur-base) var(--pl-ease-out), box-shadow var(--pl-dur-base) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = pdInkMix(28);
        e.currentTarget.style.boxShadow = `0 16px 36px -18px ${pdInkMix(22)}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = PD.line;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: p.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
        </div>
        <Pearl size={8} />
      </div>

      <h3 style={{ fontFamily: 'var(--pl-font-display)', fontSize: 19, fontWeight: 600, color: PD.ink, margin: '0 0 2px' }}>
        {p.name}
      </h3>
      <div style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 14, color: PD.inkSoft, marginBottom: 10 }}>
        {p.sub}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: PD.inkSoft, fontFamily: 'var(--pl-font-body)', margin: '0 0 16px' }}>
        {p.body}
      </p>

      <div style={{ background: PD.paper2, borderRadius: 12, padding: 14, marginTop: 'auto' }}>
        <PillarWidget id={p.id} accent={p.accent} />
      </div>
    </div>
  );
}

function PillarWidget({ id, accent }: { id: PillarId; accent: string }) {
  if (id === 'compose') return <ComposeWidget accent={accent} />;
  if (id === 'guests') return <GuestsWidget />;
  if (id === 'dayof') return <DayofWidget accent={accent} />;
  return <KeepsakeWidget />;
}

// ── Compose: three progress bars + a checklist tally ──────────
function ComposeWidget({ accent }: { accent: string }) {
  const bars: { label: string; pct: number }[] = [
    { label: 'Timeline', pct: 64 },
    { label: 'Budget', pct: 78 },
    { label: 'Vendors', pct: 46 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bars.map((b) => (
        <div key={b.label}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, flexShrink: 0 }} />
            <span style={{ ...MONO_STYLE, fontSize: 9, color: PD.inkSoft }}>{b.label}</span>
            <span style={{ marginLeft: 'auto', ...MONO_STYLE, fontSize: 9, color: PD.inkSoft }}>{b.pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: PD.paper, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${b.pct}%`, borderRadius: 999, background: accent }} />
          </div>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
          paddingTop: 10,
          borderTop: `1px solid ${pdInkMix(8)}`,
        }}
      >
        <Check size={13} color={accent} strokeWidth={2.5} />
        <span style={{ fontSize: 12, color: PD.ink, fontFamily: 'var(--pl-font-body)' }}>Checklist</span>
        <span style={{ marginLeft: 'auto', ...MONO_STYLE, fontSize: 9, color: PD.inkSoft }}>41 done</span>
      </div>
    </div>
  );
}

// ── Guests: stat row + overlapping avatar chips ───────────────
function GuestsWidget() {
  const stats: { n: string; label: string }[] = [
    { n: '128', label: 'Invited' },
    { n: '98', label: "RSVP'd" },
    { n: '76%', label: 'Coming' },
  ];
  const avatarTints: [string, string][] = [
    [PD.rose, PD.gold],
    [PD.olive, PD.stone],
    [PD.gold, PD.terra],
    [PD.stone, PD.rose],
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ ...DISPLAY_STYLE, fontSize: 22, color: PD.ink, lineHeight: 1 }}>{s.n}</div>
            <div style={{ ...MONO_STYLE, fontSize: 8, color: PD.inkSoft, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
        {avatarTints.map((t, i) => (
          <span
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              marginLeft: i === 0 ? 0 : -8,
              border: `2px solid ${PD.paperCard}`,
              background: `linear-gradient(135deg, ${mix(t[0], 60)}, ${mix(t[1], 45)})`,
              flexShrink: 0,
            }}
          />
        ))}
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            marginLeft: -8,
            border: `2px solid ${PD.paperCard}`,
            background: PD.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...MONO_STYLE,
            fontSize: 8,
            color: PD.inkSoft,
            flexShrink: 0,
          }}
        >
          +84
        </span>
      </div>
    </div>
  );
}

// ── Day-of: mini run-of-show ──────────────────────────────────
function DayofWidget({ accent }: { accent: string }) {
  const slots: { time: string; label: string }[] = [
    { time: '2:00', label: 'Ceremony' },
    { time: '4:00', label: 'Cocktails' },
    { time: '6:00', label: 'Dinner' },
    { time: '8:00', label: 'Dancing' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {slots.map((s) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...MONO_STYLE, fontSize: 9, color: PD.inkSoft, width: 30, flexShrink: 0 }}>{s.time}</span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: PD.ink, fontFamily: 'var(--pl-font-body)' }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Keepsake: gradient album tiles ────────────────────────────
function KeepsakeWidget() {
  const tileTints: [string, string][] = [
    [PD.rose, PD.gold],
    [PD.gold, PD.olive],
    [PD.olive, PD.stone],
    [PD.stone, PD.rose],
    [PD.rose, PD.olive],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {tileTints.map((t, i) => (
        <span
          key={i}
          style={{
            aspectRatio: '1',
            borderRadius: 8,
            background: `linear-gradient(135deg, ${mix(t[0], 55)}, ${mix(t[1], 40)})`,
          }}
        />
      ))}
      <span
        style={{
          aspectRatio: '1',
          borderRadius: 8,
          background: PD.paper,
          border: `1px solid ${pdInkMix(10)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...MONO_STYLE,
          fontSize: 9,
          color: PD.inkSoft,
        }}
      >
        +126
      </span>
    </div>
  );
}
