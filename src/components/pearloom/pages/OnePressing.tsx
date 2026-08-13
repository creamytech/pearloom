'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pages/OnePressing.tsx — THE MERGE, first working cut
// (C.5 — REVAMP-EXECUTION-PLAN §9, RADICAL-DESIGN §D; behind the
// onePressing flag, lib/one-pressing.ts).
//
// The pressing IS the surface: instead of eight wizard steps and a
// handoff cliff, the host answers a floating prompt card while the
// site itself builds LIVE behind it — the real renderer
// (ThemedSite, proof mode) pressing their occasion, names, date,
// and venue as they type. Un-answered sections wear the honest
// drafting slats, never demo copy. The press uses the SAME
// idempotent create path as the classic wizard (pressKey — the
// W.2 contract), so no new double-create class.
//
// Deliberately thin in this cut (each a named later increment):
//   • The post-press editor handoff is still a route swap
//     (router.replace to /editor) — the true in-place mount needs
//     the editor's server ownership pass folded in.
//   • Photos / vibes / palette picks stay with the classic wizard;
//     the flag's default-off keeps that path primary.
//   • Signed-out presses route to /signup with the flagged return
//     path (the classic claim-card machinery owns state-keeping).
// ─────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '@/components/pearloom/redesign/ThemedSite';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import { seedSectionsFromWizard } from '@/lib/wizard-seed';
import { EVENT_TYPES, getEventType } from '@/lib/event-os/event-types';
import { nameModeFor } from '@/lib/event-os/name-mode';

