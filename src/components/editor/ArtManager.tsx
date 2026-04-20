'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ArtManager.tsx
// Manage AI-generated art surfaces.
//
// Two categories of art live in the VibeSkin:
//   1. Raster art (hero, ambient, art strip) — uploadable, regenerable,
//      replaceable with Google Photos.
//   2. Decorative SVGs (hero blob, corner flourish, chapter divider,
//      medallion, ambient pattern, per-chapter icons) — regenerable or
//      removable. Historically these were baked at site-create time with
//      no editor-surface; this component exposes them so couples can
//      curate or strip back the generated ornamentation.
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Trash2, Upload, Loader2, Sparkles, ImageIcon } from 'lucide-react';
import type { StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import { colors as C, text, card } from '@/lib/design-tokens';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';

type ArtSlot = 'heroArtDataUrl' | 'ambientArtDataUrl' | 'artStripDataUrl';

// SVG-only decorative slots generated alongside raster art by the vibe engine.
// These render as dangerouslySetInnerHTML elements sprinkled through the site
// (hero blob, corner flourishes, chapter dividers, etc.) and have never been
// user-editable until now.
type SvgSlot =
  | 'heroBlobSvg'
  | 'cornerFlourishSvg'
  | 'accentBlobSvg'
  | 'heroPatternSvg'
  | 'sectionBorderSvg'
  | 'medallionSvg';

interface ArtManagerProps {
  manifest: StoryManifest;
  coupleNames?: [string, string];
  onUpdate: (updates: Partial<StoryManifest>) => void;
}

const ART_SLOTS: { key: ArtSlot; label: string; desc: string; aspect: string }[] = [
  { key: 'heroArtDataUrl', label: 'Hero Art', desc: 'The main painted illustration behind your story header', aspect: '16/9' },
  { key: 'ambientArtDataUrl', label: 'Ambient Background', desc: 'Subtle painted texture behind your chapters', aspect: '16/9' },
  { key: 'artStripDataUrl', label: 'Art Strip', desc: 'Horizontal botanical divider between sections', aspect: '8/1' },
];

const SVG_SLOTS: { key: SvgSlot; label: string; desc: string; aspect: string }[] = [
  { key: 'heroBlobSvg',        label: 'Hero Overlay',      desc: 'Large illustrated motif layered on top of the hero',        aspect: '5/7' },
  { key: 'cornerFlourishSvg',  label: 'Corner Flourish',   desc: 'Decorative corner ornament framing the hero',               aspect: '1/1' },
  { key: 'accentBlobSvg',      label: 'Events Backdrop',   desc: 'Organic shape behind the events section',                   aspect: '3/2' },
  { key: 'heroPatternSvg',     label: 'Ambient Pattern',   desc: 'Repeating motif used as the site-wide background pattern',  aspect: '1/1' },
  { key: 'sectionBorderSvg',   label: 'Chapter Divider',   desc: 'Ornamental strip drawn between chapters',                   aspect: '10/1' },
  { key: 'medallionSvg',       label: 'Story Medallion',   desc: 'Circular ornament shown at the start of your story',       aspect: '1/1' },
];

function ArtSlotCard({
  slot,
  url,
  onReplace,
  onGooglePhotos,
  onRegenerate,
  onRemove,
  isRegenerating,
  isPickingGoogle,
}: {
  slot: typeof ART_SLOTS[number];
  url?: string;
  onReplace: (file: File) => void;
  onGooglePhotos: () => void;
  onRegenerate: () => void;
  onRemove: () => void;
  isRegenerating: boolean;
  isPickingGoogle: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      background: card.bg, borderRadius: card.radius, border: card.border,
      boxShadow: card.shadow, overflow: 'hidden',
    }}>
      {/* Preview area */}
      <div style={{
        aspectRatio: slot.aspect, background: '#1a1916', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={slot.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Hover overlay with actions */}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: 0, transition: 'opacity 0.2s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            >
              <ActionButton icon={<Upload size={14} />} label="Upload" onClick={() => inputRef.current?.click()} />
              <ActionButton icon={isPickingGoogle ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={14} />} label="Google" onClick={onGooglePhotos} disabled={isPickingGoogle} />
              <ActionButton icon={isRegenerating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />} label="AI Regen" onClick={onRegenerate} disabled={isRegenerating} />
              <ActionButton icon={<Trash2 size={14} />} label="Remove" onClick={onRemove} danger />
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <Image size={24} style={{ color: '#71717A', marginBottom: '0.5rem' }} />
            <p style={{ color: '#71717A', fontSize: text.sm, margin: 0 }}>No art generated</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <ActionButton icon={<Upload size={13} />} label="Upload" onClick={() => inputRef.current?.click()} />
              <ActionButton icon={isPickingGoogle ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={13} />} label="Google Photos" onClick={onGooglePhotos} disabled={isPickingGoogle} />
              <ActionButton icon={isRegenerating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />} label="Generate" onClick={onRegenerate} disabled={isRegenerating} />
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{ padding: '0.75rem 1rem' }}>
        <div style={{ fontSize: text.sm, fontWeight: 600, color: C.ink, marginBottom: '0.15rem' }}>{slot.label}</div>
        <div style={{ fontSize: text.xs, color: C.muted, lineHeight: 1.4 }}>{slot.desc}</div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onReplace(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function SvgSlotCard({
  slot,
  svg,
  onRegenerate,
  onRemove,
  isRegenerating,
}: {
  slot: typeof SVG_SLOTS[number];
  svg?: string;
  onRegenerate: () => void;
  onRemove: () => void;
  isRegenerating: boolean;
}) {
  const safe = svg ? sanitizeSvg(svg) : null;

  return (
    <div style={{
      background: card.bg, borderRadius: card.radius, border: card.border,
      boxShadow: card.shadow, overflow: 'hidden',
    }}>
      {/* Preview area — light background so coloured SVG strokes read clearly */}
      <div style={{
        aspectRatio: slot.aspect, background: '#FAF7F2', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: '10px',
      }}>
        {safe ? (
          <>
            <div
              aria-hidden
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.ink,
              }}
              dangerouslySetInnerHTML={{ __html: safe }}
            />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: 0, transition: 'opacity 0.2s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            >
              <ActionButton
                icon={isRegenerating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                label="Regenerate"
                onClick={onRegenerate}
                disabled={isRegenerating}
              />
              <ActionButton icon={<Trash2 size={14} />} label="Remove" onClick={onRemove} danger />
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Image size={22} style={{ color: '#71717A', marginBottom: '0.4rem' }} />
            <p style={{ color: '#71717A', fontSize: text.sm, margin: 0 }}>Removed</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.6rem' }}>
              <ActionButton
                icon={isRegenerating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
                label="Generate"
                onClick={onRegenerate}
                disabled={isRegenerating}
              />
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '0.75rem 1rem' }}>
        <div style={{ fontSize: text.sm, fontWeight: 600, color: C.ink, marginBottom: '0.15rem' }}>{slot.label}</div>
        <div style={{ fontSize: text.xs, color: C.muted, lineHeight: 1.4 }}>{slot.desc}</div>
      </div>
    </div>
  );
}

function ChapterIconsCard({
  icons,
  onRegenerate,
  onRemoveAll,
  onRemoveOne,
  isRegenerating,
}: {
  icons: string[];
  onRegenerate: () => void;
  onRemoveAll: () => void;
  onRemoveOne: (index: number) => void;
  isRegenerating: boolean;
}) {
  return (
    <div style={{
      background: card.bg, borderRadius: card.radius, border: card.border,
      boxShadow: card.shadow, padding: '0.9rem 1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontSize: text.sm, fontWeight: 600, color: C.ink }}>Chapter Icons</div>
          <div style={{ fontSize: text.xs, color: C.muted, lineHeight: 1.4 }}>
            One small illustration drawn above each chapter.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <ActionButton
            icon={isRegenerating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            label="Regen"
            onClick={onRegenerate}
            disabled={isRegenerating}
          />
          {icons.length > 0 && (
            <ActionButton icon={<Trash2 size={13} />} label="Clear" onClick={onRemoveAll} danger />
          )}
        </div>
      </div>
      {icons.length === 0 ? (
        <p style={{ color: '#71717A', fontSize: text.xs, margin: '0.4rem 0 0' }}>No chapter icons.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
          gap: '0.5rem', marginTop: '0.4rem',
        }}>
          {icons.map((svg, i) => {
            const safe = sanitizeSvg(svg);
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  background: '#FAF7F2',
                  borderRadius: 'var(--pl-radius-md)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '6px', color: C.ink,
                }}
                onMouseEnter={e => {
                  const btn = (e.currentTarget as HTMLElement).querySelector('.pl-chapter-icon-remove') as HTMLElement | null;
                  if (btn) btn.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  const btn = (e.currentTarget as HTMLElement).querySelector('.pl-chapter-icon-remove') as HTMLElement | null;
                  if (btn) btn.style.opacity = '0';
                }}
              >
                <div
                  aria-hidden
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: safe }}
                />
                <button
                  className="pl-chapter-icon-remove"
                  onClick={e => { e.stopPropagation(); onRemoveOne(i); }}
                  aria-label={`Remove chapter icon ${i + 1}`}
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(220,60,60,0.92)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.15s ease',
                  }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon, label, onClick, disabled, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={e => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
        padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
        background: danger ? 'rgba(220,60,60,0.15)' : 'rgba(0,0,0,0.07)',
        border: 'none', cursor: disabled ? 'wait' : 'pointer',
        color: danger ? '#ff6b6b' : '#fff', fontSize: text.xs, fontWeight: 600,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

export function ArtManager({ manifest, coupleNames, onUpdate }: ArtManagerProps) {
  const [regenerating, setRegenerating] = useState<ArtSlot | null>(null);
  const [regeneratingSvg, setRegeneratingSvg] = useState<SvgSlot | 'chapterIcons' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pick: pickGooglePhotos, state: gpState, error: gpError } = useGooglePhotosPicker();

  const setSlotUrl = (slot: ArtSlot, url: string) => {
    const updatedSkin: VibeSkin = { ...manifest.vibeSkin!, [slot]: url };
    onUpdate({ vibeSkin: updatedSkin });
  };

  const handleReplace = async (slot: ArtSlot, file: File) => {
    try {
      // Sanitize filename for iOS Safari — special chars cause "string did not match expected pattern"
      const safeName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeFile = new File([file], safeName, { type: file.type || 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', safeFile);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || `Upload failed (${res.status})`;
        setError(msg);
        setTimeout(() => setError(null), 5000);
        return;
      }
      if (!data.publicUrl) {
        setError('Upload failed — no URL returned');
        setTimeout(() => setError(null), 5000);
        return;
      }
      setSlotUrl(slot, data.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed — check your connection';
      console.error('[ArtManager] Upload failed:', err);
      setError(msg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleGooglePhotos = (slot: ArtSlot) => {
    pickGooglePhotos(async (photos: PickedPhoto[]) => {
      if (photos.length === 0 || !photos[0].baseUrl) return;
      // Show proxy URL immediately
      const proxyUrl = `/api/photos/proxy?url=${encodeURIComponent(photos[0].baseUrl)}&w=1920&h=1080`;
      setSlotUrl(slot, proxyUrl);
      // Mirror to permanent storage in background
      if (photos[0].baseUrl.includes('googleusercontent.com')) {
        try {
          const res = await fetch('/api/photos/mirror', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: photos[0].baseUrl, subdomain: 'draft', key: `art-${slot}-${Date.now()}` }),
          });
          const data = await res.json();
          if (data.permanentUrl) setSlotUrl(slot, data.permanentUrl);
        } catch { /* non-fatal */ }
      }
    });
  };

  const handleRegenerate = async (slot: ArtSlot) => {
    setRegenerating(slot);
    try {
      const names = coupleNames || (manifest as any).coupleNames || ['', ''];
      const res = await fetch('/api/regenerate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString,
          coupleNames: names,
          chapters: manifest.chapters?.map(c => ({
            title: c.title, subtitle: c.subtitle || '', mood: c.mood || '',
            location: c.location, description: c.description || '',
          })),
          occasion: manifest.occasion,
          regenerateArt: slot,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Regeneration failed (${res.status})`;
        setRegenerating(null);
        setError(msg);
        setTimeout(() => setError(null), 5000);
        return;
      }
      const data = await res.json();

      if (data.vibeSkin?.[slot]) {
        // API returns full vibeSkin with the regenerated art
        onUpdate({ vibeSkin: { ...manifest.vibeSkin!, [slot]: data.vibeSkin[slot] } });
      } else if (data[slot]) {
        // Fallback: direct slot value
        onUpdate({ vibeSkin: { ...manifest.vibeSkin!, [slot]: data[slot] } });
      } else {
        setError('Regeneration failed — try again');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('[ArtManager] Regenerate failed:', err);
      setError(err instanceof Error ? err.message : 'Regeneration failed — try again.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setRegenerating(null);
    }
  };

  const handleRemove = (slot: ArtSlot) => {
    if (!manifest.vibeSkin) return;
    const updatedSkin: VibeSkin = {
      ...manifest.vibeSkin,
      [slot]: undefined,
    };
    onUpdate({ vibeSkin: updatedSkin });
  };

  // ── SVG slot handlers ─────────────────────────────────────────
  // Re-hit /api/regenerate-design and cherry-pick just the requested slot
  // from the returned vibeSkin so we don't clobber unrelated art.
  const handleSvgRegenerate = async (slot: SvgSlot | 'chapterIcons') => {
    setRegeneratingSvg(slot);
    try {
      const names = coupleNames || (manifest as any).coupleNames || ['', ''];
      const res = await fetch('/api/regenerate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString,
          coupleNames: names,
          chapters: manifest.chapters?.map(c => ({
            title: c.title, subtitle: c.subtitle || '', mood: c.mood || '',
            location: c.location, description: c.description || '',
          })),
          occasion: manifest.occasion,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Regeneration failed (${res.status})`;
        setError(msg);
        setTimeout(() => setError(null), 5000);
        return;
      }
      const data = await res.json();
      const next = data.vibeSkin?.[slot];
      if (next == null || (Array.isArray(next) && next.length === 0)) {
        setError('Regeneration returned nothing — try again');
        setTimeout(() => setError(null), 3000);
        return;
      }
      onUpdate({ vibeSkin: { ...manifest.vibeSkin!, [slot]: next } });
    } catch (err) {
      console.error('[ArtManager] SVG regenerate failed:', err);
      setError(err instanceof Error ? err.message : 'Regeneration failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setRegeneratingSvg(null);
    }
  };

  const handleSvgRemove = (slot: SvgSlot) => {
    if (!manifest.vibeSkin) return;
    onUpdate({ vibeSkin: { ...manifest.vibeSkin, [slot]: undefined } });
  };

  const handleChapterIconsRemoveAll = () => {
    if (!manifest.vibeSkin) return;
    onUpdate({ vibeSkin: { ...manifest.vibeSkin, chapterIcons: [] } });
  };

  const handleChapterIconRemoveOne = (index: number) => {
    if (!manifest.vibeSkin) return;
    const icons = [...(manifest.vibeSkin.chapterIcons || [])];
    icons.splice(index, 1);
    onUpdate({ vibeSkin: { ...manifest.vibeSkin, chapterIcons: icons } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {(error || gpError) && (
        <div style={{
          background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.3)',
          borderRadius: 'var(--pl-radius-md)', padding: '8px 12px', fontSize: '0.8rem',
          color: '#ff6b6b', fontWeight: 600,
        }}>
          {error || gpError}
        </div>
      )}
      <div style={{ marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: text.md, fontWeight: 700, color: C.ink, marginBottom: '0.25rem' }}>AI Art</h3>
        <p style={{ fontSize: text.sm, color: C.muted, lineHeight: 1.5 }}>
          Custom artwork generated for your site. Replace with your own images, regenerate with AI, or remove.
        </p>
      </div>

      {ART_SLOTS.map(slot => (
        <ArtSlotCard
          key={slot.key}
          slot={slot}
          url={manifest.vibeSkin?.[slot.key] as string | undefined}
          onReplace={file => handleReplace(slot.key, file)}
          onGooglePhotos={() => handleGooglePhotos(slot.key)}
          onRegenerate={() => handleRegenerate(slot.key)}
          onRemove={() => handleRemove(slot.key)}
          isRegenerating={regenerating === slot.key}
          isPickingGoogle={gpState === 'waiting' || gpState === 'fetching' || gpState === 'creating'}
        />
      ))}

      {/* Decorative SVG art — hero overlay, chapter dividers, icons, etc. */}
      <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: text.md, fontWeight: 700, color: C.ink, marginBottom: '0.25rem' }}>Decorative Details</h3>
        <p style={{ fontSize: text.sm, color: C.muted, lineHeight: 1.5 }}>
          Small AI-generated illustrations sprinkled through the site — corner flourishes, chapter dividers, and more. Regenerate for a fresh take or remove any you don&apos;t want.
        </p>
      </div>

      {SVG_SLOTS.map(slot => (
        <SvgSlotCard
          key={slot.key}
          slot={slot}
          svg={manifest.vibeSkin?.[slot.key] as string | undefined}
          onRegenerate={() => handleSvgRegenerate(slot.key)}
          onRemove={() => handleSvgRemove(slot.key)}
          isRegenerating={regeneratingSvg === slot.key}
        />
      ))}

      <ChapterIconsCard
        icons={manifest.vibeSkin?.chapterIcons || []}
        onRegenerate={() => handleSvgRegenerate('chapterIcons')}
        onRemoveAll={handleChapterIconsRemoveAll}
        onRemoveOne={handleChapterIconRemoveOne}
        isRegenerating={regeneratingSvg === 'chapterIcons'}
      />
    </div>
  );
}
