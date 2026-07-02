'use client';

// ─────────────────────────────────────────────────────────────
// RegistryFundCard — "Give directly" (R2-lite cash funds).
//
// Pearloom NEVER processes gift money. This card renders the
// host's OWN P2P handles (manifest.registryFunds — Venmo /
// PayPal.Me / Cash App / Zelle) as brand-styled links inside the
// registry section, with an honor-system ledger on top:
//
//   • goal progress — pledge-driven (totalCents vs goalCents from
//     /api/gift-pledges), captioned "as shared by guests"; with
//     no goal, just "{count} gifts woven in".
//   • handle buttons — open in new tabs; Zelle (no web deep link)
//     shows the address with copy-to-clipboard.
//   • ≥768px viewports get a small BrandedQR per linkable handle.
//   • after a guest taps a give link: "Did you send something?
//     Add it to the thread →" (name + optional amount) → POST
//     /api/gift-pledges → "Woven in — thank you."
//
// Same contract as RegistryItemsGrid: published needs siteSlug +
// real handles or renders nothing; the editor canvas previews
// with demo pledge numbers gated by `editable` only (honesty
// rule — demo never reaches published sites). Themed entirely
// with --t-* vars; tiny opacity/color transitions only.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  cashappHref, formatCents, hasFundHandles, paypalHref, venmoHref,
  type RegistryFunds,
} from '@/lib/registry-funds';
import { BrandedQR } from '../editor/panels/BrandedQR';
import { useIsMobile } from './use-nav-hooks';

interface PledgeStats {
  totalCents: number;
  count: number;
  recent: Array<{ firstName: string; at: string }>;
}

interface Props {
  funds?: RegistryFunds;
  /** The published slug — undefined on the editor canvas. */
  siteSlug?: string;
  /** Editor canvas — demo pledge numbers, links disabled. */
  editable?: boolean;
  /** Section title, reused as the card's fund name. */
  title: string;
  /** Donation-mode re-skin ("Where donations go"). */
  donation?: boolean;
}

/* Demo furniture for the editor canvas ONLY (honesty rule:
   `editable` is the single gate). */
const DEMO_STATS: PledgeStats = {
  totalCents: 32000,
  count: 3,
  recent: [{ firstName: 'June', at: '' }],
};

type HandleDef = { key: string; label: string; href: string | null; display: string };

function buildHandles(funds: RegistryFunds): HandleDef[] {
  const out: HandleDef[] = [];
  if (funds.venmo?.trim()) {
    out.push({ key: 'venmo', label: 'Give on Venmo', href: venmoHref(funds.venmo), display: `@${funds.venmo.trim()}` });
  }
  if (funds.paypal?.trim()) {
    const href = paypalHref(funds.paypal);
    if (href) {
      out.push({ key: 'paypal', label: 'Give on PayPal', href, display: href.replace(/^https:\/\/(www\.)?/, '') });
    }
  }
  if (funds.cashapp?.trim()) {
    out.push({ key: 'cashapp', label: 'Give on Cash App', href: cashappHref(funds.cashapp), display: `$${funds.cashapp.trim()}` });
  }
  if (funds.zelle?.trim()) {
    out.push({ key: 'zelle', label: 'Give with Zelle', href: null, display: funds.zelle.trim() });
  }
  return out;
}

