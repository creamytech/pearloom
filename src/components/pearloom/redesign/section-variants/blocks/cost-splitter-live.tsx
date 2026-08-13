'use client';

/* Cost splitter — the LIVE ledger (GRAND-PLAN Phase 1 payoff).

   The published-site companion to cost-splitter.tsx's static demo.
   Where the static section reads a back-of-napkin list off
   manifest.bachelor.costs, THIS component reads the real, shared
   ledger from /api/split and lets a guest add to it:

     • roster of participants + "add someone"
     • every expense (payer, amount, per-person shares)
     • the DERIVED settle-up ("Ana owes Ben $40"), with a P2P pay
       deep-link built from the host's manifest.registryFunds handle
       (Venmo / Cash App / PayPal) on the transfer into the collector
     • an add-expense form (who paid / what for / amount / who shares)
       → POST /api/split/expenses. Shares are computed SERVER-SIDE —
       we send the mode + participant ids, NEVER the shares.

   Honesty rule (CLAUDE-DESIGN §7): this only ever renders on the
   PUBLISHED site (editable === false — the dispatcher in
   cost-splitter.tsx enforces it). Nothing here is demo content: the
   ledger is real guest/host data, and when there is no ledger yet we
   fall back to the host's own static manifest.bachelor.costs display
   (or render nothing) so an existing site never regresses.

   Auth mirrors /api/split: the owner (session) or a guest arriving
   via their passport link (?g=<token>) can read + write; a plain
   visitor 401s and quietly gets the static fallback. Money is integer
   cents from the API, formatted with registry-funds/formatCents. */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { WeaveLoader } from '@/components/brand/WeaveLoader';
import {
  hasFundHandles,
  venmoHref,
  cashappHref,
  paypalHref,
  formatCents,
  type RegistryFunds,
} from '@/lib/registry-funds';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, blockCopy, type BlockSectionProps } from './_shared';
import { StaticCostSplitter, hasStaticCosts } from './cost-splitter';

/* ─── API shapes (mirror lib/budget/split-access viewParticipant /
       viewExpense + lib/budget/split settleUp) ─────────────────── */

interface SplitParticipant {
  id: string;
  displayName: string;
  email: string | null;
  personId: string | null;
}
interface SplitExpense {
  id: string;
  payerId: string;
  description: string;
  amountCents: number;
  splitMode: string;
  spentOn: string | null;
  shares: Record<string, number>;
}
interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}
interface SplitState {
  participants: SplitParticipant[];
  expenses: SplitExpense[];
  balances: Record<string, number>;
  settleUp: Transfer[];
}

/* ─── styling idiom (matches cost-splitter.tsx — site --t-* vars,
       NOT dashboard chrome) ────────────────────────────────────── */

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

const monoLabel: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--t-ink-muted)',
};
const tabular: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

const cardStyle: CSSProperties = {
  background: 'var(--t-card)',
  border: '1px solid var(--t-line)',
  borderRadius: 'var(--t-radius-lg, 14px)',
};
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  color: 'var(--t-ink)',
  background: 'var(--t-paper)',
  border: '1px solid var(--t-line)',
  borderRadius: 10,
  outline: 'none',
};
const primaryBtn: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 999,
  border: 'none',
  background: 'var(--t-accent)',
  color: 'var(--t-accent-ink, var(--t-paper))',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