const POPULAR: string[] = [
  'wedding', 'engagement', 'baby-shower', 'birthday',
  'bachelorette-party', 'anniversary', 'memorial', 'reunion',
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export function OnePressing() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [occasion, setOccasion] = useState<string>('');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgradeUrl?: string } | null>(null);
  /* One press key per mount — the W.2 idempotency contract; any
     retry converges on the same row. Minted lazily in the press
     handler (never in render — the compiler purity rule). */
  const pressKeyRef = useRef<string | null>(null);

  const nameMode = nameModeFor(occasion || 'wedding');
  const couple = nameMode.mode === 'couple';

  /* The live pressing — rebuilt from the answers on every render.
     Same assembly the classic wizard's finish uses (look stamp +
     fill-missing seeding), so the proof IS the site they'll get. */
  const manifest = useMemo<StoryManifest>(() => {
    const base = {
      occasion: occasion || 'wedding',
      themeFamily: 'v8',
      names: [nameA, couple ? nameB : ''],
      logistics: { date: date || undefined, venue: venue || undefined },
      chapters: [],
    } as unknown as StoryManifest;
    return seedSectionsFromWizard(applyWizardLook(base, { occasion: occasion || 'wedding' }), {});
  }, [occasion, nameA, nameB, couple, date, venue]);

  const canPress = Boolean(occasion && nameA.trim());

  const press = async () => {
    if (!canPress || busy) return;
    pressKeyRef.current ??= `one-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
    setBusy(true);
    setError(null);
    try {
      const slugBase = couple && nameB.trim()
        ? `${slugify(nameA)}-and-${slugify(nameB)}`
        : slugify(nameA);
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          create: true,
          pressKey: pressKeyRef.current,
          subdomain: slugBase || 'our-celebration',
          names: [nameA.trim(), couple ? nameB.trim() : ''],
          manifest,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { subdomain?: string; error?: string; code?: string; upgradeUrl?: string }
        | null;
      if (res.status === 401) {
        router.push('/signup?next=' + encodeURIComponent('/wizard/new?press=one'));
        return;
      }
      if (res.status === 402 && data?.code === 'PLAN_LIMIT') {
        setError({
          text: data.error ?? 'Your plan has reached its site limit.',
          upgradeUrl: typeof data.upgradeUrl === 'string' ? data.upgradeUrl : '/upgrade?from=sites',
        });
        setBusy(false);
        return;
      }
      if (!res.ok || !data?.subdomain) {
        setError({ text: data?.error ?? 'The press hiccuped — nothing was lost. Try again.' });
        setBusy(false);
        return;
      }
      router.replace(`/editor/${encodeURIComponent(data.subdomain)}`);
    } catch {
      setError({ text: 'The press hiccuped — nothing was lost. Try again.' });
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: '1px solid var(--line, #D8CFB8)', background: 'var(--card, #FFFEF7)',
    fontSize: 16, color: 'var(--ink, #0E0D0B)', fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 5,
  };

  return (
    <div className="pl8" data-one-pressing style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream, #F5EFE2)' }}>
      {/* The site, live behind the prompts. Proof mode: real answers
          press in, un-answered sections wear honest drafting slats. */}
      <div aria-hidden={step !== 2} style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
        <ThemedSite manifest={manifest} names={[nameA || ' ', couple ? nameB : '']} editable={false} proof />
      </div>

      {/* The floating prompt card — glass, per the floating-chrome rule. */}
      <div
        style={{
          position: 'fixed', left: '50%', bottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
          transform: 'translateX(-50%)',
          width: 'min(520px, calc(100vw - 24px))', zIndex: 50,
        }}
      >
        <div
          className="pl-glass-surface"
          style={{
            borderRadius: 18, padding: '18px 20px 16px',
            border: '1px solid var(--pl-divider, rgba(14,13,11,0.14))',
            boxShadow: '0 18px 48px -18px rgba(40,28,12,0.35)',
            background: 'var(--pl-glass, rgba(251,247,238,0.86))',
            backdropFilter: 'blur(18px) saturate(1.4)',
          }}
        >
          <div style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)', marginBottom: 10 }}>
            Your site, taking shape
          </div>

          {step === 0 && (
            <>
              <div style={labelStyle}>What are we celebrating?</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginBottom: 8 }}>
                {POPULAR.map((id) => {
                  const et = getEventType(id);
                  if (!et) return null;
                  const on = occasion === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => { setOccasion(id); setStep(1); }}
                      style={{
                        padding: '8px 6px', borderRadius: 10, fontSize: 11.5, fontWeight: 600,
                        border: on ? '1.5px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line, #D8CFB8)',
                        background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card, #FFFEF7)',
                        color: 'var(--ink, #0E0D0B)', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {et.label}
                    </button>
                  );
                })}
              </div>
              <select
                aria-label="Every occasion"
                value={occasion}
                onChange={(e) => { if (e.target.value) { setOccasion(e.target.value); setStep(1); } }}
                style={{ ...inputStyle, fontSize: 13, padding: '9px 11px' }}
              >
                <option value="">Something else…</option>
                {EVENT_TYPES.map((et) => (
                  <option key={et.id} value={et.id}>{et.label}</option>
                ))}
              </select>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: couple ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)', gap: 10, marginBottom: 10 }}>
                <div>
                  <label htmlFor="op-name-a" style={labelStyle}>{nameMode.primaryLabel}</label>
                  <input id="op-name-a" value={nameA} onChange={(e) => setNameA(e.target.value)} autoFocus autoComplete="off" style={inputStyle} />
                </div>
                {couple && (
                  <div>
                    <label htmlFor="op-name-b" style={labelStyle}>{nameMode.secondaryLabel ?? 'And'}</label>
                    <input id="op-name-b" value={nameB} onChange={(e) => setNameB(e.target.value)} autoComplete="off" style={inputStyle} />
                  </div>
                )}
              </div>
              <StepNav
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
                nextDisabled={!nameA.trim()}
              />
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10, marginBottom: 10 }}>
                <div>
                  <label htmlFor="op-date" style={labelStyle}>Date (optional)</label>
                  <input id="op-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="op-venue" style={labelStyle}>Where (optional)</label>
                  <input id="op-venue" value={venue} onChange={(e) => setVenue(e.target.value)} autoComplete="off" placeholder="Venue or city" style={inputStyle} />
                </div>
              </div>
              {error && (
                <div role="alert" style={{ marginBottom: 10, fontSize: 12.5, lineHeight: 1.5, color: 'var(--pl-plum, #7A2D2D)' }}>
                  {error.text}
                  {error.upgradeUrl && (
                    <>
                      {' '}
                      <a href={error.upgradeUrl} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>
                        See the Pass →
                      </a>
                    </>
                  )}
                </div>
              )}
              <StepNav
                onBack={() => setStep(1)}
                onNext={() => { void press(); }}
                nextDisabled={!canPress || busy}
                nextLabel={busy ? 'Pressing…' : 'Press my site'}
              />
            </>
          )}

          <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--ink-muted, #6F6557)' }}>
            Nothing is public until you publish.{' '}
            <a href="/wizard/new?press=classic" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Use the step-by-step wizard instead
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepNav({ onBack, onNext, nextDisabled, nextLabel = 'Next' }: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '9px 14px', borderRadius: 999, border: '1px solid var(--line, #D8CFB8)',
          background: 'transparent', color: 'var(--ink-muted, #6F6557)',
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          padding: '9px 20px', borderRadius: 999, border: 'none',
          background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #F5EFE2)',
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: nextDisabled ? 'default' : 'pointer',
          opacity: nextDisabled ? 0.5 : 1,
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
