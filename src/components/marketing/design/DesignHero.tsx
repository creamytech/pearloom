'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignHero.tsx  (Landing v4)
//
// Full-bleed painterly hero with an occasion switcher. Five
// occasions (wedding · milestone · memorial · baby · reunion)
// each re-key the headline, the invitation card, and the WebGL
// mesh backdrop. The name input drives the card live. A
// Daylight / Midnight pill (bottom-right) flips the global theme
// for the sections below. No stock photography (BRAND §10) — the
// backdrop is the @paper-design mesh under a warm scrim + grain.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';
import { ArrowDown } from 'lucide-react';
import { Thread } from '@/components/brand/Thread';
import { Sprig } from '@/components/pearloom/motifs';
import { useTheme } from '@/components/shell/ThemeProvider';
import { Pearl, PLButton, MONO_STYLE } from './DesignAtoms';
import { OCC, OCC_KEYS, THREADING, parseNames, type OccasionKey } from './landing-data';

const CREAM = '#FDFAF0';
const CREAM_SOFT = 'rgba(253,250,240,0.92)';
const CREAM_MUTE = 'rgba(253,250,240,0.66)';
const GOLD_ACCENT = '#F0C9A8';

interface HeroProps {
  occ: OccasionKey;
  setOcc: (k: OccasionKey | ((prev: OccasionKey) => OccasionKey)) => void;
  names: string;
  setNames: (v: string) => void;
  onType: (v: string) => void;
  onGetStarted?: () => void;
}

