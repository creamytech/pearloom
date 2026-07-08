'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/a/[siteSlug]/ShareAddressForm.tsx
//
// The "Share your address" form + its success ceremony. Themed
// entirely from the SuiteTheme contract (lib/suite/theme.ts) so
// the page wears the couple's full look: paper + grain, monogram
// crest, display-face heading, and — after a successful POST to
// /api/address-book — the same ceremony language RsvpCeremony
// uses (motif threads in, monogram settles, gold hairline, copy
// rises).
//
// Mobile-first: one column, 16px inputs (no iOS zoom), generous
// tap targets, proper autocomplete tokens so the browser can
// fill the whole thing in one tap. Motion is transform/opacity
// only and fully disabled under prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { SuiteTheme } from '@/lib/suite/theme';
import { Monogram, type MonogramFrame } from '@/components/pearloom/site/Monogram';
import { Motif, type MotifKind } from '@/components/pearloom/site/MotifScatter';

export interface ShareAddressFormProps {
  suite: SuiteTheme;
  siteSlug: string;
  /** Relative path to the published site (buildSitePath output). */
  siteHref: string;
  /** Resolved server-side: host pick > theme-catalog motif. */
  motifKind: string;
  headline: string;
  lede: string;
  successHeadline: string;
  successBody: string;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/* Same ceremony keyframes as RsvpCeremony — thread in, settle,
   rise — plus a soft entrance for the form card. The reduced-
   motion block removes the animations entirely so the `from`
   state never paints. */
const PAGE_CSS = `
@keyframes pl-addr-thread {
  from { opacity: 0; transform: translateY(10px) scale(0.86); }
  to   { opacity: 1; transform: none; }
}
@keyframes pl-addr-settle {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
@keyframes pl-addr-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.pl-addr-enter  { animation: pl-addr-rise 480ms ${EASE} both; }
.pl-addr-motif  { animation: pl-addr-thread 480ms ${EASE} both; }
.pl-addr-mono   { animation: pl-addr-settle 480ms ${EASE} 160ms both; }
.pl-addr-copy   { animation: pl-addr-rise 480ms ${EASE} 320ms both; }
@media (prefers-reduced-motion: reduce) {
  .pl-addr-enter, .pl-addr-motif, .pl-addr-mono, .pl-addr-copy { animation: none; }
}
`;

interface Fields {
  name: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY: Fields = {
  name: '', email: '', line1: '', line2: '',
  city: '', state: '', zip: '', country: 'United States',
};

/* Module-level (NOT defined inside the page component) so React
   keeps the input mounted across renders — an inline definition
   would remount the field and drop focus on every keystroke. */
function Field({
  label, optional, labelStyle, children,
}: {
  label: string;
  optional?: boolean;
  labelStyle: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>
        {label}
        {optional && (
          <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: '0.08em' }}>
            {' '}· optional
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export function ShareAddressForm({
  suite, siteSlug, siteHref, motifKind, headline, lede, successHeadline, successBody,
}: ShareAddressFormProps) {
  const p = suite.palette;
  const fontDisplay = suite.fonts.display;
  const fontBody = suite.fonts.body;
  const mono = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (key: keyof Fields) => (v: string) =>
    setFields((prev) => ({ ...prev, [key]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);

    // Warm client-side checks — the API repeats them.
    if (!fields.name.trim()) {
      setErr('We need a name for the envelope.');
      return;
    }
    if (!fields.line1.trim() || !fields.city.trim() || !fields.state.trim() || !fields.zip.trim()) {
      setErr('Almost there — street, city, state, and ZIP are all needed for the envelope.');
      return;
    }
    if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      setErr('That email doesn’t look quite right — it’s optional, feel free to leave it blank.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          name: fields.name.trim(),
          email: fields.email.trim() || undefined,
          line1: fields.line1.trim(),
          line2: fields.line2.trim() || undefined,
          city: fields.city.trim(),
          state: fields.state.trim(),
          zip: fields.zip.trim(),
          country: fields.country.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setErr(
          typeof data?.error === 'string' && data.error
            ? data.error
            : 'We couldn’t set your address just now — try again in a moment.',
        );
        return;
      }
      setDone(true);
    } catch {
      setErr('We couldn’t set your address just now — try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  // ── Shared input styling — 16px so mobile Safari never zooms ──
  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 10,
    border: `1px solid ${p.line}`,
    background: p.paper,
    color: p.ink,
    fontFamily: fontBody,
    fontSize: 16,
    lineHeight: 1.4,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: mono,
    fontSize: '0.6rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: p.inkSoft,
    margin: '0 0 6px',
  };

  const displayNames = suite.names.filter(Boolean);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: p.paper,
        color: p.ink,
        fontFamily: fontBody,
        position: 'relative',
        // The shared Motif / Monogram components bind to the live
        // --t-* vars; hand them the suite palette so they recolor
        // with the couple's pack on this standalone page too.
        ['--t-paper' as string]: p.paper,
        ['--t-card' as string]: p.card,
        ['--t-ink' as string]: p.ink,
        ['--t-ink-soft' as string]: p.inkSoft,
        ['--t-accent' as string]: p.accent,
        ['--t-gold' as string]: p.gold,
        ['--t-line' as string]: p.line,
      }}
    >
      <style>{PAGE_CSS}</style>

      {/* Paper grain — fixed, quiet (BRAND.md §3). */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'radial-gradient(rgba(14,13,11,0.028) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      <main
        className="pl-addr-enter"
        style={{
          position: 'relative',
          maxWidth: 560,
          margin: '0 auto',
          padding: 'clamp(32px, 7vw, 64px) clamp(18px, 5vw, 32px) 88px',
        }}
      >
        {done ? (
          /* ── The ceremony — same language as RsvpCeremony ── */
          <div role="status" style={{ textAlign: 'center', paddingTop: 'clamp(24px, 8vh, 72px)' }}>
            {motifKind !== 'none' && (
              <div
                className="pl-addr-motif"
                aria-hidden="true"
                style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}
              >
                <Motif kind={motifKind as MotifKind} size={52} />
              </div>
            )}
            <div className="pl-addr-mono" style={{ display: 'flex', justifyContent: 'center' }}>
              <Monogram
                initials={suite.monogram.initials}
                frame={suite.monogram.frame as MonogramFrame}
                size={96}
                color={p.accent}
                withCard={false}
                ariaHidden
              />
            </div>
            <div className="pl-addr-copy">
              {/* Gold hairline — the editorial signature above the headline. */}
              <div
                aria-hidden="true"
                style={{
                  width: 120, height: 1,
                  margin: '14px auto 16px',
                  background: `linear-gradient(90deg, transparent, ${p.gold} 50%, transparent)`,
                  opacity: 0.6,
                }}
              />
              <h1
                style={{
                  fontFamily: fontDisplay,
                  fontStyle: 'italic',
                  fontSize: 'clamp(1.6rem, 5.5vw, 1.85rem)',
                  fontWeight: 600,
                  lineHeight: 1.12,
                  letterSpacing: '-0.015em',
                  margin: '0 0 8px',
                  color: p.ink,
                }}
              >
                {successHeadline}
              </h1>
              <p
                style={{
                  fontSize: '0.9rem', color: p.inkSoft,
                  maxWidth: 340, margin: '0 auto', lineHeight: 1.6,
                }}
              >
                {successBody}
              </p>
              <div style={{ marginTop: 26 }}>
                <a
                  href={siteHref}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '12px 24px', borderRadius: 999,
                    background: 'transparent',
                    border: `1px solid ${p.accent}`,
                    color: p.ink, textDecoration: 'none',
                    fontFamily: fontBody, fontSize: '0.82rem', fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  Visit the site
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Crest + heading ── */}
            <header style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <Monogram
                  initials={suite.monogram.initials}
                  frame={suite.monogram.frame as MonogramFrame}
                  size={104}
                  color={p.accent}
                  withCard={false}
                  ariaHidden
                />
              </div>
              <p
                style={{
                  fontFamily: mono, fontSize: '0.62rem',
                  letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: p.accent, margin: '0 0 14px',
                }}
              >
                Share your address
              </p>
              <h1
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 500,
                  fontSize: 'clamp(1.7rem, 6.5vw, 2.4rem)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.015em',
                  color: p.ink,
                  margin: '0 0 12px',
                }}
              >
                {headline}
              </h1>
              <p
                style={{
                  fontSize: '0.92rem', lineHeight: 1.65, color: p.inkSoft,
                  maxWidth: 400, margin: '0 auto',
                }}
              >
                {lede}
              </p>
            </header>

            {/* ── The form card ── */}
            <form
              onSubmit={submit}
              noValidate
              style={{
                background: p.card,
                border: `1px solid ${p.line}`,
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(14,13,11,0.08), 0 2px 8px rgba(14,13,11,0.05)',
                padding: 'clamp(20px, 5vw, 32px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <Field label="Your full name" labelStyle={labelStyle}>
                <input
                  style={inputStyle}
                  value={fields.name}
                  onChange={(e) => set('name')(e.target.value)}
                  autoComplete="name"
                  placeholder="Margaret Whitfield"
                  required
                />
              </Field>

              <Field label="Email" optional labelStyle={labelStyle}>
                <input
                  style={inputStyle}
                  value={fields.email}
                  onChange={(e) => set('email')(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="margaret@example.com"
                />
              </Field>

              <Field label="Street address" labelStyle={labelStyle}>
                <input
                  style={inputStyle}
                  value={fields.line1}
                  onChange={(e) => set('line1')(e.target.value)}
                  autoComplete="address-line1"
                  placeholder="118 Linden Lane"
                  required
                />
              </Field>

              <Field label="Apt, suite, unit" optional labelStyle={labelStyle}>
                <input
                  style={inputStyle}
                  value={fields.line2}
                  onChange={(e) => set('line2')(e.target.value)}
                  autoComplete="address-line2"
                  placeholder="Apt 2B"
                />
              </Field>

              <Field label="City" labelStyle={labelStyle}>
                <input
                  style={inputStyle}
                  value={fields.city}
                  onChange={(e) => set('city')(e.target.value)}
                  autoComplete="address-level2"
                  placeholder="Savannah"
                  required
                />
              </Field>

              {/* State + ZIP share a row, wrapping on narrow screens. */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <Field label="State" labelStyle={labelStyle}>
                    <input
                      style={inputStyle}
                      value={fields.state}
                      onChange={(e) => set('state')(e.target.value)}
                      autoComplete="address-level1"
                      placeholder="GA"
                      required
                    />
                  </Field>
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <Field label="ZIP" labelStyle={labelStyle}>
                    <input
                      style={inputStyle}
                      value={fields.zip}
                      onChange={(e) => set('zip')(e.target.value)}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="31401"
                      required
                    />
                  </Field>
                </div>
              </div>

              <Field label="Country" labelStyle={labelStyle}>
                <input
                  style={inputStyle}
                  value={fields.country}
                  onChange={(e) => set('country')(e.target.value)}
                  autoComplete="country-name"
                  placeholder="United States"
                />
              </Field>

              {err && (
                <p
                  role="alert"
                  style={{
                    margin: 0, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(122,45,45,0.08)', color: '#7A2D2D',
                    fontSize: '0.85rem', lineHeight: 1.5,
                  }}
                >
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: '15px 24px',
                  borderRadius: 999,
                  border: 'none',
                  background: p.accent,
                  color: p.paper,
                  fontFamily: fontBody,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                  transition: `opacity 180ms ${EASE}`,
                }}
              >
                {busy ? 'Sending…' : 'Send my address'}
              </button>

              <p
                style={{
                  margin: 0, textAlign: 'center',
                  fontSize: '0.74rem', lineHeight: 1.5, color: p.inkSoft, opacity: 0.85,
                }}
              >
                Your address goes straight to{' '}
                {displayNames.length > 0 ? displayNames.join(' & ') : 'your hosts'} — no one else.
              </p>
            </form>

            {/* Footer signature */}
            <footer style={{ marginTop: 32, textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: mono, fontSize: '0.55rem',
                  letterSpacing: '0.24em', textTransform: 'uppercase',
                  color: p.inkSoft, opacity: 0.5, margin: 0,
                }}
              >
                Made with Pearloom
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
