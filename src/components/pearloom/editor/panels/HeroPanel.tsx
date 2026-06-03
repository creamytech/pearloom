'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx HeroEditor —
   now with a working cover-photo control (drag-drop, file picker,
   gallery-picker fallback, preview, remove). Uploads through
   /api/photos/upload (same endpoint the wizard uses) and writes
   manifest.coverPhoto + manifest.coverPhotoAlt. */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, PearChip, SectionPanelShell } from './_section-atoms';
import { PearInlineRewrite } from '../../redesign/PearAssist';
import { PhotoUploadSlot } from './_photo-upload';

interface CoverPhotoFieldProps {
  /** Current cover photo URL (absolute, served from R2/CDN). */
  url: string;
  /** Setter for the manifest write. */
  onChange: (next: string) => void;
}

/* Thin wrapper around the shared PhotoUploadSlot — kept here so
   the existing HeroPanel call site doesn't change. The body that
   used to live inline (drag-drop / busy state / remove ×) is now
   in src/components/pearloom/editor/panels/_photo-upload.tsx. */
function CoverPhotoField({ url, onChange }: CoverPhotoFieldProps) {
  return (
    <FGroup label="Cover photo" hint="Drag an image here, or click to pick from your device.">
      <PhotoUploadSlot url={url} onChange={onChange} aspectRatio="16/9" size="md" />
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
