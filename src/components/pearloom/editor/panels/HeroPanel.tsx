'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx HeroEditor —
   now with a working cover-photo control (drag-drop, file picker,
   gallery-picker fallback, preview, remove). Uploads through
   /api/photos/upload (same endpoint the wizard uses) and writes
   manifest.coverPhoto + manifest.coverPhotoAlt. */

import { useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { FGroup, FInput, PearChip, SectionPanelShell } from './_section-atoms';
import { PearInlineRewrite } from '../../redesign/PearAssist';

interface CoverPhotoFieldProps {
  /** Current cover photo URL (absolute, served from R2/CDN). */
  url: string;
  /** Setter for the manifest write. */
  onChange: (next: string) => void;
}

function CoverPhotoField({ url, onChange }: CoverPhotoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  /* File → base64 → /api/photos/upload → manifest.coverPhoto */
  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErr('That file isn’t an image.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErr('Image is over the 12 MB upload limit.');
      return;
    }
    setBusy(true); setErr(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Couldn’t read the file.'));
        reader.readAsDataURL(file);
      });
      const id = `cover-${Date.now().toString(36)}`;
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            id, filename: file.name, mimeType: file.type, base64,
            capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { photos?: { baseUrl?: string }[]; failures?: unknown[] };
      const baseUrl = data.photos?.[0]?.baseUrl;
      if (!baseUrl) throw new Error('Upload finished but no URL was returned.');
      onChange(baseUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    void uploadFile(files[0]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onFiles(e.dataTransfer.files);
  }

  return (
    <FGroup label="Cover photo" hint="Drag an image here, or click to pick from your device.">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        style={{
          display: 'block', width: '100%', aspectRatio: '16/9',
          borderRadius: 10,
          border: dragOver
            ? '2px dashed var(--peach-ink)'
            : url
              ? '1px solid var(--line)'
              : '2px dashed var(--line)',
          background: url
            ? `var(--cream-2) center / cover no-repeat url("${url.replace(/"/g, '%22')}")`
            : 'var(--cream-2)',
          position: 'relative',
          cursor: busy ? 'wait' : 'pointer',
          transition: 'border-color 140ms, background 140ms',
        }}
      >
        {/* Hidden file input — we forward clicks/keypresses on the
            drop zone here so the keyboard + click UX stays consistent. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        {!url && !busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            color: 'var(--ink-muted)', fontSize: 12.5, textAlign: 'center', padding: 16,
          }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop a photo here</div>
              <div>or click to pick from your device</div>
            </div>
          </div>
        )}
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(245,239,226,0.85)', borderRadius: 10,
            fontSize: 12.5, fontWeight: 600, color: 'var(--peach-ink)',
          }}>
            Threading…
          </div>
        )}
        {url && !busy && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            aria-label="Remove cover photo"
            title="Remove cover photo"
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: 999,
              background: 'rgba(20,20,20,0.72)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700,
              lineHeight: 1,
            }}
          >×</button>
        )}
      </div>
      {err && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11.5, color: '#7A2D2D' }}>
          {err}
        </div>
      )}
    </FGroup>
  );
}

export function HeroPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [n1, n2] = manifest.names ?? ['', ''];
  /* Read tagline from manifest.tagline (canonical) with fallback to
     the legacy poetry.heroTagline path so existing sites don't lose
     their saved tagline. Write to manifest.tagline only. */
  const tagline = ((manifest as unknown as { tagline?: string }).tagline)
    ?? ((manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline)
    ?? '';
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const coverPhoto = ((manifest as unknown as { coverPhoto?: string }).coverPhoto) ?? '';

  const setTagline = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    tagline: v,
  } as unknown as StoryManifest);
  const setA = (v: string) => onChange({ ...manifest, names: [v, n2] });
  const setB = (v: string) => onChange({ ...manifest, names: [n1, v] });
  const setDate = (v: string) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), date: v } });
  const setVenue = (v: string) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), venue: v } });
  const setCoverPhoto = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    coverPhoto: v || undefined,
  } as unknown as StoryManifest);

  /* manifest.copy.<key> overrides — visible labels the host can
     customize. Each falls through to the voice-defaulted value in
     ThemedSite's buildCopy when blank. */
  const copy: Record<string, string> = ((manifest as unknown as { copy?: Record<string, string> }).copy) ?? {};
  const setCopy = (key: string, value: string) => {
    const next = { ...copy };
    if (value.trim()) next[key] = value;
    else delete next[key];
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      copy: next,
    } as unknown as StoryManifest);
  };
  const heroLead = copy.heroLead ?? '';
  const heroCta = copy.heroCta ?? '';
  const heroCtaSecondary = copy.heroCtaSecondary ?? '';

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Lead / eyebrow" hint="The tiny ALL-CAPS line above the names (e.g. “A SMALL FOREVER”).">
          <FInput value={heroLead} onChange={(v) => setCopy('heroLead', v)} placeholder="A small forever" />
        </FGroup>
        <FGroup label="Tagline" action={<PearChip>3 styles</PearChip>}>
          <FInput value={tagline} onChange={setTagline} placeholder="A short line above the fold" />
          {tagline.trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                value={tagline}
                onCommit={setTagline}
                context="hero tagline"
              />
            </div>
          )}
        </FGroup>
        <FGroup label="Names">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 6, alignItems: 'center' }}>
            <FInput value={n1} onChange={setA} />
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>&amp;</div>
            <FInput value={n2} onChange={setB} />
          </div>
        </FGroup>
        <FGroup label="Date & venue">
          <FInput value={date} onChange={setDate} icon="calendar" placeholder="Monday, April 26, 2027" />
          <div style={{ height: 8 }} />
          <FInput value={venue} onChange={setVenue} icon="pin" placeholder="Casa Chorro · Santorini" />
        </FGroup>
        <CoverPhotoField url={coverPhoto} onChange={setCoverPhoto} />
        <FGroup label="Buttons" hint="Customize the call-to-action labels.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <FInput value={heroCta} onChange={(v) => setCopy('heroCta', v)} placeholder="RSVP" />
            <FInput value={heroCtaSecondary} onChange={(v) => setCopy('heroCtaSecondary', v)} placeholder="Learn more" />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default HeroPanel;
