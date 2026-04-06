'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { lbl } from './editor-utils';
import { ColorPalettePanel } from './ColorPalettePanel';
import { ThemeSwitcher } from './ThemeSwitcher';
import FontPicker from '@/components/dashboard/FontPicker';
import { AssetPicker } from '@/components/asset-library/AssetPicker';
import { ArtManager } from './ArtManager';
import { SidebarSection } from './EditorSidebar';
import { DesignIcon } from '@/components/icons/EditorIcons';
import { VisualEffectsPanel } from './VisualEffectsPanel';
import { DesignAdvisor } from './DesignAdvisor';
import { AccessibilityAuditPanel } from './AccessibilityAuditPanel';
import type { StoryManifest, ThemeSchema } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

export function DesignPanel({ manifest, onChange, coupleNames }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; coupleNames?: [string, string] }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');

  const handleRegenerateDesign = async () => {
    setIsRegenerating(true);
    setRegenError('');
    try {
      const res = await fetch('/api/regenerate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString,
          coupleNames: coupleNames || ['Partner', 'Partner'],
          chapters: manifest.chapters?.map(c => ({
            title: c.title, subtitle: c.subtitle,
            mood: c.mood, location: c.location,
            description: c.description,
          })),
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { vibeSkin } = await res.json();
      handleThemeApply(vibeSkin);
    } catch (e) {
      setRegenError('Try again in a moment');
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const updateFonts = (heading: string, body: string) => {
    const newFonts = { heading, body };
    onChange({
      ...manifest,
      theme: { ...manifest.theme, fonts: newFonts },
      vibeSkin: manifest.vibeSkin ? {
        ...manifest.vibeSkin,
        fonts: { ...manifest.vibeSkin.fonts, ...newFonts },
      } : manifest.vibeSkin,
    });
  };

  const handleThemeApply = (newSkin: VibeSkin) => {
    onChange({
      ...manifest,
      vibeSkin: newSkin,
      theme: {
        ...manifest.theme,
        fonts: { heading: newSkin.fonts.heading, body: newSkin.fonts.body },
        colors: {
          ...manifest.theme.colors,
          background: newSkin.palette.background,
          foreground: newSkin.palette.foreground,
          accent: newSkin.palette.accent,
          muted: newSkin.palette.muted,
        },
      },
    });
  };

  const colors = manifest.theme?.colors || {};
  const vibeSkin = manifest.vibeSkin;
  const paletteColors = vibeSkin?.palette
    ? Object.values(vibeSkin.palette).slice(0, 5)
    : [colors.background, colors.foreground, colors.accent, colors.accentLight, colors.muted].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* ── Quick AI regenerate — prominent at top ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 12px', borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(163,177,138,0.06), rgba(196,169,106,0.04))',
        border: '1px solid rgba(163,177,138,0.2)',
      }}>
        {vibeSkin?.tone && (
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#A3B18A',
            background: 'rgba(163,177,138,0.15)', padding: '3px 10px', borderRadius: '100px',
            border: '1px solid rgba(163,177,138,0.2)', flexShrink: 0,
          }}>
            {vibeSkin.tone}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleRegenerateDesign}
          disabled={isRegenerating}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 12px', borderRadius: '100px',
            border: 'none',
            background: isRegenerating ? 'rgba(163,177,138,0.2)' : 'rgba(163,177,138,0.9)',
            color: isRegenerating ? 'var(--pl-ink-soft)' : '#fff',
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s',
            boxShadow: isRegenerating ? 'none' : '0 2px 8px rgba(163,177,138,0.3)',
          }}
        >
          {isRegenerating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <DesignIcon size={12} />}
          {isRegenerating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>
      {regenError && (
        <p style={{ fontSize: '0.78rem', color: '#e87a7a', marginTop: '-4px' }}>{regenError}</p>
      )}

      {/* ── Theme — presets ── */}
      <SidebarSection title="Theme" defaultOpen={true}>
        <ThemeSwitcher
          currentVibeSkin={manifest.vibeSkin ?? ({} as VibeSkin)}
          manifest={manifest}
          onApply={handleThemeApply}
        />
      </SidebarSection>

      {/* ── Colors — tweak individual colors or generate AI background art ── */}
      <SidebarSection title="Colors" defaultOpen={true}>
        <ColorPalettePanel manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Visual Effects (shaders, mesh, grain, etc.) — open by default ── */}
      <SidebarSection title="Visual Effects" defaultOpen>
        <VisualEffectsPanel
          effects={manifest.theme?.effects ?? {}}
          accentColor={manifest.theme?.colors?.accent}
          onChange={(effects: NonNullable<ThemeSchema['effects']>) => {
            onChange({
              ...manifest,
              theme: { ...manifest.theme, effects },
            });
          }}
        />
      </SidebarSection>

      {/* Typography — full font pair picker */}
      <SidebarSection title="Typography" defaultOpen={true}>
        <FontPicker
          currentHeading={manifest.theme?.fonts?.heading || 'Playfair Display'}
          currentBody={manifest.theme?.fonts?.body || 'Inter'}
          onChange={(heading, body) => updateFonts(heading, body)}
        />
      </SidebarSection>

      {/* AI Art Manager — hero, ambient, art strip */}
      <SidebarSection title="AI Art" defaultOpen={true}>
        {manifest.vibeSkin ? (
          <ArtManager
            manifest={manifest}
            coupleNames={coupleNames}
            onUpdate={(updates) => onChange({ ...manifest, ...updates })}
          />
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--pl-muted, #7A756E)', fontSize: '0.82rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>No AI art generated yet.</p>
            <button onClick={handleRegenerateDesign} style={{ padding: '0.5rem 1rem', borderRadius: '100px', background: 'var(--pl-olive, #A3B18A)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              Generate AI Art
            </button>
          </div>
        )}
      </SidebarSection>

      {/* Design Health — advisors collapsed at bottom */}
      <SidebarSection title="Design Health" defaultOpen={false}>
        <DesignAdvisor manifest={manifest} />
        <AccessibilityAuditPanel manifest={manifest} />
      </SidebarSection>

      {/* Asset Library */}
      <SidebarSection title="Asset Library" defaultOpen={true}>
        <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted, #7A756E)', marginBottom: '10px', lineHeight: 1.5 }}>
          Dividers, illustrations & accents to add to your pages.
        </p>
        <AssetPicker
          onSelect={(asset) => {
            // Store last-selected asset on manifest for canvas insertion
            onChange({ ...manifest, lastAsset: asset as StoryManifest['lastAsset'] });
          }}
          onAddSticker={(asset) => {
            const newSticker: import('@/types').StickerItem = {
              id: `sticker-${Date.now()}`,
              name: asset.name,
              type: asset.type as 'illustrations' | 'accents' | 'dividers',
              x: 20 + Math.random() * 60,
              y: 20 + Math.random() * 60,
              size: 80,
              rotation: (Math.random() * 30) - 15,
              opacity: 0.85,
            };
            onChange({
              ...manifest,
              stickers: [...(manifest.stickers || []), newSticker],
            });
          }}
        />

        {/* Active stickers list with controls */}
        {(manifest.stickers?.length ?? 0) > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--pl-divider, #E0D8CA)', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted, #7A756E)', marginBottom: '8px' }}>
              Active ({manifest.stickers!.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {manifest.stickers!.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: '#fff', border: '1px solid var(--pl-divider, #E0D8CA)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-ink-soft, #3D3530)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-muted, #7A756E)' }}>
                    Size
                    <input type="range" min={30} max={200} value={s.size} onChange={e => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, size: Number(e.target.value) };
                      onChange({ ...manifest, stickers: updated });
                    }} style={{ width: '50px', accentColor: '#A3B18A' }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-muted)' }}>
                    Op.
                    <input type="range" min={10} max={100} value={Math.round(s.opacity * 100)} onChange={e => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, opacity: Number(e.target.value) / 100 };
                      onChange({ ...manifest, stickers: updated });
                    }} style={{ width: '40px', accentColor: '#A3B18A' }} />
                  </label>
                  <button onClick={() => onChange({ ...manifest, stickers: manifest.stickers!.filter((_, j) => j !== i) })} style={{ all: 'unset', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '2px' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SidebarSection>

      {/* Live preview — compact, no extra nesting */}
      <div style={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid var(--pl-divider, #E0D8CA)' }}>
        <div style={{ background: colors.background || '#faf9f6', padding: '14px' }}>
          <div style={{ fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`, fontSize: '1rem', fontWeight: 700, color: colors.foreground || 'var(--pl-ink, var(--pl-ink-soft))', marginBottom: '3px' }}>
            {manifest.chapters?.[0]?.title || 'Preview'}
          </div>
          <div style={{ color: colors.muted || '#8c8c8c', fontSize: '0.72rem', marginBottom: '8px' }}>The beginning of everything.</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ background: colors.accent || '#A3B18A', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700 }}>RSVP</div>
            <div style={{ background: colors.accentLight || '#f3e8d8', color: colors.accent || '#A3B18A', padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 600 }}>View Story</div>
          </div>
        </div>
        <div style={{ height: '3px', background: colors.accent || '#A3B18A' }} />
      </div>
    </div>
  );
}
