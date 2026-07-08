'use client';

/* Tribute wall section — approved guest tributes + an inline
   composer. The memorial's signature block; also the default wall
   for retirement / milestone-birthday / graduation (and optional
   for funeral / reunion) per the EVENT_TYPES registry.

   Data:
     manifest.tributeWall  (written by TributeWallPanel)
       { prompt?, composerOpen? }
     Prompt falls back to manifest.memorial.tributePrompt on
     memorial sites (the Memorial workspace owns that field), then
     to the occasion pack's tributePrompt (occasion-copy.ts —
     "Share a memory" for solemn sites, "Leave a story" for
     retirements, "Leave a few words" otherwise). composerOpen
     falls back to memorial.tributeWallOpen the same way, so the
     Memorial workspace's "Tribute wall open" toggle keeps working.

   GUEST LOOP (published only) — the moderated sibling of
   advice-wall.tsx:
     - GET  /api/event-os/submissions?siteId&blockId=tributeWall
       → { entries: [{ from, body, at }] } of APPROVED rows only
       (author name + body + created_at — the route never returns
       emails or moderation state).
     - POST /api/event-os/submissions { siteId, blockId, from, body }
       → row lands in tribute_submissions awaiting the host at
       /dashboard/submissions. UNLIKE the advice wall there is NO
       optimistic wall entry: tributes appear only once approved,
       and the confirmation copy says so (occasion pack's
       tributeConfirm). Guest name persists under
       'pearloom:guest-name' (shared with the advice + toast
       blocks) so repeat contributions pre-fill.
   siteId = manifest.subdomain. blockId = 'tributeWall' — distinct
   from the advice wall's 'adviceWall' so the two walls never
   cross-pollinate in tribute_submissions.

   Editor canvas: two/three demo tributes (gated by `editable`
   ONLY — published sites render exclusively approved guest rows)
   + the composer visible but disabled under a "Guests write here"
   chip. No reads, no writes, no fetches on the canvas.

   Variants (layouts.ts): columns | rows.
     columns — masonry-ish CSS columns of hairline-framed cards.
     rows    — a single quiet centered column. */

import { useEffect, useState, type FormEvent } from 'react';
import { occasionCopyFor } from '../../occasion-copy';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, blockCopy, type BlockSectionProps } from './_shared';

const BLOCK_ID = 'tributeWall';
const GUEST_NAME_STORE = 'pearloom:guest-name';

/* Mirrors panels/blocks/_shared isMemorialOccasion — duplicated so
   the renderer tree never imports the editor panel tree. */
function isSolemnOccasion(occasion?: string): boolean {
  return occasion === 'memorial' || occasion === 'funeral';
}

export interface TributeWallConfig {
  prompt: string;
  composerOpen: boolean;
  confirm: string;
  solemn: boolean;
}

export function readTributeWall(manifest: BlockSectionProps['manifest']): TributeWallConfig {
  const loose = manifest as unknown as {
    occasion?: string;
    tributeWall?: { prompt?: string; composerOpen?: boolean };
    memorial?: { tributePrompt?: string; tributeWallOpen?: boolean };
  };
  const pack = occasionCopyFor(loose.occasion);
  return {
    prompt:
      loose.tributeWall?.prompt?.trim()
      || loose.memorial?.tributePrompt?.trim()
      || pack.tributePrompt,
    composerOpen: loose.tributeWall?.composerOpen ?? loose.memorial?.tributeWallOpen ?? true,
    confirm: pack.tributeConfirm,
    solemn: isSolemnOccasion(loose.occasion),
  };
}

/** Approved tribute — the shape the submissions API returns. */
interface TributeEntry { from: string; body: string; at?: string }

function readStoredGuestName(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(GUEST_NAME_STORE) ?? ''; } catch { return ''; }
}

/** First name only — the wall signs quietly (matches the
 *  first-names-only posture of familiarFacesForPerson). */
