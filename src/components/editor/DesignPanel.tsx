'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { lbl } from './editor-utils';
import { ColorPalettePanel } from './ColorPalettePanel';
import { ThemeSwitcher } from './ThemeSwitcher';
import FontPicker from '@/components/dashboard/FontPicker';
import { AssetPicker } from '@/components/asset-library/AssetPicker';
import { ArtManager } from './ArtManager';
import { DesignIcon } from '@/components/icons/EditorIcons';
import type { StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

export function DesignPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
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
          coupleNames: [
            manifest.chapters?.[0]?.title?.split(' ')[0] ?? 'Partner',
            manifest.chapters?.[1]?.title?.split(' ')[0] ?? 'Partner',
          ],
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

  const updateFont = (key: 'heading' | 'body', val: string) => {
    onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, [key]: val } } });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Theme Switcher ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
        <ThemeSwitcher
          currentVibeSkin={manifest.vibeSkin ?? ({} as VibeSkin)}
          manifest={manifest}
          onApply={handleThemeApply}
        />
      </div>

      {/* VibeSkin palette swatches */}
      <div id="design-customization" />
      {paletteColors.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '8px' }}>
            Current Palette
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {paletteColors.map((c, i) => (
              <div
                key={i}
                title={String(c)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: String(c),
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          {/* Tone badge */}
          {vibeSkin?.tone && (
            <div style={{ marginTop: '8px' }}>
              <span style={{
                display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--eg-accent, #A3B18A)',
                background: 'rgba(163,177,138,0.12)', padding: '4px 12px', borderRadius: '100px',
                border: '1px solid rgba(163,177,138,0.25)',
              }}>
                {vibeSkin.tone}
              </span>
            </div>
          )}
          {/* Regenerate design button */}
          <button
            onClick={handleRegenerateDesign}
            disabled={isRegenerating}
            style={{
              marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '7px',
              border: '1px solid rgba(163,177,138,0.25)',
              background: isRegenerating ? 'rgba(163,177,138,0.15)' : 'rgba(163,177,138,0.07)',
              color: 'var(--eg-accent, #A3B18A)', cursor: isRegenerating ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s',
              opacity: isRegenerating ? 0.7 : 1,
            }}
            onMouseOver={e => { if (!isRegenerating) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.15)'; }}
            onMouseOut={e => { if (!isRegenerating) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.07)'; }}
          >
            <DesignIcon size={13} />
            {isRegenerating ? 'Generating new design…' : 'Regenerate design'}
          </button>
          {regenError && (
            <p style={{ fontSize: '0.82rem', color: '#e87a7a', marginTop: '4px', marginLeft: '2px' }}>
              {regenError}
            </p>
          )}
        </div>
      )}

      {/* AI palette + pattern picker */}
      <ColorPalettePanel manifest={manifest} onChange={onChange} />

      {/* AI Art Manager — hero, ambient, art strip */}
      {manifest.vibeSkin && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
          <ArtManager manifest={manifest} onUpdate={(updates) => onChange({ ...manifest, ...updates })} />
        </div>
      )}

      {/* Typography — full font pair picker */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-gold, #D6C6A8)', marginBottom: '10px' }}>
          Typography
        </div>
        <FontPicker
          currentHeading={manifest.theme?.fonts?.heading || 'Playfair Display'}
          currentBody={manifest.theme?.fonts?.body || 'Inter'}
          onChange={(heading, body) => { updateFont('heading', heading); updateFont('body', body); }}
        />
      </div>

      {/* Asset Library */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-gold, #D6C6A8)', marginBottom: '10px' }}>
          Asset Library
        </div>
        <p style={{ fontSize: '0.82rem', color: 'rgba(214,198,168,0.5)', marginBottom: '10px', lineHeight: 1.5 }}>
          Dividers, illustrations & accents to add to your pages.
        </p>
        <AssetPicker
          onSelect={(asset) => {
            // Store last-selected asset on manifest for canvas insertion
            onChange({ ...manifest, lastAsset: asset as StoryManifest['lastAsset'] });
          }}
        />
      </div>

      {/* Live color preview swatch */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '10px' }}>Preview</div>
        <div style={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ background: colors.background || '#faf9f6', padding: '16px' }}>
            <div style={{ fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`, fontSize: '1.1rem', fontWeight: 700, color: colors.foreground || 'var(--eg-fg, #2B2B2B)', marginBottom: '4px' }}>
              Shauna & Ben
            </div>
            <div style={{ color: colors.muted || '#8c8c8c', fontSize: '0.75rem', marginBottom: '10px' }}>The beginning of everything.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ background: colors.accent || 'var(--eg-accent, #A3B18A)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>RSVP</div>
              <div style={{ background: colors.accentLight || '#f3e8d8', color: colors.accent || 'var(--eg-accent, #A3B18A)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600 }}>View Story</div>
            </div>
          </div>
          <div style={{ height: '4px', background: colors.accent || 'var(--eg-accent, #A3B18A)' }} />
        </div>
      </div>
    </div>
  );
}
