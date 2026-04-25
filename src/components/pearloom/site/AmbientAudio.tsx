'use client';

/* ========================================================================
   AmbientAudio — opt-in ambient loop for published sites.

   Off by default. The host enables it in the editor and picks a sound
   (cafe, fireplace, brook, chapel) or uploads a custom looping clip.
   Plays at -22dB (gain 0.18) AFTER first user interaction so we don't
   trip autoplay policies or surprise anyone. Always renders a visible
   mute button in the bottom-right that persists state in localStorage.
   ======================================================================== */

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** URL of a seamless 30-60s loop. Must be CORS-friendly. */
  url?: string;
  /** Display label shown next to the mute button. */
  label?: string;
  /** Storage key — per-site so muting one site doesn't mute others. */
  storageKey?: string;
}

export function AmbientAudio({ url, label = 'Ambient sound', storageKey = 'pearloom-ambient' }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [primed, setPrimed] = useState<boolean>(false);

  // Read persisted preference. Default: muted (we never autoplay sound
  // without explicit consent in this session).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(storageKey);
      // 'on' = user previously chose unmuted. We still wait for an
      // interaction before unmuting to satisfy autoplay policies.
      if (v === 'on') setMuted(false);
    } catch {}
  }, [storageKey]);

  // Prime audio on first user interaction so a future toggle works
  // without an empty-promise rejection from the autoplay policy.
  useEffect(() => {
    if (primed) return;
    const onAny = () => {
      setPrimed(true);
      const el = ref.current;
      if (el && !muted) {
        el.volume = 0.18;
        void el.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', onAny, { once: true });
    window.addEventListener('keydown', onAny, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onAny);
      window.removeEventListener('keydown', onAny);
    };
  }, [primed, muted]);

  // Apply mute changes to the audio element + persist preference.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = 0.18;
    if (muted) {
      el.pause();
    } else if (primed) {
      void el.play().catch(() => {});
    }
    try {
      window.localStorage.setItem(storageKey, muted ? 'off' : 'on');
    } catch {}
  }, [muted, primed, storageKey]);

  if (!url) return null;

  return (
    <>
      <audio ref={ref} src={url} loop preload="auto" />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
        title={muted ? `Play ${label}` : `Mute ${label}`}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 70,
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1px solid var(--card-ring, rgba(0,0,0,0.1))',
          background: 'var(--card, #fff)',
          color: 'var(--ink-soft)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(14,13,11,0.10)',
          transition: 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
      >
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        )}
      </button>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Curated ambient presets — host picks a name, we resolve to a URL.
   Hosting these clips on a CDN is a follow-up — for now we ship empty
   strings as placeholders so the audio element silently no-ops.
   ─────────────────────────────────────────────────────────────────────── */
export const AMBIENT_PRESETS: Record<string, { label: string; url: string; suitFor: string[] }> = {
  cafe:      { label: 'Cafe murmur',  url: '', suitFor: ['brunch', 'welcome-party', 'birthday'] },
  fireplace: { label: 'Fireplace',    url: '', suitFor: ['memorial', 'funeral', 'milestone-birthday', 'retirement'] },
  brook:     { label: 'Forest brook', url: '', suitFor: ['wedding', 'engagement', 'anniversary', 'vow-renewal'] },
  chapel:    { label: 'Chapel choir', url: '', suitFor: ['baptism', 'confirmation', 'first-communion', 'bar-mitzvah', 'bat-mitzvah'] },
  ocean:     { label: 'Ocean waves',  url: '', suitFor: ['housewarming', 'graduation', 'reunion'] },
};
