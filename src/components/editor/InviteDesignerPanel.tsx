'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/InviteDesignerPanel.tsx
//
// The bespoke invite designer. Pairs 12 hand-tuned archetypes
// with gpt-image-2 (released 2026-04-21) to produce actual
// painted invitations with the couple illustrated in — not
// photographic compositing, not template swaps. Also wires the
// companion surfaces: postage stamp, wax seal, postmark,
// envelope back, persistent couple avatar.
//
// Every render call lands in r2://invites/{slug}/... or
// r2://couples/{coupleId}/avatar-*.png and returns a stable URL
// the rest of the product can reference forever.
// ─────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import type { StoryManifest } from '@/types';
import { ARCHETYPES, type InviteArchetype } from '@/lib/invite-engine/archetypes';
import type { PaletteHex } from '@/lib/invite-engine/designer-prompts';
import { PanelRoot, PanelSection, panelText, panelWeight } from './panel';

interface Props {
  manifest: StoryManifest;
  subdomain?: string;
}

type RenderKind = 'archetype' | 'stamp' | 'seal' | 'postmark' | 'envelope-back' | 'avatar';

interface RenderRecord {
  kind: RenderKind;
  url: string;
  archetypeId?: string;
  at: number;
}

function paletteFromManifest(m: StoryManifest): PaletteHex {
  return {
    background: m.theme.colors.background,
    foreground: m.theme.colors.foreground,
    accent: m.theme.colors.accent,
    accentLight: m.theme.colors.accentLight,
    muted: m.theme.colors.muted,
  };
}

function formatCoupleNames(m: StoryManifest): string {
  const pair = m.names ?? ['', ''];
  const names = pair.filter(Boolean);
  if (names.length === 0) return 'The Hosts';
  if (names.length === 1) return names[0];
  return `${names[0]} & ${names[1]}`;
}

