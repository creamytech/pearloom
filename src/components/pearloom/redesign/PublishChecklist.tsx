'use client';

 
/* PublishChecklist — topbar pill + popover with two lives:

   BEFORE publish — audits the manifest for missing essentials.
   Doesn't block publishing — just warns. (Unchanged behavior.)

   AFTER publish — the pill flips to "Live" and the popover becomes
   the POST-PUBLISH MOMENT: "You're live." in display type, the
   site URL, the themed monogram QR (same BrandedQR the Share
   panel renders), and three handoff CTAs (share kit / save-the-
   date / view the site). When publishing succeeds while the
   editor is mounted (the publish flow stamps manifest.published
   via the live manifest prop), the handoff auto-opens once — a
   single motif draw-in is the celebration. No confetti.

   Mounted in EditorTopbar between save indicator and Publish so
   hosts notice unfilled fields before guests do. */

import { useEffect, useRef, useState, useMemo } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { isManifestPublished } from '@/lib/next-step';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { BrandedQR } from '../editor/panels/BrandedQR';
import { Motif, type MotifKind } from '../site/MotifScatter';

interface Check {
  id: string;
  label: string;
  ok: boolean;
  /** Optional hint shown under the label when failed. */
  hint?: string;
  /** BlockKey to jump to when the host clicks a failing item.
   *  Dispatches a `pearloom:design-jump` event that EditorV8
   *  listens for. */
  jumpTo?: string;
}

function buildChecks(manifest: StoryManifest): Check[] {
  const loose = manifest as unknown as Record<string, unknown>;
  const [a, b] = manifest.names ?? ['', ''];
  const subject = (loose.subject as { kind?: string } | undefined);
  const isSolo = subject?.kind === 'solo';
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const coverPhoto = (loose.coverPhoto as string | undefined) ?? '';
  const events = manifest.events ?? [];
  const faqs = manifest.faqs ?? [];
  const detailsCards = (loose.detailsCards as Array<[string, string]> | undefined) ?? [];

  return [
    {
      id: 'names',
      label: isSolo ? 'Honoree name' : 'Both names',
      ok: isSolo ? !!a.trim() : !!a.trim() && !!b.trim(),
      hint: 'Add to the Hero panel.',
      jumpTo: 'hero',
    },
    { id: 'date',  label: 'Event date',   ok: !!date.trim(),  hint: 'Hero panel · Date & venue.', jumpTo: 'hero' },
    { id: 'venue', label: 'Venue',        ok: !!venue.trim(), hint: 'Hero panel · Date & venue.', jumpTo: 'hero' },
    { id: 'cover', label: 'Cover photo',  ok: !!coverPhoto.trim(), hint: 'Hero panel · Cover photo.', jumpTo: 'hero' },
    { id: 'schedule', label: 'At least one schedule moment', ok: events.length > 0, hint: 'Schedule panel · Add a moment.', jumpTo: 'schedule' },
    { id: 'details',  label: 'At least one detail card',     ok: detailsCards.length > 0, hint: 'Details panel · Add a detail.', jumpTo: 'details' },
    { id: 'faq',      label: 'At least one FAQ',             ok: faqs.length > 0, hint: 'FAQ panel.', jumpTo: 'faq' },
  ];
}

/* ── Post-publish helpers ─────────────────────────────────────── */

/** Slug for the published URL: manifest.subdomain when persisted,
 *  else the /editor/[siteSlug] path segment (the same slug the
 *  publish flow claimed). */
