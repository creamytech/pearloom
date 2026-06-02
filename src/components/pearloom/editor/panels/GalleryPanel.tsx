'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '@/components/pearloom/motifs';

function FGroup({ label, hint, children, action }: { label: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</label>
        {action}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
function FToggle({ label, sub, on, set }: { label: string; sub?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <button onClick={() => set(!on)} style={{ width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer' }}>
        <span style={{ position: 'absolute', top: 2.5, left: on ? 18.5 : 2.5, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}/>
      </button>
    </div>
  );
}
function PearChip({ children }: { children: ReactNode }) {
  return (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', cursor: 'pointer' }}>
      <Pear size={13} tone="sage" shadow={false}/> {children}
    </button>
  );
}

export function GalleryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const tones = ['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'];

  // Pull photo URLs from chapters + heroSlideshow
  const urls: string[] = [];
  if (manifest.coverPhoto) urls.push(manifest.coverPhoto);
  manifest.heroSlideshow?.forEach((u) => urls.push(u));
  manifest.chapters?.forEach((c: any) => {
    if (Array.isArray(c.images)) c.images.forEach((img: any) => img?.url && urls.push(img.url));
  });
  const photoCount = urls.length > 0 ? urls.length : 38;

  const [guestUploads, setGuestUploads] = useState<boolean>(((manifest as any).features?.guestPhotos as boolean | undefined) ?? true);
  const onGuestUploadsToggle = (v: boolean) => {
    setGuestUploads(v);
    onChange({ ...manifest, features: { ...((manifest as any).features ?? {}), guestPhotos: v } } as any);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FGroup label={`Photos · ${photoCount}`} action={<PearChip>Auto-arrange</PearChip>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {tones.map((t, i) => <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, background: `linear-gradient(140deg, var(--${t}-2, var(--cream-3)), var(--cream-2))` } as CSSProperties}/>)}
          <button style={{ aspectRatio: '1/1', borderRadius: 8, border: '1.5px dashed var(--line)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={16} color="var(--ink-soft)"/></button>
        </div>
      </FGroup>
      <FToggle label="Guest photo uploads" sub="Let guests add to a shared album" on={guestUploads} set={onGuestUploadsToggle}/>
    </div>
  );
}

export default GalleryPanel;