export function RegistryFundCard({ funds, siteSlug, editable = false, title, donation = false }: Props) {
  const [stats, setStats] = useState<PledgeStats | null>(editable ? DEMO_STATS : null);
  /* Follow-up flow — armed once the guest taps any give affordance. */
  const [tapped, setTapped] = useState(false);
  const wide = !useIsMobile(767); // ≥768px → per-handle QRs

  const refresh = useCallback(async () => {
    if (!siteSlug || editable) return;
    try {
      const r = await fetch(`/api/gift-pledges?subdomain=${encodeURIComponent(siteSlug)}&public=1`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as Partial<PledgeStats>;
      setStats({
        totalCents: typeof d.totalCents === 'number' ? d.totalCents : 0,
        count: typeof d.count === 'number' ? d.count : 0,
        recent: Array.isArray(d.recent) ? d.recent : [],
      });
    } catch { /* card still renders — the handles matter most */ }
  }, [siteSlug, editable]);

  useEffect(() => {
    const t = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  if (!funds || !hasFundHandles(funds)) return null;
  const handles = buildHandles(funds);
  if (handles.length === 0) return null;

  const goal = typeof funds.goalCents === 'number' && funds.goalCents > 0 ? funds.goalCents : null;
  const total = stats?.totalCents ?? 0;
  const count = stats?.count ?? 0;
  const pct = goal ? Math.max(0, Math.min(100, Math.round((total / goal) * 100))) : 0;

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto 30px',
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius)',
        padding: '22px 22px 20px',
        textAlign: 'center',
      }}
    >
      {/* Mono label + gold hairlines — BRAND §4 editorial label. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
        <span aria-hidden style={{ width: 26, height: 1, background: 'var(--t-gold, var(--t-accent))' }} />
        <span
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: 'var(--t-ink-soft)',
          }}
        >
          {donation ? 'Where donations go' : 'Give directly'}
        </span>
        <span aria-hidden style={{ width: 26, height: 1, background: 'var(--t-gold, var(--t-accent))' }} />
      </div>

      <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 19, color: 'var(--t-ink)', lineHeight: 1.25 }}>
        {title}
      </div>

      {/* ── The honor ledger — pledge-driven, BRAND-honest. ── */}
      {goal ? (
        <div style={{ margin: '14px auto 0', maxWidth: 360 }}>
          <div style={{ height: 14, borderRadius: 999, background: 'var(--t-section)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`, height: '100%', borderRadius: 999,
                background: 'var(--t-accent)', transition: 'width 600ms',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', marginTop: 7 }}>
            {total > 0
              ? <>{formatCents(total)} of {formatCents(goal)} — <i>as shared by guests</i></>
              : <>Toward {formatCents(goal)}</>}
          </div>
        </div>
      ) : count > 0 ? (
        <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', marginTop: 12 }}>
          {count} {count === 1 ? 'gift' : 'gifts'} woven in
        </div>
      ) : null}

      {/* ── Handle buttons (+ QRs on wide viewports). ── */}
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 12, marginTop: 18,
        }}
      >
        {handles.map((h) => (
          <div key={h.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {h.href ? (
              <a
                href={editable ? undefined : h.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (editable) { e.preventDefault(); return; }
                  setTapped(true);
                }}
                title={editable ? 'Live on your site' : h.display}
                style={{
                  ...handleButton,
                  cursor: editable ? 'default' : 'pointer',
                  opacity: editable ? 0.8 : 1,
                }}
              >
                <span>{h.label}</span>
                <span style={handleSub}>{h.display}</span>
              </a>
            ) : (
              <ZelleRow
                address={h.display}
                preview={editable}
                onCopied={() => setTapped(true)}
              />
            )}
            {wide && h.href && (
              <BrandedQR
                value={h.href}
                size={88}
                initials=""
                dark="var(--t-ink)"
                light="var(--t-card)"
                accent="var(--t-accent)"
                shape="square"
              />
            )}
          </div>
        ))}
      </div>

      {/* ── The gentle follow-up → the thread. ── */}
      {tapped && !editable && (
        <PledgeComposer
          siteSlug={siteSlug}
          donation={donation}
          onWoven={refresh}
        />
      )}
    </div>
  );
}

/* Zelle has no web deep link — show the address with a copy
   affordance so guests can paste it into their banking app. */
function ZelleRow({ address, preview, onCopied }: { address: string; preview: boolean; onCopied: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (preview) return;
    navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* clipboard blocked — address stays visible */ });
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={preview ? 'Live on your site' : 'Copy the Zelle address'}
      style={{
        ...handleButton,
        cursor: preview ? 'default' : 'pointer',
        opacity: preview ? 0.8 : 1,
        border: '1px dashed var(--t-line)',
        background: 'transparent',
      }}
    >
      <span>{copied ? 'Copied — paste it in your bank app' : 'Give with Zelle'}</span>
      <span style={handleSub}>{address} · tap to copy</span>
    </button>
  );
}

