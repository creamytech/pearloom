'use client';

/* The comp desk UI. Server component gates access; every API
   call re-checks the session, so this client is presentation
   only. Paper styling per BRAND.md — this is internal chrome,
   but it's still our chrome. */

import { useState } from 'react';
import { PACKS } from '@/lib/theme-store/packs';

interface OwnedRow {
  packId: string;
  purchasedAt: string | null;
  source: string | null;
}

interface LookupResult {
  email: string;
  plan: string;
  stripeCustomerId: string | null;
  ownedPackIds: OwnedRow[];
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Journal (free)',
  pro: 'Atelier',
  premium: 'Legacy',
};

const mono: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono, monospace)',
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--pl-muted, #6F6557)',
};

const card: React.CSSProperties = {
  background: 'var(--pl-cream-card, #FBF7EE)',
  border: '1px solid var(--pl-divider, #D8CFB8)',
  borderRadius: 'var(--pl-radius-lg, 12px)',
  padding: 20,
};

const btn: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 'var(--pl-radius-full, 100px)',
  border: '1px solid var(--pl-divider, #D8CFB8)',
  background: 'var(--pl-cream-card, #FBF7EE)',
  color: 'var(--pl-ink, #0E0D0B)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnInk: React.CSSProperties = {
  ...btn,
  background: 'var(--pl-ink, #0E0D0B)',
  color: 'var(--pl-cream, #F5EFE2)',
  border: 'none',
};

export function AdminClient({ adminEmail }: { adminEmail: string }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [packPick, setPackPick] = useState(PACKS.find((p) => p.tier !== 'free')?.id ?? '');

  async function lookup(email: string) {
    setBusy('lookup');
    setNote(null);
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json as LookupResult);
    } catch (e) {
      setResult(null);
      setNote(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setBusy(null);
    }
  }

  async function grant(body: Record<string, string>) {
    if (!result) return;
    setBusy(body.action);
    setNote(null);
    try {
      const res = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: result.email, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setNote(
        body.action === 'set-plan'
          ? `Plan set to ${PLAN_LABEL[body.plan] ?? body.plan}.`
          : body.action === 'grant-all-packs'
            ? `Granted ${json.granted} packs.`
            : `Granted ${body.packId}.`,
      );
      await lookup(result.email);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Grant failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main
      className="pl-grain"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--pl-cream, #F5EFE2)',
        color: 'var(--pl-ink, #0E0D0B)',
        padding: '56px clamp(20px, 6vw, 72px) 96px',
      }}
    >
      <div style={mono}>PEARLOOM · THE COMP DESK</div>
      <h1
        className="pl-letterpress"
        style={{
          fontFamily: 'var(--pl-font-display, Fraunces, serif)',
          fontSize: 'clamp(30px, 4vw, 42px)',
          margin: '10px 0 6px',
        }}
      >
        Grants &amp; subscriptions
      </h1>
      <p style={{ maxWidth: 520, fontSize: 14, color: 'var(--pl-ink-soft, #3A332C)', marginBottom: 28 }}>
        Signed in as <strong>{adminEmail}</strong>. Look a member up by email, then set their plan
        or hand them theme packs. Everything lands in the same ledgers Stripe writes to, stamped
        with your name.
      </p>

      {/* Lookup */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) void lookup(query.trim());
        }}
        style={{ display: 'flex', gap: 10, maxWidth: 560, marginBottom: 28 }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="member@example.com"
          type="email"
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: 'var(--pl-radius-full, 100px)',
            border: '1px solid var(--pl-divider, #D8CFB8)',
            background: 'var(--pl-cream-card, #FBF7EE)',
            fontSize: 14,
            color: 'var(--pl-ink, #0E0D0B)',
            outline: 'none',
          }}
        />
        <button type="submit" style={btnInk} disabled={busy === 'lookup'}>
          {busy === 'lookup' ? 'Threading…' : 'Look up'}
        </button>
      </form>

      {note && (
        <div
          style={{
            ...card,
            maxWidth: 560,
            marginBottom: 20,
            padding: '12px 16px',
            fontSize: 13,
            borderColor: 'var(--pl-olive-30, rgba(92,107,63,0.3))',
          }}
        >
          {note}
        </div>
      )}

      {result && (
        <div style={{ display: 'grid', gap: 18, maxWidth: 760 }}>
          {/* Plan */}
          <section style={card}>
            <div style={mono}>PLAN</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '10px 0 16px' }}>
              <span style={{ fontFamily: 'var(--pl-font-display, Fraunces, serif)', fontSize: 24 }}>
                {PLAN_LABEL[result.plan] ?? result.plan}
              </span>
              <span style={{ fontSize: 12, color: 'var(--pl-muted, #6F6557)' }}>
                {result.email}
                {result.stripeCustomerId ? ' · has Stripe customer' : ' · no Stripe record'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['free', 'pro', 'premium'] as const).map((p) => (
                <button
                  key={p}
                  style={result.plan?.toLowerCase() === p ? btnInk : btn}
                  disabled={busy !== null}
                  onClick={() => void grant({ action: 'set-plan', plan: p })}
                >
                  {busy === 'set-plan' ? '…' : PLAN_LABEL[p]}
                </button>
              ))}
            </div>
          </section>

          {/* Packs */}
          <section style={card}>
            <div style={mono}>THEME PACKS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 16px', alignItems: 'center' }}>
              <select
                value={packPick}
                onChange={(e) => setPackPick(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: 'var(--pl-radius-full, 100px)',
                  border: '1px solid var(--pl-divider, #D8CFB8)',
                  background: 'var(--pl-cream-card, #FBF7EE)',
                  fontSize: 13,
                  color: 'var(--pl-ink, #0E0D0B)',
                }}
              >
                {PACKS.filter((p) => p.tier !== 'free').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · ${(p.priceCents / 100).toFixed(0)} · {p.tier}
                  </option>
                ))}
              </select>
              <button
                style={btn}
                disabled={busy !== null}
                onClick={() => void grant({ action: 'grant-pack', packId: packPick })}
              >
                {busy === 'grant-pack' ? 'Threading…' : 'Grant this pack'}
              </button>
              <button
                style={btn}
                disabled={busy !== null}
                onClick={() => void grant({ action: 'grant-all-packs' })}
              >
                {busy === 'grant-all-packs' ? 'Threading…' : 'Grant the whole catalog'}
              </button>
            </div>
            <div style={mono}>OWNED ({result.ownedPackIds.length})</div>
            {result.ownedPackIds.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--pl-muted, #6F6557)', margin: '8px 0 0' }}>
                Nothing yet. Free-shelf and plan-included packs don&apos;t need rows here.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 6 }}>
                {result.ownedPackIds.map((o) => (
                  <li
                    key={o.packId}
                    style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'baseline' }}
                  >
                    <span style={{ fontWeight: 600 }}>{o.packId}</span>
                    <span style={{ fontSize: 11, color: 'var(--pl-muted, #6F6557)' }}>
                      {o.source?.startsWith('admin:') ? `comped — ${o.source.split(':')[1]}` : 'purchased'}
                      {o.purchasedAt ? ` · ${new Date(o.purchasedAt).toLocaleDateString()}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
