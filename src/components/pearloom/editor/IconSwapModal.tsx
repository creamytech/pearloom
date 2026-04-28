'use client';

// ─────────────────────────────────────────────────────────────
// IconSwapModal — listens for pearloom:icon-swap events from
// EditableIcon / IconDropTarget. Surfaces the host's full asset
// library (AI decor + uploads + editorial icons + standard
// icons) as a single picker so a click on any canvas icon can
// swap to any visual the site already has.
//
// Two override flavours share the same iconOverrides record:
//   • motif name (e.g. "leaf", "sparkles")  → renders via the
//     SVG switch in motifs.tsx
//   • URL / data URI                          → motifs.tsx
//     detects the prefix and renders <img>
//
// Mirrors the AssetLibraryPanel's DecorTab structure so the
// click-to-swap surface and the rail-docked browser stay in
// lockstep — pick from one and the other updates immediately.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import {
  ICON_LIBRARY,
  flattenDecorAssets,
  type DecorAsset,
} from './asset-library-data';
import { EDITORIAL_GROUPS } from '../editorial-icons';

interface SwapEvent {
  purpose: string;
  currentName: string;
}

interface Props {
  manifest: StoryManifest;
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
}

const DECOR_GROUP_LABELS: Record<DecorAsset['kind'], string> = {
  upload: 'Your uploads',
  stamp: 'Section stamps',
  divider: 'Dividers',
  confetti: 'Confetti',
  footer: 'Closing flourish',
  accent: 'Hero accents',
  invite: 'Invite scenes',
};

const DECOR_GROUP_ORDER: DecorAsset['kind'][] = [
  'upload', 'stamp', 'divider', 'confetti', 'footer', 'accent', 'invite',
];

