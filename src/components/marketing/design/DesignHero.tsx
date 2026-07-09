'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/DesignHero.tsx  (Landing v4)
//
// Full-bleed photographic hero with an occasion switcher. Five
// occasions crossfade a per-occasion photograph (ken-burns) behind a
// warm scrim + fine grain; each re-keys the headline and the letter-
// press invitation card. The name input drives the card live. The
// headline + subhead reserve a fixed height (em-based min-heights) so
// the occasion rotation never reflows the hero.
// (Photos are Unsplash placeholders per the design handoff — swap for
// licensed assets before launch.)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Thread } from '@/components/brand/Thread';
import { Pearl, PLButton } from './DesignAtoms';
import { OCC, OCC_KEYS, OCC_IMG, ALBUM_IMGS, THREADING, U, parseNames, type OccasionKey } from './landing-data';

const CREAM = '#FDFAF0';
const CREAM_SOFT = 'rgba(253,250,240,0.95)';
const CREAM_MUTE = 'rgba(253,250,240,0.72)';
const GOLD_ACCENT = '#F0C9A8';

interface HeroProps {
  occ: OccasionKey;
  setOcc: (k: OccasionKey | ((prev: OccasionKey) => OccasionKey)) => void;
  names: string;
  setNames: (v: string) => void;
  onType: (v: string) => void;
  onGetStarted?: (prefill?: { names?: string; occ?: OccasionKey }) => void;
}