export function DesignHero({ occ, setOcc, names, setNames, onType, onGetStarted }: HeroProps) {
  const O = OCC[occ];
  const p = parseNames(names);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const { theme, setPreference } = useTheme();
  const typedRef = useRef(false);

  // Rotate the "Pear is …" ticker.
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % THREADING.length), 1600);
    return () => clearInterval(id);
  }, []);

  // Auto-advance the occasion until the visitor interacts.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (!document.hidden) setOcc((k) => OCC_KEYS[(OCC_KEYS.indexOf(k) + 1) % OCC_KEYS.length]);
    }, 5200);
    return () => clearInterval(id);
  }, [paused, setOcc]);

  // Keep the input showing the occasion default until the visitor types.
  useEffect(() => {
    if (!typedRef.current) setNames(O.ph);
  }, [occ, O.ph, setNames]);

  const pick = useCallback(
    (k: OccasionKey) => {
      setOcc(k);
      setPaused(true);
    },
    [setOcc],
  );

  const submit = () => onGetStarted?.();

  return (
    <header className="pd-hero" onMouseEnter={() => setPaused(true)}>
      {/* Painterly WebGL backdrop, per occasion. */}
      <div className="pd-hero-mesh" aria-hidden>
        <MeshGradient
          colors={O.mesh}
          speed={0.18}
          distortion={0.55}
          swirl={0.42}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="pd-hero-scrim" aria-hidden />
      <div className="pd-hero-grain pl-grain" aria-hidden />

      {/* Daylight / Midnight — flips the global theme for the page below. */}
      <div className="pd-hero-mood" role="group" aria-label="Theme">
        <button className={theme === 'light' ? 'on' : ''} onClick={() => setPreference('light')}>
          Daylight
        </button>
        <button className={theme === 'dark' ? 'on' : ''} onClick={() => setPreference('dark')}>
          Midnight
        </button>
      </div>

      <span className="pd-float f0" aria-hidden>
        <Sprig size={56} color="rgba(240,201,168,0.85)" />
      </span>
      <span className="pd-float f1" aria-hidden>
        <Pearl size={16} />
      </span>
      <span className="pd-float f2" aria-hidden>
        <Pearl size={11} />
      </span>

      <div className="pd-hero-inner">
        <div className="pd-hero-copy">
          <div className="pd-occ-tabs" role="tablist" aria-label="Occasion">
            {OCC_KEYS.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={k === occ}
                className={'pd-otab' + (k === occ ? ' on' : '')}
                onClick={() => pick(k)}
              >
                {OCC[k].chip}
              </button>
            ))}
          </div>

          <div className="pd-hero-key" key={occ}>
            <div style={{ ...MONO_STYLE, color: GOLD_ACCENT, marginBottom: 16 }}>{O.eyebrow}</div>
            <h1 className="pd-hero-h1 pl-letterpress">
              {O.h1a}
              <em>{O.em}</em>
              {O.h1b}
            </h1>
            <p className="pd-hero-sub">{O.sub}</p>
          </div>

          <div className="pd-hero-form">
            <input
              value={names}
              onChange={(e) => {
                typedRef.current = true;
                onType(e.target.value);
              }}
              onFocus={() => setPaused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder={O.ph}
              aria-label="Your names"
            />
            <PLButton variant="pearl" size="md" onClick={submit}>
              Start your loom <Pearl size={9} />
            </PLButton>
          </div>

          <div className="pd-ticker" aria-live="polite">
            <Pearl size={9} /> Pear is <span className="verb">{THREADING[step]}…</span>
          </div>

          <div className="pd-hero-stats">
            {(
              [
                ['31', 'occasions, one voice'],
                ['20 sec', 'to a first draft'],
                ['$0', 'your first site'],
              ] as const
            ).map(([n, l]) => (
              <div className="pd-hstat" key={l}>
                <div className="n">{n}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating cards — the invitation, framed by planning + album. */}
        <div className="pd-std-wrap">
          <div className="pd-pcard dash" aria-hidden>
            <div className="pc-h">
              <span>Planning</span>
              <span>120 days to go</span>
            </div>
            <div className="pc-track">
              <span className="pc-ring" />
              <div>
                <div className="pc-title">On track</div>
                <div className="pc-sub">72% planned</div>
              </div>
            </div>
            <div className="pc-row done">
              <span className="tick">✓</span>Finalize catering
            </div>
            <div className="pc-row">
              <span className="dot" />
              Send save-the-dates
            </div>
          </div>

          <div className="pd-std" style={{ ['--occ' as string]: O.accent } as React.CSSProperties}>
            <div className="pd-std-lift" key={occ}>
              <div className="std-eyebrow">{O.eyebrow}</div>
              <div className="std-pre">{O.pre}</div>
              <div className="std-names">
                {p.a ? (
                  p.two ? (
                    <>
                      {p.a}
                      <span className="amp">&amp;</span>
                      {p.b}
                    </>
                  ) : (
                    p.a
                  )
                ) : (
                  <span className="ghost">Your names</span>
                )}
              </div>
              <div className="std-post">{O.post || ' '}</div>
              <div className="std-thread">
                <Thread variant="weave" height={11} />
              </div>
              <div className="std-meta">
                {O.meta[0]}
                <br />
                {O.meta[1]}
              </div>
            </div>
            <div className="pd-wax" aria-hidden>
              <span>{O.mono.length > 2 ? O.mono[0] : O.mono}</span>
            </div>
          </div>

          <div className="pd-pcard album" aria-hidden>
            <div className="pc-h">
              <span>Memory album</span>
              <span>+126</span>
            </div>
            <div className="pc-album">
              {[0, 1, 2, 3].map((i) => (
                <div className="ph" key={i} data-i={i} />
              ))}
              <div className="ph more">126</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-scroll-cue" aria-hidden>
        See it your way
        <ArrowDown size={15} className="arw" />
      </div>

      <style jsx>{`
        .pd-hero {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #14110c;
        }
        .pd-hero-mesh {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .pd-hero-mesh :global(canvas) {
          width: 100% !important;
          height: 100% !important;
        }
        .pd-hero-scrim {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(90deg, rgba(12, 10, 7, 0.82) 0%, rgba(12, 10, 7, 0.4) 42%, rgba(12, 10, 7, 0.15) 100%),
            linear-gradient(0deg, rgba(12, 10, 7, 0.55) 0%, transparent 30%, transparent 70%, rgba(12, 10, 7, 0.35) 100%);
        }
        .pd-hero-grain {
          position: absolute;
          inset: 0;
          z-index: 2;
          opacity: 0.4;
          mix-blend-mode: soft-light;
          pointer-events: none;
        }
        .pd-hero-mood {
          position: absolute;
          bottom: 22px;
          right: 24px;
          z-index: 6;
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: rgba(20, 17, 12, 0.5);
          border: 1px solid rgba(253, 250, 240, 0.22);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
        }
        .pd-hero-mood button {
          border: none;
          background: transparent;
          color: rgba(253, 250, 240, 0.72);
          font-family: var(--pl-font-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 6px 13px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pd-hero-mood button.on {
          background: ${CREAM};
          color: #1a1712;
          font-weight: 600;
        }
        .pd-float {
          position: absolute;
          z-index: 3;
          pointer-events: none;
          will-change: transform;
        }
        .pd-float.f0 {
          top: 20%;
          left: 7%;
          animation: pd-drift 9s ease-in-out infinite;
        }
        .pd-float.f1 {
          top: 66%;
          right: 9%;
          animation: pd-drift 11s ease-in-out infinite reverse;
        }
        .pd-float.f2 {
          bottom: 20%;
          left: 13%;
          animation: pd-drift 8s ease-in-out infinite;
        }
        @keyframes pd-drift {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-14px);
          }
        }
        .pd-hero-inner {
          position: relative;
          z-index: 4;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 96px 24px 92px;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 48px;
          align-items: center;
          box-sizing: border-box;
        }
        .pd-occ-tabs {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 4px;
          border-radius: 999px;
          background: rgba(20, 17, 12, 0.42);
          border: 1px solid rgba(253, 250, 240, 0.2);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          margin-bottom: 26px;
        }
        .pd-otab {
          border: none;
          background: transparent;
          color: rgba(253, 250, 240, 0.82);
          font-family: var(--pl-font-body);
          font-size: 13px;
          font-weight: 550;
          padding: 8px 16px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .pd-otab:hover {
          color: ${CREAM};
        }
        .pd-otab.on {
          background: ${CREAM};
          color: #1a1712;
          box-shadow: 0 2px 10px -2px rgba(0, 0, 0, 0.4);
        }
        .pd-hero-key {
          animation: pd-key-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes pd-key-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .pd-hero-h1 {
          font-family: var(--pl-font-display);
          font-weight: 400;
          font-optical-sizing: auto;
          font-size: clamp(44px, 5.4vw, 88px);
          line-height: 0.98;
          letter-spacing: -0.03em;
          color: ${CREAM};
          margin: 0;
          text-shadow: 0 2px 26px rgba(11, 9, 6, 0.55), 0 1px 2px rgba(11, 9, 6, 0.4);
        }
        .pd-hero-h1 :global(em) {
          font-style: italic;
          color: ${GOLD_ACCENT};
        }
        .pd-hero-sub {
          margin: 22px 0 30px;
          font-size: clamp(15px, 1.3vw, 18px);
          line-height: 1.62;
          color: ${CREAM_SOFT};
          text-shadow: 0 1px 14px rgba(11, 9, 6, 0.6);
          max-width: 500px;
          font-family: var(--pl-font-body);
        }
        .pd-hero-form {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(253, 250, 240, 0.94);
          border-radius: 999px;
          padding: 6px 6px 6px 20px;
          max-width: 460px;
          box-shadow: 0 20px 50px -24px rgba(0, 0, 0, 0.7);
        }
        .pd-hero-form input {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          outline: none;
          font-family: var(--pl-font-display);
          font-size: 19px;
          color: #26231c;
        }
        .pd-hero-form input::placeholder {
          color: #9b917f;
        }
        .pd-ticker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 22px;
          font-family: var(--pl-font-mono);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${CREAM_MUTE};
        }
        .pd-ticker .verb {
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 15px;
          letter-spacing: 0;
          text-transform: none;
          color: ${GOLD_ACCENT};
          min-width: 150px;
          text-align: left;
        }
        .pd-hero-stats {
          display: flex;
          gap: 34px;
          margin-top: 34px;
          flex-wrap: wrap;
        }
        .pd-hstat .n {
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 27px;
          color: ${GOLD_ACCENT};
          line-height: 1;
        }
        .pd-hstat .l {
          font-size: 11.5px;
          color: ${CREAM_MUTE};
          margin-top: 5px;
          font-family: var(--pl-font-body);
        }
        .pd-std-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 480px;
        }
        .pd-std {
          position: relative;
          width: min(360px, 82vw);
          background: #fbf7ee;
          color: #26231c;
          border-radius: 18px;
          border: 1px solid #e2d9c3;
          padding: 34px 30px 28px;
          text-align: center;
          box-shadow: 0 40px 80px -34px rgba(0, 0, 0, 0.6);
          z-index: 2;
        }
        .pd-std-lift {
          animation: pd-key-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .std-eyebrow {
          font-family: var(--pl-font-mono);
          font-size: 9.5px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--occ, #c6703d);
        }
        .std-pre {
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 17px;
          color: #6f6557;
          margin: 16px 0 6px;
        }
        .std-names {
          font-family: var(--pl-font-display);
          font-weight: 400;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.04;
          letter-spacing: -0.02em;
          color: #26231c;
          min-height: 1.1em;
        }
        .std-names .amp {
          font-style: italic;
          color: var(--occ, #c6703d);
          padding: 0 0.05em;
        }
        .std-names .ghost {
          color: #b8ad99;
        }
        .std-post {
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 18px;
          color: #4a5642;
          margin-top: 6px;
        }
        .std-thread {
          margin: 16px auto;
          max-width: 180px;
        }
        .std-meta {
          font-family: var(--pl-font-mono);
          font-size: 9.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #6f6557;
          line-height: 1.8;
        }
        .pd-wax {
          position: absolute;
          right: -18px;
          bottom: -18px;
          width: 62px;
          height: 62px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: var(--occ, #c6703d);
          box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.5);
        }
        .pd-wax span {
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 24px;
          color: #fbf7ee;
        }
        .pd-pcard {
          position: absolute;
          background: rgba(251, 247, 238, 0.94);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          border: 1px solid #e2d9c3;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 24px 50px -26px rgba(0, 0, 0, 0.5);
          z-index: 3;
          width: 200px;
          animation: pd-drift 10s ease-in-out infinite;
        }
        .pd-pcard.dash {
          top: 2%;
          left: -2%;
        }
        .pd-pcard.album {
          bottom: 4%;
          right: -4%;
          animation-direction: reverse;
        }
        .pc-h {
          display: flex;
          justify-content: space-between;
          font-family: var(--pl-font-mono);
          font-size: 8.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8a8069;
          margin-bottom: 12px;
        }
        .pc-track {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .pc-ring {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          flex-shrink: 0;
          background: conic-gradient(#5c6b3f 0 72%, #e2d9c3 72% 100%);
        }
        .pc-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #26231c;
          font-family: var(--pl-font-body);
        }
        .pc-sub {
          font-size: 10.5px;
          color: #8a8069;
          font-family: var(--pl-font-body);
        }
        .pc-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #4a4437;
          font-family: var(--pl-font-body);
          padding: 3px 0;
        }
        .pc-row .tick {
          color: #5c6b3f;
          font-weight: 700;
        }
        .pc-row .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--occ, #c6703d);
        }
        .pc-album {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
        }
        .pc-album .ph {
          aspect-ratio: 1/1;
          border-radius: 6px;
          background: linear-gradient(135deg, #c8bfa5, #d9a89e);
        }
        .pc-album .ph[data-i='1'] {
          background: linear-gradient(135deg, #5c6b3f, #c19a4b);
        }
        .pc-album .ph[data-i='2'] {
          background: linear-gradient(135deg, #c6703d, #e8c77a);
        }
        .pc-album .ph[data-i='3'] {
          background: linear-gradient(135deg, #d9a89e, #c8bfa5);
        }
        .pc-album .ph.more {
          background: #2c3022;
          color: #fbf7ee;
          display: grid;
          place-items: center;
          font-family: var(--pl-font-display);
          font-size: 13px;
        }
        .pd-scroll-cue {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: ${CREAM_MUTE};
          font-family: var(--pl-font-mono);
          font-size: 9px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }
        .pd-scroll-cue :global(.arw) {
          animation: pd-cue 1.8s ease-in-out infinite;
        }
        @keyframes pd-cue {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(5px);
            opacity: 1;
          }
        }
        @media (max-width: 900px) {
          .pd-hero-inner {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 104px 22px 96px;
          }
          .pd-std-wrap {
            min-height: 380px;
          }
          .pd-pcard.dash {
            top: 0;
            left: 2%;
          }
          .pd-pcard.album {
            right: 2%;
          }
        }
        @media (max-width: 600px) {
          /* On phones the decorative planning/album cards crowd the
             invitation — keep only the invitation card, centered. */
          .pd-pcard {
            display: none;
          }
          .pd-std-wrap {
            min-height: 0;
          }
          .pd-std {
            width: 100%;
            max-width: 360px;
          }
          .pd-occ-tabs {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            justify-content: flex-start;
          }
          .pd-hero-stats {
            gap: 22px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pd-float,
          .pd-pcard,
          .pd-hero-key,
          .pd-std-lift,
          .pd-scroll-cue :global(.arw) {
            animation: none !important;
          }
        }
      `}</style>
    </header>
  );
}
