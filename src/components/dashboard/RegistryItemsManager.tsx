'use client';

// ──────────────────────────────────────────────────────────────
// RegistryItemsManager
//
// Couple-side admin for the NATIVE registry. Lists items, lets the
// couple add/edit/delete, and shows claim status (X of Y claimed,
// who claimed last). The site-facing block (RegistryItemsBlock) is
// what guests see; this is the back-office.
//
// Per-site: pass `siteId` from the parent page.
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { useDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/pearloom/motifs';
import { Thread } from '@/components/brand/Thread';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';
import {
  GiftFace, PlateRow, isPlateUrl,
  looksLikeUrl, extractUrls, readProductPage, storeDomainFor, findDuplicateByUrl,
} from '@/components/registry/gift-face';

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  itemUrl: string | null;
  category: string | null;
  priority: 'need' | 'want' | 'dream';
  quantity: number;
  quantityClaimed: number;
  purchased: boolean;
  sortOrder: number;
  claimedByName?: string | null;
  paymentStatus?: string | null;
  notes?: string | null;
  /** Group gifting — guests chip in what they like toward this
   *  item (gift_pledges rows with item_id); chip-ins never mark
   *  it spoken for. */
  allowGroupGift?: boolean;
}

interface Props {
  siteId: string;
}

