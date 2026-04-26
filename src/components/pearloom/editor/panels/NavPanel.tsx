'use client';

// ──────────────────────────────────────────────────────────────
// NavPanel — Inspector controls for the top nav.
//
// Two sections:
//   1. Nav layout — pick from 4 styles (classic / centered /
//      stacked / minimal). Each is a card with a tiny SVG preview.
//   2. Brand icon — pick from the asset library, upload your own,
//      or have Pear draw a custom one with gpt-image-2.
// ──────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import { NAV_ICON_LIBRARY } from '@/components/pearloom/assets/nav-icons';

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

const NAV_STYLES: Array<{
  id: string; label: string; description: string; preview: () => React.ReactNode;
}> = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Brand left, links right, RSVP at the end.',
    preview: () => (
      <svg viewBox="0 0 64 18" width="100%" height="100%">
        <circle cx="6" cy="9" r="2.5" fill="#5C6B3F" />
        <text x="11" y="11.5" fontFamily="serif" fontSize="4.5" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
        {[34, 41, 48].map((x) => <line key={x} x1={x - 2} y1="9" x2={x + 2} y2="9" stroke="#6F6557" strokeWidth="0.6" />)}
        <rect x="55" y="6.5" width="7" height="5" rx="2.5" fill="#0E0D0B" />
      </svg>
    ),
  },
  {
    id: 'centered',
    label: 'Centered',
    description: 'Brand at the centre, links split left and right.',
    preview: () => (
      <svg viewBox="0 0 64 18" width="100%" height="100%">
        {[6, 13, 20].map((x) => <line key={x} x1={x - 2} y1="9" x2={x + 2} y2="9" stroke="#6F6557" strokeWidth="0.6" />)}
        <circle cx="29" cy="9" r="2.5" fill="#5C6B3F" />
        <text x="33" y="11.5" fontFamily="serif" fontSize="4.5" fontStyle="italic" fill="#0E0D0B">Anna</text>
        {[44, 51, 58].map((x) => <line key={x} x1={x - 2} y1="9" x2={x + 2} y2="9" stroke="#6F6557" strokeWidth="0.6" />)}
      </svg>
    ),
  },
  {
    id: 'stacked',
    label: 'Stacked',
    description: 'Brand on top, links centred underneath. Editorial.',
    preview: () => (
      <svg viewBox="0 0 64 18" width="100%" height="100%">
        <circle cx="6" cy="6" r="2.5" fill="#5C6B3F" />
        <text x="11" y="8" fontFamily="serif" fontSize="4.5" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
        <rect x="54" y="3" width="7" height="5" rx="2.5" fill="#0E0D0B" />
        <line x1="2" y1="11" x2="62" y2="11" stroke="#6F6557" strokeWidth="0.3" />
        {[20, 28, 36, 44].map((x) => <line key={x} x1={x - 2} y1="14.5" x2={x + 2} y2="14.5" stroke="#6F6557" strokeWidth="0.6" />)}
      </svg>
    ),
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Brand only — no inline links. Magazine-cover quiet.',
    preview: () => (
      <svg viewBox="0 0 64 18" width="100%" height="100%">
        <circle cx="6" cy="9" r="2.5" fill="#5C6B3F" />
        <text x="11" y="11.5" fontFamily="serif" fontSize="4.5" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
        <rect x="55" y="6.5" width="7" height="5" rx="2.5" fill="#0E0D0B" />
      </svg>
    ),
  },
];