export function IconSwapModal({ manifest, onEditField }: Props) {
  const [pending, setPending] = useState<SwapEvent | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<SwapEvent>).detail;
      if (!detail) return;
      setPending(detail);
      setQuery('');
    }
    window.addEventListener('pearloom:icon-swap', onEvt);
    return () => window.removeEventListener('pearloom:icon-swap', onEvt);
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPending(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  // Same flatten logic as the rail-docked AssetLibraryPanel so
  // every AI-generated mark + upload shows up here too.
  const decorAssets = useMemo(() => flattenDecorAssets(manifest), [manifest]);

  const lower = query.trim().toLowerCase();
  const filterName = (n: string, label?: string) =>
    !lower ? true : n.toLowerCase().includes(lower) || (label ?? '').toLowerCase().includes(lower);

  const filteredDecor = useMemo(() => {
    if (!lower) return decorAssets;
    return decorAssets.filter(
      (a) => a.label.toLowerCase().includes(lower) || (a.usage ?? '').toLowerCase().includes(lower),
    );
  }, [decorAssets, lower]);

  const decorGroups = DECOR_GROUP_ORDER
    .map((kind) => ({ kind, label: DECOR_GROUP_LABELS[kind], items: filteredDecor.filter((a) => a.kind === kind) }))
    .filter((g) => g.items.length > 0);

  const editorialIconGroups = EDITORIAL_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((d) => filterName(d.name, d.label)),
  })).filter((g) => g.items.length > 0);

  const stdIconGroups = ICON_LIBRARY.map((g) => ({
    ...g,
    matches: g.names.filter((n) => filterName(n)),
  })).filter((g) => g.matches.length > 0);

  function pick(value: string) {
    if (!pending) return;
    onEditField((m) => {
      const cur = (m as unknown as { iconOverrides?: Record<string, string> }).iconOverrides ?? {};
      return { ...m, iconOverrides: { ...cur, [pending.purpose]: value } } as StoryManifest;
    });
    setPending(null);
  }

  function clearOverride() {
    if (!pending) return;
    onEditField((m) => {
      const cur = (m as unknown as { iconOverrides?: Record<string, string> }).iconOverrides ?? {};
      const next = { ...cur };
      delete next[pending.purpose];
      return { ...m, iconOverrides: next } as StoryManifest;
    });
    setPending(null);
  }

  if (!pending) return null;

  const hasAnyMatch = decorGroups.length > 0 || editorialIconGroups.length > 0 || stdIconGroups.length > 0;
  const overridden = pending.currentName !== pending.purpose;

  return (
    <div
      role="dialog"
      aria-label="Swap icon"
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
        {/* Header */}
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
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 4 }}>
              Swap visual
            </div>
            <h2 className="display" style={{ fontSize: 20, margin: 0 }}>
              Pick from your asset library
            </h2>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0 0', lineHeight: 1.45 }}>
              Choose an AI decor mark, an editorial icon, or a standard glyph — applies to every <code style={codeStyle}>{pending.purpose}</code> on the site.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {overridden && (
              <button
                type="button"
                onClick={clearOverride}
                title="Reset to the default icon"
                style={{
                  height: 28,
                  padding: '0 12px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: '1.5px solid var(--line)',
                  color: 'var(--ink-soft)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-ui)',
                  whiteSpace: 'nowrap',
                }}
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label="Close"
              style={{
                width: 28, height: 28, borderRadius: 999,
                background: 'transparent',
                border: '1.5px solid var(--line)',
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decor, icons, or labels"
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--line-soft)',
              background: 'var(--card)',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              outline: 'none',
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!hasAnyMatch ? (
            <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: 32, fontSize: 13 }}>
              No matches for &quot;{query}&quot;.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* AI decor + uploads — surfaces first because these
                  are the highest-effort assets the host has already
                  invested in. */}
              {decorGroups.length > 0 && (
                <Section title="AI decor + uploads" titleColor="var(--peach-ink, #C6703D)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {decorGroups.map((g) => (
                      <SubSection key={g.kind} label={g.label} count={g.items.length}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                          {g.items.map((a) => (
                            <DecorPickTile
                              key={a.id}
                              asset={a}
                              active={pending.currentName === a.url}
                              onPick={() => pick(a.url)}
                            />
                          ))}
                        </div>
                      </SubSection>
                    ))}
                  </div>
                </Section>
              )}

              {/* Editorial icons */}
              {editorialIconGroups.length > 0 && (
                <Section title="Editorial icons" titleColor="var(--peach-ink, #C6703D)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {editorialIconGroups.map((g) => (
                      <SubSection key={g.key} label={g.label} count={g.items.length}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 6 }}>
                          {g.items.map((d) => (
                            <IconPickTile
                              key={d.name}
                              name={d.name}
                              label={d.label}
                              active={pending.currentName === d.name}
                              onPick={() => pick(d.name)}
                            />
                          ))}
                        </div>
                      </SubSection>
                    ))}
                  </div>
                </Section>
              )}

              {/* Standard icons */}
              {stdIconGroups.length > 0 && (
                <Section title="Standard icons">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {stdIconGroups.map((g) => (
                      <SubSection key={g.group} label={g.group} count={g.matches.length}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 6 }}>
                          {g.matches.map((n) => (
                            <IconPickTile
                              key={n}
                              name={n}
                              active={pending.currentName === n}
                              onPick={() => pick(n)}
                            />
                          ))}
                        </div>
                      </SubSection>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const codeStyle: React.CSSProperties = {
  background: 'var(--cream-2)',
  padding: '1px 6px',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  color: 'var(--ink)',
};

function Section({
  title,
  titleColor = 'var(--ink-muted)',
  children,
}: {
  title: string;
  titleColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: titleColor,
          marginBottom: 10,
          padding: '0 4px',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SubSection({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          marginBottom: 6,
          padding: '0 4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.65 }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function DecorPickTile({
  asset,
  active,
  onPick,
}: {
  asset: DecorAsset;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={asset.usage ? `${asset.label} — in use: ${asset.usage}` : asset.label}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--card)',
        cursor: 'pointer',
        padding: 0,
        border: active
          ? '1.5px solid var(--ink)'
          : asset.usage
            ? '1.5px solid var(--peach-ink, #C6703D)'
            : '1px solid var(--line-soft)',
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 18px -8px rgba(14,13,11,0.32)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${asset.url})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: 'var(--cream-2)',
          mixBlendMode: 'multiply',
        }}
      />
      <div
        style={{
          padding: '4px 6px',
          fontSize: 9.5,
          fontWeight: 700,
          color: asset.usage ? 'var(--peach-ink, #C6703D)' : 'var(--ink-soft)',
          background: asset.usage ? 'rgba(198,112,61,0.08)' : 'transparent',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {asset.label}
      </div>
    </button>
  );
}

function IconPickTile({
  name,
  label,
  active,
  onPick,
}: {
  name: string;
  label?: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={label ?? name}
      style={{
        aspectRatio: '1 / 1',
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: active ? 'var(--cream-2)' : 'var(--card)',
        border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
        cursor: 'pointer',
        color: 'var(--ink)',
        transition: 'background 160ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <Icon name={name} size={20} />
    </button>
  );
}
