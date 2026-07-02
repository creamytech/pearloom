'use client';

// ─────────────────────────────────────────────────────────────
// RegistryItemsGrid — the native registry on the published site.
//
// Renders the site's NATIVE registry items (registry_items rows,
// via the public GET on /api/registry-items) as an item-card grid
// ABOVE the linked-store pills inside the registry section. The
// claim flow is reserve-and-link (launch mode, no payment):
// "I'll get this" → name + optional note → POST reserve → the card
// flips to "Spoken for — basted in by {first name}" with a
// "Buy it at {store} →" link when the item carries a product URL.
//
// Same contract as GuestbookSection / GuestPlaylist:
//   • published: needs siteSlug; zero items renders nothing.
//   • editor canvas (editable, no slug): three demo cards so the
//     host can see the furniture — gated by `editable` only, demo
//     content NEVER reaches published sites.
//
// Themed entirely with the site's --t-* vars. Honours
// prefers-reduced-motion (no keyframes; tiny color/opacity
// transitions only).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, type CSSProperties } from 'react';

interface PublicItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  itemUrl: string | null;
  quantity: number;
  quantityClaimed: number;
  purchased: boolean;
  claimedByFirstName: string | null;
}

interface Props {
  /** The published slug — undefined on the editor canvas. */
  siteSlug?: string;
  /** Editor canvas — renders demo cards, claims disabled. */
  editable?: boolean;
}

/* Demo furniture for the editor canvas ONLY (honesty rule:
   `editable` is the single gate — published sites render
   exclusively host-listed items). */
const DEMO_ITEMS: PublicItem[] = [
  {
    id: 'demo-1', name: 'The dutch oven', description: 'The one every soup for the next thirty years comes out of.',
    price: 120, imageUrl: null, itemUrl: null, quantity: 1, quantityClaimed: 0, purchased: false, claimedByFirstName: null,
  },
  {
    id: 'demo-2', name: 'A case of the good olive oil', description: 'For the table we keep setting.',
    price: 38, imageUrl: null, itemUrl: null, quantity: 4, quantityClaimed: 1, purchased: false, claimedByFirstName: 'June',
  },
  {
    id: 'demo-3', name: 'Two nights in the hills', description: 'The first quiet weekend after.',
    price: 260, imageUrl: null, itemUrl: null, quantity: 1, quantityClaimed: 1, purchased: true, claimedByFirstName: 'June',
  },
];

function formatPrice(n: number): string {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function storeNameFor(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'the store'; }
}

