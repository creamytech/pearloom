'use client';

/* ========================================================================
   PEARLOOM — WIZARD (v8 handoff port)
   Functional 6-step wizard posting to /api/sites. Matches the handoff
   progress-thread + Pear helper shell.
   ======================================================================== */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Icon, Pear, PearloomLogo, PhotoPlaceholder, Sparkle, Squiggle, Blob } from '../motifs';
import { Reveal } from '../motion';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { TEMPLATES_BY_ID } from '../marketplace/templates-data';
import { EVENT_TYPES, getEventType, type EventCategory } from '@/lib/event-os/event-types';
import { nameModeFor, nameModeIsValid } from '@/lib/event-os/name-mode';
import { questionsFor } from '@/lib/event-os/wizard-questions';
import { NumberInput } from '../editor/v8-forms';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { WizardLocationAutocomplete } from '../wizard/WizardLocationAutocomplete';
import { WizardDatePicker } from '../wizard/WizardDatePicker';
import { GeneratingScreen } from '../wizard/GeneratingScreen';

const STEPS = ['Occasion', 'Basics', 'Details', 'Photos', 'Vibe', 'Palette', 'Layout', 'Review'] as const;
type StepKey = (typeof STEPS)[number];

// Draw occasion list from the Event OS registry (all 28 supported
// events), grouped by category with a friendly icon + tone per card.
interface OccasionCard {
  id: string;
  label: string;
  icon: string;
  tone: 'peach' | 'sage' | 'lavender' | 'cream';
  category: EventCategory;
}
const CATEGORY_LABELS: Record<EventCategory, string> = {
  'wedding-arc': 'Wedding arc',
  family: 'Family & home',
  milestone: 'Milestones',
  cultural: 'Ceremonies & faith',
  commemoration: 'Memorials & reunions',
};
function iconFor(id: string): string {
  if (id === 'wedding' || id === 'engagement' || id === 'vow-renewal' || id === 'anniversary' || id === 'bridal-shower' || id === 'bridal-luncheon') return 'heart-icon';
  if (id === 'memorial' || id === 'funeral') return 'leaf';
  if (id === 'baby-shower' || id === 'gender-reveal' || id === 'sip-and-see' || id === 'first-birthday') return 'sparkles';
  if (id === 'bar-mitzvah' || id === 'bat-mitzvah' || id === 'quinceanera' || id === 'baptism' || id === 'first-communion' || id === 'confirmation') return 'sparkles';
  if (id === 'reunion' || id === 'housewarming' || id === 'welcome-party' || id === 'brunch') return 'users';
  if (id === 'retirement' || id === 'graduation') return 'leaf';
  if (id === 'bachelor-party' || id === 'bachelorette-party') return 'compass';
  if (id === 'birthday' || id === 'milestone-birthday' || id === 'sweet-sixteen' || id === 'rehearsal-dinner') return 'gift';
  if (id === 'story') return 'sparkles';
  return 'sparkles';
}
function toneFor(id: string): 'peach' | 'sage' | 'lavender' | 'cream' {
  const e = getEventType(id as never);
  const voice = e?.voice;
  if (voice === 'solemn') return 'lavender';
  if (voice === 'ceremonial') return 'cream';
  if (voice === 'playful') return 'peach';
  if (voice === 'intimate') return 'sage';
  return 'peach';
}
const OCCASIONS: OccasionCard[] = EVENT_TYPES
  .filter((e) => e.status === 'shipping' || e.status === 'beta')
  .map((e) => ({ id: e.id, label: e.label, icon: iconFor(e.id), tone: toneFor(e.id), category: e.category }));

const VIBES = [
  { id: 'romantic', label: 'Romantic', icon: '♥', tone: 'peach' as const },
  { id: 'joyful', label: 'Joyful', icon: '✦', tone: 'peach' as const },
  { id: 'intimate', label: 'Intimate', icon: '◉', tone: 'lavender' as const },
  { id: 'playful', label: 'Playful', icon: '✿', tone: 'peach' as const },
  { id: 'quiet', label: 'Quiet', icon: '⟐', tone: 'sage' as const },
  { id: 'editorial', label: 'Editorial', icon: '❖', tone: 'cream' as const },
  { id: 'groovy', label: 'Groovy', icon: '☀', tone: 'peach' as const },
  { id: 'outdoorsy', label: 'Outdoorsy', icon: '☘', tone: 'sage' as const },
  { id: 'modern', label: 'Modern', icon: '■', tone: 'lavender' as const },
];

const PALETTES = [
  { id: 'groovy-garden', name: 'Groovy Garden', colors: ['#F0C9A8', '#8B9C5A', '#CBD29E', '#3D4A1F'] },
  { id: 'dusk-meadow', name: 'Dusk Meadow', colors: ['#C4B5D9', '#B7A4D0', '#CBD29E', '#6B5A8C'] },
  { id: 'warm-linen', name: 'Warm Linen', colors: ['#F3E9D4', '#EAB286', '#F0C9A8', '#8B4720'] },
  { id: 'olive-gold', name: 'Olive & Gold', colors: ['#6d7d3f', '#D4A95D', '#F3E9D4', '#3D4A1F'] },
];

const LAYOUTS = [
  { id: 'timeline', name: 'Memory Thread', body: 'A vertical story, chapter by chapter.', icon: '⏳' },
  { id: 'magazine', name: 'Editorial Spread', body: 'Headlines, features, quiet pages.', icon: '▤' },
  { id: 'filmstrip', name: 'Filmstrip', body: 'Photos first, words second.', icon: '▥' },
  { id: 'bento', name: 'Bento Stack', body: 'Card grid — schedule, people, gifts.', icon: '⊞' },
];

interface WizardPhoto {
  id: string;
  /** Permanent URL (R2 or Google CDN) — what gets sent to generate. */
  url: string;
  /** Local preview — data URL for uploads before they finish, or Google baseUrl. */
  previewUrl: string;
  name?: string;
  caption?: string;
  takenAt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  source: 'upload' | 'google';
  uploading?: boolean;
  error?: string;
}

interface SmartPalette {
  id: string;
  name: string;
  rationale: string;
  colors: [string, string, string, string];
  tone: string;
  source: string;
}

interface WizardState {
  occasion: string;
  names: [string, string];
  eventDate: string;
  location: string;
  vibes: string[];
  palette: string;
  /** Hex colors from the currently-selected palette — flows to /api/generate/stream
   *  as `selectedPaletteColors` so Pass 2 honors them. */
  paletteColors?: string[];
  layout: string;
  subdomain: string;
  templateId?: string;
  // factSheet — anchors for the AI story pass
  howWeMet?: string;
  whyCelebrate?: string;
  favoriteMemory?: string;
  // Occasion-specific details (consumed by /api/generate/stream as eventDetails)
  detailDays?: number;
  detailLivestreamUrl?: string;
  detailInMemoryOf?: string;
  detailSchool?: string;
  // Photos
  photos: WizardPhoto[];
  // AI-suggested palettes (from /api/wizard/smart-palette)
  smartPalettes?: SmartPalette[];
  smartPalettesLoading?: boolean;
  smartPalettesError?: string;
}