export function RegistryItemsManager({ siteId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const dialog = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registry-items?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { void load(); }, [load]);

  async function deleteItem(id: string) {
    const sure = await dialog.confirm({
      title: 'Remove this item from the registry?',
      message: 'Guests who already claimed it can still see their claim, but no one else will see this item again.',
      confirmLabel: 'Remove item',
      cancelLabel: 'Keep it',
      variant: 'danger',
    });
    if (!sure) return;
    await fetch(`/api/registry-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    void load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 28, margin: 0 }}>
            Registry items
          </h2>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
            Items guests can reserve (or chip in on together) right from your site.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={primaryButtonStyle}
        >
          + Add item
        </button>
      </header>

      {loading ? (
        <DashSkeleton kind="card-grid" count={3} label="Threading…" style={{ padding: '24px 0' }} />
      ) : items.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        /* RG-B: category shelves — items group by category (most-wanted
           first inside each), and each group's grid rides the phone
           snap shelf. One flat group when the host never categorizes. */
        groupByCategory(items).map((group) => (
          <section key={group.label}>
            {group.label !== '' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 10px' }}>
                <span style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  {group.label}
                </span>
                <div aria-hidden style={{ flex: 1, height: 1, background: 'var(--line-soft, rgba(61,74,31,0.08))' }} />
              </div>
            )}
            <div
              className="pl8-homerow pl8-homerow-flush"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
                gap: 14,
              }}
            >
              {group.items.map((item) => (
                <ItemCard key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => deleteItem(item.id)}
                  onRefreshed={() => void load()}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {(showAdd || editing) && (
        <ItemEditor
          siteId={siteId}
          existing={editing}
          items={items}
          onEditInstead={(item) => { setShowAdd(false); setEditing(item); }}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

/* Most-wanted first ('need' → 'want' → 'dream'), stable inside each
   tier; groups keyed by trimmed category (untitled group last). */
const PRIORITY_RANK: Record<Item['priority'], number> = { need: 0, want: 1, dream: 2 };
function groupByCategory(items: Item[]): Array<{ label: string; items: Item[] }> {
  const byCat = new Map<string, Item[]>();
  for (const it of items) {
    const key = (it.category ?? '').trim();
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(it);
  }
  const groups = [...byCat.entries()]
    .map(([label, list]) => ({
      label,
      items: [...list].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]),
    }))
    .sort((a, b) => (a.label === '' ? 1 : b.label === '' ? -1 : a.label.localeCompare(b.label)));
  /* A single untitled group renders headerless (label ''). */
  return groups;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        padding: 48, textAlign: 'center', borderRadius: 16,
        background: 'var(--cream-2, #F5EFE2)',
        border: '1px dashed var(--line, rgba(61,74,31,0.18))',
      }}
    >
      <div style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 360, margin: '0 auto 12px' }}>
        Nothing here yet. Add an item, kitchenware, art, an experience, 
        and guests will be able to pay for it through your site.
      </div>
      <button type="button" onClick={onAdd} style={primaryButtonStyle}>+ Add your first item</button>
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, onRefreshed }: { item: Item; onEdit: () => void; onDelete: () => void; onRefreshed: () => void }) {
  const remaining = Math.max(0, item.quantity - item.quantityClaimed);
  const store = storeDomainFor(item.itemUrl);
  const dialog = useDialog();
  const [refreshing, setRefreshing] = useState(false);
  /* RG-C "Refresh from the store" — re-read the product page and
     confirm any change before writing it. Never automatic: prices
     moving silently under a host is spooky. */
  async function refreshFromStore() {
    if (!item.itemUrl || refreshing) return;
    setRefreshing(true);
    try {
      const d = await readProductPage(item.itemUrl);
      const priceChanged = typeof d.price === 'number' && d.price > 0 && d.price !== item.price;
      const photoChanged = !!d.imageUrl && d.imageUrl !== item.imageUrl;
      if (!priceChanged && !photoChanged) {
        await dialog.alert({ title: 'Already up to date', message: 'The store shows the same price and photo.' });
        return;
      }
      const parts: string[] = [];
      if (priceChanged) parts.push(`price $${formatPrice(item.price ?? 0)} → $${formatPrice(d.price!)}`);
      if (photoChanged) parts.push('a newer photo');
      const sure = await dialog.confirm({
        title: 'Refresh from the store?',
        message: `The store shows ${parts.join(' and ')}. Update this item to match?`,
        confirmLabel: 'Update it',
        cancelLabel: 'Keep mine',
      });
      if (!sure) return;
      await fetch('/api/registry-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          ...(priceChanged ? { price: d.price } : {}),
          ...(photoChanged ? { imageUrl: d.imageUrl } : {}),
        }),
      });
      onRefreshed();
    } catch {
      await dialog.alert({ title: 'Couldn’t reach the store', message: 'The page didn’t come back — try again in a moment.' });
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <div
      /* Spoken-for tiles wear the line-screen (TASTE-PLAN T.4) —
         pattern marks the state; color stays calm. */
      className={remaining === 0 && item.quantityClaimed > 0 ? 'pl-hatch' : undefined}
      style={{
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      <GiftFace url={item.imageUrl} category={item.category} alt={item.name} confess style={{ aspectRatio: '4/3' }}>
        {item.priority === 'need' && (
          /* The gold pearl — "most wanted". */
          <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,253,247,0.92)', border: '1px solid var(--line, rgba(61,74,31,0.14))', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)' }} />
            Most wanted
          </span>
        )}
        {store && (
          /* The store plate — where "buy it" hands off to. */
          <span style={{ position: 'absolute', bottom: 8, right: 8, padding: '3px 8px', borderRadius: 7, background: 'rgba(20,16,8,0.72)', color: '#FBF7EE', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em' }}>
            {store}
          </span>
        )}
      </GiftFace>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          ${formatPrice(item.price ?? 0)} · {item.quantityClaimed} of {item.quantity} claimed
          {item.allowGroupGift && <span style={{ color: 'var(--sage-deep)' }}> · chip in</span>}
        </div>
        {/* Group-gift / fund progress (zip Registry) — a real bar from
            quantityClaimed / quantity for any multi-unit item. Single
            items keep the plain claimed line above. */}
        {item.quantity > 1 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 6, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((item.quantityClaimed / item.quantity) * 100))}%`, height: '100%', background: remaining === 0 ? 'var(--peach-ink)' : 'var(--sage)', borderRadius: 99 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10, color: 'var(--ink-muted)' }}>
                {Math.min(100, Math.round((item.quantityClaimed / item.quantity) * 100))}% there
              </span>
              {item.quantityClaimed > 0 && (
                /* quantityClaimed counts UNITS, not people — one guest
                   can claim several — so the copy states units. */
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--sage-deep)' }}>
                  <Icon name="gift" size={11} /> {item.quantityClaimed} of {item.quantity} claimed
                </span>
              )}
            </div>
          </div>
        )}
        {item.claimedByName && (
          <div style={{ fontSize: 11, color: 'var(--peach-ink)', marginTop: 6 }}>
            Last claimed by {item.claimedByName}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={onEdit} style={smallButtonStyle}>Edit</button>
          {item.itemUrl && (
            <button type="button" onClick={refreshFromStore} disabled={refreshing} style={smallButtonStyle}>
              {refreshing ? 'Reading…' : 'Refresh'}
            </button>
          )}
          <button type="button" onClick={onDelete} style={{ ...smallButtonStyle, color: '#9B3426' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  siteId, existing, items, onEditInstead, onClose, onSaved,
}: {
  siteId: string;
  existing: Item | null;
  /** The current list — powers the pasted-link de-dupe guard. */
  items: Item[];
  onEditInstead: (item: Item) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [price, setPrice] = useState<string>(existing?.price ? String(existing.price) : '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? '');
  const [itemUrl, setItemUrl] = useState(existing?.itemUrl ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [priority, setPriority] = useState<Item['priority']>(existing?.priority ?? 'want');
  const [quantity, setQuantity] = useState<string>(String(existing?.quantity ?? 1));
  const [allowGroupGift, setAllowGroupGift] = useState(existing?.allowGroupGift ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* RG.1 — the smart intake: paste a product link (or several) and
     Pear reads the rest. One link prefills this form; several open
     the queue below. */
  const [paste, setPaste] = useState('');
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [dupe, setDupe] = useState<Item | null>(null);
  const [queue, setQueue] = useState<QueueRow[] | null>(null);

  async function readOneLink(url: string) {
    const twin = findDuplicateByUrl(items.filter((i) => i.id !== existing?.id), url);
    if (twin) { setDupe(twin); return; }
    setDupe(null);
    setReading(true); setReadNote(null);
    try {
      const d = await readProductPage(url);
      if (d.title) setName(d.title);
      if (typeof d.price === 'number' && d.price > 0) setPrice(String(d.price));
      if (d.imageUrl) setImageUrl(d.imageUrl);
      setItemUrl(url);
      setReadNote(d.store ? `Read from ${d.store} — check it over, then save.` : 'Read the page — check it over, then save.');
      setPaste('');
    } catch (e) {
      setReadNote(e instanceof Error ? e.message : 'Couldn’t read that page — add it by hand.');
    } finally {
      setReading(false);
    }
  }

  function handlePaste(text: string) {
    setPaste(text);
    const urls = extractUrls(text);
    if (urls.length > 1) {
      /* Several links at once → the queue takes over (RG-C). */
      setQueue(urls.map((u) => ({ url: u, state: 'waiting' as const, title: null, imageUrl: null, price: '', store: null })));
      setPaste('');
    } else if (urls.length === 1 && looksLikeUrl(text.trim())) {
      void readOneLink(urls[0]);
    }
  }

  // Phase 4.3 of AUDIT-2026-05-29 — modal a11y. titleId binds the
  // dialog announcement to the visible h3 ("Edit item" / "New item").
  // Esc closes (unless mid-save). Focus trap keeps Tab inside the
  // modal so it can't escape to the dashboard underneath.
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  async function save() {
    const p = parseFloat(price);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!Number.isFinite(p) || p <= 0) { setError('Price must be greater than 0.'); return; }
    const q = parseInt(quantity, 10);
    if (!Number.isFinite(q) || q < 1) { setError('Quantity must be at least 1.'); return; }

    setError(null);
    setSaving(true);
    try {
      const body = {
        siteId,
        name: name.trim(),
        description: description.trim() || null,
        price: p,
        imageUrl: imageUrl.trim() || null,
        itemUrl: itemUrl.trim() || null,
        category: category.trim() || null,
        priority,
        quantity: q,
        allowGroupGift,
      };
      const res = existing
        ? await fetch('/api/registry-items', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: existing.id, ...body }),
          })
        : await fetch('/api/registry-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed.');
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="presentation" aria-hidden onClick={onClose} className="pl-modal-veil" style={modalBackdropStyle}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="pl-modal-card"
        style={modalCardStyle}
      >
        <button type="button" onClick={onClose} aria-label="Close" style={modalCloseStyle}>×</button>
        <h3
          id={titleId}
          className="pl-letterpress"
          style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em', margin: 0 }}
        >
          {existing ? 'Edit item' : 'New item'}
        </h3>
        {/* The two-strand thread — the brand's divider, not a bare rule. */}
        <div aria-hidden style={{ maxWidth: 180, margin: '10px 0 2px' }}>
          <Thread variant="weave" height={10} />
        </div>
        {queue ? (
          <LinkQueue
            siteId={siteId}
            rows={queue}
            setRows={setQueue}
            items={items}
            onDone={onSaved}
            onCancel={() => setQueue(null)}
          />
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {!existing && (
            <Field label="Paste a product link — Pear reads the rest">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={paste}
                  onChange={(e) => handlePaste(e.target.value)}
                  placeholder="https://… (or several links at once)"
                  className="pl-modal-input"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => { if (looksLikeUrl(paste)) void readOneLink(paste.trim()); }}
                  disabled={reading || !looksLikeUrl(paste)}
                  style={{ ...smallButtonStyle, padding: '10px 16px', opacity: reading || !looksLikeUrl(paste) ? 0.5 : 1 }}
                >
                  {reading ? 'Reading…' : 'Read it'}
                </button>
              </div>
              {readNote && <span style={{ fontSize: 11.5, color: 'var(--sage-deep, #5C6B3F)', marginTop: 4 }}>{readNote}</span>}
              {dupe && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                  Already on your list — “{dupe.name}”.
                  <button type="button" onClick={() => onEditInstead(dupe)} style={{ ...smallButtonStyle, padding: '3px 10px' }}>Edit that one</button>
                </span>
              )}
            </Field>
          )}
          <Field label="Item name">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="pl-modal-input" style={inputStyle} />
          </Field>
          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="pl-modal-input" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Price (USD)">
              <input type="number" min={1} step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)} className="pl-modal-input" style={inputStyle} />
            </Field>
            <Field label="Quantity">
              <input type="number" min={1} step="1" value={quantity}
                onChange={(e) => setQuantity(e.target.value)} className="pl-modal-input" style={inputStyle} />
            </Field>
          </div>
          {/* RG.2 — the face picker: what the card shows. A read link
              supplies the photo; otherwise pick a Pearloom plate. The
              bare Image-URL text input is gone. */}
          <Field label="The face on the card">
            <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 10, alignItems: 'start' }}>
              <GiftFace url={imageUrl || null} category={category} confess style={{ aspectRatio: '4/3', borderRadius: 8, border: '1px solid var(--line, rgba(61,74,31,0.14))' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <PlateRow value={imageUrl} onPick={(sentinel) => setImageUrl(sentinel)} />
                {imageUrl && !isPlateUrl(imageUrl) && (
                  <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Using the photo from the link · pick a plate to swap</span>
                )}
              </div>
            </div>
          </Field>
          <Field label="External link (optional)">
            <input value={itemUrl} onChange={(e) => setItemUrl(e.target.value)}
              placeholder="https://crateandbarrel.com/…" className="pl-modal-input" style={inputStyle} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Kitchen, Bath, Honeymoon…" className="pl-modal-input" style={inputStyle} />
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Item['priority'])}
                className="pl-modal-input" style={inputStyle}>
                <option value="need">Need</option>
                <option value="want">Want</option>
                <option value="dream">Dream</option>
              </select>
            </Field>
          </div>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              background: allowGroupGift ? 'rgba(92,107,63,0.08)' : 'var(--cream-2, #F5EFE2)',
              border: '1px solid var(--line, rgba(61,74,31,0.14))',
            }}
          >
            <input
              type="checkbox"
              checked={allowGroupGift}
              onChange={(e) => setAllowGroupGift(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--sage-deep, #5C6B3F)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>
              Let guests chip in together
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)' }}>
                For the big one, several guests give what they like toward it.
              </span>
            </span>
          </label>
        </div>
        )}

        {!queue && error && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(155,52,38,0.08)', color: '#9B3426', fontSize: 13 }}>
            {error}
          </div>
        )}

        {!queue && (
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ ...smallButtonStyle, padding: '10px 18px' }}>Cancel</button>
          <button type="button" onClick={save} disabled={saving} style={primaryButtonStyle}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add item'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

