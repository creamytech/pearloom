'use client';

/* ========================================================================
   DecorLibraryPanel — couple-side admin for the AI decor library.

   v9 upgrades over the original 1-shot black box:
   - Custom prompt composer per slot — user dictates exactly what
     gets drawn ("a single olive sprig" vs "trailing ivy"). The
     auto-context (palette, occasion, venue) still wraps the prompt.
   - × remove on every slot — clears just that piece.
   - Alternates strip per slot — every successful draft is saved
     (capped 5 per slot). Click a thumb to revert; "+ Show another"
     keeps the current piece active and adds a new alternate.
   - Per-slot error + isolated-warning surfacing, so the user knows
     when the white-flood post-process couldn't isolate the cutout
     and they should retry with a clearer prompt.
   ======================================================================== */

import { useCallback, useState } from 'react';
import type { StoryManifest, DecorDraft, SectionStampsDraft } from '@/types';
import { PanelSection } from '../atoms';
import { Icon } from '../../motifs';
import { getVenueMotifs, describeVenueMatch, type VenueMotif } from '@/lib/decor/venue-motifs';
import {
  DecorPromptComposer,
  DecorAlternatesStrip,
  pushDraft,
  pushSectionStampsDraft,
  buildAutoSummary,
} from './decor-shared';

type LibrarySlot = 'divider' | 'sectionStamps' | 'confetti' | 'footerBouquet';
type Status = 'idle' | 'running' | 'ok' | 'error';

const SLOT_META: Record<LibrarySlot, { label: string; hint: string; aspect: '5/2' | '1/1' | '2/3' | '3/2' }> = {
  divider: { label: 'Section divider', hint: 'Hand-drawn ornament between every section.', aspect: '5/2' },
  sectionStamps: { label: 'Section stamps', hint: 'Tiny wax-seal icons next to each block title.', aspect: '3/2' },
  confetti: { label: 'RSVP confetti', hint: 'Plays once when a guest confirms.', aspect: '1/1' },
  footerBouquet: { label: 'Footer flourish', hint: 'Closing bouquet above the footer.', aspect: '2/3' },
};