type ComposerStage = 'idle' | 'sending' | 'done';

function PledgeComposer({ siteSlug, donation, onWoven }: {
  siteSlug?: string;
  donation: boolean;
  onWoven: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<ComposerStage>('idle');
  const [error, setError] = useState<string | null>(null);

  async function weaveIn() {
    if (stage === 'sending' || !name.trim() || !siteSlug) return;
    setStage('sending');
    setError(null);
    /* Optional amount — dollars in, integer cents out. Malformed
       input just drops the number; the thread matters more. */
    const dollars = parseFloat(amount.replace(/[$,\s]/g, ''));
    const amountCents = Number.isFinite(dollars) && dollars > 0
      ? Math.round(dollars * 100)
      : undefined;
    try {
      const r = await fetch('/api/gift-pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug, guestName: name.trim(), amountCents }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Could not save — try again.');
      setStage('done');
      void onWoven();
    } catch (e) {
      setStage('idle');
      setError(e instanceof Error ? e.message : 'Could not save — try again.');
    }
  }

  if (stage === 'done') {
    return (
      <div style={{ marginTop: 16, fontSize: 13, fontStyle: 'italic', color: 'var(--t-ink-soft)' }}>
        Woven in — thank you.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 16, padding: 0, border: 'none', background: 'transparent',
          fontSize: 12.5, fontWeight: 700, color: 'var(--t-accent-ink)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Did you send something? Add it to the thread →
      </button>
    );
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 320, marginInline: 'auto' }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={80}
        disabled={stage === 'sending'}
        style={cardInput}
      />
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={donation ? 'Amount (optional)' : 'Amount (optional) — e.g. 50'}
        maxLength={12}
        disabled={stage === 'sending'}
        style={cardInput}
      />
      {error && <div style={{ fontSize: 11.5, color: 'var(--t-accent)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={weaveIn}
          disabled={stage === 'sending' || !name.trim()}
          style={{
            padding: '8px 16px', borderRadius: 999,
            background: 'var(--t-rsvp, var(--t-accent))',
            color: 'var(--t-rsvp-ink, var(--t-paper))',
            border: 'none', fontSize: 12.5, fontWeight: 700,
            cursor: stage === 'sending' || !name.trim() ? 'default' : 'pointer',
            opacity: stage === 'sending' || !name.trim() ? 0.55 : 1,
            fontFamily: 'inherit',
          }}
        >
          {stage === 'sending' ? 'Threading…' : 'Add it to the thread'}
        </button>
        {stage !== 'sending' && (
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            style={{
              padding: '8px 12px', borderRadius: 999,
              background: 'transparent', color: 'var(--t-ink-soft)',
              border: '1px solid var(--t-line)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Not yet
          </button>
        )}
      </div>
    </div>
  );
}

const handleButton: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  padding: '12px 22px',
  borderRadius: 'var(--t-radius)',
  background: 'var(--t-card)',
  border: '1px solid var(--t-line)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--t-ink)',
  textDecoration: 'none',
  maxWidth: 260,
  fontFamily: 'inherit',
  transition: 'border-color 160ms ease, opacity 160ms ease',
};

const handleSub: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--t-ink-soft)',
  lineHeight: 1.4,
  wordBreak: 'break-all',
};

const cardInput: CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 'var(--t-radius, 10px)',
  border: '1px solid var(--t-line)',
  background: 'var(--t-paper)',
  color: 'var(--t-ink)',
  fontSize: 'max(16px, 0.9rem)',
  fontFamily: 'var(--t-body, inherit)',
  outline: 'none',
  boxSizing: 'border-box',
  textAlign: 'center',
};

export default RegistryFundCard;
