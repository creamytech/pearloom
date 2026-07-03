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
//   • editor canvas (editable): fetches the host's REAL items via
//     the same public GET when a slug is present (claims disabled),
//     and refetches on the RegistryPanel's pearloom:registry-items
//     ping so panel edits land promptly. Demo cards stand in ONLY
//     while the host has zero items — gated by `editable`, demo
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
  /** Group gift — guests chip in what they like (honor-ledger
   *  pledges with itemId) instead of reserving. Chip-ins never
   *  mark the item spoken for. */
  allowGroupGift?: boolean;
}

/** Per-item chip-in aggregate from the public pledge GET —
 *  totals only, "as shared by guests". */
interface ChipStat { totalCents: number; count: number }

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
  {
    id: 'demo-4', name: 'The long table', description: 'Every dinner party for the next decade starts here.',
    price: 1200, imageUrl: null, itemUrl: null, quantity: 1, quantityClaimed: 0, purchased: false, claimedByFirstName: null,
    allowGroupGift: true,
  },
];

/* Demo chip-in aggregate for the editor canvas ONLY — same
   honesty gate as DEMO_ITEMS. */
const DEMO_CHIP_STATS: Record<string, ChipStat> = {
  'demo-4': { totalCents: 42000, count: 3 },
};

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
  /* Host items — null while threading. The editor canvas fetches
     too (same public GET as published) so the host's real items
     show on the canvas; demo furniture only fills in while there
     are none (see `showDemo` below). */
  const [items, setItems] = useState<PublicItem[] | null>(null);
  /* Per-item chip-in aggregates — fetched only when a group-gift
     item is actually listed, so plain registries pay no extra
     request. */
  const [chipStats, setChipStats] = useState<Record<string, ChipStat>>({});

  const refresh = useCallback(async () => {
    if (!siteSlug) return;
    try {
      const r = await fetch(`/api/registry-items?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as { items?: PublicItem[] };
      const next = d.items ?? [];
      setItems(next);
      if (next.some((it) => it.allowGroupGift)) {
        const pr = await fetch(`/api/gift-pledges?subdomain=${encodeURIComponent(siteSlug)}&public=1`, { cache: 'no-store' });
        if (pr.ok) {
          const pd = (await pr.json()) as { items?: Array<{ itemId: string; totalCents: number; count: number }> };
          const rec: Record<string, ChipStat> = {};
          for (const row of pd.items ?? []) {
            rec[row.itemId] = { totalCents: row.totalCents, count: row.count };
          }
          setChipStats(rec);
        }
      }
    } catch { /* grid stays as-is */ }
  }, [siteSlug]);

  useEffect(() => {
    const t = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  /* Editor canvas — the RegistryPanel's items manager pings this
     pearloom:* event after every add / edit / delete so the canvas
     reflects the change without a reload. */
  useEffect(() => {
    if (!editable) return;
    const onPing = () => { void refresh(); };
    window.addEventListener('pearloom:registry-items', onPing);
    return () => window.removeEventListener('pearloom:registry-items', onPing);
  }, [editable, refresh]);

  /* Honesty rule: demo furniture is gated by `editable` only, and
     ONLY stands in while the host has zero real items (or while
     the first fetch is still threading). */
  const showDemo = editable && (items === null || items.length === 0);
  const shown = showDemo ? DEMO_ITEMS : items;
  const stats = showDemo ? DEMO_CHIP_STATS : chipStats;

  // Published with nothing listed (or still threading) → no extra chrome.
  if (!shown || shown.length === 0) return null;

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
        {shown.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            preview={editable}
            onReserved={refresh}
            siteSlug={siteSlug}
            chip={item.allowGroupGift ? stats[item.id] ?? { totalCents: 0, count: 0 } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

type ClaimStage = 'idle' | 'form' | 'sending' | 'done';

function ItemCard({ item, preview, onReserved, siteSlug, chip }: {
  item: PublicItem;
  preview: boolean;
  onReserved: () => Promise<void> | void;
  siteSlug?: string;
  /** Present only for group-gift items — the chip-in aggregate. */
  chip?: ChipStat;
}) {
  const [stage, setStage] = useState<ClaimStage>('idle');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [buyUrl, setBuyUrl] = useState<string | null>(null);

  /* Group gifts never become "spoken for" — guests chip in what
     they like until (and past) the price; the card stays warm. */
  const groupGift = item.allowGroupGift === true;
  const remaining = Math.max(0, item.quantity - item.quantityClaimed);
  const spokenFor = !groupGift && stage !== 'done' && (item.purchased || remaining === 0);

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
        {!groupGift && !spokenFor && stage !== 'done' && item.quantity > 1 && (
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
        {groupGift ? (
          <ChipInBlock
            item={item}
            chip={chip ?? { totalCents: 0, count: 0 }}
            siteSlug={siteSlug}
            preview={preview}
            onWoven={onReserved}
          />
        ) : spokenFor || stage === 'done' ? (
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

/* ─── Chip in — the group-gift flow ─────────────────────────────
   Guests give what they like toward the big item (honor-ledger
   pledges with itemId — Pearloom never processes the money). A
   woven progress line shows the chipped-in total against the
   price, "as shared by guests"; the item never becomes spoken
   for. When the total reaches the price the line reads "Fully
   woven — N gave together" and the form quiets to a note-only
   affordance. */

type ChipStage = 'idle' | 'form' | 'sending' | 'done';

function ChipInBlock({ item, chip, siteSlug, preview, onWoven }: {
  item: PublicItem;
  chip: ChipStat;
  siteSlug?: string;
  preview: boolean;
  onWoven: () => Promise<void> | void;
}) {
  const [stage, setStage] = useState<ChipStage>('idle');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const priceCents = typeof item.price === 'number' && item.price > 0 ? Math.round(item.price * 100) : null;
  const fullyWoven = priceCents !== null && chip.totalCents >= priceCents;
  const pct = priceCents ? Math.max(0, Math.min(100, Math.round((chip.totalCents / priceCents) * 100))) : 0;

  async function weaveIn() {
    if (stage === 'sending' || !name.trim() || !siteSlug) return;
    setStage('sending');
    setError(null);
    /* Optional amount — dollars in, integer cents out. Malformed
       input just drops the number; the thread matters more. */
    const dollars = parseFloat(amount.replace(/[$,\s]/g, ''));
    const amountCents = !fullyWoven && Number.isFinite(dollars) && dollars > 0
      ? Math.round(dollars * 100)
      : undefined;
    try {
      const r = await fetch('/api/gift-pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: siteSlug,
          guestName: name.trim(),
          amountCents,
          note: note.trim() || undefined,
          itemId: item.id,
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Could not save — try again.');
      setStage('done');
      void onWoven();
    } catch (e) {
      setStage('form');
      setError(e instanceof Error ? e.message : 'Could not save — try again.');
    }
  }

  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 7 }}>
      {/* The woven progress line — totals only, guest-shared. */}
      {priceCents !== null && (
        <div>
          <div style={{ height: 5, borderRadius: 999, background: 'var(--t-section)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`, height: '100%', borderRadius: 999,
                background: 'var(--t-accent)', transition: 'width 600ms ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 5, lineHeight: 1.45 }}>
            {fullyWoven
              ? <>Fully woven — {chip.count} gave together</>
              : chip.totalCents > 0
                ? <>{formatPrice(chip.totalCents / 100)} of {formatPrice(priceCents / 100)} — <i>as shared by guests</i></>
                : <>Chip in toward {formatPrice(priceCents / 100)} — give what you like</>}
          </div>
        </div>
      )}
      {priceCents === null && chip.count > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', lineHeight: 1.45 }}>
          {chip.count} {chip.count === 1 ? 'guest has' : 'guests have'} chipped in
        </div>
      )}

      {stage === 'done' ? (
        <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--t-ink-soft)' }}>
          Woven in — thank you.
        </div>
      ) : stage === 'idle' ? (
        fullyWoven ? (
          /* The gift is covered — quiet the form to a note-only
             affordance so latecomers can still add their name. */
          <button
            type="button"
            onClick={() => { if (!preview) setStage('form'); }}
            disabled={preview}
            title={preview ? 'Live on your site' : undefined}
            style={{
              alignSelf: 'flex-start', padding: 0, border: 'none', background: 'transparent',
              fontSize: 12, fontWeight: 700, color: 'var(--t-accent-ink)',
              cursor: preview ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: preview ? 0.7 : 1,
            }}
          >
            Add a note anyway →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { if (!preview) setStage('form'); }}
            disabled={preview}
            title={preview ? 'Live on your site' : undefined}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 16px', borderRadius: 999,
              background: 'var(--t-rsvp, var(--t-accent))',
              color: 'var(--t-rsvp-ink, var(--t-paper))',
              border: 'none', fontSize: 12.5, fontWeight: 700,
              cursor: preview ? 'default' : 'pointer',
              opacity: preview ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {preview ? 'Live on your site' : 'Chip in'}
          </button>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {!fullyWoven && (
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (optional) — e.g. 50"
              maxLength={12}
              disabled={stage === 'sending'}
              style={cardInput}
            />
          )}
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
            maxLength={280}
            disabled={stage === 'sending'}
            style={{ ...cardInput, resize: 'vertical', lineHeight: 1.45 }}
          />
          {error && <div style={{ fontSize: 11.5, color: 'var(--t-accent)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
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
              {stage === 'sending' ? 'Threading…' : fullyWoven ? 'Add the note' : 'Weave it in'}
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