function resolveSiteSlug(manifest: StoryManifest): string {
  const sub = (manifest.subdomain ?? '').trim();
  if (sub) return sub;
  if (typeof window !== 'undefined') {
    const m = /\/editor\/([^/?#]+)/.exec(window.location.pathname);
    if (m) return decodeURIComponent(m[1]);
  }
  return '';
}

/** "S & J" monogram for the QR badge — same format the Share
 *  panel's monogram QR uses; single initial for solo honorees. */
function monogramInitials(names: [string, string] | undefined): string {
  const [a, b] = names ?? ['', ''];
  const ia = (a ?? '').trim().charAt(0).toUpperCase();
  const ib = (b ?? '').trim().charAt(0).toUpperCase();
  if (ia && ib) return `${ia} & ${ib}`;
  return ia || ib || '';
}

export function PublishChecklist({ manifest }: { manifest: StoryManifest }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const published = isManifestPublished(manifest);
  /* The moment — publishing succeeded while we're mounted (the
     publish flow stamps manifest.published through the live
     manifest prop). Auto-open the handoff exactly once, via the
     render-time "derive from previous render" pattern (same as
     EditorRedesign's lastSheet) — no effect, no cascading render. */
  const [prevPublished, setPrevPublished] = useState(published);
  if (published !== prevPublished) {
    setPrevPublished(published);
    if (published) setOpen(true);
  }

  const checks = useMemo(() => buildChecks(manifest), [manifest]);
  const missing = checks.filter((c) => !c.ok);
  const ready = missing.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* ── AFTER publish — the handoff moment ─────────────────────── */
  if (published) {
    return (
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Your site is live — link, QR, and next steps"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--sage-bg)',
            color: 'var(--sage-deep)',
            border: '1px solid rgba(92,107,63,0.18)',
            fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer',
            transition: 'background var(--pl-dur-quick), color var(--pl-dur-quick), border-color var(--pl-dur-quick)',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gold, #C19A4B)',
          }} />
          Live
        </button>
        {open && <LiveHandoff manifest={manifest} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  /* ── BEFORE publish — the checklist (unchanged) ─────────────── */
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={ready ? 'Site is ready to publish' : `${missing.length} thing${missing.length === 1 ? '' : 's'} still to do`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          background: ready ? 'var(--sage-bg)' : 'var(--peach-bg)',
          color: ready ? 'var(--sage-deep)' : 'var(--peach-ink)',
          border: '1px solid ' + (ready ? 'rgba(92,107,63,0.18)' : 'rgba(198,112,61,0.18)'),
          fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer',
          transition: 'background var(--pl-dur-quick), color var(--pl-dur-quick), border-color var(--pl-dur-quick)',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: ready ? 'var(--sage-deep)' : 'var(--peach-ink)',
        }} />
        {ready ? 'Ready' : `${missing.length} to do`}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Publish readiness"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 'var(--z-overlay)',
            width: 280,
            padding: 14,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            {ready ? 'Looking great' : "What's still missing"}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {ready
              ? 'Every essential field is filled in. Ready to publish whenever you are.'
              : 'These aren’t blocking — but they help guests have a complete experience.'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {checks.map((c) => {
              const clickable = !c.ok && !!c.jumpTo;
              const handleClick = () => {
                if (!clickable || typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('pearloom:design-jump', {
                  detail: { block: c.jumpTo },
                }));
                setOpen(false);
              };
              const sharedStyle = {
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '6px 8px', borderRadius: 8,
                background: c.ok ? 'var(--sage-bg)' : 'var(--cream-2)',
                transition: 'background var(--pl-dur-subtle), transform var(--pl-dur-subtle)',
              } as const;
              const inner = (
                <>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: c.ok ? 'var(--sage-deep)' : 'transparent',
                    border: c.ok ? 'none' : '1.5px solid var(--ink-muted)',
                    display: 'grid', placeItems: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {c.ok && <Icon name="check" size={9} color="#fff" />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.ok ? 'var(--sage-deep)' : 'var(--ink)' }}>
                      {c.label}
                    </div>
                    {!c.ok && c.hint && (
                      <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 1 }}>
                        {c.hint}
                      </div>
                    )}
                  </div>
                  {clickable && (
                    <span style={{ alignSelf: 'center', color: 'var(--ink-muted)' }}>
                      <Icon name="arrow-right" size={11} color="var(--ink-muted)" />
                    </span>
                  )}
                </>
              );
              return clickable ? (
                <button
                  key={c.id}
                  type="button"
                  onClick={handleClick}
                  style={{
                    ...sharedStyle,
                    border: 'none', cursor: 'pointer', width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
                >
                  {inner}
                </button>
              ) : (
                <div key={c.id} style={sharedStyle}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── LiveHandoff — the post-publish popover ──────────────────────
   "You're live." in display type, the canonical site URL, the
   themed monogram QR, and three next CTAs. The celebration is a
   single motif draw-in (manifest.motifKind), honoring
   prefers-reduced-motion. */
function LiveHandoff({ manifest, onClose }: { manifest: StoryManifest; onClose: () => void }) {
  const occasion = normalizeOccasion(manifest.occasion);
  const slug = resolveSiteSlug(manifest);
  const liveUrl = slug ? buildSiteUrl(slug, '', undefined, occasion) : '';
  const displayUrl = slug ? formatSiteDisplayUrl(slug, '', occasion) : '';
  const initials = monogramInitials(manifest.names as [string, string] | undefined);
  const motifKind = ((manifest as unknown as { motifKind?: MotifKind }).motifKind ?? 'pressed');
  /* Save-the-date never applies to memorial / funeral sites (you
     don't pre-announce one) — mirror isToolPanelApplicable. */
  const showSaveTheDate = occasion !== 'memorial' && occasion !== 'funeral';

  function jump(block: 'share' | 'savetheDate') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block } }));
    }
    onClose();
  }

  const ctaStyle = {
    display: 'flex', alignItems: 'center', gap: 9,
    width: '100%',
    padding: '9px 11px',
    borderRadius: 10,
    background: 'var(--cream-2)',
    border: '1px solid var(--line-soft)',
    color: 'var(--ink)',
    fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    fontFamily: 'var(--font-ui)',
    transition: 'background var(--pl-dur-quick), border-color var(--pl-dur-quick)',
  } as const;
  const hoverOn = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'var(--cream-3)'; };
  const hoverOff = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'var(--cream-2)'; };

  return (
    <div
      role="dialog"
      aria-label="Your site is live"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 'var(--z-overlay)',
        width: 296,
        padding: '18px 16px 14px',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
        textAlign: 'center',
      }}
    >
      <style>{`
        @keyframes pl-rd-motif-draw {
          0%   { opacity: 0; transform: scale(0.4) rotate(-10deg); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .pl-rd-motif-draw {
          display: inline-flex;
          animation: pl-rd-motif-draw 640ms var(--pl-ease-emphasis, cubic-bezier(0.16, 1, 0.3, 1)) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-rd-motif-draw { animation: none; }
        }
      `}</style>

      {/* The celebration — one motif, drawn in. */}
      <span className="pl-rd-motif-draw" aria-hidden>
        <Motif kind={motifKind} size={40} />
      </span>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24, fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1.05,
          marginTop: 6,
        }}
      >
        You{'’'}re live.
      </div>
      {displayUrl && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, wordBreak: 'break-all' }}>
          {displayUrl}
        </div>
      )}

      {/* Themed monogram QR — same BrandedQR the Share panel uses
          (error correction H, so the initials badge still scans). */}
      {liveUrl && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 4px' }}>
          <BrandedQR value={liveUrl} size={132} initials={initials} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        <button type="button" style={ctaStyle} onClick={() => jump('share')} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <Icon name="share" size={13} color="var(--ink-soft)" />
          <span style={{ flex: 1 }}>Open the share kit</span>
          <Icon name="arrow-right" size={11} color="var(--ink-muted)" />
        </button>
        {showSaveTheDate && (
          <button type="button" style={ctaStyle} onClick={() => jump('savetheDate')} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            <Icon name="send" size={13} color="var(--ink-soft)" />
            <span style={{ flex: 1 }}>Send your save-the-date</span>
            <Icon name="arrow-right" size={11} color="var(--ink-muted)" />
          </button>
        )}
        {/* The handoff hosts actually need next: a live site with
            nobody invited is a stage with no audience. Lands on
            the Guests dashboard (import CSV / add by hand / copy
            from a sibling event) with this site preselected. */}
        {slug && (
          <a href={`/dashboard/rsvp?site=${encodeURIComponent(slug)}`} style={ctaStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            <Icon name="users" size={13} color="var(--ink-soft)" />
            <span style={{ flex: 1 }}>Bring in your guest list</span>
            <Icon name="arrow-right" size={11} color="var(--ink-muted)" />
          </a>
        )}
        {liveUrl && (
          <a href={liveUrl} target="_blank" rel="noreferrer" style={ctaStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            <Icon name="globe" size={13} color="var(--ink-soft)" />
            <span style={{ flex: 1 }}>View your site</span>
            <Icon name="arrow-right" size={11} color="var(--ink-muted)" />
          </a>
        )}
      </div>
    </div>
  );
}

export default PublishChecklist;
