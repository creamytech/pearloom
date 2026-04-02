'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ArtManager.tsx
// Manage AI-generated art surfaces: hero art, ambient background,
// art strip. Replace with upload, regenerate with AI, or remove.
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, RefreshCw, Trash2, Upload, Loader2, Sparkles } from 'lucide-react';
import type { StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import { colors as C, text, card } from '@/lib/design-tokens';

type ArtSlot = 'heroArtDataUrl' | 'ambientArtDataUrl' | 'artStripDataUrl';

interface ArtManagerProps {
  manifest: StoryManifest;
  onUpdate: (updates: Partial<StoryManifest>) => void;
}

const ART_SLOTS: { key: ArtSlot; label: string; desc: string; aspect: string }[] = [
  { key: 'heroArtDataUrl', label: 'Hero Art', desc: 'The main painted illustration behind your story header', aspect: '16/9' },
  { key: 'ambientArtDataUrl', label: 'Ambient Background', desc: 'Subtle painted texture behind your chapters', aspect: '16/9' },
  { key: 'artStripDataUrl', label: 'Art Strip', desc: 'Horizontal botanical divider between sections', aspect: '8/1' },
];

function ArtSlotCard({
  slot,
  url,
  onReplace,
  onRegenerate,
  onRemove,
  isRegenerating,
}: {
  slot: typeof ART_SLOTS[number];
  url?: string;
  onReplace: (file: File) => void;
  onRegenerate: () => void;
  onRemove: () => void;
  isRegenerating: boolean;
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
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: 0, transition: 'opacity 0.2s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            >
              <ActionButton icon={<Upload size={14} />} label="Replace" onClick={() => inputRef.current?.click()} />
              <ActionButton icon={isRegenerating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />} label="AI Regen" onClick={onRegenerate} disabled={isRegenerating} />
              <ActionButton icon={<Trash2 size={14} />} label="Remove" onClick={onRemove} danger />
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <Image size={24} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '0.5rem' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: text.sm, margin: 0 }}>No art generated</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
              <ActionButton icon={<Upload size={13} />} label="Upload" onClick={() => inputRef.current?.click()} />
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
        background: danger ? 'rgba(220,60,60,0.15)' : 'rgba(255,255,255,0.12)',
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

export function ArtManager({ manifest, onUpdate }: ArtManagerProps) {
  const [regenerating, setRegenerating] = useState<ArtSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReplace = async (slot: ArtSlot, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) { setError('Upload failed — try again'); setTimeout(() => setError(null), 3000); return; }
      const { publicUrl } = await res.json();
      if (!publicUrl) { setError('Upload failed — try again'); setTimeout(() => setError(null), 3000); return; }

      const updatedSkin: VibeSkin = {
        ...manifest.vibeSkin!,
        [slot]: publicUrl,
      };
      onUpdate({ vibeSkin: updatedSkin });
    } catch (err) {
      console.error('[ArtManager] Upload failed:', err);
    }
  };

  const handleRegenerate = async (slot: ArtSlot) => {
    setRegenerating(slot);
    try {
      const res = await fetch('/api/regenerate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString,
          occasion: manifest.occasion,
          regenerateArt: slot,
        }),
      });
      if (!res.ok) { setRegenerating(null); setError('Regeneration failed — try again'); setTimeout(() => setError(null), 3000); return; }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{
          background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.3)',
          borderRadius: '8px', padding: '8px 12px', fontSize: '0.82rem',
          color: '#ff6b6b', fontWeight: 600,
        }}>
          {error}
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
          onRegenerate={() => handleRegenerate(slot.key)}
          onRemove={() => handleRemove(slot.key)}
          isRegenerating={regenerating === slot.key}
        />
      ))}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
