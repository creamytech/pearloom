'use client';

import React, { useState } from 'react';
import { RangeSlider } from '@/components/ui/range-slider';
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
import { CORNER_PRESETS, renderCornerSvg, type CornerPreset } from '@/lib/corner-presets';
import { Check, Navigation } from 'lucide-react';
import {
  PearIcon, PearlIcon, WeddingRingsIcon, BouquetIcon, ElegantHeartIcon,
  EnvelopeIcon, ChampagneIcon, GiftIcon, MountainIcon, PawIcon,
  MusicNoteIcon, CoffeeCupIcon, SuitcaseIcon, StarburstIcon,
} from '@/components/icons/PearloomIcons';
import type { StoryManifest, ThemeSchema, LogoIconId } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

// ── Logo Icon Options ─────────────────────────────────────────
const LOGO_ICONS: Array<{ id: LogoIconId; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = [
  { id: 'wedding-rings', label: 'Rings', Icon: WeddingRingsIcon },
  { id: 'heart', label: 'Heart', Icon: ElegantHeartIcon },
  { id: 'bouquet', label: 'Bouquet', Icon: BouquetIcon },
  { id: 'champagne', label: 'Cheers', Icon: ChampagneIcon },
  { id: 'envelope', label: 'Letter', Icon: EnvelopeIcon },
  { id: 'gift', label: 'Gift', Icon: GiftIcon },
  { id: 'pearl', label: 'Pearl', Icon: PearlIcon },
  { id: 'pear', label: 'Pear', Icon: PearIcon },
  { id: 'mountain', label: 'Mountain', Icon: MountainIcon },
  { id: 'paw', label: 'Paw', Icon: PawIcon },
  { id: 'music-note', label: 'Music', Icon: MusicNoteIcon },
  { id: 'coffee', label: 'Coffee', Icon: CoffeeCupIcon },
  { id: 'suitcase', label: 'Travel', Icon: SuitcaseIcon },
  { id: 'starburst', label: 'Star', Icon: StarburstIcon },
];

// ── Nav Style Options ─────────────────────────────────────────
const NAV_STYLES: Array<{ id: string; label: string; desc: string; preview: React.ReactNode }> = [
  {
    id: 'glass', label: 'Glass', desc: 'Frosted blur, floats over content',
    preview: (
      <div style={{ height: '100%', background: 'linear-gradient(135deg, rgba(163,177,138,0.15), rgba(196,169,106,0.1))', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.6 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'minimal', label: 'Minimal', desc: 'Clean line, no background',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.4 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'solid', label: 'Solid', desc: 'Opaque bar with shadow',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.5 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'editorial', label: 'Editorial', desc: 'Centered logo, wide spacing',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', paddingTop: '2px' }}>
          <div style={{ width: '16px', height: '2.5px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.5 }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '1.5px', background: 'var(--pl-muted)', borderRadius: '1px', opacity: 0.5 }} />)}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'floating', label: 'Floating', desc: 'Pill-shaped, detached from edge',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '3px', left: '15%', right: '15%', height: '8px', background: 'rgba(255,255,255,0.9)', borderRadius: '100px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
            <div style={{ width: '10px', height: '1.5px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.4 }} />
          </div>
        </div>
      </div>
    ),
  },
];

// ── Nav Customization Panel ───────────────────────────────────
function NavCustomizationPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const currentLogo = manifest.logoIcon || 'pear';
  const currentNavStyle = manifest.navStyle || 'glass';
  const accent = manifest.vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Logo icon picker */}
      <div>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '8px' }}>
          Site Logo Icon
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {LOGO_ICONS.map(({ id, label, Icon }) => {
            const isActive = currentLogo === id && !manifest.logoSvg;
            return (
              <button
                key={id}
                onClick={() => onChange({ ...manifest, logoIcon: id, logoSvg: undefined })}
                title={label}
                style={{
                  aspectRatio: '1',
                  borderRadius: '10px',
                  border: isActive ? '2px solid var(--pl-olive)' : '1px solid rgba(0,0,0,0.06)',
                  background: isActive ? 'rgba(163,177,138,0.1)' : 'rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'all 0.15s',
                  position: 'relative',
                } as React.CSSProperties}
              >
                <Icon size={18} color={isActive ? accent : 'var(--pl-muted)'} />
              </button>
            );
          })}
        </div>
        {manifest.logoSvg && (
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--pl-olive)', fontStyle: 'italic' }}>
              ✦ Using AI-generated logo
            </span>
            <button
              onClick={() => onChange({ ...manifest, logoSvg: undefined })}
              style={{
                fontSize: '0.55rem', color: 'var(--pl-muted)', background: 'rgba(0,0,0,0.04)',
                border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer',
              }}
            >
              Use icon instead
            </button>
          </div>
        )}
      </div>

      {/* Nav bar style */}
      <div>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '8px' }}>
          Nav Bar Style
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {NAV_STYLES.map(style => {
            const isActive = currentNavStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onChange({ ...manifest, navStyle: style.id as StoryManifest['navStyle'] })}
                style={{
                  display: 'flex', flexDirection: 'column',
                  borderRadius: '10px', overflow: 'hidden',
                  border: isActive ? '2px solid var(--pl-olive)' : '1px solid rgba(0,0,0,0.06)',
                  background: isActive ? 'rgba(163,177,138,0.06)' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', padding: 0,
                  boxShadow: isActive ? '0 2px 8px rgba(163,177,138,0.12)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ height: '32px', overflow: 'hidden' }}>
                  {style.preview}
                </div>
                <div style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{
                    fontSize: '0.58rem', fontWeight: 700,
                    color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                  }}>
                    {style.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Corner Decoration Picker ──────────────────────────────────
function CornerDecorationPicker({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const accent = manifest.vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
  const currentSvg = manifest.vibeSkin?.cornerFlourishSvg || '';
  const [filter, setFilter] = useState<string>('all');

  const categories = ['all', 'botanical', 'whimsical', 'geometric', 'minimal', 'cultural'];
  const filtered = filter === 'all' ? CORNER_PRESETS : CORNER_PRESETS.filter(p => p.category === filter);

  const applyPreset = (preset: CornerPreset) => {
    const svg = preset.svg ? renderCornerSvg(preset, accent) : '';
    onChange({
      ...manifest,
      vibeSkin: manifest.vibeSkin ? { ...manifest.vibeSkin, cornerFlourishSvg: svg || undefined } : manifest.vibeSkin,
    });
  };

  // Check if current matches a preset (rough match by id presence in svg)
  const isActive = (preset: CornerPreset) => {
    if (!preset.svg && !currentSvg) return true;
    if (!preset.svg || !currentSvg) return false;
    const rendered = renderCornerSvg(preset, accent);
    // Compare first 100 chars of path data as fingerprint
    return rendered.slice(0, 120) === currentSvg.slice(0, 120);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', lineHeight: 1.5, margin: 0 }}>
        Decorative corners for the hero and footer — personalized to your style.
      </p>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '3px 10px', borderRadius: '100px', border: 'none',
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
              background: filter === cat ? 'var(--pl-olive)' : 'rgba(0,0,0,0.03)',
              color: filter === cat ? 'white' : 'var(--pl-muted)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {filtered.map(preset => {
          const active = isActive(preset);
          const previewSvg = preset.svg ? renderCornerSvg(preset, accent) : '';
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              title={preset.label}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '12px',
                border: active ? '2px solid var(--pl-olive)' : '1px solid rgba(0,0,0,0.06)',
                background: active ? 'rgba(163,177,138,0.08)' : 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.15s',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              } as React.CSSProperties}
            >
              {previewSvg ? (
                <div
                  style={{ width: '80%', height: '80%' }}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <span style={{ fontSize: '0.6rem', color: 'var(--pl-muted)', fontWeight: 600 }}>None</span>
              )}
              {active && (
                <div style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'var(--pl-olive)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={9} color="white" strokeWidth={3} />
                </div>
              )}
              <span style={{
                position: 'absolute', bottom: '3px', left: 0, right: 0,
                fontSize: '0.5rem', fontWeight: 700, color: 'var(--pl-muted)',
                textAlign: 'center', letterSpacing: '0.03em',
              }}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {currentSvg && (
        <p style={{ fontSize: '0.6rem', color: 'var(--pl-olive)', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
          ✦ AI-generated corners will be replaced when you pick a preset
        </p>
      )}
    </div>
  );
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

      {/* ── Quick AI regenerate ── */}
      <div className="pl-panel-section" style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'linear-gradient(135deg, rgba(163,177,138,0.06), rgba(196,169,106,0.04))',
        border: '1px solid rgba(163,177,138,0.15)',
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

      {/* ── Navigation — logo + nav style ── */}
      <SidebarSection title="Navigation" defaultOpen={true}>
        <NavCustomizationPanel manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Corner Decorations — swappable presets ── */}
      <SidebarSection title="Corner Decorations" defaultOpen={true}>
        <CornerDecorationPicker manifest={manifest} onChange={onChange} />
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
                    <RangeSlider min={30} max={200} value={s.size} onChange={v => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, size: v };
                      onChange({ ...manifest, stickers: updated });
                    }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-muted)' }}>
                    Op.
                    <RangeSlider min={10} max={100} value={Math.round(s.opacity * 100)} onChange={v => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, opacity: v / 100 };
                      onChange({ ...manifest, stickers: updated });
                    }} />
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
