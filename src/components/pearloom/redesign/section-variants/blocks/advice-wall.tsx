'use client';

/* Advice wall section — words for the honoree.

   Data: manifest.adviceWall  (written by AdviceWallPanel)
     { prompt?, entries?: [{ id, from, body }] }
   Prompt falls back to manifest.memorial.tributePrompt on memorial
   sites (MemorialPanel's Tribute wall group owns that field) so a
   memorial host who configured the tribute prompt there sees it
   here without re-typing. Host-seeded entries always render first.

   GUEST INTERACTIVITY (published only) — ported from the legacy
   src/components/site/AdviceWallBlock.tsx logic:
     - GET  /api/event-os/submissions?siteId&blockId → { entries }
       of approved submissions ({ from, body, at }, newest first).
       Server entries take precedence; local entries dedupe against
       them by `from|body` so a guest's own post isn't doubled once
       it comes back approved.
     - POST /api/event-os/submissions { siteId, blockId, from, body }.
       The local write happens FIRST (optimistic — the guest sees
       their note instantly, persisted under 'pearloom:advice:<slug>',
       the SAME store the legacy renderer used so one browser keeps
       its entries across both renderers). On ok, the list is
       re-fetched; { stored: false } (keyless deploy) comes back 200
       so the optimistic local entry simply stands. Non-ok (429 rate
       limit etc.) surfaces the server's warm copy; offline keeps
       the note local with a gentle note.
     - Guest name persisted under 'pearloom:guest-name' (same store
       as the toast block) so repeat contributions pre-fill.
   siteId = manifest.subdomain. blockId = 'adviceWall' (one wall per
   site in the redesign manifest).

   Editor canvas: the composer renders VISIBLE but disabled with a
   "Guests write here" chip — no reads, no writes, no fetches.

   Variants (layouts.ts): wall | cards | letters.
     wall    — staggered masonry of note cards, alternating ±1deg
               paper-scrap rotation, mono-caps author line.
     cards   — clean even grid, no rotation.
     letters — stacked letter sheets: drop-cap first letter in the
               display face + hairline dividers between letters. */

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface AdviceEntryData { id?: string; from?: string; body?: string; at?: string }

export function readAdviceWall(manifest: BlockSectionProps['manifest']): {
  prompt: string;
  entries: AdviceEntryData[];
} {
  const loose = manifest as unknown as {
    adviceWall?: { prompt?: string; entries?: AdviceEntryData[] };
    memorial?: { tributePrompt?: string };
  };
  return {
    prompt: loose.adviceWall?.prompt?.trim() || loose.memorial?.tributePrompt?.trim() || '',
    entries: Array.isArray(loose.adviceWall?.entries) ? loose.adviceWall.entries : [],
  };
}

function readSiteId(manifest: BlockSectionProps['manifest']): string {
  return (manifest.subdomain ?? '').trim();
}

/* ─── Interaction plumbing (legacy port) ─────────────────────── */

const LOCAL_PREFIX = 'pearloom:advice:';
const GUEST_NAME_STORE = 'pearloom:guest-name';
const BLOCK_ID = 'adviceWall';

/** Guest-written entry — the shape the submissions API speaks. */
interface GuestEntry { from: string; body: string; at?: string }

function readStoredGuestName(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(GUEST_NAME_STORE) ?? ''; } catch { return ''; }
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false),
    () => false,
  );
}

/** Wall sync — exact port of the legacy block's fetch / POST
 *  shapes. `enabled` is false on the editor canvas: no reads, no
 *  writes, no fetches. The localStorage key matches the legacy
 *  renderer's (`pearloom:advice:<slug>`) so one browser keeps its
 *  entries across both renderers. */
