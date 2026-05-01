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
import { SEPARATOR_PRESETS } from '@/lib/separator-presets';
import { IconifyBrowser } from './IconifyBrowser';

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

// Encode an inline SVG as a data URI so it slots into the picker
// the same way uploads + AI marks do. Keeps the rest of the
// decor pipeline single-shape — every asset is "URL", never
// "name + render-via-component".
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Bundled baseline — a small library that ships even when the
// host has never generated AI decor. Without this, the swap
// modal showed an empty list for "dividers" / "flourishes" /
// "accents" on every fresh site, which is what the host hit.
const BUNDLED_DIVIDERS: DecorAsset[] = SEPARATOR_PRESETS.map((p) => ({
  id: `bundled-divider-${p.id}`,
  url: svgToDataUri(p.svg.replace(/currentColor/g, '#5C6B3F')),
  kind: 'divider',
  label: p.label,
}));

const BUNDLED_ACCENTS: DecorAsset[] = [
  {
    id: 'bundled-accent-leaf',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 6 C 18 24, 18 40, 32 58 C 46 40, 46 24, 32 6 Z M 32 12 L 32 56" fill="none" stroke="#5C6B3F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`),
    kind: 'accent',
    label: 'Single leaf',
  },
  {
    id: 'bundled-accent-sprig',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="#5C6B3F" stroke-width="1.4" stroke-linecap="round"><path d="M32 6 L 32 58"/><path d="M32 18 Q 22 16 18 24"/><path d="M32 28 Q 42 26 46 34"/><path d="M32 38 Q 22 36 18 44"/><path d="M32 48 Q 42 46 46 54"/></g></svg>`),
    kind: 'accent',
    label: 'Olive sprig',
  },
  {
    id: 'bundled-accent-ring',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="none" stroke="#C6703D" stroke-width="1.4"/><circle cx="32" cy="32" r="14" fill="none" stroke="#5C6B3F" stroke-width="1"/></svg>`),
    kind: 'accent',
    label: 'Twin ring',
  },
  {
    id: 'bundled-accent-asterism',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="#C6703D"><polygon points="32,12 33.5,18 40,20 33.5,22 32,28 30.5,22 24,20 30.5,18"/><polygon points="20,40 21,44 25,45 21,46 20,50 19,46 15,45 19,44"/><polygon points="44,40 45,44 49,45 45,46 44,50 43,46 39,45 43,44"/></g></svg>`),
    kind: 'accent',
    label: 'Asterism',
  },
];

const BUNDLED_FOOTERS: DecorAsset[] = [
  {
    id: 'bundled-footer-bouquet',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><g fill="none" stroke="#5C6B3F" stroke-width="1.4" stroke-linecap="round"><path d="M100 220 L 100 80" /><path d="M100 80 Q 60 60 50 100" /><path d="M100 80 Q 140 60 150 100" /><path d="M100 110 Q 70 100 60 130" /><path d="M100 110 Q 130 100 140 130" /></g><g fill="#C6703D"><circle cx="100" cy="60" r="14"/><circle cx="60" cy="80" r="10"/><circle cx="140" cy="80" r="10"/><circle cx="80" cy="120" r="8"/><circle cx="120" cy="120" r="8"/></g></svg>`),
    kind: 'footer',
    label: 'Bouquet',
  },
  {
    id: 'bundled-footer-wreath',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><g fill="none" stroke="#5C6B3F" stroke-width="1.5" stroke-linecap="round"><circle cx="100" cy="120" r="80"/><path d="M30 110 Q 40 100 50 110"/><path d="M150 110 Q 160 100 170 110"/><path d="M30 130 Q 40 140 50 130"/><path d="M150 130 Q 160 140 170 130"/><path d="M90 50 Q 100 40 110 50"/><path d="M90 200 Q 100 190 110 200"/></g></svg>`),
    kind: 'footer',
    label: 'Wreath',
  },
  {
    id: 'bundled-footer-rule',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><g fill="none" stroke="#5C6B3F" stroke-width="0.8" stroke-linecap="round"><line x1="20" y1="40" x2="80" y2="40"/><line x1="120" y1="40" x2="180" y2="40"/></g><g fill="#C6703D"><circle cx="100" cy="40" r="3"/><circle cx="90" cy="40" r="1.5"/><circle cx="110" cy="40" r="1.5"/></g></svg>`),
    kind: 'footer',
    label: 'Editorial rule',
  },
];

