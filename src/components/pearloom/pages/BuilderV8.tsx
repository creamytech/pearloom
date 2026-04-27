'use client';

/* ========================================================================
   PEARLOOM — SITE BUILDER (v8 handoff port)
   Three-panel shell: outline / live preview iframe / style panel.
   Wired to /api/sites for save-draft + publish.
   ======================================================================== */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Blob, Icon, Pear, PearloomLogo, PhotoPlaceholder, Sparkle, Squiggle } from '../motifs';
import type { StoryManifest } from '@/types';
import { buildSitePath, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

type DeviceKey = 'desktop' | 'tablet' | 'phone';
type BlockKey =
  | 'hero'
  | 'story'
  | 'timeline'
  | 'schedule'
  | 'registry'
  | 'gallery'
  | 'rsvp';

const DEFAULT_PAGES = ['Home', 'Our Story', 'Schedule', 'Registry', 'Gallery', 'RSVP', 'Footer'] as const;

const ALL_BLOCKS: Array<{ key: BlockKey; label: string; icon: string }> = [
  { key: 'hero', label: 'Hero', icon: 'image' },
  { key: 'story', label: 'Our Story', icon: 'text' },
  { key: 'timeline', label: 'Timeline', icon: 'clock' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar' },
  { key: 'registry', label: 'Registry', icon: 'gift' },
  { key: 'gallery', label: 'Gallery', icon: 'gallery' },
  { key: 'rsvp', label: 'RSVP', icon: 'mail' },
];

const PALETTES = [
  { id: 'groovy-garden', name: 'Groovy Garden', colors: ['#3D4A1F', '#8B9C5A', '#C4B5D9', '#F3E9D4', '#2A3512', '#D7CCE5'] },
  { id: 'dusk-meadow', name: 'Dusk Meadow', colors: ['#6B5A8C', '#B7A4D0', '#CBD29E', '#F3E9D4', '#4A3F6B', '#D7CCE5'] },
  { id: 'warm-linen', name: 'Warm Linen', colors: ['#8B4720', '#EAB286', '#F7DDC2', '#F3E9D4', '#C6703D', '#FBE8D6'] },
  { id: 'olive-gold', name: 'Olive & Gold', colors: ['#3D4A1F', '#6d7d3f', '#D4A95D', '#F3E9D4', '#B89244', '#CBD29E'] },
];

const MOTIFS = [
  { id: 'pear', name: 'Pear Stamps', icon: <Pear size={24} tone="sage" shadow={false} /> },
  { id: 'squiggle', name: 'Loop Lines', icon: <Squiggle variant={1} width={40} height={16} /> },
  { id: 'blob', name: 'Soft Shapes', icon: <Blob tone="lavender" size={32} /> },
];

const SPACING = ['Cozy', 'Comfortable', 'Spacious'] as const;

const IMAGERY = [
  { id: 'warm', name: 'Natural & warm' },
  { id: 'cream', name: 'Soft contrast' },
  { id: 'sage', name: 'Airy & light' },
] as const;

function safeJson<T>(v: unknown, fallback: T): T {
  try {
    return (v as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function BuilderV8({
  manifest: initialManifest,
  siteSlug,
  names,
  demoMode = false,
  previewPathOverride,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
  demoMode?: boolean;
  /** Optional override for the preview iframe src (absolute or rooted path). */
  previewPathOverride?: string;
}) {
  const router = useRouter();
  const [manifest, setManifest] = useState<StoryManifest>(initialManifest);
  const [device, setDevice] = useState<DeviceKey>('desktop');
  const [tab, setTab] = useState<'Style' | 'Settings'>('Style');
  const [activePage, setActivePage] = useState<string>('Home');
  const [activeBlock, setActiveBlock] = useState<BlockKey>('hero');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewFailed, setPreviewFailed] = useState(demoMode);

  // Probe the preview URL once on mount — if it 404s, skip the iframe entirely.
  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    // Probe the canonical path once. The proxy rewrites this internally
    // so /sites/{slug} also resolves, but probing the canonical URL
    // matches what the iframe will actually request.
    const probe = previewPathOverride
      ?? buildSitePath(
        siteSlug,
        '',
        (manifest as unknown as { occasion?: string }).occasion,
      );
    fetch(probe)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setPreviewFailed(true);
          return;
        }
        const text = await r.text();
        // A Next.js not-found page includes "404" in the response body; an
        // empty / stub site renders as a sparse shell. If we find either,
        // skip the iframe and show the friendly fallback.
        if (text.includes('This page could not be found') || text.length < 800) {
          setPreviewFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [siteSlug, demoMode, previewPathOverride]);

  // Derived theme fields from manifest (defaults fall back to Groovy Garden)
  const themeName = safeJson<string>(
    (manifest as unknown as { themeName?: string }).themeName,
    'Groovy Garden',
  );
  const palette = safeJson<string>(
    (manifest as unknown as { palette?: string }).palette,
    PALETTES[0].id,
  );
  const motif = safeJson<string>(
    (manifest as unknown as { motif?: string }).motif,
    'pear',
  );
  const spacing = safeJson<string>(
    (manifest as unknown as { spacing?: string }).spacing,
    'Comfortable',
  );
  const imagery = safeJson<string>(
    (manifest as unknown as { imagery?: string }).imagery,
    'warm',
  );

  const displayNames = useMemo(() => names.filter(Boolean).join(' & ') || siteSlug, [names, siteSlug]);
  const occasion = useMemo(() => {
    const raw = (manifest as unknown as { occasion?: string }).occasion;
    return normalizeOccasion(raw);
  }, [manifest]);
  const prettyPath = useMemo(
    () => previewPathOverride ?? buildSitePath(siteSlug, '', occasion),
    [siteSlug, occasion, previewPathOverride],
  );
  const prettyUrl = useMemo(() => formatSiteDisplayUrl(siteSlug, '', occasion), [siteSlug, occasion]);

  const deviceWidth: Record<DeviceKey, number> = { desktop: 1200, tablet: 900, phone: 390 };
  const previewW = deviceWidth[device];

  async function saveManifest(next: StoryManifest) {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug, manifest: next, names }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
      iframeRef.current?.contentWindow?.location.reload();
    } catch {
      setSaveStatus('error');
    }
  }

  function updateManifest(patch: Record<string, unknown>) {
    const next = { ...manifest, ...patch } as StoryManifest;
    setManifest(next);
    void saveManifest(next);
  }

  async function handlePublish() {
    const next = { ...manifest, published: true } as StoryManifest;
    setManifest(next);
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug, manifest: next, names, published: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaveStatus('saved');
      window.open(prettyPath, '_blank');
      setTimeout(() => setSaveStatus('idle'), 1800);
    } catch {
      setSaveStatus('error');
    }
  }

  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <BuilderTopbar
        displayNames={displayNames}
        prettyUrl={prettyUrl}
        prettyPath={prettyPath}
        device={device}
        setDevice={setDevice}
        saveStatus={saveStatus}
        onSaveDraft={() => void saveManifest(manifest)}
        onPublish={() => void handlePublish()}
      />
      <div className="pl8-builder-main" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SiteOutline
          activePage={activePage}
          setActivePage={setActivePage}
          activeBlock={activeBlock}
          setActiveBlock={setActiveBlock}
        />

        {/* Center — live preview */}
        <div
          className="pl8-builder-preview"
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            padding: 24,
            background: 'var(--cream-2)',
            display: 'grid',
            placeItems: 'start center',
          }}
        >
          <div
            style={{
              width: previewW,
              maxWidth: '100%',
              background: 'var(--paper)',
              borderRadius: 20,
              border: '1px solid var(--card-ring)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              transition: 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {previewFailed ? (
              <BuilderPreviewFallback names={displayNames} prettyUrl={prettyUrl} />
            ) : (
              <iframe
                ref={iframeRef}
                title="Live site preview"
                src={prettyPath}
                onLoad={() => {
                  // If the loaded document is a "site not found" marker, fall back.
                  try {
                    const doc = iframeRef.current?.contentDocument;
                    if (!doc) return;
                    const title = doc.title || '';
                    if (title.includes('not found') || title.includes('404')) setPreviewFailed(true);
                  } catch {
                    /* cross-origin — ignore */
                  }
                }}
                onError={() => setPreviewFailed(true)}
                style={{ width: '100%', height: 'calc(100vh - 180px)', border: 0, display: 'block', background: 'var(--paper)' }}
              />
            )}
          </div>
          <div
            style={{
              marginTop: 10,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12.5,
            }}
          >
            <Sparkle size={12} />
            <span style={{ fontWeight: 600 }}>Live preview · {displayNames}</span>
            <span style={{ color: 'var(--ink-muted)' }}>{prettyUrl}</span>
            <Link href={prettyPath} target="_blank" className="btn btn-ghost btn-sm">
              <Icon name="eye" size={12} /> Open
            </Link>
          </div>
        </div>

        <StylePanel
          tab={tab}
          setTab={setTab}
          themeName={themeName}
          palette={palette}
          motif={motif}
          spacing={spacing}
          imagery={imagery}
          prettyUrl={prettyUrl}
          onUpdate={updateManifest}
        />
      </div>
    </div>
  );
}