function useAdviceWall(siteId: string, enabled: boolean) {
  const canSync = enabled && Boolean(siteId);
  const storeKey = `${LOCAL_PREFIX}${siteId || 'draft'}`;
  // Lazy useState init reads localStorage once on mount — the key
  // is stable for the section's lifetime so no effect cascade.
  const [localEntries, setLocalEntries] = useState<GuestEntry[]>(() => {
    if (!enabled || typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(storeKey);
      return raw ? (JSON.parse(raw) as GuestEntry[]) : [];
    } catch { return []; }
  });
  const [serverEntries, setServerEntries] = useState<GuestEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams({ siteId, blockId: BLOCK_ID });
    const res = await fetch(`/api/event-os/submissions?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok) return null;
    return (data.entries as GuestEntry[]) ?? [];
  }, [siteId]);

  // Server sync — the approved list is authoritative. On keyless
  // deploys this is always [] so local-only behavior is untouched.
  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    fetchEntries()
      .then((entries) => { if (!cancelled && entries) setServerEntries(entries); })
      .catch(() => { /* offline, seeds + local still render */ });
    return () => { cancelled = true; };
  }, [canSync, fetchEntries]);

  const submit = async (rawFrom: string, rawBody: string): Promise<boolean> => {
    const from = rawFrom.trim();
    const body = rawBody.trim();
    if (!from || !body || !enabled) return false;
    setError(null);

    // Optimistic local write FIRST — the guest sees their own note
    // instantly even if the server is slow / offline / keyless.
    const next: GuestEntry = { from, body, at: new Date().toISOString() };
    setLocalEntries((prev) => {
      const merged = [...prev, next];
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(storeKey, JSON.stringify(merged)); } catch { /* ignore */ }
      }
      return merged;
    });
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(GUEST_NAME_STORE, from); } catch { /* ignore */ }
    }

    if (canSync) {
      try {
        const res = await fetch('/api/event-os/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, blockId: BLOCK_ID, from, body }),
        });
        // { stored: false } (Supabase unconfigured) comes back 200 —
        // the optimistic local entry simply stands. No banner.
        if (res.ok) {
          const refreshed = await fetchEntries().catch(() => null);
          if (refreshed) setServerEntries(refreshed);
        } else {
          const data = await res.json().catch(() => ({} as { error?: string }));
          if (res.status === 404) {
            // Older deploy without the event-os routes — keep the
            // local-only behavior, no banner.
          } else {
            setError(data?.error ?? 'Could not post your note just now, it’s held in this browser.');
          }
        }
      } catch {
        setError('You look offline, your note is held in this browser and will show for you here.');
      }
    }
    return true;
  };

  // Merged view — server entries authoritative; local ones a guest
  // wrote dedupe against them by from|body once approved.
  const guestEntries: GuestEntry[] = (() => {
    if (serverEntries.length === 0) return localEntries;
    const seen = new Set(serverEntries.map((e) => `${e.from}|${e.body}`));
    return [...serverEntries, ...localEntries.filter((e) => !seen.has(`${e.from}|${e.body}`))];
  })();

  return { guestEntries, submit, error };
}

/* ─── Shared bits ────────────────────────────────────────────── */

function GuestHint({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '4px 12px', borderRadius: 999,
          border: '1px dashed var(--t-line)', background: 'var(--t-card)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--t-ink-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)', flexShrink: 0 }} />
        {children}
      </span>
    </div>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        margin: '0 0 14px', padding: '10px 14px',
        borderRadius: 'var(--t-radius, 10px)',
        border: '1px solid color-mix(in oklab, var(--t-accent) 45%, transparent)',
        background: 'var(--t-accent-bg, var(--t-section))',
        color: 'var(--t-ink)', fontSize: 12.5, lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function fmtDate(at?: string): string | null {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Display entry — host seeds + guest entries normalized. */
interface WallEntry { key: string; from: string; body: string; at?: string }

function AuthorLine({ entry }: { entry: WallEntry }) {
  const date = fmtDate(entry.at);
  return (
    <div
      style={{
        marginTop: 'auto', paddingTop: 10,
        fontFamily: 'var(--t-mono)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'var(--t-ink-muted)',
      }}
    >
      , {entry.from || 'Anonymous'}
      {date && <span style={{ marginLeft: 8, opacity: 0.75 }}>· {date}</span>}
    </div>
  );
}

/* ─── Composer — prompt + name + note + "Leave your words" ───── */

function AdviceComposer({
  prompt, editable, reduced, onSubmit,
}: {
  prompt: string;
  editable: boolean;
  reduced: boolean;
  onSubmit: (from: string, body: string) => Promise<boolean>;
}) {
  const [from, setFrom] = useState(() => (editable ? '' : readStoredGuestName()));
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const canSubmit = !editable && Boolean(from.trim() && body.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onSubmit(from, body);
    if (!ok) return;
    setBody('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2400);
  };

  const fieldStyle = {
    width: '100%', padding: '9px 12px',
    borderRadius: 'var(--t-radius, 10px)',
    border: '1px solid var(--t-line)',
    background: 'var(--t-paper)', color: 'var(--t-ink)',
    fontSize: 'max(16px, 13px)', fontFamily: 'inherit',
    outline: 'none',
  } as const;

  return (
    <form
      onSubmit={submit}
      style={{
        margin: '0 auto 28px', maxWidth: 560,
        padding: 'clamp(16px, 3vw, 22px)',
        border: '1px dashed color-mix(in oklab, var(--t-accent) 55%, var(--t-line))',
        borderRadius: 'var(--t-radius-lg, 14px)',
        background: 'color-mix(in oklab, var(--t-accent) 5%, var(--t-card))',
        opacity: editable ? 0.7 : 1,
      }}
    >
      <p
        style={{
          margin: '0 0 12px',
          fontFamily: 'var(--t-display)', fontStyle: 'italic',
          fontSize: 'clamp(15.5px, 2.2vw, 17px)',
          color: 'var(--t-ink)', lineHeight: 1.45,
        }}
      >
        {prompt}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          disabled={editable}
          placeholder="Your name"
          aria-label="Your name"
          style={fieldStyle}
        />
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={editable}
          placeholder="Leave something worth re-reading."
          aria-label="Your note"
          style={{ ...fieldStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.55 }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            alignSelf: 'flex-end',
            padding: '8px 16px', borderRadius: 999,
            border: '1px solid var(--t-accent)',
            background: canSubmit || submitted ? 'var(--t-accent)' : 'transparent',
            color: canSubmit || submitted
              ? 'var(--t-accent-ink)'
              : 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
            fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'default',
            opacity: canSubmit || submitted ? 1 : 0.6,
            whiteSpace: 'nowrap',
            transition: reduced ? 'none' : 'background 160ms ease, color 160ms ease, opacity 160ms ease',
          }}
        >
          {submitted ? 'Thanks, it’s on the wall' : 'Leave your words'}
        </button>
      </div>
    </form>
  );
}

/* ─── Variant renderers ──────────────────────────────────────── */

const noteCardStyle = {
  background: 'var(--t-card)',
  border: '1px solid var(--t-line)',
  borderRadius: 'var(--t-radius-lg, 14px)',
  padding: '16px 18px',
  boxShadow: 'var(--t-shadow-sm, none)',
  display: 'flex',
  flexDirection: 'column',
} as const;

const noteBodyStyle = {
  fontSize: 13.5, color: 'var(--t-ink)', lineHeight: 1.6,
  overflowWrap: 'break-word',
} as const;

/** wall — staggered masonry, alternating ±1deg paper-scrap tilt. */
function WallVariant({ entries }: { entries: WallEntry[] }) {
  return (
    <div style={{ columns: '230px', columnGap: 14 }}>
      {entries.map((e, i) => (
        <div key={e.key} style={{ breakInside: 'avoid', marginBottom: 14 }}>
          <div
            style={{
              ...noteCardStyle,
              transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
            }}
          >
            <div style={noteBodyStyle}>{e.body}</div>
            <AuthorLine entry={e} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** cards — clean even grid, no rotation. */
function CardsVariant({ entries }: { entries: WallEntry[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
      {entries.map((e) => (
        <div key={e.key} style={noteCardStyle}>
          <div style={noteBodyStyle}>{e.body}</div>
          <AuthorLine entry={e} />
        </div>
      ))}
    </div>
  );
}

/** letters — stacked letter sheets with a display-face drop cap +
 *  hairline dividers. */
function LettersVariant({ entries }: { entries: WallEntry[] }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {entries.map((e, i) => {
        const first = e.body.charAt(0);
        const rest = e.body.slice(1);
        return (
          <article
            key={e.key}
            style={{
              padding: '22px 2px',
              borderBottom: i < entries.length - 1 ? '1px solid var(--t-line-soft)' : 'none',
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--t-ink)', lineHeight: 1.7, overflowWrap: 'break-word' }}>
              <span
                aria-hidden
                style={{
                  float: 'left',
                  fontFamily: 'var(--t-display)', fontStyle: 'italic',
                  fontSize: 44, lineHeight: 0.82,
                  marginRight: 9, marginTop: 5,
                  color: 'var(--t-accent-ink)',
                }}
              >
                {first}
              </span>
              <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                {first}
              </span>
              {rest}
            </div>
            <div style={{ clear: 'both', display: 'flex', justifyContent: 'flex-end' }}>
              <AuthorLine entry={e} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function AdviceWallSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const v: 'wall' | 'cards' | 'letters' =
    variant === 'cards' ? 'cards' : variant === 'letters' ? 'letters' : 'wall';
  const reduced = usePrefersReducedMotion();
  const siteId = readSiteId(manifest);
  const { prompt, entries: rawSeeds } = readAdviceWall(manifest);
  const { guestEntries, submit, error } = useAdviceWall(siteId, !editable);
  const seeds = rawSeeds.filter((e) => (e.body ?? '').trim());
  const empty = seeds.length === 0 && !prompt;
  if (empty && !editable) return null;

  // Host seeds first, guest entries after — both normalized.
  const entries: WallEntry[] = [
    ...seeds.map((e, i) => ({
      key: e.id ?? `seed-${i}`,
      from: (e.from ?? '').trim(),
      body: (e.body ?? '').trim(),
      at: e.at,
    })),
    ...guestEntries
      .filter((e) => (e.body ?? '').trim())
      .map((e, i) => ({ key: `guest-${e.from}-${i}`, from: e.from, body: e.body.trim(), at: e.at })),
  ];

  return (
    <BlockFrame pad={pad} background="var(--t-section)">
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'adviceWallEyebrow', 'In your words')}
        title={blockCopy(manifest, 'adviceWallTitle', 'Words for the honoree')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (val) => onEditCopy('adviceWallEyebrow', val) : undefined}
        onEditTitle={onEditCopy ? (val) => onEditCopy('adviceWallTitle', val) : undefined}
      />
      {editable && !empty && <GuestHint>Guests write here</GuestHint>}
      {empty ? (
        <BlockEmpty hint="Set a prompt or seed a few notes in the Advice wall panel." />
      ) : (
        <>
          {error && (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <AdviceComposer
            prompt={prompt || 'A piece of advice for the road ahead.'}
            editable={editable}
            reduced={reduced}
            onSubmit={submit}
          />
          {entries.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--t-ink-muted)', fontStyle: 'italic', fontSize: 13.5 }}>
              No notes yet, be the first to add one.
            </p>
          ) : v === 'wall' ? (
            <WallVariant entries={entries} />
          ) : v === 'cards' ? (
            <CardsVariant entries={entries} />
          ) : (
            <LettersVariant entries={entries} />
          )}
        </>
      )}
    </BlockFrame>
  );
}