export function DecorLibraryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const lib = manifest.decorLibrary;
  const drafts = manifest.decorDrafts ?? {};
  const ctx = useContext(manifest);

  const [status, setStatus] = useState<Record<LibrarySlot, Status>>({
    divider: 'idle', sectionStamps: 'idle', confetti: 'idle', footerBouquet: 'idle',
  });
  const [errors, setErrors] = useState<Record<LibrarySlot, string | null>>({
    divider: null, sectionStamps: null, confetti: null, footerBouquet: null,
  });
  const [customPrompts, setCustomPrompts] = useState<Record<LibrarySlot, string>>({
    divider: '', sectionStamps: '', confetti: '', footerBouquet: '',
  });

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
        const slotPrompts: Partial<Record<LibrarySlot, string>> = {};
        for (const k of slots) {
          const p = customPrompts[k]?.trim();
          if (p) slotPrompts[k] = p;
        }
        const res = await fetch('/api/decor/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...ctx, slots,
            customPrompts: Object.keys(slotPrompts).length ? slotPrompts : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? String(res.status));
        }
        const raw = (await res.json()) as unknown;
        const dataObj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
        const libRaw = dataObj.library;
        const promptsRaw = (dataObj.prompts as Record<string, string>) || {};

        // Validate library shape — accept only known keys + string URLs.
        const incoming: Partial<NonNullable<StoryManifest['decorLibrary']>> = {};
        if (libRaw && typeof libRaw === 'object') {
          const l = libRaw as Record<string, unknown>;
          if (typeof l.divider === 'string') incoming.divider = l.divider;
          if (typeof l.confetti === 'string') incoming.confetti = l.confetti;
          if (typeof l.footerBouquet === 'string') incoming.footerBouquet = l.footerBouquet;
          if (l.sectionStamps && typeof l.sectionStamps === 'object') {
            const stamps: Record<string, string> = {};
            for (const [k, v] of Object.entries(l.sectionStamps as Record<string, unknown>)) {
              if (typeof v === 'string') stamps[k] = v;
            }
            if (Object.keys(stamps).length) incoming.sectionStamps = stamps;
          }
          if (typeof l.updatedAt === 'string') incoming.updatedAt = l.updatedAt;
        }

        // Update manifest: live URLs go into decorLibrary, history into
        // decorDrafts. Each slot's draft is keyed by the per-slot prompt.
        const nextDrafts = { ...(manifest.decorDrafts ?? {}) };
        const ts = new Date().toISOString();
        for (const k of slots) {
          if (k === 'sectionStamps' && incoming.sectionStamps) {
            const draft: SectionStampsDraft = {
              id: `stamps-${Date.now()}`,
              stamps: { ...incoming.sectionStamps },
              prompt: promptsRaw.sectionStamps ?? '',
              customPrompt: slotPrompts.sectionStamps,
              createdAt: ts,
            };
            nextDrafts.sectionStamps = pushSectionStampsDraft(nextDrafts.sectionStamps, draft);
          } else if (k !== 'sectionStamps' && typeof incoming[k] === 'string') {
            const draft: DecorDraft = {
              id: `${k}-${Date.now()}`,
              url: incoming[k] as string,
              prompt: promptsRaw[k] ?? '',
              customPrompt: slotPrompts[k],
              createdAt: ts,
            };
            const key = k as 'divider' | 'confetti' | 'footerBouquet';
            nextDrafts[key] = pushDraft(nextDrafts[key], draft);
          }
        }

        onChange({
          ...manifest,
          decorLibrary: { ...(manifest.decorLibrary ?? {}), ...incoming },
          decorDrafts: nextDrafts,
        } as StoryManifest);

        setStatus((s) => {
          const next = { ...s };
          for (const k of slots) {
            const hit = (k === 'sectionStamps' ? incoming.sectionStamps : incoming[k]);
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
    [ctx, customPrompts, manifest, onChange],
  );

  function clearSlot(slot: LibrarySlot) {
    const next = { ...(manifest.decorLibrary ?? {}) };
    if (slot === 'sectionStamps') delete next.sectionStamps;
    else delete next[slot];
    onChange({ ...manifest, decorLibrary: next } as StoryManifest);
  }

  function pickDraft(slot: 'divider' | 'confetti' | 'footerBouquet', d: DecorDraft) {
    onChange({
      ...manifest,
      decorLibrary: { ...(manifest.decorLibrary ?? {}), [slot]: d.url },
    } as StoryManifest);
    setCustomPrompts((p) => ({ ...p, [slot]: d.customPrompt ?? '' }));
  }

  function deleteDraft(slot: 'divider' | 'confetti' | 'footerBouquet', d: DecorDraft) {
    const list = drafts[slot] ?? [];
    const next = list.filter((x) => x.id !== d.id);
    const isActive = manifest.decorLibrary?.[slot] === d.url;
    onChange({
      ...manifest,
      decorLibrary: {
        ...(manifest.decorLibrary ?? {}),
        [slot]: isActive ? next[0]?.url : manifest.decorLibrary?.[slot],
      },
      decorDrafts: { ...(manifest.decorDrafts ?? {}), [slot]: next },
    } as StoryManifest);
  }

  function pickStampsDraft(d: SectionStampsDraft) {
    onChange({
      ...manifest,
      decorLibrary: {
        ...(manifest.decorLibrary ?? {}),
        sectionStamps: { ...d.stamps },
      },
    } as StoryManifest);
    setCustomPrompts((p) => ({ ...p, sectionStamps: d.customPrompt ?? '' }));
  }

  function deleteStampsDraft(d: SectionStampsDraft) {
    const list = drafts.sectionStamps ?? [];
    const next = list.filter((x) => x.id !== d.id);
    const activeStamps = manifest.decorLibrary?.sectionStamps;
    const someUrlMatches = activeStamps && Object.values(activeStamps).some(
      (u) => Object.values(d.stamps).includes(u as string),
    );
    onChange({
      ...manifest,
      decorLibrary: {
        ...(manifest.decorLibrary ?? {}),
        sectionStamps: someUrlMatches ? next[0]?.stamps : activeStamps,
      },
      decorDrafts: { ...(manifest.decorDrafts ?? {}), sectionStamps: next },
    } as StoryManifest);
  }

  const allSlots: LibrarySlot[] = ['divider', 'sectionStamps', 'confetti', 'footerBouquet'];

  // Venue-aware motif suggestions. When the venue string matches a
  // known archetype (desert, vineyard, beach, mountain, ...), Pear
  // surfaces 3-5 motif chips. Click a chip to drop its prompt into
  // ALL slot prompts at once — clicking again clears it.
  const heuristicMotifs = getVenueMotifs(ctx.venue);
  const venueMatchLabel = describeVenueMatch(ctx.venue);

  // AI fallback — when the heuristic doesn't match, the user can
  // ask Pear directly. Loaded on demand, cached in component state.
  const [aiMotifs, setAiMotifs] = useState<VenueMotif[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const venueMotifs = heuristicMotifs ?? aiMotifs;

  async function askPearForMotifs() {
    if (!ctx.venue || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/decor/venue-motifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: ctx.venue, occasion: ctx.occasion, vibe: ctx.vibe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data && data.error) || 'Pear couldn\'t pull motifs.');
      setAiMotifs(data.motifs as VenueMotif[]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Pear is unreachable.');
    } finally {
      setAiLoading(false);
    }
  }

  function applyMotifToAllSlots(motif: VenueMotif) {
    setCustomPrompts((p) => {
      // Toggle: if every slot already has this motif's prompt,
      // clear them; otherwise apply to all four.
      const allMatch = allSlots.every((s) => p[s] === motif.prompt);
      const next: Record<LibrarySlot, string> = { ...p };
      for (const s of allSlots) next[s] = allMatch ? '' : motif.prompt;
      return next;
    });
  }

  return (
    <PanelSection
      label="Decor library (AI)"
      hint="Ask Pear to draft a full set of bespoke graphics that match your venue, palette, and occasion — divider, six section stamps, RSVP confetti, and a closing flourish. All pieces ship with transparent backgrounds."
    >
      {!ctx.venue && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: 'var(--cream-2)',
            border: '1px dashed var(--line-soft)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <Icon name="pin" size={13} />
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Set a venue first.</span> Pear pulls motif
            suggestions (Joshua trees, cypress, palm fronds…) from the Hero panel's venue field.
          </div>
        </div>
      )}
      {ctx.venue && !venueMotifs && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
          }}
        >
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>"{ctx.venue}"</span> didn't match a known
            archetype. Ask Pear to read your venue and propose motifs, or write a custom prompt below.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void askPearForMotifs()}
              disabled={aiLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--ink)',
                color: 'var(--cream)',
                border: 'none',
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: 'var(--font-ui)',
                cursor: aiLoading ? 'wait' : 'pointer',
              }}
            >
              <Icon name="sparkles" size={11} />
              {aiLoading ? 'Pear is thinking…' : 'Ask Pear for ideas'}
            </button>
            {aiError && (
              <span style={{ fontSize: 11, color: '#7A2D2D' }}>{aiError}</span>
            )}
          </div>
        </div>
      )}
      {venueMotifs && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: 'var(--peach-bg, #FCE6D7)',
            border: '1px solid var(--peach-2, #F4C7A4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              marginBottom: 6,
            }}
          >
            <Icon name="sparkles" size={11} />
            {heuristicMotifs
              ? `Pear sees: ${venueMatchLabel ?? 'a venue with character'}`
              : `Pear's picks for ${ctx.venue}`}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>
            Click a motif and Pear will fold it into every piece in the next draft.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {venueMotifs.map((m) => {
              const active = allSlots.every((s) => customPrompts[s] === m.prompt);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => applyMotifToAllSlots(m)}
                  title={m.prompt}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: active ? 'var(--peach-ink, #C6703D)' : 'var(--cream, #FBF7EE)',
                    color: active ? '#fff' : 'var(--ink)',
                    border: active ? '1px solid var(--peach-ink, #C6703D)' : '1px solid var(--line-soft)',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    transition: 'background 160ms ease, color 160ms ease',
                  }}
                >
                  {active ? '✓ ' : ''}{m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => void generate(allSlots)}
        style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}
        disabled={Object.values(status).some((v) => v === 'running')}
      >
        {lib && Object.keys(lib).length > 1 ? 'Re-draft the whole library' : 'Draft the decor library'}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
        {allSlots.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            lib={lib}
            status={status[slot]}
            error={errors[slot]}
            customPrompt={customPrompts[slot]}
            onCustomPromptChange={(v) => setCustomPrompts((p) => ({ ...p, [slot]: v }))}
            onRegen={() => void generate([slot])}
            onClear={() => clearSlot(slot)}
            ctx={ctx}
            drafts={
              slot === 'sectionStamps'
                ? (drafts.sectionStamps ?? [])
                : (drafts[slot as 'divider' | 'confetti' | 'footerBouquet'] ?? [])
            }
            onPickDraft={(d) => {
              if (slot === 'sectionStamps') pickStampsDraft(d as SectionStampsDraft);
              else pickDraft(slot as 'divider' | 'confetti' | 'footerBouquet', d as DecorDraft);
            }}
            onDeleteDraft={(d) => {
              if (slot === 'sectionStamps') deleteStampsDraft(d as SectionStampsDraft);
              else deleteDraft(slot as 'divider' | 'confetti' | 'footerBouquet', d as DecorDraft);
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 12, lineHeight: 1.5 }}>
        Each full-library draft makes 4 generations. Per-slot regen + alternates count against your hourly budget of 3 full libraries.
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
                    flex: 1, padding: '6px 10px', borderRadius: 8,
                    border: active ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                    background: active ? 'var(--cream-2)' : 'var(--card)',
                    fontSize: 12, fontWeight: active ? 700 : 500, color: 'var(--ink)',
                    cursor: 'pointer', textTransform: 'capitalize',
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

interface SlotCardProps {
  slot: LibrarySlot;
  lib: StoryManifest['decorLibrary'];
  status: Status;
  error: string | null;
  customPrompt: string;
  onCustomPromptChange: (v: string) => void;
  onRegen: () => void;
  onClear: () => void;
  ctx: { occasion: string; venue?: string; vibe?: string };
  drafts: DecorDraft[] | SectionStampsDraft[];
  onPickDraft: (d: DecorDraft | SectionStampsDraft) => void;
  onDeleteDraft: (d: DecorDraft | SectionStampsDraft) => void;
}

function SlotCard({
  slot, lib, status, error, customPrompt, onCustomPromptChange,
  onRegen, onClear, ctx, drafts, onPickDraft, onDeleteDraft,
}: SlotCardProps) {
  const meta = SLOT_META[slot];
  const url =
    slot === 'sectionStamps'
      ? (Object.values(lib?.sectionStamps ?? {})[0] as string | undefined)
      : ((lib?.[slot] as string | undefined) ?? undefined);

  // Adapt drafts to a uniform DecorDraft shape for the strip view —
  // sectionStamps draft uses its first stamp as the thumbnail.
  const stripDrafts: DecorDraft[] = drafts.map((d) => {
    if ('stamps' in d) {
      const firstUrl = Object.values(d.stamps).find((v): v is string => typeof v === 'string') ?? '';
      return {
        id: d.id, url: firstUrl, prompt: d.prompt,
        customPrompt: d.customPrompt, createdAt: d.createdAt,
      };
    }
    return d;
  });

  return (
    <div
      style={{
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--line-soft)', background: 'var(--card)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, padding: 10 }}>
        <div
          style={{
            flexShrink: 0, width: 96, aspectRatio: meta.aspect,
            borderRadius: 8, position: 'relative',
            background: url
              ? `url(${url}) center/contain no-repeat var(--cream-2)`
              : 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            display: 'grid', placeItems: 'center',
            color: 'var(--ink-muted)', fontSize: 10,
          }}
        >
          {!url && status === 'idle' && 'Not yet'}
          {status === 'running' && '…drawing'}
          {status === 'error' && (
            <span style={{ padding: 6, fontSize: 10, color: '#7A2D2D', textAlign: 'center', lineHeight: 1.3 }}>
              {error ?? 'Failed'}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.35 }}>{meta.hint}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <button
              type="button"
              onClick={onRegen}
              disabled={status === 'running'}
              style={{
                border: '1px solid var(--ink)', background: 'var(--ink)',
                color: 'var(--cream)', padding: '5px 12px',
                borderRadius: 999, fontSize: 11, fontWeight: 600,
                cursor: status === 'running' ? 'wait' : 'pointer',
              }}
            >
              {url ? 'Redraw' : 'Draft'}
            </button>
            {url && (
              <button
                type="button"
                onClick={onClear}
                disabled={status === 'running'}
                style={{
                  border: '1px solid var(--line)', background: 'var(--card)',
                  color: 'var(--ink)', padding: '5px 12px',
                  borderRadius: 999, fontSize: 11, fontWeight: 600,
                  cursor: status === 'running' ? 'wait' : 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 10px 10px' }}>
        <DecorPromptComposer
          value={customPrompt}
          onChange={onCustomPromptChange}
          autoSummary={buildAutoSummary(ctx)}
          disabled={status === 'running'}
          label={`${meta.label} — direction (optional)`}
        />
        <DecorAlternatesStrip
          drafts={stripDrafts}
          activeUrl={url}
          onSelect={(d) => onPickDraft(drafts.find((x) => x.id === d.id) ?? d)}
          onDelete={(d) => onDeleteDraft(drafts.find((x) => x.id === d.id) ?? d)}
          onAlternate={onRegen}
          busy={status === 'running'}
          aspect={meta.aspect === '5/2' ? '5/2' : meta.aspect === '2/3' ? '2/3' : meta.aspect === '3/2' ? '3/2' : '1/1'}
        />
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