const quietBtn: CSSProperties = {
  padding: '9px 14px',
  borderRadius: 999,
  border: '1px solid var(--t-line)',
  background: 'transparent',
  color: 'var(--t-ink-soft)',
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/* ─── resolving the site + guest token, client-side ─────────────

   The dispatch bag doesn't carry the slug, so a published client
   resolves it itself (same shape /api/split accepts: uuid OR
   subdomain). manifest.subdomain when stamped, else the path segment
   the site is served at (/{occasion}/{slug} or /sites/{slug}), else
   a subdomain host. The `?g=` token is the passport link, exactly as
   GuestPearChat reads it. */

function safeSeg(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function resolveSiteId(manifest: BlockSectionProps['manifest']): string | null {
  const sub = (manifest as unknown as { subdomain?: unknown }).subdomain;
  if (typeof sub === 'string' && sub.trim()) return sub.trim();
  if (typeof window === 'undefined') return null;
  const segs = window.location.pathname.split('/').filter(Boolean);
  if (segs[0] === 'sites' && segs[1]) return safeSeg(segs[1]);
  if (segs.length >= 2) return safeSeg(segs[1]); // /{occasion}/{slug}[/page]
  const labels = window.location.hostname.split('.');
  if (labels.length >= 2 && labels[0] && labels[0] !== 'www') {
    if (window.location.hostname.endsWith('.localhost') || labels.length >= 3) return labels[0];
  }
  return null;
}

function resolveToken(): string {
  if (typeof window === 'undefined') return '';
  const p = new URL(window.location.href).searchParams;
  return (p.get('g') || p.get('guest') || '').trim();
}

function dollarsToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function normalize(json: unknown): SplitState {
  const o = (json ?? {}) as Record<string, unknown>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const rec = (v: unknown): Record<string, number> =>
    v && typeof v === 'object' ? (v as Record<string, number>) : {};
  return {
    participants: arr<SplitParticipant>(o.participants),
    expenses: arr<SplitExpense>(o.expenses),
    balances: rec(o.balances),
    settleUp: arr<Transfer>(o.settleUp),
  };
}

/* ─── the component ─────────────────────────────────────────────

   Render priority (published only):
     1. live ledger present (participants > 0)         → LiveLedger
     2. authorized but empty ledger (data non-null)    → ContributeSurface
     3. first load still in flight                      → static-or-Threading…
     4. SSR / unauthorized / unresolvable               → static-or-null

   `data` is set only on an authorized response and never cleared, so a
   background refresh keeps the current surface on screen (no flash). */

type Status = 'ssr' | 'loading' | 'loaded';

export function CostSplitterLive({ manifest, pad, variant, onEditCopy }: BlockSectionProps) {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>('ssr');
  const [data, setData] = useState<SplitState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const startedRef = useRef(false);

  const hasStatic = hasStaticCosts(manifest);
  const funds = (manifest as unknown as { registryFunds?: RegistryFunds }).registryFunds;

  const staticFallback = (
    <StaticCostSplitter manifest={manifest} pad={pad} editable={false} variant={variant} onEditCopy={onEditCopy} />
  );

  // Resolve the site + passport token once, on the client.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setSiteId(resolveSiteId(manifest));
    setToken(resolveToken());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the ledger (and re-load after a write bumps refreshKey).
  useEffect(() => {
    if (siteId === null) return;
    setStatus('loading');
    const ctrl = new AbortController();
    let cancelled = false;
    const url = `/api/split?siteId=${encodeURIComponent(siteId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    fetch(url, { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: unknown) => {
        if (cancelled) return;
        setStatus('loaded');
        if (json && typeof json === 'object' && (json as { ok?: unknown }).ok === true) {
          setData(normalize(json));
        }
      })
      .catch((e: unknown) => {
        if (cancelled || (e as { name?: string })?.name === 'AbortError') return;
        setStatus('loaded');
      });
    return () => { cancelled = true; ctrl.abort(); };
  }, [siteId, token, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // 1 · live ledger.
  if (data && data.participants.length > 0) {
    return (
      <BlockFrame pad={pad}>
        <VariantSectionHead
          eyebrow={blockCopy(manifest, 'costSplitterEyebrow', 'The kitty')}
          title={blockCopy(manifest, 'costSplitterTitle', 'Who owes what')}
        />
        <LiveLedger
          state={data}
          funds={funds}
          siteId={siteId!}
          token={token}
          onWrote={refresh}
        />
      </BlockFrame>
    );
  }

  // 2 · authorized, but no ledger yet → let them start one.
  if (data) {
    return (
      <BlockFrame pad={pad}>
        <VariantSectionHead
          eyebrow={blockCopy(manifest, 'costSplitterEyebrow', 'The kitty')}
          title={blockCopy(manifest, 'costSplitterTitle', 'Who owes what')}
        />
        <ContributeSurface
          siteId={siteId!}
          token={token}
          hasStatic={hasStatic}
          staticFallback={hasStatic ? staticFallback : null}
          // owner heuristic: an authorized caller with NO passport token
          // was authorized by session → the site owner (see gateSplit).
          canSeed={!token && hasStatic}
          onWrote={refresh}
        />
      </BlockFrame>
    );
  }

  // 3 · first load still in flight.
  if (status === 'loading') {
    return hasStatic ? staticFallback : (
      <BlockFrame pad={pad}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '32px 0' }}>
          <WeaveLoader size="md" label="Threading…" />
        </div>
      </BlockFrame>
    );
  }

  // 4 · SSR / unauthorized / unresolvable → today's behaviour.
  return hasStatic ? staticFallback : null;
}

/* ─── live ledger ───────────────────────────────────────────────── */

function LiveLedger({
  state, funds, siteId, token, onWrote,
}: {
  state: SplitState;
  funds: RegistryFunds | undefined;
  siteId: string;
  token: string;
  onWrote: () => void;
}) {
  const { participants, expenses, balances, settleUp } = state;
  const nameById = new Map(participants.map((p) => [p.id, p.displayName]));
  const nameOf = (id: string) => nameById.get(id) ?? 'Someone';

  // The collector: the biggest net creditor. In the common weekend
  // case one person fronts the pot and everyone reimburses them — the
  // host, whose handles registryFunds holds. We attach the pay link
  // only to transfers INTO them; other creditors get no link (we don't
  // have their handle — never invent one).
  let collectorId: string | null = null;
  let top = 0;
  for (const [id, v] of Object.entries(balances)) {
    if (v > top) { top = v; collectorId = id; }
  }
  const links = hasFundHandles(funds) ? payLinks(funds!) : [];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Roster */}
      <div style={{ ...cardStyle, padding: '14px 18px' }}>
        <div style={{ ...monoLabel, marginBottom: 10 }}>Sharing the cost</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {participants.map((p) => (
            <span
              key={p.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 11px 5px 5px', borderRadius: 999,
                background: 'var(--t-section)', border: '1px solid var(--t-line-soft)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--t-accent-bg, var(--t-section))', color: 'var(--t-accent-ink)',
                  display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 9, fontWeight: 700,
                }}
              >
                {initials(p.displayName)}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--t-ink)' }}>{p.displayName}</span>
            </span>
          ))}
        </div>
        <AddParticipantRow siteId={siteId} token={token} onWrote={onWrote} />
      </div>

      {/* Expenses */}
      {expenses.length > 0 && (
        <div style={{ ...cardStyle, padding: '6px 18px 14px' }}>
          <div>
            {expenses.map((e, i) => {
              const sharerIds = Object.keys(e.shares);
              return (
                <div
                  key={e.id}
                  style={{
                    padding: '12px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
                    display: 'flex', alignItems: 'baseline', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t-ink)' }}>{e.description}</div>
                    <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--t-ink-muted)', marginTop: 1 }}>
                      {nameOf(e.payerId)} paid · split {sharerIds.length} {sharerIds.length === 1 ? 'way' : 'ways'}
                    </div>
                  </div>
                  <div style={{ ...tabular, fontSize: 14, fontWeight: 600, color: 'var(--t-ink)', textAlign: 'right' }}>
                    {formatCents(e.amountCents)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settle up */}
      <SettleUpBlock
        settleUp={settleUp}
        nameOf={nameOf}
        collectorId={collectorId}
        links={links}
      />

      {/* Add an expense */}
      <AddExpenseForm participants={participants} siteId={siteId} token={token} onWrote={onWrote} />
    </div>
  );
}

function payLinks(funds: RegistryFunds): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (funds.venmo && funds.venmo.trim()) out.push({ label: 'Venmo', href: venmoHref(funds.venmo) });
  if (funds.cashapp && funds.cashapp.trim()) out.push({ label: 'Cash App', href: cashappHref(funds.cashapp) });
  const pp = funds.paypal && funds.paypal.trim() ? paypalHref(funds.paypal) : null;
  if (pp) out.push({ label: 'PayPal', href: pp });
  return out;
}

function SettleUpBlock({
  settleUp, nameOf, collectorId, links,
}: {
  settleUp: Transfer[];
  nameOf: (id: string) => string;
  collectorId: string | null;
  links: { label: string; href: string }[];
}) {
  if (settleUp.length === 0) {
    return (
      <div style={{ textAlign: 'center', ...monoLabel, fontSize: 10, letterSpacing: '0.2em', color: 'var(--t-ink-soft)' }}>
        All square
      </div>
    );
  }
  const canPay = links.length > 0 && collectorId != null;
  const attachedAny = canPay && settleUp.some((t) => t.toId === collectorId);
  return (
    <div style={{ ...cardStyle, padding: '16px 20px 18px' }}>
      <div style={{ ...monoLabel, textAlign: 'center', marginBottom: 4 }}>Settle up</div>
      <div aria-hidden style={{ height: 2, background: 'var(--t-accent)', width: 44, margin: '0 auto 14px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {settleUp.map((t, i) => {
          const showLinks = canPay && t.toId === collectorId;
          return (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', gap: '4px 10px' }}>
              <span style={{ fontSize: 13.5, color: 'var(--t-ink-soft)', ...tabular }}>
                <strong style={{ fontWeight: 600, color: 'var(--t-ink)' }}>{nameOf(t.fromId)}</strong>
                {' owes '}
                <strong style={{ fontWeight: 600, color: 'var(--t-ink)' }}>{nameOf(t.toId)}</strong>
                {' — '}
                <span style={{ color: 'var(--t-accent-ink)', fontWeight: 700 }}>{formatCents(t.amountCents)}</span>
              </span>
              {showLinks && (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  {links.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...quietBtn,
                        padding: '4px 10px',
                        fontSize: 11.5,
                        textDecoration: 'none',
                        color: 'var(--t-ink)',
                      }}
                    >
                      {l.label}
                    </a>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {attachedAny && (
        <div style={{ textAlign: 'center', fontSize: 11, fontStyle: 'italic', color: 'var(--t-ink-muted)', marginTop: 12 }}>
          Pay links open the host&apos;s saved handle. Pearloom never touches the money.
        </div>
      )}
    </div>
  );
}

/* ─── contribute surface (authorized, empty ledger) ─────────────── */

function ContributeSurface({
  siteId, token, hasStatic, staticFallback, canSeed, onWrote,
}: {
  siteId: string;
  token: string;
  hasStatic: boolean;
  staticFallback: ReactNode;
  canSeed: boolean;
  onWrote: () => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function seed() {
    setSeeding(true);
    setErr(null);
    try {
      const res = await fetch('/api/split/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && json?.ok) onWrote();
      else setErr(json?.error ?? 'Could not bring in the costs.');
    } catch {
      setErr('Could not bring in the costs.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {hasStatic ? (
        staticFallback
      ) : (
        <div
          style={{
            ...cardStyle,
            borderStyle: 'dashed',
            padding: '26px 18px',
            textAlign: 'center',
            color: 'var(--t-ink-muted)',
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--t-ink-soft)', marginBottom: 4 }}>
            Nothing here yet.
          </div>
          <div>Add the first person and the ledger starts weaving.</div>
        </div>
      )}

      {canSeed && (
        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={seed} disabled={seeding} style={{ ...primaryBtn, opacity: seeding ? 0.6 : 1 }}>
            {seeding ? 'Bringing them in…' : 'Bring in your weekend costs'}
          </button>
          <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 8 }}>
            Starts the shared ledger from your planner&apos;s cost list.
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, padding: '14px 18px' }}>
        <div style={{ ...monoLabel, marginBottom: 10 }}>Sharing the cost</div>
        <AddParticipantRow siteId={siteId} token={token} onWrote={onWrote} />
      </div>

      {err && <div style={{ fontSize: 12.5, color: 'var(--t-plum, #8a3a52)', textAlign: 'center' }}>{err}</div>}
    </div>
  );
}

/* ─── add participant ───────────────────────────────────────────── */

function AddParticipantRow({ siteId, token, onWrote }: { siteId: string; token: string; onWrote: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const displayName = name.trim();
    if (!displayName || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/split/participants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ siteId, token: token || undefined, displayName }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && json?.ok) {
        setName('');
        onWrote();
      } else {
        setErr(json?.error ?? 'Could not add.');
      }
    } catch {
      setErr('Could not add.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <input
        value={name}
        onChange={(e) => { setName(e.target.value); setErr(null); }}
        placeholder="Add someone"
        aria-label="Add someone to the split"
        maxLength={80}
        style={inputStyle}
      />
      <button type="submit" disabled={!name.trim() || busy} style={{ ...quietBtn, opacity: !name.trim() || busy ? 0.5 : 1 }}>
        Add
      </button>
      {err && <span role="alert" style={{ alignSelf: 'center', fontSize: 12, color: 'var(--t-plum, #8a3a52)' }}>{err}</span>}
    </form>
  );
}

/* ─── add expense ───────────────────────────────────────────────── */

function AddExpenseForm({
  participants, siteId, token, onWrote,
}: {
  participants: SplitParticipant[];
  siteId: string;
  token: string;
  onWrote: () => void;
}) {
  const allIds = participants.map((p) => p.id);
  const [open, setOpen] = useState(false);
  const [payerId, setPayerId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Derive the effective payer (no render-time setState) so it stays
  // valid as the roster changes — default to the first participant.
  const effectivePayer = payerId && allIds.includes(payerId) ? payerId : (allIds[0] ?? '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const cents = dollarsToCents(amount);
    const desc = description.trim();
    if (!effectivePayer) { setErr('Choose who paid.'); return; }
    if (!desc) { setErr('What was it for?'); return; }
    if (cents == null) { setErr('Add an amount.'); return; }
    const excludedIds = allIds.filter((id) => excluded[id]);
    if (excludedIds.length >= allIds.length) { setErr('At least one person has to share it.'); return; }
    const mode = excludedIds.length > 0 ? 'exclude' : 'even';
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/split/expenses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          siteId,
          token: token || undefined,
          payerId: effectivePayer,
          description: desc,
          amountCents: cents,
          mode,
          // shares are computed server-side — we send the mode + who
          // is in, never the per-person cents.
          participantIds: allIds,
          excluded: mode === 'exclude' ? excludedIds : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && json?.ok) {
        setDescription('');
        setAmount('');
        setExcluded({});
        setOpen(false);
        onWrote();
      } else {
        setErr(json?.error ?? 'Could not save it.');
      }
    } catch {
      setErr('Could not save it.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div style={{ textAlign: 'center' }}>
        <button type="button" onClick={() => setOpen(true)} style={quietBtn}>
          Add an expense
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={monoLabel}>Add an expense</div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>Who paid</span>
        <select
          value={effectivePayer}
          onChange={(e) => setPayerId(e.target.value)}
          aria-label="Who paid"
          style={{ ...inputStyle, appearance: 'auto' }}
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>What for</span>
        <input
          value={description}
          onChange={(e) => { setDescription(e.target.value); setErr(null); }}
          placeholder="House rental"
          maxLength={140}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>Amount</span>
        <input
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setErr(null); }}
          inputMode="decimal"
          placeholder="$0"
          style={inputStyle}
        />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>Who shares it</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {participants.map((p) => (
            <label key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--t-ink-soft)' }}>
              <input
                type="checkbox"
                checked={!excluded[p.id]}
                onChange={(e) => setExcluded((prev) => ({ ...prev, [p.id]: !e.target.checked }))}
              />
              {p.displayName}
            </label>
          ))}
        </div>
      </div>

      {err && <div role="alert" style={{ fontSize: 12.5, color: 'var(--t-plum, #8a3a52)' }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => { setOpen(false); setErr(null); }} style={quietBtn}>Cancel</button>
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Saving…' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