function firstNameOf(from: string): string {
  return from.trim().split(/\s+/)[0] || 'A guest';
}

/* ─── Approved-wall sync (published only) ────────────────────── */

function useApprovedTributes(siteId: string, enabled: boolean) {
  const canSync = enabled && Boolean(siteId);
  const [entries, setEntries] = useState<TributeEntry[]>([]);
  /* 'threading' only while a real fetch is possibly in flight —
     the editor canvas and keyless deploys resolve immediately. */
  const [threading, setThreading] = useState(canSync);

  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    const params = new URLSearchParams({ siteId, blockId: BLOCK_ID });
    fetch(`/api/event-os/submissions?${params}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.entries)) setEntries(data.entries as TributeEntry[]);
        setThreading(false);
      })
      .catch(() => { if (!cancelled) setThreading(false); });
    return () => { cancelled = true; };
  }, [canSync, siteId]);

  return { entries, threading };
}

/* ─── Composer ───────────────────────────────────────────────── */

function TributeComposer({
  prompt, confirm, editable, siteId,
}: {
  prompt: string;
  confirm: string;
  editable: boolean;
  siteId: string;
}) {
  const [from, setFrom] = useState(() => (editable ? '' : readStoredGuestName()));
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = !editable && !sending && Boolean(from.trim() && body.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/event-os/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, blockId: BLOCK_ID, from: from.trim(), body: body.trim() }),
      });
      if (res.ok) {
        /* { stored: false } (keyless deploy) still confirms — the
           note was received as far as the guest can know. */
        setBody('');
        setConfirmed(true);
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem(GUEST_NAME_STORE, from.trim()); } catch { /* ignore */ }
        }
      } else {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setError(data?.error ?? 'Your words didn’t go through just now — please try again in a moment.');
      }
    } catch {
      setError('You look offline — your words didn’t go through. Please try again in a moment.');
    } finally {
      setSending(false);
    }
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
        margin: '0 auto 30px', maxWidth: 560,
        padding: 'clamp(16px, 3vw, 22px)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        background: 'var(--t-card)',
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
      {error && (
        <div
          role="alert"
          style={{
            margin: '0 0 10px', padding: '9px 12px',
            borderRadius: 'var(--t-radius, 10px)',
            border: '1px solid color-mix(in oklab, var(--t-accent) 45%, transparent)',
            background: 'var(--t-accent-bg, var(--t-section))',
            color: 'var(--t-ink)', fontSize: 12.5, lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}
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
          placeholder="In your own words."
          aria-label="Your tribute"
          style={{ ...fieldStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.55 }}
        />
        {confirmed ? (
          <p
            role="status"
            style={{
              margin: 0, paddingTop: 2, textAlign: 'right',
              fontFamily: 'var(--t-display)', fontStyle: 'italic',
              fontSize: 13.5, color: 'var(--t-ink-soft)', lineHeight: 1.5,
            }}
          >
            {confirm}
          </p>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              alignSelf: 'flex-end',
              padding: '8px 16px', borderRadius: 999,
              border: '1px solid var(--t-accent)',
              background: canSubmit ? 'var(--t-accent)' : 'transparent',
              color: canSubmit
                ? 'var(--t-accent-ink)'
                : 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
              fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              cursor: canSubmit ? 'pointer' : 'default',
              opacity: canSubmit ? 1 : 0.6,
              whiteSpace: 'nowrap',
            }}
          >
            {sending ? 'Sending…' : 'Add your words'}
          </button>
        )}
      </div>
    </form>
  );
}

/* ─── Wall cards ─────────────────────────────────────────────── */

function TributeCard({ entry }: { entry: TributeEntry }) {
  return (
    <figure
      style={{
        margin: 0,
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <blockquote
        style={{
          margin: 0, fontSize: 13.5, color: 'var(--t-ink)',
          lineHeight: 1.65, overflowWrap: 'break-word',
        }}
      >
        {entry.body}
      </blockquote>
      <figcaption
        style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid var(--t-line-soft)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--t-mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--t-ink-muted)',
        }}
      >
        <span
          aria-hidden
          style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-gold, var(--t-accent))', flexShrink: 0 }}
        />
        {firstNameOf(entry.from)}
      </figcaption>
    </figure>
  );
}

/** columns — masonry-ish CSS columns of framed tributes. */
function ColumnsVariant({ entries }: { entries: TributeEntry[] }) {
  return (
    <div style={{ columns: '250px', columnGap: 16 }}>
      {entries.map((e, i) => (
        <div key={`${e.from}-${i}`} style={{ breakInside: 'avoid', marginBottom: 16 }}>
          <TributeCard entry={e} />
        </div>
      ))}
    </div>
  );
}

/** rows — a single quiet centered column. */
function RowsVariant({ entries }: { entries: TributeEntry[] }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {entries.map((e, i) => (
        <TributeCard key={`${e.from}-${i}`} entry={e} />
      ))}
    </div>
  );
}

/* ─── Demo tributes — EDITOR CANVAS ONLY (honesty rule: gated by
   `editable`; published sites render approved rows exclusively). ─ */

const DEMO_SOLEMN: TributeEntry[] = [
  { from: 'Ruth', body: 'She kept every letter I ever sent her, and answered each one within the week. I still write the way she taught me to.' },
  { from: 'Daniel', body: 'Sunday dinners, the radio on, one more story before anyone was allowed to leave. I would give a great deal for one more.' },
];

const DEMO_CELEBRATORY: TributeEntry[] = [
  { from: 'Maya', body: 'Twenty years of desk-side pep talks and truly terrible puns. We were lucky to have every one of them.' },
  { from: 'Sam', body: 'You showed the rest of us what it looks like to do the work and love the people. Nobody did it better.' },
  { from: 'Priya', body: 'Here’s to the years ahead — you’ve more than earned every one of them.' },
];

/* ─── Section ────────────────────────────────────────────────── */

export function TributeWallSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const v: 'columns' | 'rows' = variant === 'rows' ? 'rows' : 'columns';
  const siteId = ((manifest.subdomain ?? '') as string).trim();
  const { prompt, composerOpen, confirm, solemn } = readTributeWall(manifest);
  const { entries: approved, threading } = useApprovedTributes(siteId, !editable);

  /* Published + composer closed + nothing approved → nothing to
     show; guests never see scaffolding. */
  if (!editable && !composerOpen && approved.length === 0 && !threading) return null;

  const entries: TributeEntry[] = editable
    ? (solemn ? DEMO_SOLEMN : DEMO_CELEBRATORY)
    : approved;

  return (
    <BlockFrame pad={pad} background="var(--t-section)">
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'tributeWallEyebrow', solemn ? 'In their memory' : 'In your words')}
        title={blockCopy(manifest, 'tributeWallTitle', solemn ? 'Tributes' : 'The tribute wall')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (val) => onEditCopy('tributeWallEyebrow', val) : undefined}
        onEditTitle={onEditCopy ? (val) => onEditCopy('tributeWallTitle', val) : undefined}
      />
      {editable && composerOpen && (
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
            Guests write here — you approve before it shows
          </span>
        </div>
      )}
      {composerOpen && (
        <TributeComposer prompt={prompt} confirm={confirm} editable={editable} siteId={siteId} />
      )}
      {threading ? (
        <p style={{ textAlign: 'center', color: 'var(--t-ink-muted)', fontStyle: 'italic', fontSize: 13.5 }}>
          One moment…
        </p>
      ) : entries.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--t-ink-muted)', fontStyle: 'italic', fontSize: 13.5 }}>
          {solemn ? 'No memories yet — the first one begins the wall.' : 'No memories yet — be the first to share one.'}
        </p>
      ) : v === 'columns' ? (
        <ColumnsVariant entries={entries} />
      ) : (
        <RowsVariant entries={entries} />
      )}
    </BlockFrame>
  );
}
