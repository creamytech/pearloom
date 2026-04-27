'use client';

// ─────────────────────────────────────────────────────────────
// GuestPhaseStrip — top-of-page band that reflects where the
// guest currently is in the event lifecycle. Switches copy +
// CTAs based on phase (upcoming → live → fresh-memory → year-
// ago → archived). See lib/passport/phase.ts for the state
// machine.
//
// Also surfaces:
//   • Push notifications opt-in (day-of pings)
//   • Save-to-home-screen prompt (PWA companion)
//   • Quick logistics: dietary, accessibility, table, ride
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { computePassportPhase, phaseCopy, type PassportPhase } from '@/lib/passport/phase';

interface Props {
  eventDateIso: string | null;
  firstName: string;
  coupleNames: string;
  venue?: string;
  sitePath: string;
  rsvpHref: string;
  accent?: string;
  paper?: string;
  ink?: string;
  /** Push subscription endpoint. When set, "Get day-of pings" CTA
   *  registers the browser with /api/guest-passport/[token]/subscribe. */
  guestToken: string;
  /** Logistics quick-glance — passed in by parent so this strip
   *  can show dietary / table / dress code without fetching. */
  logistics?: {
    table?: string;
    seat?: string;
    dietary?: string[];
    accessibility?: string[];
    dressCode?: string;
  };
}

export function GuestPhaseStrip({
  eventDateIso,
  firstName,
  coupleNames,
  venue,
  sitePath,
  rsvpHref,
  accent = '#C6703D',
  paper = '#F8F1E4',
  ink = '#0E0D0B',
  guestToken,
  logistics,
}: Props) {
  const [phase, setPhase] = useState<PassportPhase>('no-date');
  const [pushState, setPushState] = useState<'idle' | 'enabling' | 'enabled' | 'denied' | 'unsupported'>('idle');
  const [installPromptEvent, setInstallPromptEvent] = useState<unknown>(null);

  // Recompute phase every minute so 'live' kicks in at the right moment.
  useEffect(() => {
    const tick = () => setPhase(computePassportPhase(eventDateIso));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [eventDateIso]);

  // Listen for the PWA install prompt and stash it so the strip
  // can offer "Save to home screen" on supported browsers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onPrompt(e: Event) {
      e.preventDefault();
      setInstallPromptEvent(e);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Probe existing push permission state.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') setPushState('enabled');
    else if (Notification.permission === 'denied') setPushState('denied');
  }, []);

  const eventDateLabel = eventDateIso
    ? new Date(eventDateIso).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Date to come';
  const daysUntil = eventDateIso
    ? Math.max(0, Math.round((new Date(eventDateIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : undefined;
  const yearsPassed = eventDateIso
    ? Math.max(0, Math.floor((Date.now() - new Date(eventDateIso).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : undefined;
  const copy = phaseCopy(phase, {
    firstName, coupleNames, venue, sitePath, rsvpHref, eventDateLabel, daysUntil, yearsPassed,
  });

  async function enablePush() {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushState('unsupported');
      return;
    }
    setPushState('enabling');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushState(perm === 'denied' ? 'denied' : 'idle');
        return;
      }
      // Try to register an SW + subscribe via Web Push if a VAPID
      // key is exposed. Fall back to "permission granted, no
      // subscription" if not configured (server can still send
      // foreground notifications).
      const vapid = (window as unknown as { __PEARLOOM_VAPID__?: string }).__PEARLOOM_VAPID__;
      if (vapid) {
        const reg = await navigator.serviceWorker.register('/sw-passport.js').catch(() => null);
        if (reg) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
          }).catch(() => null);
          if (sub) {
            await fetch(`/api/guest-passport/${guestToken}/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription: sub.toJSON() }),
            }).catch(() => {});
          }
        }
      }
      setPushState('enabled');
    } catch {
      setPushState('idle');
    }
  }

  async function installApp() {
    const evt = installPromptEvent as { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } | null;
    if (!evt?.prompt) return;
    await evt.prompt();
    setInstallPromptEvent(null);
  }

  return (
    <div
      style={{
        background: paper,
        borderBottom: `1px solid ${accent}22`,
        padding: 'clamp(20px, 4vw, 32px) clamp(20px, 4vw, 32px) clamp(24px, 4vw, 36px)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: accent, marginBottom: 10,
        }}>
          {copy.eyebrow}
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 'clamp(28px, 4.5vw, 42px)',
          lineHeight: 1.1,
          margin: '0 0 12px',
          color: ink,
          fontWeight: 500,
        }}>
          {copy.headline}
        </h1>
        <p style={{ color: ink, opacity: 0.78, fontSize: 15, lineHeight: 1.55, margin: '0 0 18px', maxWidth: 560 }}>
          {copy.body}
        </p>

        {/* Logistics chips — only render the ones we have data for. */}
        {logistics && (logistics.table || logistics.dressCode || (logistics.dietary?.length ?? 0) > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {logistics.table && (
              <Chip label="Table" value={logistics.table} accent={accent} />
            )}
            {logistics.seat && (
              <Chip label="Seat" value={logistics.seat} accent={accent} />
            )}
            {logistics.dressCode && (
              <Chip label="Dress" value={logistics.dressCode} accent={accent} />
            )}
            {logistics.dietary?.map((d) => (
              <Chip key={d} label="Diet" value={d} accent={accent} />
            ))}
            {logistics.accessibility?.map((a) => (
              <Chip key={a} label="Access" value={a} accent={accent} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {copy.primaryCta && (
            <a
              href={copy.primaryCta.href}
              style={{
                padding: '11px 20px',
                background: accent,
                color: '#FFFFFF',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {copy.primaryCta.label}
            </a>
          )}
          {copy.secondaryCta && (
            <a
              href={copy.secondaryCta.href}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: ink,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                border: `1.5px solid ${ink}22`,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {copy.secondaryCta.label}
            </a>
          )}
          {(phase === 'upcoming-soon' || phase === 'day-of-pre' || phase === 'live') && pushState !== 'unsupported' && pushState !== 'enabled' && (
            <button
              type="button"
              onClick={enablePush}
              disabled={pushState === 'enabling' || pushState === 'denied'}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: ink,
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: pushState === 'enabling' ? 'wait' : 'pointer',
                border: `1.5px dashed ${accent}`,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {pushState === 'enabling' ? 'Enabling…' : pushState === 'denied' ? 'Pings blocked' : 'Get day-of pings'}
            </button>
          )}
          {pushState === 'enabled' && (
            <span style={{ fontSize: 12, color: '#5C6B3F', fontWeight: 600 }}>
              · Day-of pings on
            </span>
          )}
          {!!installPromptEvent && (
            <button
              type="button"
              onClick={installApp}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: ink,
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1.5px dashed ${accent}`,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Add to home screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: `${accent}10`,
      color: 'var(--ink, #0E0D0B)',
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <span style={{
        fontSize: 9.5,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        opacity: 0.65,
      }}>
        {label}
      </span>
      {value}
    </span>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
