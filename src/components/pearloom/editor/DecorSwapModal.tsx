'use client';

// ─────────────────────────────────────────────────────────────
// DecorSwapModal — listens for pearloom:decor-swap events from
// DecorEditOverlay. Shows the host every decor asset on the
// site (uploads, AI-painted dividers, stamps, footers, accents)
// and swaps the *one currently rendered* decor for whichever
// they pick — same UX language as IconSwapModal so the canvas
// reads as one consistent system: click any visual, get a
// library, pick its replacement.
//
// Replaces the older Recolor + Regenerate buttons that lived
// on the canvas. Recolor + regenerate moved out of the canvas
// entirely; if you want either, you go through Pear in the
// inspector instead. Click-on-canvas → swap-from-library is
// the only canvas-side action now.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { flattenDecorAssets, type DecorAsset } from './asset-library-data';
import type { DecorKind } from './canvas/DecorEditOverlay';

interface SwapEvent {
  kind: DecorKind;
  /** The visibilityKey the overlay carried — drives which manifest
   *  field we write the new URL to (mirrors DecorRecolorModal). */
  visibilityKey: string;
  /** Current URL so the modal can render a "before" thumb. */
  url?: string | null;
  label?: string;
}

interface Props {
  manifest: StoryManifest;
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
}

// Asset kinds shown in the picker, ordered to match the editor's
// asset library. Uploads first because hosts usually want their own
// art back; AI-painted decor next; editorial scenes last.
const GROUP_ORDER: DecorAsset['kind'][] = [
  'upload', 'stamp', 'divider', 'confetti', 'footer', 'accent', 'invite',
];

const GROUP_LABELS: Record<DecorAsset['kind'], string> = {
  upload: 'Your uploads',
  stamp: 'Section stamps',
  divider: 'Dividers',
  confetti: 'Confetti',
  footer: 'Closing flourish',
  accent: 'Hero accents',
  invite: 'Invite scenes',
};

export function DecorSwapModal({ manifest, onEditField }: Props) {
  const [pending, setPending] = useState<SwapEvent | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<SwapEvent>).detail;
      if (!detail) return;
      setPending(detail);
      setQuery('');
    }
    window.addEventListener('pearloom:decor-swap', onEvt);
    return () => window.removeEventListener('pearloom:decor-swap', onEvt);
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPending(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const decorAssets = useMemo(() => flattenDecorAssets(manifest), [manifest]);
  const lower = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!lower) return decorAssets;
    return decorAssets.filter(
      (a) => a.label.toLowerCase().includes(lower) || (a.usage ?? '').toLowerCase().includes(lower),
    );
  }, [decorAssets, lower]);

  const groups = GROUP_ORDER
    .map((kind) => ({ kind, label: GROUP_LABELS[kind], items: filtered.filter((a) => a.kind === kind) }))
    .filter((g) => g.items.length > 0);

  function applyDecorUrl(visibilityKey: string, kind: DecorKind, newUrl: string, m: StoryManifest): StoryManifest {
    // Map visibilityKey/kind → manifest field. Mirrors the writeBack
    // path in DecorRecolorModal so the canvas, the asset library, and
    // the swap modal all agree on where each decor surface lives.
    const next: StoryManifest = { ...m };
    const lib: Record<string, unknown> = ((next as unknown as { decorLibrary?: Record<string, unknown> }).decorLibrary ?? {});
    if (visibilityKey.startsWith('stamp-')) {
      const section = visibilityKey.slice('stamp-'.length);
      const stamps = ((lib.sectionStamps as Record<string, string> | undefined) ?? {});
      lib.sectionStamps = { ...stamps, [section]: newUrl };
    } else if (visibilityKey === 'footer-bouquet') {
      lib.footerBouquet = newUrl;
    } else if (visibilityKey.startsWith('divider')) {
      lib.divider = newUrl;
    } else if (visibilityKey === 'confetti') {
      lib.confetti = newUrl;
    } else if (visibilityKey === 'flourish' || kind === 'flourish') {
      (next as unknown as { aiAccentUrl?: string }).aiAccentUrl = newUrl;
    } else if (kind === 'sticker') {
      // Stickers are positioned per-instance; treat the swap as a
      // patch to the global stickers map keyed by visibilityKey.
      const stickers = ((lib.stickers as Record<string, string> | undefined) ?? {});
      lib.stickers = { ...stickers, [visibilityKey]: newUrl };
    }
    (next as unknown as { decorLibrary?: Record<string, unknown> }).decorLibrary = lib;
    return next;
  }

  function pick(asset: DecorAsset) {
    if (!pending) return;
    onEditField((m) => applyDecorUrl(pending.visibilityKey, pending.kind, asset.url, m));
    setPending(null);
  }

  if (!pending) return null;

  return (
    <div
      role="dialog"
      aria-label="Swap art"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setPending(null); }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '84vh',
          background: 'var(--paper)',
          borderRadius: 16,
          boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
          fontFamily: 'var(--font-ui)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 20px 12px',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--peach-ink, #C6703D)',
                marginBottom: 4,
              }}
            >
              Swap art
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 20,
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              Pick a piece from your library
            </h2>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0 0', lineHeight: 1.45 }}>
              Replace this {pending.label ?? pending.kind} with any other piece on the site — uploads, AI marks, editorial scenes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPending(null)}
            aria-label="Close"
            style={{
              width: 30, height: 30,
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search uploads, dividers, stamps…"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'var(--cream-2, #F5EFE2)',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 20px' }}>
          {pending.url && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--cream-2, #F5EFE2)',
                border: '1px dashed var(--line)',
                borderRadius: 12,
                margin: '8px 0 18px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pending.url}
                alt=""
                style={{ width: 56, height: 56, objectFit: 'contain', background: 'var(--paper)', borderRadius: 8, padding: 4, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  Currently
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
                  {pending.label ?? pending.kind}
                </div>
              </div>
            </div>
          )}
          {groups.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'var(--ink-muted)',
                fontSize: 13,
                fontStyle: 'italic',
              }}
            >
              No matches. Try uploading a piece in the asset library.
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.kind} style={{ marginBottom: 22 }}>
                <h3
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-muted)',
                    margin: '0 0 10px',
                  }}
                >
                  {g.label}
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                    gap: 10,
                  }}
                >
                  {g.items.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pick(a)}
                      title={a.label}
                      style={{
                        aspectRatio: '1 / 1',
                        background: 'var(--cream, #FBF7EE)',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        padding: 10,
                        display: 'grid',
                        placeItems: 'center',
                        transition: 'transform 140ms ease, border-color 140ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--line)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.url}
                        alt={a.label}
                        loading="lazy"
                        decoding="async"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