export function NavPanel({ manifest, onChange }: Props) {
  const navCfg = manifest.nav ?? {};
  const activeStyle = navCfg.style ?? 'classic';
  const iconCfg = navCfg.icon ?? {};
  const iconKind = iconCfg.kind ?? 'pear';
  const activeAssetId = iconCfg.assetId ?? 'pear';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function setNav(next: Partial<NonNullable<StoryManifest['nav']>>) {
    onChange({
      ...manifest,
      nav: { ...(manifest.nav ?? {}), ...next },
    });
  }

  function pickStyle(id: string) {
    setNav({ style: id });
  }

  function pickAsset(assetId: string) {
    setNav({ icon: { kind: 'asset', assetId } });
  }

  function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setAiError('Brand icon must be an image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAiError('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNav({ icon: { kind: 'image', imageUrl: dataUrl } });
      setAiError(null);
    };
    reader.readAsDataURL(file);
  }

  async function generateAi() {
    if (!aiPrompt.trim()) {
      setAiError('Describe what you want Pear to draw.');
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
      const theme = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
      const paletteHex = theme
        ? ([theme.background, theme.accent, theme.accentLight, theme.foreground, theme.muted].filter(Boolean) as string[])
        : undefined;
      const siteId = (manifest as unknown as { subdomain?: string }).subdomain ?? 'preview';
      // Reuse /api/decor/sticker — same single-subject + transparent
      // pipeline. The hint becomes a logomark request.
      const res = await fetch('/api/decor/sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, occasion, paletteHex,
          hint: `A small monochrome logomark for the top nav: ${aiPrompt.trim()}. Single shape, fits inside a 28px circle, hand-drawn ink.`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Gen failed (${res.status})`);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error('No icon URL returned');
      setNav({ icon: { kind: 'ai', imageUrl: data.url } });
      setAiPrompt('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Icon generation failed');
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div>
      <PanelSection label="Nav layout" hint="How the top nav composes its brand + links.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {NAV_STYLES.map((s) => {
            const active = s.id === activeStyle;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickStyle(s.id)}
                title={s.description}
                style={{
                  background: 'transparent',
                  border: active ? '1.5px solid var(--ink)' : '1px solid var(--line-soft)',
                  borderRadius: 8, overflow: 'hidden',
                  cursor: 'pointer', padding: 0, color: 'var(--ink)',
                  display: 'flex', flexDirection: 'column', textAlign: 'left',
                }}
              >
                <div style={{ width: '100%', aspectRatio: '64/18', background: 'var(--cream-2)', borderBottom: '1px solid var(--line-soft)' }}>
                  {s.preview()}
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-muted)', lineHeight: 1.3 }}>{s.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection label="Brand icon" hint="The little glyph next to your names.">
        {/* Asset library */}
        <div
          style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-muted)',
            marginBottom: 6,
          }}
        >
          From the library
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
          {NAV_ICON_LIBRARY.map((a) => {
            const active = iconKind === 'asset' ? a.id === activeAssetId : a.id === 'pear' && iconKind === 'pear';
            const C = a.Component;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => pickAsset(a.id)}
                title={a.description ?? a.label}
                aria-label={a.label}
                style={{
                  aspectRatio: '1/1',
                  background: 'var(--cream-2)',
                  border: active ? '1.5px solid var(--ink)' : '1px solid var(--line-soft)',
                  borderRadius: 8, cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--ink)',
                }}
              >
                <C size={22} />
              </button>
            );
          })}
        </div>

        {/* Custom uploaded image */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-outline btn-sm"
            style={{ flex: 1 }}
          >
            Upload your own image
          </button>
          {(iconKind === 'image' || iconKind === 'ai') && iconCfg.imageUrl && (
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: `url(${iconCfg.imageUrl}) center/contain no-repeat var(--cream-2)`,
                border: '1.5px solid var(--ink)',
              }}
            />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />

        {/* AI generation */}
        <div
          style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-muted)',
            marginBottom: 6,
          }}
        >
          Have Pear draw one
        </div>
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g. a sprig of olive, hand-drawn"
          disabled={aiBusy}
          style={{
            width: '100%', padding: '8px 10px',
            borderRadius: 8, border: '1px solid var(--line-soft)',
            background: 'var(--card)', fontSize: 13, color: 'var(--ink)',
            marginBottom: 6,
          }}
        />
        <button
          type="button"
          onClick={generateAi}
          disabled={aiBusy}
          className="btn btn-outline btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {aiBusy ? 'Drafting…' : 'Draft an icon'}
        </button>
        {aiError && (
          <div role="alert" style={{ marginTop: 8, fontSize: 12, color: '#7A2D2D' }}>{aiError}</div>
        )}
      </PanelSection>
    </div>
  );
}
