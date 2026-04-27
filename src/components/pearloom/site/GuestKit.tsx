'use client';

/* ========================================================================
   GuestKit — guest-experience helpers that compose into the published
   site. Six components, all noscript-graceful and reduced-motion-safe.

   - <CalendarAddButton />     : Apple/Google/Outlook one-tap add
   - <SaveContactButton />     : downloads a vCard for the couple
   - <CountdownPill />         : floating mini-countdown after hero scroll
   - <StickyMobileCta />       : sticky RSVP CTA on mobile until RSVP'd
   - <OpenInMapsButton />      : Google Maps + Apple Maps + Uber deep links
   - <PersonalGuestGreeting /> : first-paint greeting when guest hits with ?guest=<token>
   - <AskPearFloater />        : tiny Pear chat that answers from manifest
   ======================================================================== */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { buildSiteUrl, normalizeOccasion } from '@/lib/site-urls';

interface BaseProps {
  domain: string;
  manifest: StoryManifest;
  names: [string, string];
}

// ─────────────────────────────────────────────────────────────
// Calendar add
// ─────────────────────────────────────────────────────────────
export function CalendarAddButton({ domain, manifest, variant = 'pill' }: { domain: string; manifest: StoryManifest; variant?: 'pill' | 'link' }) {
  const [open, setOpen] = useState(false);
  const date = manifest.logistics?.date;
  if (!date) return null;
  const ics = `/sites/${domain}/event.ics`;

  // Build Google Calendar template URL (date-only — Google supports this).
  const startStr = date.replace(/-/g, '');
  const venue = manifest.logistics?.venue ?? '';
  const address = manifest.logistics?.venueAddress ?? '';
  const occ = (manifest as unknown as { occasion?: string }).occasion ?? 'celebration';
  const tagline = (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  const gcal = new URL('https://calendar.google.com/calendar/render');
  gcal.searchParams.set('action', 'TEMPLATE');
  gcal.searchParams.set('text', `${occ} · Pearloom`);
  gcal.searchParams.set('details', tagline);
  if (address) gcal.searchParams.set('location', `${venue ? venue + ', ' : ''}${address}`);
  // Google wants YYYYMMDD/YYYYMMDD for all-day events
  gcal.searchParams.set('dates', `${startStr}/${startStr}`);

  // Outlook Live also accepts a query-style URL.
  const outlook = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  outlook.searchParams.set('subject', `${occ} · Pearloom`);
  outlook.searchParams.set('body', tagline);
  outlook.searchParams.set('location', `${venue ? venue + ', ' : ''}${address}`);
  outlook.searchParams.set('startdt', date);
  outlook.searchParams.set('enddt', date);
  outlook.searchParams.set('allday', 'true');

  const linkStyle: CSSProperties = {
    color: 'var(--ink)',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(61,74,31,0.25)',
    paddingBottom: 1,
    fontSize: 13,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={variant === 'link' ? 'pl8-cal-trigger' : 'btn btn-outline btn-sm pl8-cal-trigger'}
        style={
          variant === 'link'
            ? linkStyle
            : { display: 'inline-flex', alignItems: 'center', gap: 6 }
        }
        onMouseEnter={(e) => {
          if (variant === 'link') e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)';
        }}
        onMouseLeave={(e) => {
          if (variant === 'link') e.currentTarget.style.borderBottomColor = 'rgba(61,74,31,0.25)';
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {variant !== 'link' && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
          </svg>
        )}
        Add to calendar
      </button>
      {open && (
        <div
          role="menu"
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--card, #fff)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            boxShadow: '0 14px 28px rgba(14,13,11,0.14)',
            minWidth: 200,
            padding: 6,
            zIndex: 80,
            animation: 'pl8-cal-pop 180ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <a href={ics} download style={menuItem}>
             Apple Calendar (.ics)
          </a>
          <a href={gcal.toString()} target="_blank" rel="noreferrer" style={menuItem}>
            Google Calendar
          </a>
          <a href={outlook.toString()} target="_blank" rel="noreferrer" style={menuItem}>
            Outlook
          </a>
          <a href={ics} download style={{ ...menuItem, fontSize: 11, color: 'var(--ink-muted)' }}>
            Download .ics
          </a>
          <style jsx>{`
            @keyframes pl8-cal-pop {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </span>
  );
}

const menuItem: CSSProperties = {
  display: 'block',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--ink)',
  textDecoration: 'none',
  borderRadius: 8,
};

// ─────────────────────────────────────────────────────────────
// Save contact (vCard)
// ─────────────────────────────────────────────────────────────
export function SaveContactButton({ names, domain, manifest, variant = 'pill' }: BaseProps & { variant?: 'pill' | 'link' }) {
  const [name1, name2] = names;
  const venue = manifest.logistics?.venue ?? '';
  const note = (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  // Canonical occasion-prefixed URL (e.g. /wedding/scott). buildSiteUrl
  // reads window.location.origin client-side, falls back to the
  // configured app origin server-side, and normalises occasion to a
  // valid prefix (defaulting to 'wedding' for legacy/missing values).
  const url = buildSiteUrl(
    domain,
    '',
    undefined,
    normalizeOccasion((manifest as unknown as { occasion?: string }).occasion),
  );
  const fullName = [name1, name2].filter(Boolean).join(' & ');
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fullName}`,
    `N:${(name2 || '').trim()};${(name1 || '').trim()};;;`,
    'NICKNAME:Pearloom',
    venue ? `ADR;TYPE=WORK:;;${venue};;;;` : '',
    note ? `NOTE:${note.replace(/\n/g, '\\n')}` : '',
    `URL:${url}`,
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');

  function download() {
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(fullName || 'pearloom').replace(/\s+/g, '-').toLowerCase()}.vcf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 800);
  }

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={download}
        style={{
          color: 'var(--ink)',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(61,74,31,0.25)',
          paddingBottom: 1,
          fontSize: 13,
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 200ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(61,74,31,0.25)'; }}
      >
        Save contact
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={download}
      className="btn btn-outline btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </svg>
      Save contact
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Countdown pill
// ─────────────────────────────────────────────────────────────
export function FloatingCountdown({ manifest }: { manifest: StoryManifest }) {
  const date = manifest.logistics?.date;
  const [delta, setDelta] = useState<{ days: number; hrs: number; min: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!date) return;
    function compute() {
      if (!date) { setDelta(null); return; }
      const target = new Date(date + 'T00:00:00').getTime();
      const diff = target - Date.now();
      if (diff <= 0) { setDelta(null); return; }
      const days = Math.floor(diff / 86_400_000);
      const hrs = Math.floor((diff % 86_400_000) / 3_600_000);
      const min = Math.floor((diff % 3_600_000) / 60_000);
      setDelta({ days, hrs, min });
    }
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [date]);

  // Show only after the user has scrolled past the hero (~600px).
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!delta) return null;

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'var(--ink, #18181B)',
        color: 'var(--cream, #FDFAF0)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.05em',
        boxShadow: '0 6px 14px rgba(14,13,11,0.18)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--peach-2, #F0C9A8)',
          animation: 'pl8-pill-pulse 1.6s ease-in-out infinite',
        }}
      />
      <span>
        {delta.days}d <span style={{ opacity: 0.7 }}>·</span> {delta.hrs}h
      </span>
      <style jsx>{`
        @keyframes pl8-pill-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl8-pill-pulse {
            0%, 100% { opacity: 0.85; transform: none; }
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sticky mobile CTA — anchors to #rsvp until guest has responded
// ─────────────────────────────────────────────────────────────
export function StickyMobileCta({ deadline }: { deadline?: string | null }) {
  const [responded, setResponded] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Cheap signal — read the per-site rsvp-key sessionStorage we use
    // when an RSVP succeeds. If the guest hasn't responded yet, show the CTA.
    try {
      const key = 'pl-rsvp-' + window.location.pathname.replace(/\W+/g, '-');
      setResponded(window.sessionStorage.getItem(key) === '1');
    } catch {}
    // Only mobile widths.
    setShow(window.innerWidth < 760);
    function onResize() { setShow(window.innerWidth < 760); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!show || responded) return null;

  return (
    <a
      href="#rsvp"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 70,
        background: 'var(--ink, #18181B)',
        color: 'var(--cream, #FDFAF0)',
        textAlign: 'center',
        padding: '14px 18px',
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 15,
        textDecoration: 'none',
        boxShadow: '0 10px 24px rgba(14,13,11,0.32)',
        animation: 'pl8-rsvp-cta-in 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      RSVP {deadline ? `by ${deadline}` : 'now'} →
      <style jsx>{`
        @keyframes pl8-rsvp-cta-in {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Open-in-Maps + Uber deep link
// ─────────────────────────────────────────────────────────────
export function OpenInMapsButton({ address, label }: { address: string; label?: string }) {
  if (!address) return null;
  const enc = encodeURIComponent(address);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${enc}`;
  const apple = `https://maps.apple.com/?q=${enc}`;
  const uber = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${enc}`;
  // Detect iOS so we hand the user the right default deep link.
  const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <a
        href={ios ? apple : gmaps}
        target="_blank"
        rel="noreferrer"
        className="btn btn-outline btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8l-2 6-6 2 2-6z" />
        </svg>
        {label ?? 'Directions'}
      </a>
      <a
        href={uber}
        target="_blank"
        rel="noreferrer"
        className="btn btn-outline btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
      >
        Uber
      </a>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Personal guest greeting — only shows if ?guest=<id> is present
// AND we can resolve them via the per-guest API. Falls through
// silently when there's no token.
// ─────────────────────────────────────────────────────────────
export function PersonalGuestGreeting({ domain }: { domain: string }) {
  const [info, setInfo] = useState<null | { name: string; tableName?: string; meal?: string; dietary?: string }>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URL(window.location.href).searchParams;
    const token = params.get('guest') || params.get('g');
    if (!token) return;
    fetch(`/api/sites/guest-passport?siteSlug=${encodeURIComponent(domain)}&token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: null | { guest?: { name?: string; table?: string; meal?: string; dietary?: string } }) => {
        if (!data?.guest?.name) return;
        setInfo({
          name: data.guest.name,
          tableName: data.guest.table,
          meal: data.guest.meal,
          dietary: data.guest.dietary,
        });
      })
      .catch(() => {});
  }, [domain]);

  if (!info) return null;
  const firstName = info.name.split(/\s+/)[0];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--sage-tint, #E0DDC9)',
        borderBottom: '1px solid var(--sage-deep, #5C6B3F)',
        padding: '12px 18px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        fontSize: 13.5,
        color: 'var(--ink, #18181B)',
        animation: 'pl8-greet-in 480ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontStyle: 'italic', fontSize: 16 }}>
        Hi {firstName} —
      </span>
      {info.tableName && <span>your seat: <strong>{info.tableName}</strong></span>}
      {info.meal && <span>·</span>}
      {info.meal && <span>meal: <strong>{info.meal}</strong></span>}
      {info.dietary && <span>·</span>}
      {info.dietary && <span style={{ fontStyle: 'italic' }}>{info.dietary}</span>}
      <style jsx>{`
        @keyframes pl8-greet-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ask Pear floater — small chat that answers from the manifest
// ─────────────────────────────────────────────────────────────
export function AskPearFloater({ domain, manifest, names }: BaseProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<Array<{ role: 'user' | 'pear'; text: string }>>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function ask() {
    const q = draft.trim();
    if (!q) return;
    setDraft('');
    setThread((t) => [...t, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content:
                `You are answering a guest's question about ${names.filter(Boolean).join(' & ') || 'this'}'s ${
                  (manifest as unknown as { occasion?: string }).occasion ?? 'celebration'
                }. Answer ONLY from the manifest data below; if the answer isn't there, say "I don't know — text the host" once.\n\nManifest summary:\n` +
                summarizeManifest(manifest) +
                `\n\nGuest question: ${q}\n\nKeep your answer to 1-3 sentences. Warm, specific, useful.`,
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; text?: string; message?: string };
      const reply = data.reply ?? data.text ?? data.message ?? "I'm not sure — text the host.";
      setThread((t) => [...t, { role: 'pear', text: reply }]);
    } catch {
      setThread((t) => [...t, { role: 'pear', text: "Couldn't reach Pear right now. Text the host." }]);
    } finally {
      setBusy(false);
    }
    void domain;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ask Pear"
        style={{
          position: 'fixed',
          bottom: 18,
          right: 18,
          zIndex: 75,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--peach-ink, #C6703D)',
          color: 'var(--cream, #FDFAF0)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 10px 24px rgba(198,112,61,0.32)',
          fontSize: 22,
          display: 'grid',
          placeItems: 'center',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
      >
        🍐
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Ask Pear about this site"
          style={{
            position: 'fixed',
            bottom: 80,
            right: 18,
            zIndex: 76,
            width: 'min(360px, calc(100vw - 36px))',
            maxHeight: 'min(520px, calc(100vh - 120px))',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--card, #fff)',
            border: '1px solid var(--card-ring)',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(14,13,11,0.22)',
            animation: 'pl8-ask-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <header
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--line-soft)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Ask Pear</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', fontSize: 18, cursor: 'pointer' }}
            >
              ×
            </button>
          </header>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            {thread.length === 0 ? (
              <div style={{ color: 'var(--ink-muted)' }}>
                Try: <em>"What time should I show up?"</em> or <em>"Where are guests staying?"</em>
              </div>
            ) : (
              thread.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? 'var(--cream-2)' : 'var(--peach-bg)',
                    color: m.role === 'user' ? 'var(--ink)' : 'var(--peach-ink)',
                    padding: '8px 12px',
                    borderRadius: 12,
                    maxWidth: '85%',
                  }}
                >
                  {m.text}
                </div>
              ))
            )}
            {busy && <div style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>Pear is reading…</div>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) ask();
            }}
            style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--line-soft)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything…"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'var(--cream-2)',
                fontSize: 13,
                color: 'var(--ink)',
              }}
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 999, padding: '6px 14px' }}
            >
              Ask
            </button>
          </form>
          <style jsx>{`
            @keyframes pl8-ask-in {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function summarizeManifest(m: StoryManifest): string {
  const lines: string[] = [];
  const occ = (m as unknown as { occasion?: string }).occasion ?? 'celebration';
  lines.push(`Occasion: ${occ}.`);
  if (m.logistics?.date) lines.push(`Date: ${m.logistics.date}.`);
  if (m.logistics?.venue) lines.push(`Venue: ${m.logistics.venue}.`);
  if (m.logistics?.venueAddress) lines.push(`Address: ${m.logistics.venueAddress}.`);
  if (m.logistics?.dresscode) lines.push(`Dress code: ${m.logistics.dresscode}.`);
  if (m.logistics?.notes) lines.push(`Notes: ${m.logistics.notes}.`);
  if (m.logistics?.rsvpDeadline) lines.push(`RSVP deadline: ${m.logistics.rsvpDeadline}.`);
  const events = m.events ?? [];
  events.slice(0, 6).forEach((e) => {
    lines.push(`Event "${e.name}" at ${e.time ?? 'TBD'}: ${e.description ?? ''}${e.venue ? ` (${e.venue})` : ''}`);
  });
  const hotels = m.travelInfo?.hotels ?? [];
  hotels.slice(0, 4).forEach((h) => {
    lines.push(`Hotel: ${h.name} — ${h.address ?? ''} ${h.groupRate ?? ''}`);
  });
  const faq = (m as unknown as { faq?: Array<{ question?: string; answer?: string }> }).faq;
  (faq ?? []).slice(0, 8).forEach((f) => {
    if (f.question && f.answer) lines.push(`FAQ: ${f.question} → ${f.answer}`);
  });
  return lines.join('\n');
}

// Render-prop helper that wraps an entire DashLayout-free node so
// hosts can opt in to the kit. Right now SiteV8Renderer just imports
// the individual components.
export function GuestKitProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
