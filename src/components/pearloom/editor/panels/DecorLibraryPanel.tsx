'use client';

/* ========================================================================
   DecorLibraryPanel — the UI for the full AI decor library.

   One primary button generates the entire library (divider + six
   section stamps + confetti + footer bouquet) in parallel. Shows a
   progress row per slot, then thumbnails once each lands. Each
   thumbnail has its own "Regenerate just this one" button so users
   can iterate without paying for the whole sheet again.

   Lives inside the Theme panel today; could be its own panel later.
   ======================================================================== */

import { useCallback, useState } from 'react';
import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';

type LibrarySlot = 'divider' | 'sectionStamps' | 'confetti' | 'footerBouquet';
type Status = 'idle' | 'running' | 'ok' | 'error';

const SLOT_META: Record<LibrarySlot, { label: string; hint: string }> = {
  divider: { label: 'Section divider', hint: 'Hand-drawn ornament between every section.' },
  sectionStamps: { label: 'Section stamps', hint: 'Tiny wax-seal icons next to each block title.' },
  confetti: { label: 'RSVP confetti', hint: 'Plays once when a guest confirms.' },
  footerBouquet: { label: 'Footer flourish', hint: 'Closing bouquet above the footer.' },
};

export function DecorLibraryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const lib = manifest.decorLibrary;
  const [status, setStatus] = useState<Record<LibrarySlot, Status>>({
    divider: 'idle',
    sectionStamps: 'idle',
    confetti: 'idle',
    footerBouquet: 'idle',
  });
  const [errors, setErrors] = useState<Record<LibrarySlot, string | null>>({
    divider: null,
    sectionStamps: null,
    confetti: null,
    footerBouquet: null,
  });

  const ctx = useContext(manifest);

  const generate = useCallback(
    async (slots: LibrarySlot[]) => {
      setStatus((s) => {
        const next = { ...s };
        for (const k of slots) next[k] = 'running';
        return next;
      });
      setErrors((e) => {
        const next = { ...e };
        for (const k of slots) next[k] = null;
        return next;
      });
      try {
        const res = await fetch('/api/decor/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ctx, slots }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? String(res.status));
        }
        const raw = (await res.json()) as unknown;
        const dataObj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
        const libRaw = dataObj.library;
        // Defensive validation — accept only URLs (strings) in the
        // slots we know about; drop anything unexpected so a server
        // shape change can't poison the manifest with garbage.
        const lib: Partial<NonNullable<StoryManifest['decorLibrary']>> = {};
        if (libRaw && typeof libRaw === 'object') {
          const l = libRaw as Record<string, unknown>;
          if (typeof l.divider === 'string') lib.divider = l.divider;
          if (typeof l.confetti === 'string') lib.confetti = l.confetti;
          if (typeof l.footerBouquet === 'string') lib.footerBouquet = l.footerBouquet;
          if (l.sectionStamps && typeof l.sectionStamps === 'object') {
            const stamps: Record<string, string> = {};
            for (const [k, v] of Object.entries(l.sectionStamps as Record<string, unknown>)) {
              if (typeof v === 'string') stamps[k] = v;
            }
            if (Object.keys(stamps).length) lib.sectionStamps = stamps;
          }
          if (typeof l.updatedAt === 'string') lib.updatedAt = l.updatedAt;
        }
        onChange({
          ...manifest,
          decorLibrary: {
            ...(manifest.decorLibrary ?? {}),
            ...lib,
          },
        } as StoryManifest);
        setStatus((s) => {
          const next = { ...s };
          for (const k of slots) {
            const hit = (k === 'sectionStamps' ? lib.sectionStamps : lib[k]);
            next[k] = hit ? 'ok' : 'error';
          }
          return next;
        });
        const failures = Array.isArray(dataObj.failures) ? (dataObj.failures as string[]) : [];
        if (failures.length) {
          setErrors((e) => {
            const next = { ...e };
            for (const line of failures) {
              const slot = line.split(':')[0] as LibrarySlot;
              if (slot in next) next[slot] = line.slice(line.indexOf(':') + 1).trim();
            }
            return next;
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed';
        setErrors((e) => {
          const next = { ...e };
          for (const k of slots) next[k] = msg;
          return next;
        });
        setStatus((s) => {
          const next = { ...s };
          for (const k of slots) next[k] = 'error';
          return next;
        });
      }
    },
    [ctx, manifest, onChange],
  );

  const allSlots: LibrarySlot[] = ['divider', 'sectionStamps', 'confetti', 'footerBouquet'];

  return (
    <PanelSection
      label="Decor library (AI)"
      hint="Ask Pear to draft a full set of bespoke graphics that match your venue, palette, and occasion — divider, six section stamps, RSVP confetti, and a closing flourish."
    >
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => void generate(allSlots)}
        style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}
        disabled={Object.values(status).some((v) => v === 'running')}
      >
        {lib && Object.keys(lib).length > 1 ? 'Re-draft the whole library' : 'Draft the decor library'}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {allSlots.map((slot) => (
          <SlotTile
            key={slot}
            slot={slot}
            lib={lib}
            status={status[slot]}
            error={errors[slot]}
            onRegen={() => void generate([slot])}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 10, lineHeight: 1.5 }}>
        Each full-library draft costs one slot per piece (4 total). Individual tile regen counts against your hourly
        budget of 3 full libraries.
      </p>

      {/* Divider strength — only relevant once a divider exists. */}
      {lib?.divider && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
            Divider presence
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['subtle', 'standard', 'tall'] as const).map((s) => {
              const active = (lib?.dividerStrength ?? 'standard') === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...manifest,
                      decorLibrary: { ...(lib ?? {}), dividerStrength: s },
                    } as StoryManifest)
                  }
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: active ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                    background: active ? 'var(--cream-2)' : 'var(--card)',
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PanelSection>
  );
}

