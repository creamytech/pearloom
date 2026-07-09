'use client';

/* ─────────────────────────────────────────────────────────────
   LoomTapestry — The Loom, a living tapestry woven from RSVPs.

   Pearloom's thread metaphor made literal: a fixed warp of
   --t-line hairlines, and one weft thread per attending reply —
   hue drawn from the site's own accent/gold range, stacked
   downward in reply order so early guests sit at the top of the
   cloth. The tapestry grows denser as the day approaches.

   Data: /api/rsvp/weave?subdomain=… — anonymous strand seeds
   only (no PII). Geometry is 100% deterministic from those seeds
   (loom-weave.ts) — no Math.random(), no Date.now() in render.

   Rendered by ThemedSite's RsvpBlock when manifest.rsvpLoom is
   on. Editor canvas gets a deterministic 14-strand demo cloth;
   published sites weave the real replies. Threads draw in on
   first view (IntersectionObserver + stroke-dash transition);
   prefers-reduced-motion renders the finished cloth.

   Live weave: listens for 'pearloom:loom-thread' (dispatched by
   GuestRsvpModal after an attending reply) — appends one strand
   optimistically, then refetches for the server truth.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { getEventType } from '@/lib/event-os/event-types';
import {
  DEMO_LOOM_STRANDS,
  LOOM_H,
  LOOM_PAD_Y,
  LOOM_W,
  STARTER_LOOM_STRANDS,
  warpPositions,
  weftFromStrand,
  type LoomStrand,
} from './loom-weave';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/* Reduced motion: the finished cloth, no draw-in. !important so
   the media query beats the per-path inline dashoffset. */
const LOOM_MOTION_CSS = `
@media (prefers-reduced-motion: reduce) {
  .pl8-loom-weft { transition: none !important; stroke-dashoffset: 0 !important; }
}`;

interface LoomFeed {
  strands: LoomStrand[];
  total: number;
}

export function LoomTapestry({
  siteSlug,
  editable = false,
  occasion,
}: {
  /** Published slug — undefined on the editor canvas (demo mode). */
  siteSlug?: string;
  editable?: boolean;
  occasion?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState<LoomFeed | null>(null);
  /** Strand count at first load — later arrivals skip the stagger. */
  const [initialCount, setInitialCount] = useState<number | null>(null);
  const [woven, setWoven] = useState(false);

  /* ── Fetch the strand feed (published only) + live weave ───── */
  useEffect(() => {
    if (editable || !siteSlug) return;
    let cancelled = false;

    const load = async (fresh: boolean) => {
      try {
        const res = await fetch(
          `/api/rsvp/weave?subdomain=${encodeURIComponent(siteSlug)}`,
          fresh ? { cache: 'reload' } : undefined,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; strands?: LoomStrand[]; total?: number };
        if (cancelled || !data.ok || !Array.isArray(data.strands)) return;
        const feed: LoomFeed = { strands: data.strands, total: data.total ?? data.strands.length };
        setInitialCount((prev) => prev ?? feed.strands.length);
        /* Never let a stale cached read unravel an optimistic
           strand the guest just watched join. */
        setLive((prev) => (prev && prev.total > feed.total ? prev : feed));
      } catch {
        /* quiet — the cloth simply doesn't fill in */
      }
    };

    load(false);

    /* A guest just replied attending on this page — weave their
       thread in immediately, then reconcile with the server. */
    const onThread = () => {
      setLive((prev) => {
        if (!prev) return prev;
        const strand: LoomStrand = { seed: `loom-live-${prev.total + 1}`, t: 1 };
        return { strands: [...prev.strands, strand], total: prev.total + 1 };
      });
      load(true);
    };
    window.addEventListener('pearloom:loom-thread', onThread);
    return () => {
      cancelled = true;
      window.removeEventListener('pearloom:loom-thread', onThread);
    };
  }, [editable, siteSlug]);

  /* ── Draw-in on first view ──────────────────────────────────── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      const raf = requestAnimationFrame(() => setWoven(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setWoven(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── Which strands are on the cloth ─────────────────────────── */
  const isEmpty = !editable && live !== null && live.total === 0;
  const strands: LoomStrand[] = editable
    ? DEMO_LOOM_STRANDS
    : isEmpty
      ? STARTER_LOOM_STRANDS
      : live?.strands ?? [];
  const total = editable ? DEMO_LOOM_STRANDS.length : live?.total ?? 0;

  const solemn = getEventType(occasion)?.voice === 'solemn';
  const caption = isEmpty
    ? 'The first threads are yours, every reply adds one.'
    : solemn
      ? `${total} threads · each in memory`
      : `${total} threads woven · each reply adds one`;

  /* Stagger only the strands present at first load; a thread that
     joins live (or after a refetch) draws in right away. */
  const staggerCount = initialCount ?? strands.length;

  return (
    <div
      ref={rootRef}
      style={{
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius)',
        padding: '14px 14px 12px',
        textAlign: 'center',
      }}
    >
      <style>{LOOM_MOTION_CSS}</style>
      <svg
        viewBox={`0 0 ${LOOM_W} ${LOOM_H}`}
        width="100%"
        role="img"
        aria-label={
          solemn
            ? `A woven tapestry, ${total} threads, one in memory for each reply.`
            : `A woven tapestry of RSVP threads, ${total} woven so far.`
        }
        style={{ display: 'block', height: 'auto' }}
      >
        {/* The warp — fixed vertical hairlines the replies weave through. */}
        <g aria-hidden>
          {warpPositions().map((x) => (
            <line
              key={x}
              x1={x}
              y1={LOOM_PAD_Y - 8}
              x2={x}
              y2={LOOM_H - LOOM_PAD_Y + 8}
              stroke="var(--t-line)"
              strokeWidth={1}
              opacity={0.55}
            />
          ))}
        </g>
        {/* The weft — one thread per attending reply. */}
        <g aria-hidden>
          {strands.map((strand, i) => {
            const spec = weftFromStrand(strand);
            const delay = i < staggerCount ? Math.min(i * 55, 1400) : 120;
            return (
              <path
                key={`${strand.seed}-${i}`}
                className="pl8-loom-weft"
                d={spec.path}
                pathLength={1}
                fill="none"
                stroke={spec.colorVar}
                strokeWidth={spec.strokeWidth}
                strokeLinecap="round"
                opacity={spec.opacity}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: woven ? 0 : 1,
                  transition: `stroke-dashoffset 1100ms ${EASE} ${delay}ms`,
                }}
              />
            );
          })}
        </g>
      </svg>
      {/* Mono caption — editorial label with a gold leading rule. */}
      {(editable || live !== null) && (
        <div
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--t-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--t-ink-muted)',
          }}
        >
          <span aria-hidden style={{ width: 18, height: 1, background: 'var(--t-gold)' }} />
          <span>{caption}</span>
          {editable && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                border: '1px solid var(--t-line)',
                color: 'var(--t-ink-muted)',
              }}
            >
              Preview
            </span>
          )}
        </div>
      )}
    </div>
  );
}
