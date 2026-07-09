'use client';

// ─────────────────────────────────────────────────────────────
// DesignTogether — "Plan it together": co-host invites with roles
// + real-time co-editing (live presence). A fresh treatment: a
// stacked "editor canvas" mock with two presence avatars and a
// live "who's editing what" highlight on a section, mirroring the
// product's CoEditHighlights. Left copy, right mock; stacks +
// centers on mobile.
// ─────────────────────────────────────────────────────────────

import { Pill, Pearl, PLButton, PD, DISPLAY_STYLE, MONO_STYLE, pdInkMix } from './DesignAtoms';

interface Props {
  onGetStarted: () => void;
}

const ROLES: Array<{ label: string; sub: string; tone: string }> = [
  { label: 'Co-editor', sub: 'Shape every section', tone: PD.olive },
  { label: 'Guest manager', sub: 'Run the list + RSVPs', tone: PD.terra },
  { label: 'Viewer', sub: 'Look, never touch', tone: PD.gold },
];

export function DesignTogether({ onGetStarted }: Props) {
  return (
    <section
      style={{ position: 'relative', padding: 'clamp(60px, 8vw, 116px) 24px' }}
    >
      <div
        className="pd-together-grid"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1.05fr',
          gap: 'clamp(36px, 5vw, 72px)',
          alignItems: 'center',
        }}
      >
        {/* ── Copy ───────────────────────────────────────── */}
        <div className="pd-together-copy">
          <Pill color="transparent">
            <Pearl size={7} /> PLAN IT TOGETHER
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(34px, 4.4vw, 60px)',
              lineHeight: 1.02,
              margin: '20px 0 18px',
              letterSpacing: '-0.02em',
              color: PD.ink,
            }}
          >
            Invite the people who{' '}
            <span style={{ fontStyle: 'italic', color: PD.olive }}>help</span>,
            <br className="pd-together-br" /> and weave it together.
          </h2>
          <p
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(15px, 1.1vw, 18px)',
              lineHeight: 1.6,
              color: PD.inkSoft,
              maxWidth: 500,
              margin: '0 0 26px',
            }}
          >
            Hand the maid of honor the shower, the best man the bachelor weekend,
            the parents the rehearsal dinner. Give each a role. Then edit the same
            site at the same time, you&rsquo;ll see their mark, and the very block
            they&rsquo;re shaping, the moment they touch it.
          </p>

          {/* Roles */}
          <div className="pd-together-roles" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {ROLES.map((r) => (
              <div
                key={r.label}
                className="pl-lift"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: '10px 14px',
                  borderRadius: 14,
                  background: PD.paperCard,
                  border: `1px solid ${pdInkMix(12)}`,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: PD.ink }}>
                  <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: r.tone }} />
                  {r.label}
                </span>
                <span style={{ fontSize: 11.5, color: PD.inkSoft }}>{r.sub}</span>
              </div>
            ))}
          </div>

          <PLButton variant="pearl" size="lg" onClick={onGetStarted}>
            Invite a co-host <Pearl size={9} />
          </PLButton>
        </div>

        {/* ── Mock: live co-editing canvas ───────────────── */}
        <div className="pd-together-mock" style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              background: PD.paperCard,
              border: `1px solid ${pdInkMix(14)}`,
              borderRadius: 20,
              boxShadow: `0 30px 70px ${pdInkMix(12)}`,
              padding: 20,
              overflow: 'hidden',
            }}
          >
            {/* top bar: title + live presence avatars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ ...MONO_STYLE, fontSize: 10, color: PD.inkSoft }}>EDITING · EMMA &amp; JAMES</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar initials="EJ" tone={PD.olive} />
                <Avatar initials="MV" tone={PD.terra} overlap />
                <span style={{ ...MONO_STYLE, fontSize: 9, color: PD.inkSoft, marginLeft: 8 }}>2 EDITING</span>
              </div>
            </div>

            {/* stacked section bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionBar label="Cover" />
              <SectionBar label="Story" />
              {/* the live-edited section — outlined + labeled, like CoEditHighlights */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: 12,
                    zIndex: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: PD.terra,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    boxShadow: `0 4px 10px ${pdInkMix(20)}`,
                  }}
                >
                  {/* The presence pip breathes — a live-collab pitch
                      shouldn't be frozen. .pd-anim gates it under
                      prefers-reduced-motion (LandingPageWrapper rule);
                      pl-dot-pulse is the global presence keyframe. */}
                  <span
                    aria-hidden
                    className="pd-anim"
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pl-dot-pulse 2s ease-in-out infinite' }}
                  />
                  Maya is editing
                </div>
                <SectionBar label="Schedule" active toneActive={PD.terra} />
              </div>
              <SectionBar label="Travel" />
              <SectionBar label="Registry" />
            </div>

            {/* live status line */}
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: PD.inkSoft,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: PD.olive }} />
              Changes thread in live, no save button, no refresh.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-together-grid) {
            grid-template-columns: 1fr !important;
            gap: 44px !important;
          }
          :global(.pd-together-copy) {
            text-align: center;
          }
          :global(.pd-together-copy) p {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          :global(.pd-together-roles) {
            justify-content: center !important;
          }
          :global(.pd-together-br) {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}

function Avatar({ initials, tone, overlap }: { initials: string; tone: string; overlap?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: tone,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        border: '2px solid var(--pd-paperCard, #FBF7EE)',
        marginLeft: overlap ? -8 : 0,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      {initials}
    </span>
  );
}

function SectionBar({ label, active, toneActive }: { label: string; active?: boolean; toneActive?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        borderRadius: 12,
        // color-mix, not hex-alpha concat — the PD entries are var()
        // strings, so `${tone}14` produced invalid CSS (no tint at all).
        background: active
          ? `color-mix(in oklab, ${toneActive ?? PD.terra} 8%, transparent)`
          : 'var(--pd-paper, #F5EFE2)',
        border: active ? `1.5px solid ${toneActive ?? PD.terra}` : `1px solid ${pdInkMix(8)}`,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: PD.ink, minWidth: 78 }}>{label}</span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ height: 6, borderRadius: 3, background: pdInkMix(active ? 18 : 10), width: '85%' }} />
        <span style={{ height: 6, borderRadius: 3, background: pdInkMix(active ? 14 : 8), width: '60%' }} />
      </span>
    </div>
  );
}

export default DesignTogether;