function SlotTile({
  slot,
  lib,
  status,
  error,
  onRegen,
}: {
  slot: LibrarySlot;
  lib: StoryManifest['decorLibrary'];
  status: Status;
  error: string | null;
  onRegen: () => void;
}) {
  const meta = SLOT_META[slot];
  const url =
    slot === 'sectionStamps'
      ? (Object.values(lib?.sectionStamps ?? {})[0] as string | undefined)
      : ((lib?.[slot] as string | undefined) ?? undefined);

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--line-soft)',
        background: 'var(--cream-2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          aspectRatio: '4/3',
          background: url
            ? `url(${url}) center/contain no-repeat var(--cream)`
            : 'var(--cream)',
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-muted)',
          fontSize: 12,
        }}
      >
        {!url && status === 'idle' && 'Not yet'}
        {status === 'running' && '…drawing'}
        {status === 'error' && (
          <span style={{ padding: 8, fontSize: 11, color: '#7A2D2D', textAlign: 'center' }}>{error ?? 'Failed'}</span>
        )}
      </div>
      <div style={{ padding: 10, borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{meta.label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {meta.hint}
          </div>
        </div>
        <button
          type="button"
          onClick={onRegen}
          disabled={status === 'running'}
          style={{
            border: '1px solid var(--line)',
            background: 'var(--cream)',
            color: 'var(--ink)',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            cursor: status === 'running' ? 'wait' : 'pointer',
            flexShrink: 0,
          }}
        >
          {url ? 'Redraw' : 'Draft'}
        </button>
      </div>
    </div>
  );
}

function useContext(manifest: StoryManifest) {
  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const venue = manifest.logistics?.venue ?? '';
  const theme = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
  const paletteHex = theme
    ? ([theme.background, theme.accent, theme.accentLight, theme.foreground, theme.muted].filter(Boolean) as string[])
    : undefined;
  const siteId = (manifest as unknown as { subdomain?: string }).subdomain ?? 'preview';
  const vibe = (manifest as unknown as { vibeString?: string }).vibeString ?? '';
  return { siteId, occasion, venue, paletteHex, vibe };
}