/* ── The multi-link queue (RG.1 / RG-C) ───────────────────────
   Several links pasted at once thread through from-url one at a
   time (the server route is untouched; sequential + a courtesy
   pause keeps us friendly with its 10/min limit) and land as
   preview rows the host confirms per item. Nothing is added
   without a click. */

interface QueueRow {
  url: string;
  state: 'waiting' | 'reading' | 'ready' | 'adding' | 'added' | 'failed' | 'dupe';
  title: string | null;
  imageUrl: string | null;
  price: string;
  store: string | null;
  note?: string | null;
}

const QUEUE_STATE_LABEL: Record<QueueRow['state'], string> = {
  waiting: 'Waiting…',
  reading: 'Reading the page…',
  ready: '',
  adding: 'Adding…',
  added: 'Added to your list',
  failed: '',
  dupe: '',
};

function LinkQueue({
  siteId, rows, setRows, items, onDone, onCancel,
}: {
  siteId: string;
  rows: QueueRow[];
  setRows: React.Dispatch<React.SetStateAction<QueueRow[] | null>>;
  items: Item[];
  onDone: () => void;
  onCancel: () => void;
}) {
  /* One in-flight read at a time. The worker is state-driven: each
     patch re-renders, the effect re-runs and picks the next
     'waiting' row — so a failed row set back to 'waiting' by
     "Try again" simply rejoins the line. */
  const busyRef = useRef(false);

  const patchRow = useCallback((i: number, patch: Partial<QueueRow>) => {
    setRows((prev) => (prev ? prev.map((r, j) => (j === i ? { ...r, ...patch } : r)) : prev));
  }, [setRows]);

  useEffect(() => {
    if (busyRef.current) return;
    const i = rows.findIndex((r) => r.state === 'waiting');
    if (i < 0) return;
    busyRef.current = true;
    const url = rows[i].url;
    const isFirst = rows.every((r, j) => j >= i || r.state === 'waiting');
    void (async () => {
      // Defer past the render tick; pause between reads after the first.
      await new Promise((resolve) => setTimeout(resolve, isFirst ? 0 : 700));
      const twin = findDuplicateByUrl(items, url);
      if (twin) {
        patchRow(i, { state: 'dupe', title: twin.name });
      } else {
        patchRow(i, { state: 'reading' });
        try {
          const d = await readProductPage(url);
          patchRow(i, {
            state: 'ready',
            title: d.title,
            imageUrl: d.imageUrl,
            price: typeof d.price === 'number' && d.price > 0 ? String(d.price) : '',
            store: d.store ?? storeDomainFor(url),
          });
        } catch (e) {
          patchRow(i, { state: 'failed', note: e instanceof Error ? e.message : 'Couldn’t read that page.' });
        }
      }
      busyRef.current = false;
    })();
  }, [rows, items, patchRow]);

  async function addRow(i: number) {
    const row = rows[i];
    if (!row || row.state !== 'ready') return;
    const p = parseFloat(row.price);
    if (!row.title?.trim()) { patchRow(i, { note: 'Give it a name first.' }); return; }
    if (!Number.isFinite(p) || p <= 0) { patchRow(i, { note: 'Add a price first.' }); return; }
    patchRow(i, { state: 'adding', note: null });
    try {
      const res = await fetch('/api/registry-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          name: row.title.trim(),
          price: p,
          imageUrl: row.imageUrl,
          itemUrl: row.url,
          quantity: 1,
          priority: 'want',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      patchRow(i, { state: 'added' });
    } catch (e) {
      patchRow(i, { state: 'ready', note: e instanceof Error ? e.message : 'Save failed.' });
    }
  }

  async function addAllReady() {
    const idxs = rows.map((r, i) => (r.state === 'ready' && r.title?.trim() && parseFloat(r.price) > 0 ? i : -1)).filter((i) => i >= 0);
    for (const i of idxs) await addRow(i);
  }

  const addedCount = rows.filter((r) => r.state === 'added').length;
  const readyCount = rows.filter((r) => r.state === 'ready' && r.title?.trim() && parseFloat(r.price) > 0).length;
  const pendingCount = rows.filter((r) => r.state === 'waiting' || r.state === 'reading').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
        {pendingCount > 0
          ? `Reading ${rows.length} links — each becomes a card you confirm.`
          : 'Check each card over, then add the ones you want.'}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.url}
          style={{
            display: 'grid', gridTemplateColumns: '64px 1fr', gap: 10, alignItems: 'center',
            padding: 10, borderRadius: 10,
            background: 'var(--card, #FBF7EE)',
            border: '1px solid var(--line, rgba(61,74,31,0.14))',
            opacity: row.state === 'added' || row.state === 'dupe' ? 0.65 : 1,
          }}
        >
          <GiftFace url={row.imageUrl} alt="" style={{ aspectRatio: '4/3', borderRadius: 7, border: '1px solid var(--line-soft, rgba(61,74,31,0.08))' }} />
          <div style={{ minWidth: 0 }}>
            {row.state === 'ready' || row.state === 'adding' ? (
              <>
                <input
                  value={row.title ?? ''}
                  onChange={(e) => patchRow(i, { title: e.target.value })}
                  placeholder="Name this gift"
                  className="pl-modal-input"
                  style={{ ...inputStyle, width: '100%', padding: '6px 9px', fontSize: 13 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <input
                    type="number" min={1} step="0.01"
                    value={row.price}
                    onChange={(e) => patchRow(i, { price: e.target.value })}
                    placeholder="Price"
                    className="pl-modal-input"
                    style={{ ...inputStyle, width: 92, padding: '6px 9px', fontSize: 13 }}
                  />
                  {row.store && (
                    <span style={{ fontSize: 11, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.store}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void addRow(i)}
                    disabled={row.state === 'adding'}
                    style={{ ...smallButtonStyle, marginLeft: 'auto', opacity: row.state === 'adding' ? 0.5 : 1 }}
                  >
                    {row.state === 'adding' ? 'Adding…' : 'Add it'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.state === 'added' || row.state === 'dupe' ? (row.title ?? row.url) : row.url}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: row.state === 'added' ? 'var(--sage-deep, #5C6B3F)' : 'var(--ink-muted)' }}>
                    {row.state === 'dupe' ? 'Already on your list' : row.state === 'failed' ? (row.note ?? 'Couldn’t read that page.') : QUEUE_STATE_LABEL[row.state]}
                  </span>
                  {row.state === 'failed' && (
                    <button type="button" onClick={() => patchRow(i, { state: 'waiting', note: null })} style={{ ...smallButtonStyle, padding: '3px 10px' }}>
                      Try again
                    </button>
                  )}
                </div>
              </>
            )}
            {row.note && row.state !== 'failed' && (
              <div style={{ fontSize: 11, color: '#9B3426', marginTop: 4 }}>{row.note}</div>
            )}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ ...smallButtonStyle, padding: '10px 18px' }}>Back</button>
        <div style={{ flex: 1 }} />
        {readyCount > 1 && (
          <button type="button" onClick={() => void addAllReady()} style={{ ...smallButtonStyle, padding: '10px 18px' }}>
            Add all {readyCount}
          </button>
        )}
        <button type="button" onClick={onDone} style={primaryButtonStyle}>
          {addedCount > 0 ? `Done · ${addedCount} added` : 'Done'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  background: 'var(--card, #FFFFFF)', fontSize: 14,
  color: 'var(--ink)', fontFamily: 'inherit',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 999, border: 'none',
  // Deep olive-brown, matching the sidebar's active pill — pure ink
  // read as a black slab against the paper system.
  background: 'var(--pl-nav-active-bg, var(--pl-olive-deep, #363F22))',
  color: 'var(--pl-nav-active-ink, #F7F2E4)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 999,
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  background: 'var(--card, #FFFFFF)', fontSize: 12,
  cursor: 'pointer', color: 'var(--ink)',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(20, 16, 8, 0.48)',
  backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 20, zIndex: 1000,
};

const modalCardStyle: React.CSSProperties = {
  background: 'var(--cream, #FDFAF0)', borderRadius: 20,
  border: '1px solid var(--line-soft, rgba(61, 74, 31, 0.08))',
  boxShadow: '0 40px 90px -30px rgba(31, 26, 12, 0.45), 0 4px 16px rgba(31, 26, 12, 0.10)',
  padding: 28, maxWidth: 540, width: '100%', position: 'relative',
  maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
};

const modalCloseStyle: React.CSSProperties = {
  position: 'absolute', top: 14, right: 14, width: 32, height: 32,
  display: 'grid', placeItems: 'center', borderRadius: 999,
  background: 'var(--cream-2, #F5EFE2)',
  border: '1px solid var(--line-soft, rgba(61, 74, 31, 0.08))',
  fontSize: 18, lineHeight: 1, cursor: 'pointer', color: 'var(--ink-soft)',
};