function BuilderTopbar({
  displayNames,
  prettyUrl,
  prettyPath,
  device,
  setDevice,
  saveStatus,
  onSaveDraft,
  onPublish,
}: {
  displayNames: string;
  prettyUrl: string;
  prettyPath: string;
  device: DeviceKey;
  setDevice: (d: DeviceKey) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  return (
    <div
      className="pl8-builder-topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 24px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        flexWrap: 'wrap',
      }}
    >
      <Link href="/">
        <PearloomLogo />
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {displayNames}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {prettyUrl}
          <span
            className="pill"
            style={{ padding: '1px 8px', fontSize: 10, background: 'var(--sage-deep)', color: 'var(--cream)', border: 'none' }}
          >
            Editing
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          margin: '0 auto',
          padding: 4,
          background: 'var(--cream-2)',
          borderRadius: 10,
        }}
      >
        {(['desktop', 'tablet', 'phone'] as const).map((name) => {
          const on = device === name;
          return (
            <button
              key={name}
              onClick={() => setDevice(name)}
              aria-pressed={on}
              aria-label={name}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: 0,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name={name} size={14} />
            </button>
          );
        })}
      </div>

      <span
        style={{
          fontSize: 11.5,
          color:
            saveStatus === 'saving'
              ? 'var(--ink-muted)'
              : saveStatus === 'saved'
                ? 'var(--sage-deep)'
                : saveStatus === 'error'
                  ? '#7A2D2D'
                  : 'var(--ink-muted)',
          fontWeight: 600,
          minWidth: 70,
          textAlign: 'right',
        }}
      >
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Save failed'}
      </span>
      <Link href={prettyPath} target="_blank" className="btn btn-outline btn-sm">
        <Icon name="eye" size={14} /> Preview
      </Link>
      <Link href="/dashboard" className="btn btn-outline btn-sm">
        <Icon name="grid" size={14} /> Dashboard
      </Link>
      <button type="button" className="btn btn-outline" onClick={onSaveDraft}>
        Save draft
      </button>
      <button type="button" className="btn btn-primary" onClick={onPublish}>
        Save &amp; publish <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

