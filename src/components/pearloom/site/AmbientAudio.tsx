'use client';

/* ========================================================================
   AmbientAudio — opt-in ambient loop for published sites.

   Two source modes:
     1. URL  → plays an HTMLAudioElement loop (host-supplied).
     2. Synth → builds the ambience in real time with the Web Audio API.
        No CDN dependency, no licensing risk, infinite seamless loops.

   Five synth presets:
     • cafe       — pink noise + slow LFO chatter (cafe murmur).
     • fireplace  — low-pass brown noise + occasional spike (crackle).
     • brook      — band-pass white noise modulated by triangle LFO.
     • chapel     — low gain, narrow band-pass + long delay reverb tail.
     • ocean      — slow LFO sweeping a low-pass over brown noise (waves).

   Off by default. Plays at gain 0.18 (~ -22dB) AFTER the first user
   interaction so we never trip autoplay policies. Always renders a
   visible mute button bottom-right that persists state in localStorage.
   ======================================================================== */

import { useEffect, useRef, useState } from 'react';

export type AmbientPresetId = 'cafe' | 'fireplace' | 'brook' | 'chapel' | 'ocean';

interface Props {
  /** Preset id (selects a synth recipe) — wins when both are set. */
  preset?: AmbientPresetId;
  /** URL of a 30-60s seamless loop. Falls back path when no preset. */
  url?: string;
  /** Display label shown next to the mute button. */
  label?: string;
  /** Storage key — per-site so muting one site doesn't mute others. */
  storageKey?: string;
}