export function RegistryItemsGrid({ siteSlug, editable = false }: Props) {
  const [items, setItems] = useState<PublicItem[] | null>(editable ? DEMO_ITEMS : null);

  const refresh = useCallback(async () => {
    if (!siteSlug || editable) return;
    try {
      const r = await fetch(`/api/registry-items?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as { items?: PublicItem[] };
      setItems(d.items ?? []);
    } catch { /* grid stays as-is */ }
  }, [siteSlug, editable]);

  useEffect(() => {
    const t = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  // Published with nothing listed (or still threading) → no extra chrome.
  if (!items || items.length === 0) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto 30px' }}>
      {/* Mono label + gold hairline — BRAND §4 editorial label. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
        <span aria-hidden style={{ width: 26, height: 1, background: 'var(--t-gold, var(--t-accent))' }} />
        <span
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: 'var(--t-ink-soft)',
          }}
        >
          The registry
        </span>
        <span aria-hidden style={{ width: 26, height: 1, background: 'var(--t-gold, var(--t-accent))' }} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          textAlign: 'left',
        }}
      >
        {items.map((item) => (
          <ItemCard key={item.id} item={item} preview={editable} onReserved={refresh} />
        ))}
      </div>
    </div>
  );
}

type ClaimStage = 'idle' | 'form' | 'sending' | 'done';

function ItemCard({ item, preview, onReserved }: { item: PublicItem; preview: boolean; onReserved: () => Promise<void> | void }) {
  const [stage, setStage] = useState<ClaimStage>('idle');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [buyUrl, setBuyUrl] = useState<string | null>(null);

  const remaining = Math.max(0, item.quantity - item.quantityClaimed);
  const spokenFor = stage !== 'done' && (item.purchased || remaining === 0);

  async function reserve() {
    if (stage === 'sending' || !name.trim()) return;
    setStage('sending');
    setError(null);
    try {
      const r = await fetch(`/api/registry-items/${encodeURIComponent(item.id)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'reserve', payerName: name.trim(), message: note.trim(), quantity: 1 }),
      });
      const d = (await r.json().catch(() => ({}))) as { reserved?: boolean; buyUrl?: string | null; error?: string };
      if (!r.ok || !d.reserved) {
        throw new Error(d.error ?? 'Could not reserve — try again.');
      }
      setDoneName(name.trim().split(/\s+/)[0]);
      setBuyUrl(d.buyUrl ?? null);
      setStage('done');
      void onReserved();
    } catch (e) {
      setStage('form');
      setError(e instanceof Error ? e.message : 'Could not reserve — try again.');
    }
  }

  const claimedName = stage === 'done' ? doneName : item.claimedByFirstName;
  const effectiveBuyUrl = stage === 'done' ? buyUrl : item.itemUrl;

  return (
    <div
      style={{
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius)',
        overflow: 'hidden',
        opacity: spokenFor ? 0.72 : 1,
        transition: 'opacity 240ms ease',
      }}
    >
      {/* Photo — or a quiet paper tile with the gift glyph. */}
      {item.imageUrl ? (
        <div
          role="img"
          aria-label={item.name}
          style={{
            aspectRatio: '4/3',
            background: `var(--t-section) center / cover no-repeat url("${item.imageUrl.replace(/"/g, '%22')}")`,
            filter: spokenFor ? 'grayscale(0.5)' : undefined,
          }}
        />
      ) : (
        <div style={{ aspectRatio: '4/3', background: 'var(--t-section)', display: 'grid', placeItems: 'center' }}>
          <GiftGlyph crossed={spokenFor || stage === 'done'} />
        </div>
      )}

      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div
            style={{
              fontFamily: 'var(--t-display)',
              fontWeight: 'var(--t-display-wght)',
              fontSize: 16.5, lineHeight: 1.2, color: 'var(--t-ink)',
            }}
          >
            {item.name}
          </div>
          {typeof item.price === 'number' && item.price > 0 && (
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11.5, letterSpacing: '0.06em', color: 'var(--t-ink-soft)', whiteSpace: 'nowrap',
              }}
            >
              {formatPrice(item.price)}
            </span>
          )}
        </div>

        {item.description && (
          <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.55 }}>
            {item.description}
          </div>
        )}

        {/* Remaining-quantity chip — multi-unit items only. */}
        {!spokenFor && stage !== 'done' && item.quantity > 1 && (
          <span
            style={{
              alignSelf: 'flex-start',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--t-accent-ink)', background: 'var(--t-accent-bg)',
              padding: '3px 8px', borderRadius: 999,
            }}
          >
            {remaining} of {item.quantity} left
          </span>
        )}

        {/* ── Claim states ─────────────────────────────────── */}
        {spokenFor || stage === 'done' ? (
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--t-ink-soft)' }}>
              Spoken for{claimedName ? <> — basted in by {claimedName}</> : null}
            </div>
            {stage === 'done' && effectiveBuyUrl && (
              <a
                href={effectiveBuyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12.5, fontWeight: 700, color: 'var(--t-accent-ink)',
                  textDecoration: 'none',
                }}
              >
                Buy it at {storeNameFor(effectiveBuyUrl)} →
              </a>
            )}
          </div>
        ) : stage === 'idle' ? (
          <button
            type="button"
            onClick={() => { if (!preview) setStage('form'); }}
            disabled={preview}
            title={preview ? 'Live on your site' : undefined}
            style={{
              marginTop: 6, alignSelf: 'flex-start',
              padding: '8px 16px', borderRadius: 999,
              background: 'var(--t-rsvp, var(--t-accent))',
              color: 'var(--t-rsvp-ink, var(--t-paper))',
              border: 'none', fontSize: 12.5, fontWeight: 700,
              cursor: preview ? 'default' : 'pointer',
              opacity: preview ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {preview ? 'Live on your site' : 'I’ll get this'}
          </button>
        ) : (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              disabled={stage === 'sending'}
              style={cardInput}
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A note for the hosts (optional)"
              rows={2}
              maxLength={500}
              disabled={stage === 'sending'}
              style={{ ...cardInput, resize: 'vertical', lineHeight: 1.45 }}
            />
            {error && <div style={{ fontSize: 11.5, color: 'var(--t-accent)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={reserve}
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
                {stage === 'sending' ? 'Threading…' : 'Reserve it'}
              </button>
              {stage !== 'sending' && (
                <button
                  type="button"
                  onClick={() => { setStage('idle'); setError(null); }}
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
        )}
      </div>
    </div>
  );
}

/* Quiet gift glyph for photo-less items; the crossed variant marks
   fully-claimed cards. Pure SVG — no animation. */
function GiftGlyph({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden
      stroke="var(--t-accent-ink)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      style={{ opacity: crossed ? 0.55 : 0.9 }}
    >
      <rect x="3.5" y="8.5" width="17" height="12" rx="1.5" />
      <path d="M3.5 12.5h17M12 8.5v12" />
      <path d="M12 8.5c-2.6 0-4.6-1-4.6-2.6C7.4 4.6 8.4 4 9.4 4c1.7 0 2.6 2 2.6 4.5C12 6 12.9 4 14.6 4c1 0 2 .6 2 1.9 0 1.6-2 2.6-4.6 2.6Z" />
      {crossed && <path d="M4 21 20 6" stroke="var(--t-ink-soft)" strokeWidth="1.2" />}
    </svg>
  );
}

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
};

export default RegistryItemsGrid;