export function DesignHero({ occ, setOcc, names, setNames, onType, onGetStarted }: HeroProps) {
  const O = OCC[occ];
  const p = parseNames(names);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const typedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % THREADING.length), 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (!document.hidden) setOcc((k) => OCC_KEYS[(OCC_KEYS.indexOf(k) + 1) % OCC_KEYS.length]);
    }, 5200);
    return () => clearInterval(id);
  }, [paused, setOcc]);

  useEffect(() => {
    if (!typedRef.current) setNames(O.ph);
  }, [occ, O.ph, setNames]);

  /* Explicit tab picks only — the tabs auto-rotate every 5.2s, so
     the CURRENT occ is meaningless unless the visitor chose it. */
  const pickedRef = useRef(false);
  const pick = useCallback(
    (k: OccasionKey) => {
      pickedRef.current = true;
      setOcc(k);
      setPaused(true);
    },
    [setOcc],
  );

  /* The hero's promise is "type a name, start your loom" — so the
     typed name (and an explicitly picked occasion) must actually
     arrive in the wizard (PERSONA-PLAN S5). Demo placeholders never
     ride along: names only when typedRef, occ only when pickedRef. */
  const submit = () => onGetStarted?.({
    names: typedRef.current && names.trim() ? names.trim() : undefined,
    occ: pickedRef.current ? occ : undefined,
  });

  return (
    <header className="pd-hero" onMouseEnter={() => setPaused(true)}>
      {/* Crossfading per-occasion photographs (ken-burns on the active). */}
      <div className="pd-hero-photos" aria-hidden>
        {OCC_KEYS.map((k) => (
          <img
            key={k}
            src={U(OCC_IMG[k], 1600)}
            alt=""
            decoding="async"
            loading={k === occ ? 'eager' : 'lazy'}
            className={k === occ ? 'on' : ''}
          />
        ))}
      </div>
      <div className="pd-hero-scrim" aria-hidden />
      <div className="pd-hero-grain" aria-hidden />

      <div className="pd-hero-inner">
        <div className="pd-hero-copy">
          <div className={'pd-occ-tabs' + (paused ? ' paused' : '')} role="tablist" aria-label="Occasion">
            {OCC_KEYS.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={k === occ}
                className={'pd-otab' + (k === occ ? ' on' : '')}
                style={{ ['--occ' as string]: O.accent } as React.CSSProperties}
                onClick={() => pick(k)}
              >
                {OCC[k].chip}
              </button>
            ))}
          </div>

          <div className="pd-hero-key" key={occ}>
            <div className="pd-hero-eyebrow">{O.eyebrow}</div>
            <h1 className="pd-hero-h1">
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
              Create your site <Pearl size={9} />
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

        {/* The letterpress invitation, framed by two floating cards. */}
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
              <div className="std-post">{O.post || ' '}</div>
              <div className="std-thread">
                <Thread variant="weave" height={11} />
              </div>
              <div className="std-meta">
                {O.meta[0]}
                <br />
                {O.meta[1]}
              </div>
            </div>
          </div>

          <div className="pd-pcard album" aria-hidden>
            <div className="pc-h">
              <span>Memory album</span>
              <span>+126</span>
            </div>
            <div className="pc-album">
              {ALBUM_IMGS.slice(0, 5).map((id) => (
                <div className="ph" key={id} style={{ backgroundImage: `url(${U(id, 200)})` }} />
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
          min-height: 100vh;
          /* svh = the small viewport (address bar shown) — the hero
             stays a fixed height as the mobile bar collapses/expands
             instead of resizing under the reader (a real scroll jump). */
          min-height: 100svh;
          overflow: hidden;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #14110c;
        }
        .pd-hero-photos {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .pd-hero-photos img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transform: scale(1.06);
          transition: opacity 1.1s var(--pl-ease-out, ease);
          filter: saturate(1.08) sepia(0.06) brightness(0.96);
        }
        .pd-hero-photos img.on {
          opacity: 1;
          animation: pd-kenburns 16s ease-out forwards;
        }
        @keyframes pd-kenburns {
          to {
            transform: scale(1.14);
          }
        }
        .pd-hero-scrim {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(90deg, rgba(12, 10, 7, 0.86) 0%, rgba(12, 10, 7, 0.52) 40%, rgba(12, 10, 7, 0.2) 100%),
            linear-gradient(0deg, rgba(12, 10, 7, 0.6) 0%, transparent 34%, transparent 68%, rgba(12, 10, 7, 0.4) 100%);
        }
        .pd-hero-grain {
          position: absolute;
          inset: 0;
          z-index: 2;
          background-image: var(--pl-grain);
          background-size: 180px;
          opacity: 0.12;
          pointer-events: none;
        }
        .pd-hero-inner {
          position: relative;
          z-index: 5;
          flex: 1;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 128px clamp(20px, 4vw, 48px) 60px;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: clamp(28px, 5vw, 80px);
          align-items: center;
          box-sizing: border-box;
        }
        .pd-hero-copy {
          color: ${CREAM};
          max-width: 560px;
        }
        .pd-occ-tabs {
          display: inline-flex;
          gap: 5px;
          padding: 5px;
          border-radius: 999px;
          background: rgba(20, 16, 10, 0.4);
          border: 1px solid rgba(253, 250, 240, 0.22);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          margin-bottom: 26px;
          flex-wrap: wrap;
        }
        .pd-otab {
          border: none;
          background: transparent;
          color: rgba(253, 250, 240, 0.86);
          font-family: var(--pl-font-body);
          font-size: 13px;
          font-weight: 550;
          padding: 8px 16px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
          position: relative;
        }
        .pd-otab:hover {
          background: rgba(253, 250, 240, 0.14);
        }
        .pd-otab.on {
          background: ${CREAM};
          color: #14110c;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }
        .pd-otab.on::after {
          content: '';
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 3px;
          height: 2px;
          border-radius: 2px;
          background: var(--occ, #c6703d);
          transform-origin: left;
          transform: scaleX(0);
        }
        .pd-occ-tabs:not(.paused) .pd-otab.on::after {
          animation: pd-tabprog 5.2s linear infinite;
        }
        @keyframes pd-tabprog {
          to {
            transform: scaleX(1);
          }
        }
        .pd-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--pl-font-mono);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${GOLD_ACCENT};
        }
        .pd-hero-eyebrow::before {
          content: '';
          width: 22px;
          height: 1px;
          background: ${GOLD_ACCENT};
        }
        .pd-hero-key {
          animation: pd-key-in 0.62s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes pd-key-in {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(3px);
          }
          to {
            opacity: 1;
            transform: none;
            filter: blur(0);
          }
        }
        .pd-hero-h1 {
          font-family: var(--pl-font-display);
          font-weight: 400;
          font-optical-sizing: auto;
          font-size: clamp(46px, 5.6vw, 92px);
          line-height: 0.98;
          letter-spacing: -0.03em;
          margin: 20px 0 0;
          color: ${CREAM};
          text-shadow: 0 2px 26px rgba(11, 9, 6, 0.55), 0 1px 2px rgba(11, 9, 6, 0.4);
          /* Reserve height for the longest headline (em-based, so it
             scales with the clamp) so the height doesn't change as
             occasions rotate — the hero stays put instead of reflowing
             every ~5s. On desktop the copy column sits beside the taller
             stationery card, so any slack here is absorbed by the row. */
          min-height: 2.94em;
        }
        .pd-hero-h1 :global(em) {
          font-style: italic;
          color: ${GOLD_ACCENT};
        }
        .pd-hero-sub {
          margin: 22px 0 30px;
          font-size: clamp(16px, 1.35vw, 19px);
          line-height: 1.62;
          color: ${CREAM_SOFT};
          text-shadow: 0 1px 14px rgba(11, 9, 6, 0.6);
          max-width: 500px;
          font-family: var(--pl-font-body);
          /* Reserve three lines so the subhead height is constant across
             occasions (they run 2–3 lines) — no reflow on rotation. */
          min-height: 4.86em;
        }
        .pd-hero-form {
          display: flex;
          gap: 9px;
          align-items: center;
          background: rgba(253, 250, 240, 0.97);
          border-radius: 999px;
          padding: 7px 7px 7px 20px;
          box-shadow: 0 18px 50px -14px rgba(0, 0, 0, 0.6);
          max-width: 440px;
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
          color: #7a6e5c;
        }
        .pd-ticker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 22px;
          font-family: var(--pl-font-mono);
          font-size: 10px;
          letter-spacing: 0.18em;
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
          gap: 26px;
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
          margin-top: 4px;
          font-family: var(--pl-font-body);
        }
        .pd-std-wrap {
          justify-self: center;
          perspective: 1400px;
          position: relative;
        }
        .pd-std {
          position: relative;
          z-index: 4; /* the invitation leads; the flank cards support */
          width: min(500px, 86vw);
          border-radius: 8px;
          background-image: repeating-linear-gradient(0deg, rgba(38, 35, 28, 0.028) 0 1px, transparent 1px 3px),
            linear-gradient(150deg, #fdfaf0, #f5ecda);
          padding: 52px 48px 46px;
          text-align: center;
          box-shadow: 0 46px 100px -30px rgba(0, 0, 0, 0.75), 0 2px 0 rgba(255, 255, 255, 0.7) inset,
            0 0 0 1px rgba(120, 90, 50, 0.14);
        }
        .pd-std::before {
          content: '';
          position: absolute;
          inset: 13px;
          /* Foil hairline frame — gold as metal, not flat. */
          border: 1px solid transparent;
          border-image: linear-gradient(100deg, #a87f35, #e3c77e 45%, #c19a4b 70%, #b8913f) 1;
          opacity: 0.55;
          pointer-events: none;
        }
        .pd-std-lift {
          animation: pd-std-fade 0.55s ease;
        }
        @keyframes pd-std-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          font-weight: 420;
          font-size: clamp(38px, 4.9vw, 64px);
          line-height: 1.03;
          letter-spacing: -0.02em;
          color: #26231c;
          min-height: 1.1em;
          font-variation-settings: 'opsz' 144, 'SOFT' 70, 'WONK' 0;
          /* Letterpress — the typed names sit INTO the paper. */
          text-shadow: 0 1px 1px rgba(255, 255, 255, 0.85), 0 -1px 1px rgba(38, 35, 28, 0.16);
        }
        .std-names .amp {
          font-style: italic;
          color: var(--occ, #c6703d);
          padding: 0 0.05em;
          font-size: 0.72em;
          vertical-align: 0.08em;
        }
        .std-names .ghost {
          color: #c8bfa5;
        }
        .std-post {
          font-family: var(--pl-font-display);
          font-style: italic;
          font-size: 19px;
          color: #4a5642;
          margin-top: 6px;
          min-height: 1.2em;
        }
        .std-thread {
          max-width: 180px;
          margin: 18px auto 16px;
        }
        .std-meta {
          font-family: var(--pl-font-mono);
          font-size: 9.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #6f6557;
          line-height: 1.7;
        }
        .pd-pcard {
          position: absolute;
          z-index: 3;
          border-radius: 14px;
          background: rgba(253, 250, 240, 0.97);
          box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 13px 15px;
          animation: pd-drift 11s ease-in-out infinite;
        }
        .pd-pcard.dash {
          top: -26px;
          left: -46px;
          width: 172px;
          opacity: 0.94;
        }
        .pd-pcard.album {
          bottom: -30px;
          right: -38px;
          width: 182px;
          opacity: 0.94;
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
          gap: 4px;
        }
        .pc-album .ph {
          aspect-ratio: 1;
          border-radius: 6px;
          background-size: cover;
          background-position: center;
        }
        .pc-album .ph.more {
          background: rgba(92, 107, 63, 0.15);
          display: grid;
          place-items: center;
          font-family: var(--pl-font-display);
          font-size: 12px;
          color: #363f22;
        }
        .pd-scroll-cue {
          position: absolute;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 6;
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
          animation: pd-bob 1.9s ease-in-out infinite;
        }
        @keyframes pd-bob {
          50% {
            transform: translateY(6px);
          }
        }
        @media (max-width: 1120px) {
          .pd-pcard.dash {
            left: -22px;
          }
          .pd-pcard.album {
            right: -18px;
          }
        }
        @media (max-width: 900px) {
          .pd-hero-inner {
            /* minmax(0, 1fr) — NOT 1fr. A bare 1fr is minmax(auto, 1fr),
               and the auto floor refuses to shrink below the widest
               child's min-content, blowing the single column past the
               viewport (the copy, h1, form + card then clip under the
               page's overflow:hidden). minmax(0, …) lets the track
               shrink to the viewport so children reflow instead. */
            grid-template-columns: minmax(0, 1fr);
            gap: 44px;
            padding: 120px 22px 80px;
            align-items: start;
          }
          .pd-hero-copy,
          .pd-std-wrap {
            min-width: 0;
            max-width: 100%;
          }
          .pd-hero-copy {
            justify-self: center;
            width: 100%;
            max-width: 560px;
          }
          /* Contain the floating cards inside the single column so they
             stop overhanging the viewport in the 641-900 band (they
             hide entirely at 640). */
          .pd-pcard.dash {
            left: 6px;
          }
          .pd-pcard.album {
            right: 6px;
          }
        }
        @media (max-width: 640px) {
          .pd-pcard {
            display: none;
          }
          .pd-hero-inner {
            padding: 104px 18px 64px;
          }
          .pd-occ-tabs {
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            /* Only claim horizontal pans — a vertical swipe that lands on
               this strip still scrolls the page instead of being eaten by
               the horizontal scroller. */
            touch-action: pan-x;
          }
          .pd-occ-tabs::-webkit-scrollbar {
            display: none;
          }
          .pd-hero-h1 {
            font-size: clamp(34px, 9vw, 46px);
            overflow-wrap: break-word;
            /* Narrower column → the longest headline wraps to 3 lines;
               reserve them so rotation never reflows the mobile hero. */
            min-height: 2.94em;
          }
          .pd-hero-sub {
            font-size: 15.5px;
            max-width: 100%;
            /* The longest subhead runs ~5 lines at this width. */
            min-height: 8.1em;
          }
          .pd-hero-form {
            max-width: 100%;
          }
          .pd-hero-stats {
            gap: 18px 22px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pd-hero-photos img.on,
          .pd-pcard,
          .pd-hero-key,
          .pd-std-lift,
          .pd-occ-tabs .pd-otab.on::after,
          .pd-scroll-cue :global(.arw) {
            animation: none !important;
          }
        }
      `}</style>
    </header>
  );
}