const defaultState: WizardState = {
  occasion: '',
  names: ['', ''],
  eventDate: '',
  location: '',
  vibes: [],
  palette: PALETTES[0].id,
  layout: LAYOUTS[0].id,
  subdomain: '',
  photos: [],
};

// User-friendly upload failure messages keyed on HTTP status.
function humanizeUploadStatus(status: number): string {
  if (status === 401) return 'Please sign back in and try uploading again.';
  if (status === 413) return 'Those files are too large. Try smaller photos (under 12MB each).';
  if (status === 429) return "You've uploaded a lot recently — take a breath and try again in a minute.";
  if (status >= 500) return "Pearloom's servers are hiccuping. Try again in a moment.";
  return `Upload failed (${status}). Try again, or contact hello@pearloom.com.`;
}

// ── Photo upload (device + Google Photos) ────────────────────
// Both sources produce the same WizardPhoto shape so downstream
// code doesn't care where the photos came from.
const MAX_WIZARD_PHOTOS = 24;

function WizardPhotoUpload({
  photos,
  onChange,
}: {
  photos: WizardPhoto[];
  onChange: (next: WizardPhoto[]) => void;
}) {
  const inputId = 'pl8-wizard-photo-input';
  const picker = useGooglePhotosPicker();
  // Latest photos ref — patched into async mirror callbacks so they
  // don't clobber intermediate edits (deletes, reorders, captions).
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_WIZARD_PHOTOS - photos.length;
    const accepted = Array.from(files).slice(0, Math.max(0, remaining)).filter((f) => f.type.startsWith('image/'));
    if (accepted.length === 0) return;

    // Stage all images as local previews immediately so the user sees
    // their thumbnails right away, then upload in the background.
    const staged: WizardPhoto[] = await Promise.all(
      accepted.map(async (file) => {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        return {
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: '', // filled in after upload
          previewUrl: dataUrl,
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
          source: 'upload' as const,
          uploading: true,
        };
      }),
    );
    onChange([...photos, ...staged]);

    // Batch-upload to R2 via /api/photos/upload (max 25 per request).
    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: staged.map((p) => ({
            id: p.id,
            filename: p.name ?? p.id,
            mimeType: p.mimeType ?? 'image/jpeg',
            base64: p.previewUrl,
            capturedAt: p.takenAt,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? humanizeUploadStatus(res.status);
        throw new Error(msg);
      }
      const data = await res.json() as { photos?: Array<{ id: string; baseUrl: string; width?: number; height?: number }> };
      const byId = new Map(data.photos?.map((p) => [p.id, p]) ?? []);
      onChange((await buildNext(staged, byId)));
    } catch (err) {
      // Keep the previews but mark them as errored so the user can retry,
      // with a friendly message they can actually act on.
      const friendly = err instanceof Error ? err.message : 'Upload failed — try again';
      onChange(
        photosRef.current.concat(
          staged.map((s) => ({ ...s, uploading: false, error: friendly })),
        ),
      );
    }

    async function buildNext(
      stagedList: WizardPhoto[],
      byId: Map<string, { baseUrl: string; width?: number; height?: number }>,
    ): Promise<WizardPhoto[]> {
      return [
        ...photos,
        ...stagedList.map((s) => {
          const hit = byId.get(s.id);
          if (!hit?.baseUrl) return { ...s, uploading: false, error: 'Upload failed' };
          return {
            ...s,
            uploading: false,
            error: undefined,
            url: hit.baseUrl,
            width: hit.width ?? s.width,
            height: hit.height ?? s.height,
          };
        }),
      ];
    }
  }

  function handleGoogle() {
    picker.pick(async (picked: PickedPhoto[]) => {
      const remaining = MAX_WIZARD_PHOTOS - photos.length;
      const accepted = picked.slice(0, Math.max(0, remaining));
      if (accepted.length === 0) return;

      // 1. Stage immediately so the thumbnails paint while the server
      //    mirrors in the background. Picker baseUrls require OAuth —
      //    the browser can't load them in <img> tags directly — so we
      //    route the preview through our authenticated proxy. Once the
      //    R2 mirror lands below, we swap the preview to the permanent
      //    URL and the proxy request goes away.
      const previewFor = (baseUrl: string) =>
        `/api/photos/proxy?url=${encodeURIComponent(baseUrl)}&w=600&h=600`;
      const staged: WizardPhoto[] = accepted.map((g) => ({
        id: g.id,
        url: g.baseUrl,
        previewUrl: previewFor(g.baseUrl),
        name: g.filename,
        mimeType: g.mimeType,
        width: g.width,
        height: g.height,
        source: 'google' as const,
        uploading: true,
      }));
      onChange([...photos, ...staged]);

      // 2. Mirror each Google URL to R2 via /api/photos/upload. The
      //    server fetches each URL with the session's OAuth token and
      //    writes the bytes to R2 — same path as device uploads. This
      //    guarantees the photo survives past Google's ~1h CDN expiry.
      try {
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos: staged.map((p, i) => ({
              id: p.id,
              filename: p.name ?? `google-${i}.jpg`,
              mimeType: p.mimeType ?? 'image/jpeg',
              sourceUrl: p.previewUrl,
              capturedAt: p.takenAt,
              width: p.width,
              height: p.height,
            })),
          }),
        });
        if (!res.ok) throw new Error(`mirror ${res.status}`);
        const data = (await res.json()) as {
          photos?: Array<{ id: string; baseUrl: string; width?: number; height?: number }>;
        };
        const byId = new Map(data.photos?.map((p) => [p.id, p]) ?? []);
        // Use the freshest photos array from state to avoid racing
        // with other edits. We match staged entries by id so if the
        // user deleted or reordered photos while the mirror was in
        // flight, we only touch the ones that still exist.
        // Patch by id against whatever state is current — respects
        // any deletes/reorders the user made during the round trip.
        const patched = photosRef.current.map((p) => {
          const hit = byId.get(p.id);
          if (!hit?.baseUrl) {
            if (p.source === 'google' && p.uploading) return { ...p, uploading: false };
            return p;
          }
          return {
            ...p,
            uploading: false,
            url: hit.baseUrl,
            previewUrl: hit.baseUrl,
            width: hit.width ?? p.width,
            height: hit.height ?? p.height,
          };
        });
        onChange(patched);
      } catch (err) {
        console.warn('[wizard] Google mirror failed:', err);
        // Keep the previews but flip off uploading state, using the
        // latest photos array so concurrent edits aren't clobbered.
        onChange(photosRef.current.map((p) => (p.uploading ? { ...p, uploading: false } : p)));
      }
    });
  }

  function remove(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }
  function setCaption(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  const pickerBusy = picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            border: '2px dashed var(--line)',
            borderRadius: 14,
            background: 'var(--cream-2)',
            cursor: 'pointer',
            gap: 8,
            color: 'var(--ink-soft)',
            minHeight: 150,
          }}
        >
          <Icon name="upload" size={24} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Upload from device</div>
          <div style={{ fontSize: 11, textAlign: 'center' }}>JPG, PNG, HEIC · up to {MAX_WIZARD_PHOTOS}</div>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={handleGoogle}
          disabled={pickerBusy}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            border: '2px solid var(--line)',
            borderRadius: 14,
            background: pickerBusy ? 'var(--cream-2)' : 'var(--card)',
            cursor: pickerBusy ? 'wait' : 'pointer',
            gap: 8,
            color: 'var(--ink)',
            minHeight: 150,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c-3.54 0-6.72 1.22-9.2 3.22l-5.36-5.36C13.26 3.89 18.37 2 24 2c8.27 0 15.26 4.59 19 11.27l-5.9 4.58C34.96 13.31 29.89 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.35l-7.73-6c-2.15 1.45-4.92 2.3-6.84 2.3-5.89 0-10.87-3.81-12.65-8.85l-7.98 6.19C6.73 41.41 13.73 46 24 46z" />
          </svg>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {pickerBusy ? 'Opening Google Photos…' : 'Pick from Google Photos'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center' }}>
            Choose in a popup · nothing leaves Google unless you pick it
          </div>
        </button>
      </div>

      {picker.error && (
        <div style={{ fontSize: 12, color: '#7A2D2D', marginBottom: 10 }}>{picker.error}</div>
      )}

      {photos.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {photos.map((p) => (
            <div key={p.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
              <img
                src={p.previewUrl}
                alt={p.name ?? ''}
                style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', opacity: p.uploading ? 0.6 : 1 }}
              />
              {p.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  uploading…
                </div>
              )}
              {p.error && !p.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: '#7A2D2D',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  {p.error}
                </div>
              )}
              {p.source === 'google' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: 'rgba(66,133,244,0.85)',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  Google
                </div>
              )}
              <input
                value={p.caption ?? ''}
                onChange={(e) => setCaption(p.id, e.target.value)}
                placeholder="Caption (optional)"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  border: 0,
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Remove photo"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 0,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-muted)' }}>
        {photos.length === 0
          ? 'No photos yet — Pear will start with an empty canvas.'
          : `${photos.length} photo${photos.length === 1 ? '' : 's'} ready. Pear clusters them into chapters.`}
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function ProgressThread({ active, hiddenSteps }: { active: number; hiddenSteps?: StepKey[] }) {
  // When a template is selected the Vibe/Palette/Layout steps are
  // skipped — hide them from the progress thread too so the dots
  // line up with the real flow.
  const visibleSteps = STEPS.filter((s) => !(hiddenSteps ?? []).includes(s));
  return (
    <div className="pl8-wizard-progress" style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '18px 0', flex: 1, overflow: 'hidden' }}>
      {visibleSteps.map((s, i) => {
        const originalIndex = STEPS.indexOf(s);
        const done = originalIndex < active;
        const cur = originalIndex === active;
        return (
          <Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: cur ? 'var(--ink)' : done ? 'var(--ink-soft)' : 'var(--cream-2)',
                  color: cur || done ? 'var(--cream)' : 'var(--ink-muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  border: cur ? '2px solid var(--gold)' : '1.5px solid var(--line)',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <div
                data-step-label
                style={{
                  fontSize: 10.5,
                  fontWeight: cur ? 700 : 500,
                  color: cur ? 'var(--ink)' : 'var(--ink-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {s}
              </div>
            </div>
            {i < visibleSteps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1.5,
                  minWidth: 14,
                  marginBottom: 16,
                  borderTop: `1.5px dashed ${done ? 'var(--ink-soft)' : 'var(--line)'}`,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function ContextChips({ st }: { st: WizardState }) {
  const occ = OCCASIONS.find((o) => o.id === st.occasion)?.label ?? 'Not set';
  const namesVal = st.names.filter(Boolean).join(' & ') || 'Add names';
  const dateVal = st.eventDate ? new Date(st.eventDate).toLocaleDateString() : 'Set date';
  const locVal = st.location || 'Add location';
  const chips = [
    { icon: '♥', tone: 'peach' as const, label: 'Occasion', val: occ },
    { icon: '✦', tone: 'lavender' as const, label: 'Names', val: namesVal },
    { icon: '🗓', tone: 'sage' as const, label: 'Date', val: dateVal },
    { icon: '📍', tone: 'peach' as const, label: 'Location', val: locVal },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--card)',
        borderRadius: 16,
        border: '1px solid var(--card-ring)',
        alignItems: 'center',
      }}
    >
      {chips.map((c) => (
        <div key={c.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background:
                c.tone === 'peach'
                  ? 'var(--peach-bg)'
                  : c.tone === 'lavender'
                    ? 'var(--lavender-bg)'
                    : 'var(--sage-tint)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {c.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--ink-muted)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PearHelper({ step }: { step: StepKey }) {
  const copy: Record<StepKey, { title: string; body: string; tip: string }> = {
    Occasion: {
      title: 'What brings everyone together?',
      body: 'Pick what fits best — you can shape the specifics next.',
      tip: 'Not sure? Pick the closest — we can change it any time.',
    },
    Basics: {
      title: 'The who, when, and where.',
      body: 'Just the bones. Names, a date, and a place. Details come later.',
      tip: 'Guests see only what you choose. Names can be first-name-only.',
    },
    Details: {
      title: 'What Pear should know.',
      body: 'Everything here is fuel for the AI. The more specific, the richer your site.',
      tip: 'Skip any field you want to write yourself later.',
    },
    Photos: {
      title: 'Let Pear see it.',
      body: 'Upload photos and Pear analyses scene, mood, and moment to write chapters that fit.',
      tip: '6–20 photos is the sweet spot. More = more chapters.',
    },
    Vibe: {
      title: 'Set the feeling.',
      body: 'Your vibe shapes the tone, flow, and language of your site.',
      tip: 'Most people pick 2–4 vibes that capture the heart of the day.',
    },
    Palette: {
      title: 'A palette to match the mood.',
      body: 'You can always tweak individual colors later in the studio.',
      tip: 'Pick what you love — we’ll build matching gradients + accents.',
    },
    Layout: {
      title: 'How should it read?',
      body: 'Every layout is a full site. Each handles media and timing differently.',
      tip: 'The Memory Thread is a safe, warm default for weddings.',
    },
    Review: {
      title: 'Check everything over.',
      body: 'When you save, we’ll build your first draft and open the studio.',
      tip: 'You can keep editing — nothing is public until you publish.',
    },
  };
  const c = copy[step];
  return (
    <aside style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pear size={30} tone="sage" />
        <span className="display" style={{ fontSize: 20 }}>
          Pear is here to help <Sparkle size={12} />
        </span>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{c.body}</div>
      </div>

      <div style={{ background: 'var(--lavender-bg)', borderRadius: 16, padding: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--lavender-ink)',
            marginBottom: 4,
          }}
        >
          <Heart size={12} /> A small tip
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{c.tip}</div>
      </div>

      <div
        style={{
          background: 'var(--cream-2)',
          borderRadius: 16,
          padding: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Need inspiration?</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>See real events that match your vibe.</div>
          <Link href="/templates" className="btn btn-outline btn-sm" style={{ marginTop: 6 }}>
            Explore templates
          </Link>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden' }}>
          <PhotoPlaceholder tone="warm" aspect="1/1" />
        </div>
      </div>
    </aside>
  );
}

export function WizardV8() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const [stepIndex, setStepIndex] = useState(0);
  // Persist wizard state across refreshes so users don't lose their
  // work if they accidentally reload mid-flow. Photos stay out of
  // storage (too big); they'd need to be re-picked.
  const STORAGE_KEY = 'pl-wizard-state-v1';
  const [st, setSt] = useState<WizardState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<WizardState>;
          if (parsed && typeof parsed === 'object') {
            return { ...defaultState, ...parsed, photos: [] } as WizardState;
          }
        }
      } catch {}
    }
    if (!templateId) return defaultState;
    const tpl = TEMPLATES_BY_ID[templateId];
    if (!tpl) return defaultState;
    return {
      ...defaultState,
      occasion: tpl.occasion,
      vibes: tpl.vibes.map((v) => v.toLowerCase()),
      palette: tpl.palette,
      layout: tpl.layout,
      templateId,
    } as WizardState;
  });

  // Debounced persistence — runs on every state change, but throttled
  // to one write per 400ms so we don't thrash localStorage on each
  // keystroke.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        const { photos: _photos, ...persisted } = st;
        void _photos;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [st]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [genStep, setGenStep] = useState<string>('');
  const [generatedTagline, setGeneratedTagline] = useState<string>('');
  const [taglineState, setTaglineState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const step = STEPS[stepIndex];

  // Fetch AI palette suggestions. Factored out so we can fire it
  // automatically on step enter AND from the "Re-read my event"
  // button.
  const fetchSmartPalettes = async () => {
    setSt((s) => ({ ...s, smartPalettesLoading: true, smartPalettesError: undefined }));
    try {
      const res = await fetch('/api/wizard/smart-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: st.occasion,
          names: st.names,
          venue: st.location,
          city: st.location,
          vibes: st.vibes,
          howWeMet: st.howWeMet,
          whyCelebrate: st.whyCelebrate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Palette advisor unavailable.');
      setSt((s) => ({
        ...s,
        smartPalettes: (data.palettes ?? []) as SmartPalette[],
        smartPalettesLoading: false,
      }));
    } catch (err) {
      setSt((s) => ({
        ...s,
        smartPalettesLoading: false,
        smartPalettesError: err instanceof Error ? err.message : 'Palette advisor failed.',
      }));
    }
  };

  // Auto-fire palette suggestions the FIRST time the user lands on
  // the Palette step — no click required. Guards against re-firing
  // on step-navigation back-and-forth by checking existing results.
  useEffect(() => {
    if (step !== 'Palette') return;
    if (st.smartPalettesLoading) return;
    if ((st.smartPalettes?.length ?? 0) > 0) return;
    // Don't auto-fire if the user hasn't given us enough to work with.
    if (!st.occasion) return;
    void fetchSmartPalettes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Steps that are redundant when a template is selected — the
  // template already picked the occasion, vibes, palette, and
  // layout. Skip them on forward navigation; still reachable via
  // the progress bar if the user wants to override.
  const isTemplateRedundant = (stepName: StepKey): boolean => {
    if (!st.templateId) return false;
    return stepName === 'Vibe' || stepName === 'Palette' || stepName === 'Layout';
  };

  /** Next index, skipping template-redundant steps. */
  const nextStepIndex = (from: number): number => {
    let next = Math.min(from + 1, STEPS.length - 1);
    while (next < STEPS.length - 1 && isTemplateRedundant(STEPS[next])) next += 1;
    return next;
  };

  /** Previous index, also skipping template-redundant steps. */
  const prevStepIndex = (from: number): number => {
    let prev = Math.max(0, from - 1);
    while (prev > 0 && isTemplateRedundant(STEPS[prev])) prev -= 1;
    return prev;
  };

  // Auto-advance to the next step after a single-choice selection.
  // Small delay so the user sees the checkmark animation before the
  // step transitions. Skips Vibe/Palette/Layout when a template is
  // active since those are pre-set by the template itself.
  const autoAdvance = (ms = 380) => {
    window.setTimeout(() => {
      setStepIndex((i) => nextStepIndex(i));
    }, ms);
  };

  async function suggestTagline() {
    setTaglineState('running');
    try {
      const res = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Write a warm 1-2 sentence hero tagline for a ${st.occasion} site for ${st.names.filter(Boolean).join(' & ') || 'the hosts'}${
            st.location ? ` at ${st.location}` : ''
          }${st.vibes.length ? `. Vibes: ${st.vibes.join(', ')}` : ''}. No exclamation marks, no cliches. Write like a friend.`,
          tone: 'warm',
        }),
      });
      if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
      const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
      const text = (data.text ?? data.rewritten ?? data.result ?? '').trim();
      if (!text) throw new Error('Empty tagline');
      setGeneratedTagline(text);
      setTaglineState('done');
      setTimeout(() => setTaglineState('idle'), 1800);
    } catch {
      setTaglineState('error');
    }
  }

  // When a template is pre-selected, start the user at the Basics step so
  // they don't re-confirm the occasion/vibe/palette/layout we already chose.
  useEffect(() => {
    if (templateId && TEMPLATES_BY_ID[templateId] && stepIndex === 0) {
      setStepIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'Occasion':
        return !!st.occasion;
      case 'Basics':
        return nameModeIsValid(st.occasion, st.names);
      case 'Vibe':
        return st.vibes.length > 0;
      case 'Palette':
        return !!st.palette;
      case 'Layout':
        return !!st.layout;
      case 'Review':
        return nameModeIsValid(st.occasion, st.names) && !!st.occasion;
      default:
        return true;
    }
  }, [step, st]);

  function toggleVibe(id: string) {
    setSt((s) => ({ ...s, vibes: s.vibes.includes(id) ? s.vibes.filter((v) => v !== id) : [...s.vibes, id] }));
  }

  async function handleFinish() {
    setBusy(true);
    setErr(null);
    setGenStep('starting…');
    try {
      const derivedSubdomain =
        st.subdomain ||
        slugify(st.names.filter(Boolean).join('-and-')) ||
        slugify(st.occasion) ||
        `event-${Date.now().toString(36)}`;

      // Only photos that have a resolvable URL reach the pipeline.
      // Uploads that haven't finished (or failed) are dropped here.
      const readyPhotos = st.photos.filter((p) => p.url && !p.uploading);
      const hasPhotos = readyPhotos.length > 0;
      const e = getEventType(st.occasion as never);
      const category = e?.category;

      let manifest: Record<string, unknown>;

      if (hasPhotos) {
        // Full AI pipeline — stream generate returns a populated
        // manifest with chapters, story, logistics, poetry, etc.
        const photosPayload = readyPhotos.map((p) => ({
          mediaId: p.id,
          baseUrl: p.url,
          filename: p.name ?? p.id,
          mimeType: p.mimeType ?? 'image/jpeg',
          width: p.width ?? 1200,
          height: p.height ?? 1200,
          creationTime: p.takenAt,
          description: p.caption,
        }));
        const clusters = [
          {
            id: 'c-all',
            photos: photosPayload,
            timeRange: st.eventDate || new Date().toISOString(),
            locationLabel: st.location || undefined,
          },
        ];
        const vibeString = st.vibes.join(', ') || 'warm, celebratory';
        const body = {
          photos: photosPayload,
          clusters,
          vibeString,
          vibeName: vibeString,
          names: st.names,
          occasion: st.occasion,
          category,
          eventDate: st.eventDate || undefined,
          eventVenue: st.location || undefined,
          hostRole: 'principal',
          factSheet: {
            howWeMet: st.howWeMet,
            why: st.whyCelebrate,
            favorite: st.favoriteMemory,
          },
          eventDetails: {
            days: st.detailDays,
            livestreamUrl: st.detailLivestreamUrl,
            inMemoryOf: st.detailInMemoryOf,
            school: st.detailSchool,
          },
          layoutFormat: st.layout,
          templateId: st.templateId,
          selectedPaletteColors: st.paletteColors,
        };
        setGenStep('Pear is reading your photos…');
        const res = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Generation failed (${res.status})`);
        }
        // Consume the SSE stream, looking for `type: 'complete'`.
        const reader = res.body?.getReader();
        if (!reader) throw new Error('Stream unavailable');
        const decoder = new TextDecoder();
        let buffer = '';
        let finalManifest: Record<string, unknown> | null = null;
        let streamError: string | null = null;

        const processFrame = (part: string) => {
          const line = part.split('\n').find((l) => l.startsWith('data: '));
          if (!line) return;
          let ev: Record<string, unknown> | null = null;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            // Truly partial / malformed frame — drop it.
            return;
          }
          if (!ev) return;
          // NOTE: don't put an ev.type === 'error' throw inside a
          // try/catch — the surrounding "ignore parse errors"
          // guard used to swallow the real server error and
          // bubble up a misleading "No manifest received".
          if (ev.type === 'progress') {
            const label = (ev.label ?? ev.message) as string | undefined;
            if (label) setGenStep(label);
          } else if (ev.type === 'pass' && typeof ev.message === 'string') {
            setGenStep(ev.message);
          } else if (ev.type === 'complete' && ev.manifest) {
            finalManifest = ev.manifest as Record<string, unknown>;
          } else if (ev.type === 'error') {
            streamError = (ev.message as string) ?? 'Generation failed';
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) processFrame(part);
          if (streamError) break;
        }
        // Flush: the final frame may live in `buffer` if the server
        // closed before writing the trailing blank line. Replay it
        // through the same parser so `complete` isn't lost.
        buffer += decoder.decode();
        if (buffer.trim()) {
          for (const part of buffer.split('\n\n')) processFrame(part);
        }
        if (streamError) throw new Error(streamError);
        // Capture the closure-assigned value into a local so TS can
        // narrow it — `finalManifest` is referenced by `processFrame`
        // so the compiler keeps it as `Record<string, unknown> | null`
        // even after a null guard.
        const resolvedManifest = finalManifest as Record<string, unknown> | null;
        if (!resolvedManifest) {
          throw new Error(
            'Pear finished without sending your manifest — try again in a minute, or contact support if this keeps happening.',
          );
        }
        manifest = {
          ...resolvedManifest,
          themeFamily: (resolvedManifest as { themeFamily?: string }).themeFamily ?? 'v8',
          templateId: st.templateId,
        };
      } else {
        // Skeleton path — no photos → no AI pass. Seed what we can
        // so the editor opens with enough for the user to write.
        const seedTagline = st.templateId ? TEMPLATES_BY_ID[st.templateId]?.tagline : generatedTagline || undefined;
        manifest = {
          occasion: st.occasion,
          themeFamily: 'v8',
          templateId: st.templateId,
          vibeString: st.vibes.join(', '),
          names: st.names,
          logistics: { date: st.eventDate || undefined, venue: st.location || undefined },
          chapters: [],
          layoutFormat: st.layout,
          factSheet: {
            howWeMet: st.howWeMet,
            why: st.whyCelebrate,
            favorite: st.favoriteMemory,
          },
          ...(seedTagline ? { poetry: { heroTagline: seedTagline } } : {}),
        };
      }

      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: derivedSubdomain, manifest, names: st.names }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to create site (${res.status})`);
      }
      // Invalidate the shared sites cache so the dashboard renders
      // this freshly-created site the next time the user lands on it.
      try {
        const { invalidateSitesCache } = await import('@/components/marketing/design/dash/hooks');
        invalidateSitesCache();
      } catch {}
      // Clear persisted wizard state — user has their site, no reason
      // to keep the draft. Prevents the wizard from showing yesterday's
      // answers if the user starts a second site later.
      if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
      }
      router.push(`/editor/${derivedSubdomain}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <Blob tone="lavender" size={320} opacity={0.4} seed={0} style={{ position: 'absolute', top: -100, left: -100 }} />
      <Blob tone="peach" size={260} opacity={0.35} seed={2} style={{ position: 'absolute', top: 200, right: -80 }} />
      <Squiggle variant={1} width={180} stroke="#D4A95D" style={{ position: 'absolute', top: 120, right: 220, opacity: 0.5 }} />

      {/* Header */}
      <header
        className="pl8-wizard-header"
        style={{
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(248,241,228,0.85)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--line-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Link href="/">
          <PearloomLogo />
        </Link>
        <ProgressThread
          active={stepIndex}
          hiddenSteps={st.templateId ? ['Vibe', 'Palette', 'Layout'] : []}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard" className="btn btn-outline btn-sm">
            Save draft
          </Link>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Exit
          </Link>
        </div>
      </header>

      <div
        className="pl8-split-wizard"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '24px 32px 56px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div>
          {/* Active-template banner — shown whenever a template is
              selected, so the user always knows which design drives
              their site and can swap it without digging through
              the wizard back-buttons. */}
          {st.templateId && TEMPLATES_BY_ID[st.templateId] && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 'var(--r, 12px)',
                background: 'var(--sage-tint, #EDEFE1)',
                border: '1px solid var(--line-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
              }}
            >
              <Sparkle size={12} color="var(--gold)" />
              <span style={{ color: 'var(--ink-soft)' }}>
                Using template
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display, Fraunces, serif)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  fontSize: 16,
                }}
              >
                {TEMPLATES_BY_ID[st.templateId].name}
              </span>
              <div style={{ flex: 1 }} />
              <Link
                href="/templates"
                style={{
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Change template
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Start from scratch — this keeps everything you\'ve typed but drops the template’s palette + layout.')) {
                    setSt((s) => ({ ...s, templateId: undefined }));
                  }
                }}
                style={{
                  fontSize: 12,
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Start blank
              </button>
            </div>
          )}

          {stepIndex > 0 && (
            <div style={{ marginBottom: 16 }}>
              <ContextChips st={st} />
            </div>
          )}

          <Reveal y={14} key={step}>
            <div className="card card-pad-lg" style={{ position: 'relative' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Step {stepIndex + 1} · {step}
              </div>

              {step === 'Occasion' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    What are we <span className="display-italic">celebrating?</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Pearloom supports {OCCASIONS.length} event types. Pick the closest — you can tune the details later.
                  </p>
                  {(['wedding-arc', 'family', 'milestone', 'cultural', 'commemoration'] as EventCategory[]).map((cat) => {
                    const items = OCCASIONS.filter((o) => o.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat} style={{ marginBottom: 22 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: 'var(--peach-ink)',
                            marginBottom: 10,
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </div>
                        <div className="pl8-occasion-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                          {items.map((o) => {
                            const on = st.occasion === o.id;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => {
                                  setSt((s) => ({ ...s, occasion: o.id }));
                                  autoAdvance();
                                }}
                                style={{
                                  padding: 16,
                                  borderRadius: 14,
                                  border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                                  background: on ? 'var(--cream-2)' : 'var(--card)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontFamily: 'var(--font-ui)',
                                }}
                              >
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    flexShrink: 0,
                                    background:
                                      o.tone === 'peach'
                                        ? 'var(--peach-bg)'
                                        : o.tone === 'lavender'
                                          ? 'var(--lavender-bg)'
                                          : o.tone === 'sage'
                                            ? 'var(--sage-tint)'
                                            : 'var(--cream-2)',
                                    display: 'grid',
                                    placeItems: 'center',
                                  }}
                                >
                                  <Icon name={o.icon} size={16} />
                                </div>
                                <div className="display" style={{ fontSize: 15 }}>
                                  {o.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {step === 'Basics' && (() => {
                const nameSpec = nameModeFor(st.occasion);
                return (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Who, when, and <span className="display-italic">where.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Just the bones — you can make anything optional later.
                  </p>
                  <div
                    className="pl8-basics-grid"
                    style={{
                      display: 'grid',
                      // Solo and group modes get a single-column name row;
                      // couple modes use the two-up layout.
                      gridTemplateColumns: nameSpec.mode === 'couple' ? '1fr 1fr' : '1fr',
                      gap: 16,
                    }}
                  >
                    <div style={{ gridColumn: nameSpec.mode === 'couple' ? 'auto' : 'span 1' }}>
                      <label className="field-label">{nameSpec.primaryLabel}</label>
                      <input
                        className="input"
                        value={st.names[0]}
                        onChange={(e) => setSt((s) => ({ ...s, names: [e.target.value, s.names[1]] }))}
                        placeholder={nameSpec.primaryPlaceholder}
                      />
                    </div>
                    {nameSpec.mode === 'couple' && (
                      <div>
                        <label className="field-label">{nameSpec.secondaryLabel ?? 'Second name'}</label>
                        <input
                          className="input"
                          value={st.names[1]}
                          onChange={(e) => setSt((s) => ({ ...s, names: [s.names[0], e.target.value] }))}
                          placeholder={nameSpec.secondaryPlaceholder ?? ''}
                        />
                      </div>
                    )}
                    {nameSpec.hint && (
                      <div
                        style={{
                          gridColumn: nameSpec.mode === 'couple' ? 'span 2' : 'auto',
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          marginTop: -6,
                          fontStyle: 'italic',
                        }}
                      >
                        {nameSpec.hint}
                      </div>
                    )}
                    <div>
                      <label className="field-label">Date</label>
                      <WizardDatePicker
                        value={st.eventDate}
                        onChange={(iso) => setSt((s) => ({ ...s, eventDate: iso }))}
                        placeholder="Pick a date"
                      />
                    </div>
                    <div>
                      <label className="field-label">Location</label>
                      <WizardLocationAutocomplete
                        value={st.location}
                        onChange={(v) => setSt((s) => ({ ...s, location: v }))}
                        onSelect={(place) =>
                          setSt((s) => ({ ...s, location: place.name ? `${place.name}${place.address ? ` · ${place.address}` : ''}` : place.address }))
                        }
                        placeholder="Madison Square Garden · New York"
                      />
                    </div>
                    <div style={{ gridColumn: nameSpec.mode === 'couple' ? 'span 2' : 'span 1' }}>
                      <label className="field-label">Site link</label>
                      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 14px',
                            border: '1.5px solid var(--line)',
                            borderRight: 0,
                            borderTopLeftRadius: 'var(--r)',
                            borderBottomLeftRadius: 'var(--r)',
                            color: 'var(--ink-muted)',
                            fontSize: 13,
                            background: 'var(--cream-2)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          pearloom.com/{normalizeOccasion(st.occasion || 'wedding')}/
                        </div>
                        <input
                          className="input"
                          value={st.subdomain}
                          onChange={(e) => setSt((s) => ({ ...s, subdomain: slugify(e.target.value) }))}
                          placeholder="alex-and-jamie"
                          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1, minWidth: 160 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
                        We&apos;ll derive this from your names if you leave it empty.
                      </div>
                    </div>
                  </div>
                </>
                );
              })()}

              {step === 'Details' && (() => {
                const e = getEventType(st.occasion as never);
                const preset = e?.rsvpPreset ?? 'wedding';
                const isMemorial = preset === 'memorial';
                const isBachelor = preset === 'bachelor';
                const isReunion = preset === 'reunion';
                const isGrad = st.occasion === 'graduation';
                // Per-occasion question copy — labels + placeholders
                // tailored to the specific event (birthday no longer
                // asks "how did you meet in 2018").
                const q = questionsFor(st.occasion);
                return (
                  <>
                    <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                      A little more <span className="display-italic">about it.</span>
                    </h2>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                      Every answer here sharpens the story Pear writes. Skip anything you want to leave to the editor.
                    </p>

                    <div style={{ display: 'grid', gap: 18 }}>
                      <div>
                        <label className="field-label">{q.q1Label}</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={st.howWeMet ?? ''}
                          onChange={(ev) => setSt((s) => ({ ...s, howWeMet: ev.target.value }))}
                          placeholder={q.q1Placeholder}
                        />
                      </div>

                      <div>
                        <label className="field-label">{q.q2Label}</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={st.whyCelebrate ?? ''}
                          onChange={(ev) => setSt((s) => ({ ...s, whyCelebrate: ev.target.value }))}
                          placeholder={q.q2Placeholder}
                        />
                      </div>

                      <div>
                        <label className="field-label">{q.q3Label}</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={st.favoriteMemory ?? ''}
                          onChange={(ev) => setSt((s) => ({ ...s, favoriteMemory: ev.target.value }))}
                          placeholder={q.q3Placeholder}
                        />
                      </div>

                      {/* Occasion-specific fields */}
                      {isBachelor && (
                        <div>
                          <label className="field-label">How many days is this trip?</label>
                          <NumberInput
                            value={st.detailDays ?? 3}
                            onChange={(n) => setSt((s) => ({ ...s, detailDays: n }))}
                            min={1}
                            max={14}
                            unit="days"
                            width={140}
                            ariaLabel="Trip duration in days"
                          />
                        </div>
                      )}

                      {isReunion && (
                        <div>
                          <label className="field-label">The connection</label>
                          <input
                            className="input"
                            value={st.detailSchool ?? ''}
                            onChange={(ev) => setSt((s) => ({ ...s, detailSchool: ev.target.value }))}
                            placeholder="Jefferson High, class of 2005 · or · The Hernandez cousins"
                          />
                        </div>
                      )}

                      {isMemorial && (
                        <>
                          <div>
                            <label className="field-label">In memory of</label>
                            <input
                              className="input"
                              value={st.detailInMemoryOf ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, detailInMemoryOf: ev.target.value }))}
                              placeholder="Eleanor Rose Thompson (1948–2026)"
                            />
                          </div>
                          <div>
                            <label className="field-label">Livestream link (optional)</label>
                            <input
                              className="input"
                              value={st.detailLivestreamUrl ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, detailLivestreamUrl: ev.target.value }))}
                              placeholder="https://…"
                            />
                          </div>
                        </>
                      )}

                      {isGrad && (
                        <div>
                          <label className="field-label">School</label>
                          <input
                            className="input"
                            value={st.detailSchool ?? ''}
                            onChange={(ev) => setSt((s) => ({ ...s, detailSchool: ev.target.value }))}
                            placeholder="Portland State University · BS, Computer Science"
                          />
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {step === 'Photos' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Give Pear <span className="display-italic">something to see.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Add 6–20 favourite photos. Pear looks at them — scenes, people, light — and writes each chapter
                    from what&apos;s actually in the frame. Skip this step if you want a blank canvas.
                  </p>
                  <WizardPhotoUpload
                    photos={st.photos}
                    onChange={(next) => setSt((s) => ({ ...s, photos: next }))}
                  />
                </>
              )}

              {step === 'Vibe' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Set the <span className="display-italic">vibe.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Pick 2–4. Your vibes shape tone, language, and flow.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {VIBES.map((v) => {
                      const on = st.vibes.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVibe(v.id)}
                          className="chip"
                          style={{
                            background: on
                              ? 'var(--sage-deep)'
                              : v.tone === 'peach'
                                ? 'var(--peach-bg)'
                                : v.tone === 'lavender'
                                  ? 'var(--lavender-bg)'
                                  : v.tone === 'sage'
                                    ? 'var(--sage-tint)'
                                    : 'var(--cream-2)',
                            color: on
                              ? 'var(--cream)'
                              : v.tone === 'peach'
                                ? 'var(--peach-ink)'
                                : v.tone === 'lavender'
                                  ? 'var(--lavender-ink)'
                                  : 'var(--ink)',
                            border: 'none',
                            padding: '12px 20px',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          <span>{v.icon}</span> {v.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 'Palette' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Choose a <span className="display-italic">palette.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Pear read your venue and vibes and mixed three palettes just for you — or pick a classic below.
                  </p>

                  {/* ── Smart palettes header ──────────────────── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                        fontSize: 11,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink)',
                      }}
                    >
                      <Sparkle size={11} color="var(--gold)" /> Pear's picks for you
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchSmartPalettes()}
                      className="btn btn-outline btn-sm"
                      disabled={!!st.smartPalettesLoading}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Icon name="wand" size={12} />{' '}
                      {st.smartPalettesLoading
                        ? 'Mixing palette…'
                        : (st.smartPalettes?.length ?? 0) > 0
                          ? 'Re-read my event'
                          : 'Ask Pear again'}
                    </button>
                  </div>

                  {st.smartPalettesError && (
                    <div style={{ fontSize: 12, color: 'var(--peach-ink)', marginBottom: 10 }}>
                      {st.smartPalettesError}
                    </div>
                  )}

                  {/* Skeleton while Pear mixes the first set */}
                  {st.smartPalettesLoading && (st.smartPalettes?.length ?? 0) === 0 && (
                    <div
                      className="pl8-palette-grid"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--card, #fff)',
                            border: '1.5px solid var(--line)',
                            minHeight: 170,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0, 1, 2, 3].map((k) => (
                              <div
                                key={k}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'var(--cream-2)',
                                  opacity: 0.7 - k * 0.12,
                                  animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.15 + k * 0.08}s infinite`,
                                }}
                              />
                            ))}
                          </div>
                          <div
                            style={{
                              width: '70%',
                              height: 14,
                              background: 'var(--cream-2)',
                              borderRadius: 6,
                              marginTop: 12,
                              opacity: 0.6,
                              animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
                            }}
                          />
                          <div
                            style={{
                              width: '90%',
                              height: 10,
                              background: 'var(--cream-2)',
                              borderRadius: 5,
                              marginTop: 8,
                              opacity: 0.5,
                              animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                          <style jsx>{`
                            @keyframes wizard-skeleton-pulse {
                              0%, 100% { opacity: 0.6; }
                              50%      { opacity: 0.85; }
                            }
                          `}</style>
                        </div>
                      ))}
                    </div>
                  )}

                  {(st.smartPalettes?.length ?? 0) > 0 && (
                    <div
                      className="pl8-palette-grid"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
                    >
                      {st.smartPalettes!.map((p) => {
                        const on = st.palette === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSt((s) => ({
                                ...s,
                                palette: p.id,
                                paletteColors: p.colors,
                              }));
                              autoAdvance();
                            }}
                            style={{
                              padding: 16,
                              borderRadius: 16,
                              background: 'var(--card)',
                              border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                              cursor: 'pointer',
                              position: 'relative',
                              textAlign: 'left',
                            }}
                          >
                            {on && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 10,
                                  right: 10,
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: 'var(--ink)',
                                  display: 'grid',
                                  placeItems: 'center',
                                }}
                              >
                                <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 4 }}>
                              {p.colors.map((c, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: c,
                                    border: '1.5px solid rgba(255,255,255,0.45)',
                                  }}
                                />
                              ))}
                            </div>
                            <div
                              className="display"
                              style={{
                                fontSize: 18,
                                fontStyle: 'italic',
                                margin: 0,
                                lineHeight: 1.2,
                              }}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                              {p.rationale}
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                                fontSize: 9.5,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color: 'var(--ink-muted)',
                              }}
                            >
                              {p.source === 'venue' ? 'Venue-aware' : p.source === 'vibe' ? 'Vibe-aware' : p.source}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Classic presets ───────────────────────── */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                      marginBottom: 10,
                    }}
                  >
                    Classic presets
                  </div>
                  <div
                    className="pl8-palette-grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
                  >
                    {PALETTES.map((p) => {
                      const on = st.palette === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSt((s) => ({
                              ...s,
                              palette: p.id,
                              paletteColors: p.colors,
                            }));
                            autoAdvance();
                          }}
                          style={{
                            padding: 14,
                            borderRadius: 14,
                            background: 'var(--card)',
                            border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            cursor: 'pointer',
                            position: 'relative',
                            textAlign: 'left',
                          }}
                        >
                          {on && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: 'var(--ink)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <Icon name="check" size={10} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {p.colors.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  background: c,
                                  border: '1.5px solid rgba(255,255,255,0.4)',
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 'Layout' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    How should it <span className="display-italic">read?</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Every layout is a full site — they just handle pacing differently.
                  </p>
                  <div className="pl8-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {LAYOUTS.map((l) => {
                      const on = st.layout === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setSt((s) => ({ ...s, layout: l.id }));
                            autoAdvance();
                          }}
                          style={{
                            padding: 18,
                            borderRadius: 14,
                            background: on ? 'var(--lavender-bg)' : 'var(--card)',
                            border: on ? '2px solid var(--lavender-ink)' : '1.5px solid var(--line)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 10,
                              background: 'var(--cream-2)',
                              display: 'grid',
                              placeItems: 'center',
                              marginBottom: 6,
                              fontSize: 20,
                            }}
                          >
                            {l.icon}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{l.body}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 'Review' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Everything in <span className="display-italic">order?</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    When you save, we&apos;ll build your first draft and open the studio.
                  </p>
                  <div className="pl8-basics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Row label="Occasion" val={OCCASIONS.find((o) => o.id === st.occasion)?.label ?? '—'} />
                    <Row label="Names" val={st.names.filter(Boolean).join(' & ') || '—'} />
                    <Row label="Date" val={st.eventDate || '—'} />
                    <Row label="Location" val={st.location || '—'} />
                    <Row
                      label="Vibes"
                      val={
                        st.vibes
                          .map((id) => VIBES.find((v) => v.id === id)?.label ?? id)
                          .join(', ') || '—'
                      }
                    />
                    <Row
                      label="Palette"
                      val={
                        PALETTES.find((p) => p.id === st.palette)?.name ??
                        st.smartPalettes?.find((p) => p.id === st.palette)?.name ??
                        (st.paletteColors && st.paletteColors.length > 0 ? 'Pear-picked palette' : '—')
                      }
                      swatches={
                        st.paletteColors && st.paletteColors.length > 0
                          ? st.paletteColors
                          : PALETTES.find((p) => p.id === st.palette)?.colors
                      }
                    />
                    <Row label="Layout" val={LAYOUTS.find((l) => l.id === st.layout)?.name ?? '—'} />
                    <Row
                      label="Site link"
                      val={formatSiteDisplayUrl(
                        st.subdomain || slugify(st.names.filter(Boolean).join('-and-')) || slugify(st.occasion),
                        '',
                        normalizeOccasion(st.occasion || 'wedding'),
                      )}
                    />
                  </div>

                  {/* Let Pear draft a tagline */}
                  <div
                    style={{
                      marginTop: 22,
                      padding: 16,
                      borderRadius: 14,
                      background: 'var(--lavender-bg)',
                      border: '1px solid rgba(107,90,140,0.22)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Pear size={36} tone="sage" sparkle />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 4 }}>
                        Want Pear to draft a hero tagline?
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
                        Pear reads your occasion, names, vibes, and venue and writes a warm one-liner. You can always edit it later in the editor.
                      </div>
                      {generatedTagline && (
                        <div
                          style={{
                            padding: '10px 12px',
                            background: 'var(--card)',
                            border: '1px solid var(--card-ring)',
                            borderRadius: 10,
                            fontSize: 14,
                            fontStyle: 'italic',
                            color: 'var(--ink)',
                            marginBottom: 10,
                            lineHeight: 1.5,
                          }}
                        >
                          {generatedTagline}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={taglineState === 'running'}
                          onClick={() => void suggestTagline()}
                        >
                          {taglineState === 'running'
                            ? 'Writing…'
                            : generatedTagline
                              ? 'Try another'
                              : 'Let Pear draft it'}
                          <Sparkle size={10} />
                        </button>
                        {taglineState === 'error' && (
                          <span style={{ fontSize: 11.5, color: '#7A2D2D', alignSelf: 'center' }}>
                            Pear couldn't write one. Try once more.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {err && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: 'rgba(198,86,61,0.08)',
                        border: '1px solid rgba(198,86,61,0.22)',
                        color: '#7A2D2D',
                        fontSize: 13,
                      }}
                    >
                      {err}
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: '1px solid var(--line-soft)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStepIndex((i) => prevStepIndex(i))}
                  disabled={stepIndex === 0}
                >
                  <Icon name="arrow-left" size={14} /> Back
                </button>
                {step !== 'Review' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canContinue}
                    onClick={() => setStepIndex((i) => nextStepIndex(i))}
                  >
                    Continue <Icon name="arrow-right" size={14} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary btn-lg" disabled={!canContinue || busy} onClick={handleFinish}>
                    {busy ? 'Weaving your site…' : 'Build my site'}
                    <Pear size={14} tone="cream" shadow={false} />
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        <PearHelper step={step} />
      </div>

      {busy && <GeneratingScreen genStep={genStep} photoCount={st.photos.length} />}
    </div>
  );
}

function Row({ label, val, swatches }: { label: string; val: string; swatches?: string[] }) {
  return (
    <div style={{ background: 'var(--cream-2)', borderRadius: 12, padding: '10px 14px' }}>
      <div className="eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{val}</div>
        {swatches && swatches.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {swatches.slice(0, 5).map((c, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: c,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