function SiteOutline({
  activePage,
  setActivePage,
  activeBlock,
  setActiveBlock,
}: {
  activePage: string;
  setActivePage: (p: string) => void;
  activeBlock: BlockKey;
  setActiveBlock: (b: BlockKey) => void;
}) {
  return (
    <aside
      className="pl8-builder-outline"
      style={{
        width: 260,
        flexShrink: 0,
        borderRight: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
      }}
    >
      <Link href="/dashboard" className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start' }}>
        <Icon name="arrow-left" size={14} /> Back to dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>Site outline</div>
        <button
          type="button"
          style={{ fontSize: 11, color: 'var(--ink-muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
        >
          + Add page
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {DEFAULT_PAGES.map((p) => {
          const on = activePage === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setActivePage(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                fontSize: 13,
                fontWeight: 500,
                textAlign: 'left',
                border: 0,
                cursor: 'pointer',
              }}
            >
              <Icon name={p === 'Home' ? 'home' : 'page'} size={14} />
              <span style={{ flex: 1 }}>{p}</span>
              <Icon name="eye" size={12} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>Home page blocks</div>
        <button
          type="button"
          style={{ fontSize: 11, color: 'var(--ink-muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
        >
          + Add block
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ALL_BLOCKS.map((b) => {
          const on = activeBlock === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setActiveBlock(b.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: on ? 'var(--lavender-bg)' : 'var(--card)',
                border: `1px solid ${on ? 'var(--lavender-2)' : 'var(--line-soft)'}`,
                fontSize: 12.5,
                fontWeight: 500,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <Icon name="drag" size={14} color="var(--ink-muted)" />
              <Icon name={b.icon} size={14} />
              <span style={{ flex: 1 }}>{b.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        style={{
          padding: 10,
          borderRadius: 10,
          border: '1.5px dashed var(--line)',
          background: 'transparent',
          fontSize: 13,
          color: 'var(--ink-soft)',
          cursor: 'pointer',
        }}
      >
        + Add new block
      </button>

      <div
        style={{
          background: 'var(--lavender-bg)',
          borderRadius: 14,
          padding: 14,
          display: 'flex',
          gap: 10,
          marginTop: 'auto',
        }}
      >
        <Pear size={40} tone="sage" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 2 }}>
            Tip from Pear
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            Drag to reorder blocks. Your story flows best in the order you lived it.
          </div>
        </div>
      </div>
    </aside>
  );
}

function StylePanel({
  tab,
  setTab,
  themeName,
  palette,
  motif,
  spacing,
  imagery,
  prettyUrl,
  onUpdate,
}: {
  tab: 'Style' | 'Settings';
  setTab: (t: 'Style' | 'Settings') => void;
  themeName: string;
  palette: string;
  motif: string;
  spacing: string;
  imagery: string;
  prettyUrl: string;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const activePalette = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  return (
    <aside
      className="pl8-builder-style"
      style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', background: 'var(--cream-2)', borderRadius: 10, padding: 3 }}>
        {(['Style', 'Settings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: tab === t ? 'var(--ink)' : 'transparent',
              color: tab === t ? 'var(--cream)' : 'var(--ink)',
              border: 0,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Style' ? (
        <>
          <Section label="ACTIVE THEME">
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: 8,
                background: 'var(--card)',
                border: '1px solid var(--line-soft)',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #CBD29E, #F0C9A8, #C4B5D9)',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{themeName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>by Pearloom</div>
              </div>
              <Icon name="chev-right" size={14} />
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
              onClick={() => onUpdate({ themeName: 'Dusk Meadow', palette: 'dusk-meadow' })}
            >
              Change theme
            </button>
          </Section>

          <Section
            label="COLOR PALETTE"
            right={<span style={{ fontSize: 11, color: 'var(--lavender-ink)' }}>Edit</span>}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {activePalette.colors.map((c) => (
                <div
                  key={c}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: c,
                    border: '2px solid rgba(255,255,255,0.6)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUpdate({ palette: p.id, themeName: p.name })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: `1.5px solid ${palette === p.id ? 'var(--ink)' : 'var(--line)'}`,
                    background: palette === p.id ? 'var(--ink)' : 'transparent',
                    color: palette === p.id ? 'var(--cream)' : 'var(--ink)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Section>

          <Section label="MOTIF STYLE">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {MOTIFS.map((m) => {
                const on = motif === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onUpdate({ motif: m.id })}
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      background: on ? 'var(--sage-tint)' : 'var(--card)',
                      border: on ? '1.5px solid var(--sage-deep)' : '1.5px solid var(--line-soft)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ height: 30, display: 'grid', placeItems: 'center' }}>{m.icon}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600 }}>{m.name}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="SECTION SPACING">
            <div style={{ display: 'flex', gap: 6 }}>
              {SPACING.map((s) => {
                const on = spacing === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onUpdate({ spacing: s })}
                    className="chip"
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      background: on ? 'var(--peach-bg)' : 'var(--card)',
                      borderColor: on ? 'var(--peach-2)' : 'var(--line)',
                      color: on ? 'var(--peach-ink)' : 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="IMAGERY STYLE">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {IMAGERY.map((o) => {
                const on = imagery === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onUpdate({ imagery: o.id })}
                    style={{
                      padding: 6,
                      borderRadius: 10,
                      background: on ? 'var(--cream-2)' : 'var(--card)',
                      border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line-soft)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <PhotoPlaceholder tone={o.id} aspect="1/1" style={{ borderRadius: 6, marginBottom: 4 }} />
                    <div style={{ fontSize: 10, fontWeight: 600 }}>{o.name}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="TYPOGRAPHY">
            <div style={{ fontSize: 11, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>Headings</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                Fraunces <Icon name="chev-down" size={10} />
              </span>
            </div>
            <div style={{ fontSize: 11, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>Body</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                Inter <Icon name="chev-down" size={10} />
              </span>
            </div>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
              <span>Script</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                Caveat <Icon name="chev-down" size={10} />
              </span>
            </div>
          </Section>

          <div
            style={{
              background: 'var(--lavender-bg)',
              borderRadius: 14,
              padding: 12,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Pear size={38} tone="sage" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Try Pear Assistant <Sparkle size={10} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  Want a new color combo or motif? I&apos;ve got ideas.
                </div>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6 }}>
                  Ask Pear <Icon name="arrow-right" size={12} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          <Section label="DOMAIN">
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--card)',
                border: '1px solid var(--line-soft)',
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              Your celebration lives at <strong>pearloom.app</strong>. Add a custom domain from the dashboard.
            </div>
          </Section>
          <Section label="VISIBILITY">
            <button type="button" className="chip" style={{ background: 'var(--sage-tint)', color: 'var(--sage-deep)', border: 0 }}>
              <Icon name="eye" size={12} /> Only people with the link
            </button>
          </Section>
          <Section label="SHARE">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                if (typeof navigator === 'undefined') return;
                // prettyUrl is already host+occasion+slug — turn it
                // into a full URL by prefixing the current scheme.
                const fullUrl = `${window.location.protocol}//${prettyUrl}`;
                navigator.clipboard?.writeText(fullUrl).catch(() => {});
              }}
            >
              <Icon name="link" size={12} /> Copy share link
            </button>
          </Section>
        </div>
      )}
    </aside>
  );
}

function BuilderPreviewFallback({ names, prettyUrl }: { names: string; prettyUrl: string }) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: 520,
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'linear-gradient(155deg, var(--sage-tint), var(--peach-bg) 55%, var(--lavender-bg))',
        borderRadius: 16,
        gap: 16,
      }}
    >
      <Pear size={90} tone="sage" sparkle />
      <h2 className="display" style={{ fontSize: 42, margin: 0 }}>
        {names}
      </h2>
      <p className="display-italic" style={{ fontSize: 20, margin: 0, color: 'var(--ink-soft)' }}>
        a celebration in the making
      </p>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{prettyUrl}</div>
      <div
        style={{
          marginTop: 8,
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--ink-soft)',
          maxWidth: 420,
          lineHeight: 1.5,
        }}
      >
        Your site is saving, but isn&apos;t ready to preview yet. Keep editing on the right, and
        it&apos;ll come together as you go.
      </div>
    </div>
  );
}

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink-soft)' }}>
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}