function formatEventDate(m: StoryManifest): string {
  const iso = m.logistics?.date;
  if (!iso) return 'Date to come';
  try {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buf = await file.arrayBuffer();
  const binary = Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join('');
  return { base64: btoa(binary), mimeType: file.type || 'image/jpeg' };
}

export function InviteDesignerPanel({ manifest, subdomain }: Props) {
  const palette = useMemo(() => paletteFromManifest(manifest), [manifest]);
  const names = useMemo(() => formatCoupleNames(manifest), [manifest]);
  const date = useMemo(() => formatEventDate(manifest), [manifest]);
  const venue = manifest.logistics?.venue;
  const city = manifest.logistics?.venueAddress?.split(',').slice(-2)[0]?.trim();
  const occasion = manifest.occasion ?? 'wedding';
  const siteSlug = subdomain ?? manifest.subdomain ?? manifest.coupleId ?? 'site';

  const [portrait, setPortrait] = useState<{ base64: string; mimeType: string } | null>(null);
  const [selected, setSelected] = useState<InviteArchetype | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [records, setRecords] = useState<RenderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pushRecord = useCallback((r: RenderRecord) => {
    setRecords((prev) => [r, ...prev].slice(0, 12));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Upload an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Photo must be under 12 MB.');
      return;
    }
    setError(null);
    try {
      const p = await fileToBase64(file);
      setPortrait(p);
    } catch {
      setError('Could not read that image.');
    }
  }, []);

  const renderArchetype = useCallback(async (archetype: InviteArchetype) => {
    setBusy(archetype.id);
    setError(null);
    try {
      const res = await fetch('/api/invite/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: archetype.id,
          siteSlug,
          names,
          date,
          venue,
          city,
          occasionLabel: occasion,
          palette,
          portrait: portrait ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Render failed.');
      pushRecord({ kind: 'archetype', url: data.url, archetypeId: archetype.id, at: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render failed.');
    } finally {
      setBusy(null);
    }
  }, [city, date, names, occasion, palette, portrait, pushRecord, siteSlug, venue]);

  const renderCompanion = useCallback(async (kind: 'stamp' | 'seal' | 'postmark' | 'envelope-back') => {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          names,
          date,
          city,
          palette,
          occasionLabel: occasion,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Render failed.');
      pushRecord({ kind, url: data.url, at: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render failed.');
    } finally {
      setBusy(null);
    }
  }, [city, date, names, occasion, palette, pushRecord, siteSlug]);

  const mintAvatar = useCallback(async () => {
    // vibeSkin doesn't embed coupleProfile in its final shape, so we
    // build a sensible prompt from what the manifest has and let
    // the render prompt builder layer painterly instructions on top.
    const illustrationPrompt =
      `Painted character illustration of ${names} — soft brushwork, warm natural light, editorial wedding illustration style. Vibe: ${manifest.vibeString || 'warm and timeless'}.`;
    setBusy('avatar');
    setError(null);
    try {
      const res = await fetch('/api/invite/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          coupleId: manifest.coupleId,
          illustrationPrompt,
          palette,
          portrait: portrait ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Avatar mint failed.');
      pushRecord({ kind: 'avatar', url: data.url, at: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar mint failed.');
    } finally {
      setBusy(null);
    }
  }, [manifest.coupleId, manifest.vibeString, names, palette, portrait, pushRecord, siteSlug]);

  return (
    <PanelRoot>
      <PanelSection
        title="Invite designer"
        hint="Twelve archetypes, painted by gpt-image-2 in your palette. Upload a couple portrait and we’ll paint you into the scene — or leave it blank for a bespoke setting."
      >
        {/* ── Portrait upload ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              border: '1px solid var(--pl-chrome-border)',
              borderRadius: 'var(--pl-radius-md)',
              cursor: 'pointer',
              fontSize: panelText.hint,
              fontWeight: panelWeight.medium,
              background: portrait ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
              color: 'var(--pl-chrome-text)',
            }}
          >
            {portrait ? 'Portrait attached — replace' : 'Attach couple portrait'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
          </label>
          {portrait && (
            <button
              type="button"
              onClick={() => setPortrait(null)}
              style={{
                fontSize: panelText.hint,
                color: 'var(--pl-chrome-text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              remove
            </button>
          )}
        </div>

        {/* ── Archetype grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          {ARCHETYPES.map((a) => {
            const isBusy = busy === a.id;
            const isSelected = selected?.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelected(a);
                  void renderArchetype(a);
                }}
                disabled={Boolean(busy)}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  border: `1px solid ${isSelected ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-border)'}`,
                  background: 'var(--pl-chrome-surface)',
                  borderRadius: 'var(--pl-radius-md)',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy && !isBusy ? 0.55 : 1,
                  transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out)',
                }}
              >
                <div style={{ fontSize: panelText.body, fontWeight: panelWeight.semibold, color: 'var(--pl-chrome-text)' }}>
                  {a.label}
                </div>
                <div style={{ fontSize: panelText.hint, color: 'var(--pl-chrome-text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                  {a.blurb}
                </div>
                <div style={{ fontSize: panelText.hint, color: 'var(--pl-chrome-accent)', marginTop: 8 }}>
                  {isBusy ? 'Painting…' : a.supportsPortrait && portrait ? 'Paint me in' : 'Render'}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--pl-warning-mist)', color: 'var(--pl-warning)', borderRadius: 'var(--pl-radius-sm)', fontSize: panelText.hint }}>
            {error}
          </div>
        )}
      </PanelSection>

      {/* ── Companion renders ── */}
      <PanelSection
        title="Companion elements"
        hint="Stack these on any invite to make it feel commissioned — stamp, wax seal, postmark, envelope back."
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['stamp', 'seal', 'postmark', 'envelope-back'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => renderCompanion(kind)}
              disabled={Boolean(busy)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--pl-chrome-border)',
                background: 'var(--pl-chrome-surface)',
                color: 'var(--pl-chrome-text)',
                borderRadius: 'var(--pl-radius-sm)',
                fontSize: panelText.hint,
                fontWeight: panelWeight.medium,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy && busy !== kind ? 0.6 : 1,
              }}
            >
              {busy === kind ? `${kind}…` : `Render ${kind}`}
            </button>
          ))}
        </div>
      </PanelSection>

      {/* ── Persistent avatar ── */}
      <PanelSection
        title="Couple avatar"
        hint="Paint the couple once. Reuse the same character across invite, save-the-date, RSVP, thank-you, and the anniversary recap."
      >
        <button
          type="button"
          onClick={() => void mintAvatar()}
          disabled={Boolean(busy)}
          className="pl-pearl-accent"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-full)',
            fontSize: panelText.body,
            fontWeight: panelWeight.semibold,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy === 'avatar' ? 'Painting…' : portrait ? 'Mint from portrait' : 'Mint from description'}
        </button>
      </PanelSection>

      {/* ── Render history ── */}
      {records.length > 0 && (
        <PanelSection
          title="Recent renders"
          hint="Click any render to copy its URL. Everything is stored in R2 — safe to reference from other blocks."
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
            {records.map((r) => (
              <button
                key={`${r.kind}-${r.at}`}
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
                    void navigator.clipboard.writeText(r.url);
                  }
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '3/4',
                  padding: 0,
                  border: '1px solid var(--pl-chrome-border)',
                  borderRadius: 'var(--pl-radius-sm)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'var(--pl-chrome-surface)',
                }}
              >
                <Image
                  src={r.url}
                  alt={r.archetypeId ?? r.kind}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
                <span
                  style={{
                    position: 'absolute',
                    left: 4,
                    bottom: 4,
                    padding: '2px 6px',
                    fontSize: panelText.hint,
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    borderRadius: 'var(--pl-radius-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {r.archetypeId ?? r.kind}
                </span>
              </button>
            ))}
          </div>
        </PanelSection>
      )}
    </PanelRoot>
  );
}
