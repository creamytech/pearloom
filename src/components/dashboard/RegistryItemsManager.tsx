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

import { useEffect, useState } from 'react';

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
}

interface Props {
  siteId: string;
}

export function RegistryItemsManager({ siteId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/registry-items?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [siteId]);

  async function deleteItem(id: string) {
    if (!confirm('Remove this item from the registry?')) return;
    await fetch(`/api/registry-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    void load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 28, margin: 0 }}>
            Registry items
          </h2>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
            Items guests can claim and pay for through Pearloom (3% platform fee).
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
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-muted)' }}>Threading…</div>
      ) : items.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {items.map((item) => (
            <ItemCard key={item.id}
              item={item}
              onEdit={() => setEditing(item)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <ItemEditor
          siteId={siteId}
          existing={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); void load(); }}
        />
      )}
    </div>
  );
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
        Nothing here yet. Add an item — kitchenware, art, an experience —
        and guests will be able to pay for it through your site.
      </div>
      <button type="button" onClick={onAdd} style={primaryButtonStyle}>+ Add your first item</button>
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete }: { item: Item; onEdit: () => void; onDelete: () => void }) {
  const remaining = Math.max(0, item.quantity - item.quantityClaimed);
  return (
    <div
      style={{
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div
        style={{
          aspectRatio: '4/3',
          background: item.imageUrl
            ? `url(${item.imageUrl}) center/cover`
            : 'linear-gradient(135deg, var(--peach-bg), var(--sage-tint))',
        }}
      />
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          ${formatPrice(item.price ?? 0)} · {item.quantityClaimed} of {item.quantity} claimed
        </div>
        {item.claimedByName && (
          <div style={{ fontSize: 11, color: 'var(--peach-ink)', marginTop: 2 }}>
            Last claimed by {item.claimedByName}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button type="button" onClick={onEdit} style={smallButtonStyle}>Edit</button>
          <button type="button" onClick={onDelete} style={{ ...smallButtonStyle, color: '#9B3426' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  siteId, existing, onClose, onSaved,
}: {
  siteId: string;
  existing: Item | null;
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    <div onClick={onClose} style={modalBackdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
        <button onClick={onClose} aria-label="Close" style={modalCloseStyle}>×</button>
        <h3 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 22, margin: 0 }}>
          {existing ? 'Edit item' : 'New item'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <Field label="Item name">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} />
          </Field>
          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Price (USD)">
              <input type="number" min={1} step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Quantity">
              <input type="number" min={1} step="1" value={quantity}
                onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <Field label="Image URL (optional)">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…" style={inputStyle} />
          </Field>
          <Field label="External link (optional)">
            <input value={itemUrl} onChange={(e) => setItemUrl(e.target.value)}
              placeholder="https://crateandbarrel.com/…" style={inputStyle} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Kitchen, Bath, Honeymoon…" style={inputStyle} />
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Item['priority'])}
                style={inputStyle}>
                <option value="need">Need</option>
                <option value="want">Want</option>
                <option value="dream">Dream</option>
              </select>
            </Field>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(155,52,38,0.08)', color: '#9B3426', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ ...smallButtonStyle, padding: '10px 18px' }}>Cancel</button>
          <button type="button" onClick={save} disabled={saving} style={primaryButtonStyle}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add item'}
          </button>
        </div>
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
  padding: '10px 18px', borderRadius: 999, border: 'none',
  background: 'var(--ink, #18181B)', color: 'var(--cream, #FBF7EE)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6,
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  background: 'var(--card, #FFFFFF)', fontSize: 12,
  cursor: 'pointer', color: 'var(--ink)',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(14,13,11,0.55)',
  backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 20, zIndex: 1000,
};

const modalCardStyle: React.CSSProperties = {
  background: 'var(--cream, #FDFAF0)', borderRadius: 18,
  padding: 28, maxWidth: 540, width: '100%', position: 'relative',
  maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
};

const modalCloseStyle: React.CSSProperties = {
  position: 'absolute', top: 12, right: 12, background: 'transparent',
  border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-soft)',
};