const BUNDLED_CONFETTI: DecorAsset[] = [
  {
    id: 'bundled-confetti-petals',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><g fill="#C6703D"><ellipse cx="20" cy="40" rx="6" ry="3" transform="rotate(-30 20 40)"/><ellipse cx="80" cy="20" rx="6" ry="3" transform="rotate(15 80 20)"/><ellipse cx="120" cy="60" rx="6" ry="3" transform="rotate(45 120 60)"/></g><g fill="#5C6B3F"><ellipse cx="50" cy="60" rx="6" ry="3" transform="rotate(-10 50 60)"/><ellipse cx="160" cy="30" rx="6" ry="3" transform="rotate(60 160 30)"/></g></svg>`),
    kind: 'confetti',
    label: 'Petals',
  },
  {
    id: 'bundled-confetti-stars',
    url: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><g fill="#C6703D"><polygon points="20,30 22,36 28,38 22,40 20,46 18,40 12,38 18,36"/><polygon points="100,20 102,26 108,28 102,30 100,36 98,30 92,28 98,26"/><polygon points="170,40 172,46 178,48 172,50 170,56 168,50 162,48 168,46"/></g><g fill="#5C6B3F"><polygon points="60,55 62,60 67,62 62,64 60,69 58,64 53,62 58,60"/><polygon points="140,55 142,60 147,62 142,64 140,69 138,64 133,62 138,60"/></g></svg>`),
    kind: 'confetti',
    label: 'Star burst',
  },
];

export function DecorSwapModal({ manifest, onEditField }: Props) {
  const [pending, setPending] = useState<SwapEvent | null>(null);
  const [query, setQuery] = useState('');
  // Two tabs: "Library" (bundled baseline + uploads + AI marks) and
  // "Browse more" (Iconify long-tail). The library tab is the default
  // since hosts who haven't generated AI decor still need somewhere
  // to start — that was the "modal is empty" bug.
  const [mode, setMode] = useState<'library' | 'iconify'>('library');

  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<SwapEvent>).detail;
      if (!detail) return;
      setPending(detail);
      setQuery('');
      setMode('library');
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

  // Merge the host's AI decor + uploads with the bundled baseline.
  // Bundled items appear *after* user-generated ones so the host's
  // own work is the first thing they see — but they're never empty.
  const decorAssets = useMemo(() => {
    const userAssets = flattenDecorAssets(manifest);
    return [
      ...userAssets,
      ...BUNDLED_DIVIDERS,
      ...BUNDLED_ACCENTS,
      ...BUNDLED_FOOTERS,
      ...BUNDLED_CONFETTI,
    ];
  }, [manifest]);
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
      aria-modal="true"
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

        {/* Mode tabs — Library (curated bundled set + uploads + AI
            marks) vs. Browse more (Iconify long-tail). The "modal
            looked empty" bug was that without AI generation, the
            library showed nothing — bundled assets fix that. */}
        <div
          role="tablist"
          aria-label="Picker mode"
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 20px 0',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          {(['library', 'iconify'] as const).map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMode(m)}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: on
                    ? '2px solid var(--peach-ink, #C6703D)'
                    : '2px solid transparent',
                  color: on ? 'var(--ink)' : 'var(--ink-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  marginBottom: -1,
                }}
              >
                {m === 'library' ? 'Library' : 'Browse more'}
              </button>
            );
          })}
        </div>

        {mode === 'library' && (
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
        )}

        {mode === 'iconify' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <IconifyBrowser
              onPick={(dataUrl) => {
                if (!pending) return;
                onEditField((m) => applyDecorUrl(pending.visibilityKey, pending.kind, dataUrl, m));
                setPending(null);
              }}
            />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
