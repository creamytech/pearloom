'use client';

// ─────────────────────────────────────────────────────────────
// DecorRecolorModal — listens for pearloom:decor-recolor events
// emitted by the canvas DecorEditOverlay chips. Opens a modal
// scoped to the asset, lets the host pick a palette (default
// pulls from the current site theme), and submits to
// /api/decor/recolor. On success, writes the new URL back into
// the manifest at the right path.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';

type DecorKind = 'divider' | 'stamp' | 'flourish' | 'bouquet' | 'confetti' | 'sticker';

interface RecolorEvent {
  kind: DecorKind;
  url: string;
  visibilityKey: string;
  label?: string;
}

interface Props {
  manifest: StoryManifest;
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
}

export function DecorRecolorModal({ manifest, onEditField }: Props) {
  const [pending, setPending] = useState<RecolorEvent | null>(null);

  const themeAccent = (manifest.theme?.colors?.accent as string | undefined) ?? '#C6703D';
  const themeInk = (manifest.theme?.colors?.foreground as string | undefined) ?? '#0E0D0B';
  const themeSoft = (manifest.theme?.colors?.accentLight as string | undefined) ?? '#EDE0C5';

  const [ink, setInk] = useState(themeInk);
  const [accent, setAccent] = useState(themeAccent);
  const [soft, setSoft] = useState(themeSoft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<RecolorEvent>).detail;
      if (!detail || !detail.url) return;
      setPending(detail);
      setInk(themeInk);
      setAccent(themeAccent);
      setSoft(themeSoft);
      setError(null);
    }
    window.addEventListener('pearloom:decor-recolor', onEvt);
    return () => window.removeEventListener('pearloom:decor-recolor', onEvt);
  }, [themeInk, themeAccent, themeSoft]);

  // Esc closes.
  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) setPending(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, busy]);

  const writeBack = useCallback((newUrl: string) => {
    if (!pending) return;
    onEditField((m) => {
      // Map the pending kind/visibilityKey back to the manifest
      // path the renderer reads. The visibilityKey we wrote in
      // DecorEditOverlay tells us which slot:
      //   stamp-{section}, footer-bouquet, divider, flourish,
      //   confetti.
      const v = pending.visibilityKey;
      const next: StoryManifest = { ...m };
      const lib: Record<string, unknown> = ((next as unknown as { decorLibrary?: Record<string, unknown> }).decorLibrary ?? {});
      if (v.startsWith('stamp-')) {
        const section = v.slice('stamp-'.length);
        const stamps = ((lib.sectionStamps as Record<string, string> | undefined) ?? {});
        lib.sectionStamps = { ...stamps, [section]: newUrl };
      } else if (v === 'footer-bouquet') {
        lib.footerBouquet = newUrl;
      } else if (v === 'divider' || v === 'divider-story' || v === 'divider-schedule') {
        lib.divider = newUrl;
      } else if (v === 'confetti') {
        lib.confetti = newUrl;
      } else if (v === 'flourish' || pending.kind === 'flourish') {
        // Hero flourish lives at manifest.aiAccentUrl.
        (next as unknown as { aiAccentUrl?: string }).aiAccentUrl = newUrl;
      }
      (next as unknown as { decorLibrary?: Record<string, unknown> }).decorLibrary = lib;
      return next;
    });
  }, [pending, onEditField]);

  async function handleSubmit() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    const jobId = startDecorJob('recolor', `Recolouring ${pending.label ?? pending.kind}`);
    try {
      const res = await fetch('/api/decor/recolor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: pending.url,
          palette: { ink, accent, soft },
          kind: pending.kind,
        }),
      });
      const raw = await res.text();
      let data: { ok?: boolean; url?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch {
        if (res.status === 504 || /An error occurred/i.test(raw)) {
          throw new Error('Pear timed out. Try again with a simpler palette.');
        }
        throw new Error(`Painter responded with non-JSON (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error ?? `Recolor failed (${res.status})`);
      if (!data.url) throw new Error('Pear returned no image URL.');
      writeBack(data.url);
      completeDecorJob(jobId, true);
      setPending(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Recolor failed.';
      setError(msg);
      completeDecorJob(jobId, false, msg);
    } finally {
      setBusy(false);
    }
  }

  if (!pending) return null;

  return (
    <div
      role="dialog"
      aria-label="Recolor decor"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) setPending(null);
      }}
    >
      <div style={{
        width: 'min(440px, 100%)',
        background: 'var(--paper)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
        fontFamily: 'var(--font-ui)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>Recolor</div>
            <h2 className="display" style={{ fontSize: 22, margin: 0 }}>{pending.label ?? `${pending.kind}`}</h2>
          </div>
          <button
            type="button"
            onClick={() => !busy && setPending(null)}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 999,
              background: 'transparent', border: '1.5px solid var(--line)',
              cursor: 'pointer', color: 'var(--ink-soft)',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending.url} alt="" style={{ width: 88, height: 88, objectFit: 'contain', background: 'var(--cream-2)', borderRadius: 8, padding: 6, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Pear keeps the composition + lines identical and just swaps the colors. Pick three tones below or use the theme defaults.
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          <ColorRow label="Ink" value={ink} onChange={setInk} />
          <ColorRow label="Accent" value={accent} onChange={setAccent} />
          <ColorRow label="Soft" value={soft} onChange={setSoft} />
        </div>
        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setPending(null)}
            disabled={busy}
            style={{
              padding: '9px 16px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="pl-pearl-accent"
            style={{
              padding: '9px 18px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              border: 'none',
              fontFamily: 'inherit',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Pear is painting…' : 'Recolor'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '70px 36px 1fr', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 30, padding: 0, border: '1px solid var(--line)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '7px 10px',
          background: 'var(--card)',
          border: '1.5px solid var(--line)',
          borderRadius: 8,
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 11,
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
    </label>
  );
}