export function AmbientAudio({ preset, url, label = 'Ambient sound', storageKey = 'pearloom-ambient' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [primed, setPrimed] = useState<boolean>(false);

  const usingSynth = !!preset && !url;

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(storageKey);
      if (v === 'on') setMuted(false);
    } catch {}
  }, [storageKey]);

  // Prime audio on first user interaction.
  useEffect(() => {
    if (primed) return;
    const onAny = () => {
      setPrimed(true);
      if (!muted) startPlayback();
    };
    window.addEventListener('pointerdown', onAny, { once: true });
    window.addEventListener('keydown', onAny, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onAny);
      window.removeEventListener('keydown', onAny);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primed, muted]);

  // Apply mute changes.
  useEffect(() => {
    if (muted) stopPlayback();
    else if (primed) startPlayback();
    try {
      window.localStorage.setItem(storageKey, muted ? 'off' : 'on');
    } catch {}
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, primed, preset, url]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPlayback() {
    if (usingSynth && preset) {
      stopPlayback();
      synthRef.current = startSynth(preset);
      return;
    }
    if (url) {
      const el = audioRef.current;
      if (!el) return;
      el.volume = 0.18;
      void el.play().catch(() => {});
    }
  }

  function stopPlayback() {
    synthRef.current?.stop();
    synthRef.current = null;
    audioRef.current?.pause();
  }

  if (!preset && !url) return null;

  return (
    <>
      {url && !preset && <audio ref={audioRef} src={url} loop preload="auto" />}
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
   Synth recipes — return an active AudioContext + stop() to tear down.
   ─────────────────────────────────────────────────────────────────────── */

function startSynth(preset: AmbientPresetId): { ctx: AudioContext; stop: () => void } | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  const cleanup: Array<() => void> = [];

  // Shared: a noise buffer source (8s of pink noise, looped).
  function makeNoise(type: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
    const length = ctx.sampleRate * 8;
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (type === 'white') {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      // Voss-McCartney approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      // brown
      let last = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  }

  // Each preset wires its own filter graph onto master.
  switch (preset) {
    case 'cafe': {
      const src = makeNoise('pink');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      lp.Q.value = 0.5;
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      // Slow LFO panning the chatter
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.25;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.18;
      lfo.connect(lfoGain.gain);
      lfo.start();
      src.connect(lp).connect(gain).connect(lfoGain).connect(master);
      cleanup.push(() => { try { src.stop(); lfo.stop(); } catch {} });
      break;
    }
    case 'fireplace': {
      const src = makeNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      lp.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.95;
      src.connect(lp).connect(gain).connect(master);
      // Random pop schedule for crackles.
      let cancelled = false;
      const popLoop = () => {
        if (cancelled) return;
        const pop = ctx.createOscillator();
        pop.frequency.value = 600 + Math.random() * 1200;
        const popGain = ctx.createGain();
        popGain.gain.value = 0;
        pop.connect(popGain).connect(master);
        const t = ctx.currentTime;
        popGain.gain.linearRampToValueAtTime(0.18 + Math.random() * 0.2, t + 0.01);
        popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        pop.start(t);
        pop.stop(t + 0.08);
        setTimeout(popLoop, 700 + Math.random() * 2400);
      };
      popLoop();
      cleanup.push(() => { cancelled = true; try { src.stop(); } catch {} });
      break;
    }
    case 'brook': {
      const src = makeNoise('white');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      bp.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.55;
      src.connect(bp).connect(gain).connect(master);
      // Triangle LFO on bandpass freq for water motion.
      const lfo = ctx.createOscillator();
      lfo.type = 'triangle';
      lfo.frequency.value = 0.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 800;
      lfo.connect(lfoGain).connect(bp.frequency);
      lfo.start();
      cleanup.push(() => { try { src.stop(); lfo.stop(); } catch {} });
      break;
    }
    case 'chapel': {
      const src = makeNoise('pink');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 350;
      bp.Q.value = 1.4;
      const gain = ctx.createGain();
      gain.gain.value = 0.65;
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.45;
      const fbk = ctx.createGain();
      fbk.gain.value = 0.55;
      // Reverb tail: mix dry + delayed feedback.
      src.connect(bp).connect(gain);
      gain.connect(master);
      gain.connect(delay);
      delay.connect(fbk).connect(delay);
      delay.connect(master);
      cleanup.push(() => { try { src.stop(); } catch {} });
      break;
    }
    case 'ocean': {
      const src = makeNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      lp.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 1.1;
      // Slow sine LFO sweeping the LP cutoff = waves arriving.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 480;
      lfo.connect(lfoGain).connect(lp.frequency);
      lfo.start();
      src.connect(lp).connect(gain).connect(master);
      cleanup.push(() => { try { src.stop(); lfo.stop(); } catch {} });
      break;
    }
    default:
      break;
  }

  // Soft fade-in on the master so we never hard-clip start.
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.8);

  return {
    ctx,
    stop: () => {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      } catch {}
      // Tear down sources after the fade.
      setTimeout(() => {
        for (const fn of cleanup) fn();
        try {
          void ctx.close();
        } catch {}
      }, 500);
    },
  };
}

/* ───────────────────────────────────────────────────────────────────────
   Curated ambient presets — host picks a name, we resolve to a synth
   recipe (no CDN URL needed). The renderer can also fall back to a
   custom URL the host pastes if they prefer real recordings.
   ─────────────────────────────────────────────────────────────────────── */
export const AMBIENT_PRESETS: Record<AmbientPresetId, { label: string; suitFor: string[] }> = {
  cafe:      { label: 'Cafe murmur',  suitFor: ['brunch', 'welcome-party', 'birthday'] },
  fireplace: { label: 'Fireplace',    suitFor: ['memorial', 'funeral', 'milestone-birthday', 'retirement'] },
  brook:     { label: 'Forest brook', suitFor: ['wedding', 'engagement', 'anniversary', 'vow-renewal'] },
  chapel:    { label: 'Chapel choir', suitFor: ['baptism', 'confirmation', 'first-communion', 'bar-mitzvah', 'bat-mitzvah'] },
  ocean:     { label: 'Ocean waves',  suitFor: ['housewarming', 'graduation', 'reunion'] },
};
